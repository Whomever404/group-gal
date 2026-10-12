import type {
  BadEndData, BeId, CharTable, GameState, HubOption, LabelIndex, FlatNode, FlatScript,
  Renderer, Session,
} from './types';
import { applyEff, applyStat, STAT_NAME, topHero, unlockEnding } from './effects';
import { CHARS } from '../content/characters';

/** 默认计时。 */
export const DEFAULT_DELAYS = {
  me: 280, msg: 520, sys: 560, note: 680, card: 760, fast: false,
} as const;

export interface GameEnv {
  readonly script: FlatScript;
  readonly labels: LabelIndex;
  readonly chars: CharTable;
  readonly beData: Readonly<Record<BeId, BadEndData>>;
  /**
   * 每个节点**执行前**的回调，参数是该节点自身的下标。
   *
   * 时机很关键：`run` 是先回调再 `session.ip++`，所以回调里读到的
   * `session.ip` 正指向这个节点。自动存档靠它在选择点存下指针——
   * 若改到节点执行之后再回调，读档会跳过那个选择。
   */
  readonly onNode?: (ip: number, node: FlatNode) => void;
  /**
   * 每个节点开始前询问「是否应当中止」。返回 true 则 `run` 立即返回。
   *
   * 用于读档：载入新存档时必须作废仍在跑的那个 `run`，否则它会在
   * 延迟结束后继续就地修改同一个 `Session`，与新的 `run` 打架。
   */
  readonly shouldStop?: () => boolean;
}

/** 快进时的等待上限。 */
const FAST_CAP_MS = 60;

class UnknownLabelError extends Error {
  constructor(readonly label: string) {
    super(`未知 label：${label}（goto 目标不存在，请跑 npm run check:script）`);
    this.name = 'UnknownLabelError';
  }
}

function delayFor(r: Renderer, ms: number): Promise<void> {
  const capped = r.delays.fast ? Math.min(ms, FAST_CAP_MS) : ms;
  // 免去一次宏任务调度：生产环境延时恒 > 0，这条分支只服务于测试与快进
  if (capped <= 0) return Promise.resolve();
  return new Promise(resolve => { setTimeout(resolve, capped); });
}

function resolveTarget(labels: LabelIndex, label: string): number {
  const target = labels[label];
  if (target === undefined) throw new UnknownLabelError(label);
  return target;
}

/** 结算一次选项加成（羁绊 + 资质），并把浮层交给渲染层。 */
function settle(
  session: Session,
  chars: CharTable,
  r: Renderer,
  goto?: { eff?: Parameters<typeof applyEff>[1]; stat?: Parameters<typeof applyStat>[1] } | null,
): void {
  if (!goto) return;
  if (goto.eff) {
    const { state, toasts } = applyEff(session.state, goto.eff, chars);
    session.state = state;
    if (toasts.length > 0) r.affToast(toasts);
  }
  if (goto.stat) {
    const { state, toasts } = applyStat(session.state, goto.stat);
    session.state = state;
    if (toasts.length > 0) r.statToast(toasts);
  }
}

/**
 * 回合循环中枢（第二章「群日常」）的动态选项。
 *
 * - **首轮**：从 15 条本命支线里挑一个攻略对象，选中即锁定并给一次性羁绊加成。
 * - **锁定后**：只出该对象的剩余支线 + 至多 `eventsPerTurn` 条未触发过的随机事件；
 *   羁绊达阈值或支线走完时，额外给一条「推进主线」。
 *
 * 选项 id 同时是 `state.hub` 的去重键：`pick_<key>` / `seg<i>_<key>` / `ev_<id>`。
 */
