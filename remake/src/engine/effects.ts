import type {
  AffDelta, AffToastItem, CharTable, GameState, Session, SessionProgress,
} from './types';

export const SCHEMA_VERSION = 1;

export interface ApplyEffResult {
  readonly state: GameState;
  readonly toasts: readonly AffToastItem[];
}

export type StageName = '无视' | '眼熟' | '嘴替' | '宝宝' | '沦陷';

/**
 * 全部角色键的显式初值。之所以不写成 `{} as Record<CharKey, number>`：
 * 那是个类型谎言（Record 要求全部键），而且会让每个消费方都得写 `?? 0`。
 * 显式列出后 TS 会强制完整性检查——新增角色忘了加，编译期就报错。
 *
 * 非可攻略角色（gen/aka/moku）恒为 0：applyEff 按 `hero` 拒绝改动它们。
 */
export function createInitialState(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    aff: {
      nanao: 0, yu: 0, cat: 0, g: 0, shisuan: 0, tttt: 0, shei: 0,
      shiban: 0, taffy: 0, c30586: 0, mianbao: 0,
      gen: 0, aka: 0, moku: 0,
    },
    flags: {},
    water: 0,
    members: 81,
    hub: {},
    lastRepeat: '',
    repeatN: 0,
  };
}

/** 空进度。新开一局、以及从 v1 老存档迁移时都用它。 */
export function createInitialProgress(): SessionProgress {
  return { visited: {}, checkpoints: {}, historyLens: {} };
}

/**
 * 结算一次好感度变化。纯函数，返回新状态。
 *
 * 与重构前 **行为完全一致**：
 * - 非 hero 角色的键被忽略
 * - 数值下限 0（Math.max）
 * - 浮层报告的是**原始 delta**，不是实际增量。因此好感度为 0 时
 *   收到 eff:-1，仍会弹出「💔 -1」而数值不变——这是现状行为，
 *   属于提示不准的小瑕疵，**本阶段刻意保留**以维持等价性。
 *   （修正它属于行为变更，留待阶段 3 一并处理。）
 */
export function applyEff(
  state: GameState,
  eff: AffDelta | undefined,
  chars: CharTable,
): ApplyEffResult {
  if (!eff) return { state, toasts: [] };

  const toasts: AffToastItem[] = [];
  const aff = { ...state.aff };
  let changed = false;

  for (const [k, delta] of Object.entries(eff) as [keyof CharTable, number][]) {
    const c = chars[k];
    if (!c || !c.hero || delta === undefined || delta === 0) continue;

    aff[k] = Math.max(0, (aff[k] ?? 0) + delta);
    toasts.push({ who: k, delta });
    changed = true;
  }

  return changed ? { state: { ...state, aff }, toasts } : { state, toasts: [] };
}

/** 与重构前一致。 */
export function stageOf(aff: number): StageName {
  if (aff <= 0) return '无视';
  if (aff <= 2) return '眼熟';
  if (aff <= 4) return '嘴替';
  if (aff <= 6) return '宝宝';
  return '沦陷';
}

export type RepeatOutcome = 'ok' | 'warn' | 'banned' | 'empty';

export interface RepeatResult {
  readonly outcome: RepeatOutcome;
  /** 被复读的文本；outcome 为 'empty' 时缺省 */
  readonly spoken?: string;
}

/**
 * 复读：把群里的最后一条他人消息原样再发一次，水群值 +1。
 *
 * 与重构前行为一致：
 *   第 1 次 → ok（水群值 +1）
 *   连续第 2 次 → warn（提示将被禁言）
 *   连续第 3 次 → banned（调用方据此触发 BE24）
 * 差别在于现状从 DOM 反查最后一条消息，这里改为读 history——
 * 于是「连续性」这条规则第一次可以被测试钉住。
 *
 * ⚠️ **就地推进传入的 session**，与 runner 的约定一致（session 是可变工作副本）。
 * 这一点是硬要求：main.ts 与 run() 共享同一个对象引用，任何「返回新对象」的写法
 * 都会让两侧永久分叉——复读读到冻结的历史、成员抽屉与结局面板显示过期数值。
 */
export function applyRepeat(session: Session): RepeatResult {
  const last = [...session.history].reverse().find(e => e.kind === 'say' && e.who !== 'me');
  if (!last || last.kind !== 'say') return { outcome: 'empty' };

  const s = session.state;
  const repeatN = s.lastRepeat === last.text ? s.repeatN + 1 : 1;
  const outcome: RepeatOutcome = repeatN >= 3 ? 'banned' : repeatN === 2 ? 'warn' : 'ok';

  session.state = { ...s, lastRepeat: last.text, repeatN, water: s.water + 1 };
  session.history.push({ kind: 'say', who: 'me', text: last.text });

  return { outcome, spoken: last.text };
}
