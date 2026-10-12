/* DSL → 扁平剧本适配器。
 *
 * 这是剧本从「书写格式」（命名节点表，见 engine/types.ts 的 DslNode）到
 * 「执行格式」（指令表，见 FlatNode）的**唯一转换点**。引擎只认扁平表。
 *
 * 转换规则：
 * - 每个 DSL 节点 → 一串扁平节点（章节 / BGM / 立绘先导，内容行，选项，跳转）
 * - 节点自带 fx → 紧跟 label 的 `aff` / `stat` 节点（只结算一次）
 * - chat/avg 行 → say / sys / note；avg 的 `c` → stage（舞台立绘，每个节点先重置）
 * - 选项 fx → 选项上的 eff / stat；纯动作型选项（文案是括号）→ act，不当作发言
 * - `j:'branch'` / `loop:true` → branch / loop 节点
 * - `__end_*` / `__ge_*` 目标 → 末尾统一生成 be / ge 端子节点
 *
 * ⚠️ 顺序即执行顺序——label 存的是绝对下标。调整节点顺序后跑
 * `npm run check:script` 确认可达性。
 */
import type {
  BeId, CharKey, ChoiceOption, DslChoice, DslNode, FlatNode, FlatScript, LoopConfig, Script,
  Speaker, StatDelta, TrackName,
} from '../engine/types';
import { EVENTS } from './events';
import { ARC_STEPS, CANDIDATES, LOOP_ADVANCE, EVENTS_PER_TURN, LOCK_BONUS, THRESHOLD } from './loop';
import { PRIORITY, ROUTE_START } from './route';
import { CHARS } from './characters';

/** bgm 短名 → TrackName。 */
const TRACK: Readonly<Record<string, TrackName>> = {
  daily: 'chat', night: 'night', tense: 'tension', end: 'warm',
};

/** 解析 DSL fx → 扁平选项的 eff / stat。 */
function toFx(
  fx: DslNode['fx'] | DslChoice[2],
): { eff?: ChoiceOption['eff']; stat?: StatDelta } | null {
  if (!fx) return null;
  const out: { eff?: ChoiceOption['eff']; stat?: StatDelta } = {};
  if (fx.a) out.eff = { ...fx.a } as ChoiceOption['eff'];
  if (fx.s) out.stat = fx.s;
  return Object.keys(out).length > 0 ? out : null;
}

/** 目标换算：`__end_*` / `__ge_*` → 扁平表末尾的端子 label。 */
function targetLabel(t: string): string {
  if (t.startsWith('__end_')) return '@be:' + t.slice(6);
  if (t.startsWith('__ge_')) return '@ge:' + t.slice(5);
  return t;
}

/** 纯动作型选项：文案整体被括号包住，例如「（先不说话……）」。 */
const isAct = (label: string): boolean => /^（.*）$/.test(label);

/** DSL 里的说话人 → 扁平剧本的说话人（'you' 是玩家自己的化名）。 */
function speakerOf(who: string): Speaker {
  return who === 'you' ? 'me' : (who as CharKey);
}