function loopOptions(state: GameState, node: Extract<FlatNode, { kind: 'loop' }>): HubOption[] {
  const cfg = node.config;
  const opts: HubOption[] = [];

  if (!state.target || !cfg.arcs[state.target]) {
    for (const c of cfg.candidates) {
      opts.push({ id: 'pick_' + c.key, label: c.label, once: true, goto: c.entry });
    }
    return opts;
  }

  const key = state.target;
  const segments = cfg.arcs[key] ?? [];
  segments.forEach((seg, i) => {
    if (state.hub['seg' + i + '_' + key]) return;
    opts.push({ id: 'seg' + i + '_' + key, label: seg.label, once: true, goto: seg.entry });
  });

  // 随机事件：日常为主、少量风险；每回合至多 eventsPerTurn 条，且每条只触发一次
  let evCount = 0;
  for (const ev of cfg.events) {
    if (evCount >= cfg.eventsPerTurn) break;
    if (state.hub['ev_' + ev.id]) continue;
    opts.push({ id: 'ev_' + ev.id, label: ev.label, once: true, goto: ev.entry });
    evCount++;
  }

  const bond = state.aff[key] ?? 0;
  const done = segments.filter((_, i) => state.hub['seg' + i + '_' + key]).length;
  if (bond >= cfg.threshold || done >= segments.length || opts.length === 0) {
    opts.push({ id: 'adv', label: '▶ 差不多了，推进主线', goto: cfg.advance });
  }
  return opts;
}

/** 该 option 是否应当在界面上隐藏（once 且已触发）。 */
function isDone(state: GameState, o: HubOption): boolean {
  return o.once === true && state.hub[o.id] === true;
}

/**
 * 驱动剧本。就地修改 session.state / session.ip / session.history
 * （它们是可变工作副本），所有界面副作用经 Renderer 发生。
 *
 * **ip 语义**：指向「下一个待执行节点」。调用前 ip=0 表示从头开始；
 * 返回时 ip 停在终止节点之后（或剧本末尾）。
 */
