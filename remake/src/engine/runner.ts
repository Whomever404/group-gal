import type {
  BadEndData, BeId, CharTable, LabelIndex, Node, Renderer, Script, Session,
} from './types';
import { applyEff } from './effects';
import { resolveEnding } from './ending';

/** 与现状 原版单文件的计时默认值一致。 */
export const DEFAULT_DELAYS = {
  me: 280, msg: 520, sys: 560, note: 680, card: 760, fast: false,
} as const;

export interface GameEnv {
  readonly script: Script;
  readonly labels: LabelIndex;
  readonly chars: CharTable;
  readonly beData: Readonly<Record<BeId, BadEndData>>;
  /**
   * 每个节点**执行前**的回调，参数是该节点自身的下标。
   *
   * 时机很关键：`run` 是先回调再 `session.ip++`，所以回调里读到的
   * `session.ip` 正指向这个节点。自动存档靠它在选择点存下指针——
   * 若改到节点执行之后再回调，读档会跳过那个选择（Review Focus #2）。
   */
  readonly onNode?: (ip: number, node: Node) => void;
  /**
   * 每个节点开始前询问「是否应当中止」。返回 true 则 `run` 立即返回。
   *
   * 用于读档：载入新存档时必须作废仍在跑的那个 `run`，否则它会在
   * 延迟结束后继续就地修改同一个 `Session`，与新的 `run` 打架。
   */
  readonly shouldStop?: () => boolean;
}

/** 快进时的等待上限（现状是 Math.min(ms, 60)）。 */
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

/**
 * 驱动剧本。就地修改 session.state / session.ip / session.history
 * （它们是可变工作副本），所有界面副作用经 Renderer 发生。
 *
 * **ip 语义**：指向「下一个待执行节点」。调用前 ip=0 表示从头开始；
 * 返回时 ip 停在终止节点之后（或剧本末尾）。
 *
 * 与现状 play() (:769-788) 的差别：
 * - 未知 label **抛错**，不再静默跳到结局（现状 goLabel 的 fallback）
 * - hub 的 once 过滤上移到引擎，渲染器只拿到可用选项
 */
export async function run(session: Session, env: GameEnv, r: Renderer): Promise<void> {
  const { script, labels, chars, beData, onNode, shouldStop } = env;

  while (session.ip < script.length) {
    if (shouldStop?.()) return;

    const node: Node = script[session.ip]!;
    onNode?.(session.ip, node);
    session.ip++;

    switch (node.kind) {
      case 'label':
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

      case 'bgm':
        r.bgm(node.track);
        break;

      case 'aff': {
        const { state, toasts } = applyEff(session.state, node.eff, chars);
        session.state = state;
        if (toasts.length > 0) r.affToast(toasts);
        break;
      }

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

        session.history.push({ kind: 'say', who: 'me', text: spoken });
        await r.say('me', spoken);

        if (opt.set) {
          session.state = {
            ...session.state,
            flags: { ...session.state.flags, [opt.set]: true },
          };
        }
        if (opt.eff) {
          const { state, toasts } = applyEff(session.state, opt.eff, chars);
          session.state = state;
          if (toasts.length > 0) r.affToast(toasts);
        }

        session.ip = resolveTarget(labels, opt.goto);
        break;
      }

      case 'hub': {
        const available = node.options.filter(o => !(o.once && session.state.hub[o.id]));
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
        if (opt.set) {
          session.state = {
            ...session.state,
            flags: { ...session.state.flags, [opt.set]: true },
          };
        }
        if (opt.eff) {
          const { state, toasts } = applyEff(session.state, opt.eff, chars);
          session.state = state;
          if (toasts.length > 0) r.affToast(toasts);
        }

        session.ip = resolveTarget(labels, opt.goto);
        break;
      }

      case 'be': {
        if (!(node.id in beData)) {
          throw new Error(`Bad End 缺少文本：${node.id}`);
        }
        await r.showBE(node.id);
        return;
      }

      case 'ending':
        await r.showEnding(resolveEnding(session), session);
        return;
    }
  }
}