/** DSL 节点 → 扁平节点序列。 */
function adaptNode(id: string, n: DslNode): FlatNode[] {
  const out: FlatNode[] = [{ kind: 'label', name: id }];

  if (n.d) out.push({ kind: 'chapter', title: n.d });
  if (n.bgm) out.push({ kind: 'bgm', track: TRACK[n.bgm] ?? 'chat' });

  if (n.fx) {
    const fx = toFx(n.fx);
    if (fx?.eff) out.push({ kind: 'aff', eff: fx.eff });
    if (fx?.stat) out.push({ kind: 'stat', delta: fx.stat });
  }

  if (n.m === 'avg') {
    // 立绘：每个节点先重置舞台，再按 c 立起来
    out.push({ kind: 'stage', who: n.c && n.c !== 'you' ? (n.c as CharKey) : null });
    for (const [who, text] of n.l ?? []) {
      if (who === '#') out.push({ kind: 'sys', text });
      else if (who === null) out.push({ kind: 'note', text });
      else out.push({ kind: 'say', who: speakerOf(who), text });
    }
  } else {
    out.push({ kind: 'stage', who: null });
    for (const [who, text] of n.b ?? []) {
      if (who === '#') out.push({ kind: 'sys', text });
      else out.push({ kind: 'say', who: speakerOf(who), text });
    }
  }

  if (n.j === 'branch') {
    out.push({ kind: 'branch', config: BRANCH });
  } else if (n.loop) {
    out.push({ kind: 'loop', config: LOOP });
  } else if (n.o && n.o.length > 0) {
    const options: ChoiceOption[] = n.o.map(o => {
      const fx = toFx(o[2]);
      return {
        label: o[0],
        goto: targetLabel(o[1]),
        ...(fx?.eff ? { eff: fx.eff } : {}),
        ...(fx?.stat ? { stat: fx.stat } : {}),
        ...(isAct(o[0]) ? { act: true } : {}),
      };
    });
    out.push({ kind: 'choice', prompt: '说点什么', options });
  } else if (n.next) {
    out.push({ kind: 'goto', label: targetLabel(n.next) });
  }

  return out;
}

/** 回合循环中枢配置（数据来自 content/loop.ts 与 content/events.ts）。 */
export const LOOP: LoopConfig = {
  prompt: '今晚去哪边混？',
  candidates: CANDIDATES.map(c => ({ key: c.key, label: c.label, entry: ARC_STEPS[c.key]![0] })),
  arcs: Object.fromEntries(
    Object.entries(ARC_STEPS).map(([key, steps]) => [
      key,
      steps.map((entry, i) => ({
        entry,
        label: i === 0
          ? `【本命支线】${CHARS[key as CharKey].name}：再走近一点`
          : `【深夜私聊】${CHARS[key as CharKey].name}：把没说完的话说完`,
      })),
    ]),
  ),
  events: EVENTS.map(e => ({
    id: e.id,
    label: (e.kind === 'risk' ? '🎲 [风险] ' : '🎲 ') + e.label,
    entry: e.entry,
    risk: e.kind === 'risk',
  })),
  threshold: THRESHOLD,
  lockBonus: LOCK_BONUS,
  eventsPerTurn: EVENTS_PER_TURN,
  advance: LOOP_ADVANCE,
};

/** 分岔之夜配置（数据来自 content/route.ts）。 */
export const BRANCH: Extract<FlatNode, { kind: 'branch' }>['config'] = {
  prompt: '第四章 · 分岔',
  routes: ROUTE_START,
  beWhenAirless: 'b81',
  fallbackOrder: PRIORITY,
};

/** 收集剧本里出现过的结局端子。 */
function collectTerminals(script: Script): Map<string, FlatNode> {
  const terminals = new Map<string, FlatNode>();

  const add = (t: string): void => {
    if (t.startsWith('__end_')) terminals.set('@be:' + t.slice(6), { kind: 'be', id: t.slice(6) as BeId });
    else if (t.startsWith('__ge_')) terminals.set('@ge:' + t.slice(5), { kind: 'ge', key: t.slice(5) as CharKey });
  };

  for (const n of Object.values(script)) {
    if (n.o) for (const o of n.o) add(o[1]);
    if (n.next) add(n.next);
  }
  return terminals;
}

/**
 * 展平整份剧本：逐节点转换，再把结局端子按 label + 端子节点的形式追加在末尾。
 * 端子放在末尾而不是内联，是为了让「剧本数据」与「机械生成的端子」在结构上分开。
 */
export function buildFlat(script: Script): FlatScript {
  const out: FlatNode[] = [];
  for (const [id, n] of Object.entries(script)) out.push(...adaptNode(id, n));

  const terminals = collectTerminals(script);
  for (const [label, node] of terminals) {
    out.push({ kind: 'label', name: label }, node);
  }
  return out;
}