export async function run(session: Session, env: GameEnv, r: Renderer): Promise<void> {
  const { script, labels, chars, beData, onNode, shouldStop } = env;

  while (session.ip < script.length) {
    if (shouldStop?.()) return;

    const node: FlatNode = script[session.ip]!;
    onNode?.(session.ip, node);
    session.ip++;

    switch (node.kind) {
      case 'label':
        break;

      case 'chapter':
        r.setChapter(node.title);
        break;

      case 'say': {
        session.history.push({ kind: 'say', who: node.who, text: node.text });
        await r.say(node.who, node.text);
        await delayFor(r, node.who === 'me' ? r.delays.me : r.delays.msg);
        break;
      }

      case 'sys': {
        session.history.push({ kind: 'sys', text: node.text });
        await r.sys(node.text);
        await delayFor(r, r.delays.sys);
        break;
      }

      case 'note': {
        session.history.push({ kind: 'note', text: node.text });
        await r.note(node.text);
        await delayFor(r, r.delays.note);
        break;
      }

      case 'card':
        await r.card(node.who);
        await delayFor(r, r.delays.card);
        break;

      case 'stage':
        r.stage(node.who);
        break;

      case 'bgm':
        r.bgm(node.track);
        break;

      case 'aff':
        settle(session, chars, r, { eff: node.eff });
        break;

      case 'stat':
        settle(session, chars, r, { stat: node.delta });
        break;

      case 'set':
        session.state = {
          ...session.state,
          flags: { ...session.state.flags, [node.flag]: true },
        };
        break;

      case 'goto':
        session.ip = resolveTarget(labels, node.label);
        break;

      case 'choice': {
        const idx = await r.askChoice(node.prompt, node.options);
        const opt = node.options[idx] ?? node.options[0]!;
        const spoken = opt.say ?? opt.label;

        // 纯动作型选项（文案是括号）：以旁白记入，不当作「我」发出的消息
        if (opt.act) {
          session.history.push({ kind: 'note', text: spoken });
          await r.note(spoken);
        } else {
          session.history.push({ kind: 'say', who: 'me', text: spoken });
          await r.say('me', spoken);
        }

        settle(session, chars, r, opt);
        session.ip = resolveTarget(labels, opt.goto);
        break;
      }

      case 'hub': {
        const available = node.options.filter(o => !isDone(session.state, o));
        if (available.length === 0) {
          throw new Error('hub 没有可用选项（全部 once 选项已触发且无兜底分支）');
        }

        const idx = await r.askHub(node.prompt, available);
        const opt = available[idx] ?? available[0]!;

        if (opt.once) {
          session.state = {
            ...session.state,
            hub: { ...session.state.hub, [opt.id]: true },
          };
        }
        settle(session, chars, r, opt);
        session.ip = resolveTarget(labels, opt.goto);
        break;
      }

      case 'loop': {
        const cfg = node.config;
        const turn = session.state.turn + 1;

        // 首轮：全员候选；锁定后：本命支线 + 随机事件 + 阈值推进
        const all = loopOptions(session.state, node);
        const available = all.filter(o => !isDone(session.state, o));
        if (available.length === 0) throw new Error('回合循环没有可用选项（支线与事件都已触发）');

        const prompt = session.state.target
          ? turnPrompt(session.state, cfg.prompt, cfg.threshold, cfg.arcs[session.state.target]?.length ?? 0)
          : `第 ${turn} 个晚上 · 群里 15 个人都值得深挖，先挑一个？`;

        session.state = { ...session.state, turn };

        const idx = await r.askHub(prompt, available);
        const opt = available[idx] ?? available[0]!;

        if (opt.id.startsWith('pick_')) {
          const cand = cfg.candidates.find(c => 'pick_' + c.key === opt.id);
          if (cand) {
            session.state = {
              ...session.state,
              target: cand.key,
              aff: { ...session.state.aff, [cand.key]: (session.state.aff[cand.key] ?? 0) + cfg.lockBonus },
            };
            const ch = chars[cand.key];
            r.toast(`已锁定攻略对象：${ch.emoji} ${ch.name}（羁绊 +${cfg.lockBonus}）`);
          }
        } else if (opt.once) {
          session.state = {
            ...session.state,
            hub: { ...session.state.hub, [opt.id]: true },
          };
        }

        settle(session, chars, r, opt);
        session.ip = resolveTarget(labels, opt.goto);
        break;
      }

      case 'branch': {
        const cfg = node.config;
        const airless = session.state.stats.q >= 3;
        if (airless) {
          await showBE(session, r, cfg.beWhenAirless);
          return;
        }
        const who = (session.state.target && cfg.routes[session.state.target])
          ? session.state.target
          : topHero(session.state, cfg.fallbackOrder);
        session.ip = resolveTarget(labels, cfg.routes[who]!);
        break;
      }

      case 'be': {
        if (!(node.id in beData)) {
          throw new Error(`Bad End 缺少文本：${node.id}`);
        }
        await showBE(session, r, node.id);
        return;
      }

      case 'ge': {
        session.state = unlockEnding(session.state, 'ge_' + node.key);
        await r.showEnding({ kind: 'route', key: node.key }, session);
        return;
      }
    }
  }
}

/** 顶栏提示：第 N 个晚上 · 攻略中：某某 ｜ 羁绊 x/阈值 ｜ 本命支线 a/b。 */
function turnPrompt(
  state: GameState,
  base: string,
  threshold: number,
  segments: number,
): string {
  const key = state.target!;
  const ch = CHARS[key];
  const bond = Math.min(state.aff[key] ?? 0, threshold);
  const done = Array.from({ length: segments }, (_, i) => state.hub['seg' + i + '_' + key])
    .filter(Boolean).length;
  return `${base}　｜　${ch.emoji} ${ch.name}　羁绊 ${bond}/${threshold}　本命支线 ${done}/${segments}　｜　第 ${state.turn} 个晚上`;
}

async function showBE(session: Session, r: Renderer, id: BeId): Promise<void> {
  session.state = unlockEnding(session.state, id);
  await r.showBE(id);
}

/** 资质浮层文案。抽出来是为了让 smoke 测试能直接断言。 */
export function statText(items: readonly { key: keyof typeof STAT_NAME; delta: number }[]): string {
  return items.map(i => `${STAT_NAME[i.key]} ${i.delta > 0 ? '+' : ''}${i.delta}`).join('　');
}