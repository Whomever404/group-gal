import type {
  CharKey, FlagKey, GameState, LogEntry, Session, SessionProgress, Speaker, StatKey,
} from './types';
import { CHARS } from '../content/characters';
import { SCHEMA_VERSION, STAT_KEYS, createInitialProgress, createInitialState } from './effects';
import { toCheckpoint } from './route-map';

/**
 * 存档的序列化与**防御性**反序列化。
 *
 * 存档来自 localStorage —— 那是用户可随手编辑的地方，因此反序列化面对的是
 * **不可信输入**。本模块的契约：**任何畸形输入一律返回 null，绝不抛错、绝不污染原型**。
 * 游戏在任何情况下都不应因为一个坏存档而白屏。
 */

/** 3 起新增 stats / target / turn / unlocked（回合循环与资质）。更早的存档经迁移补齐。 */
export const SAVE_VERSION = 3;
const V1 = 1;
const V2 = 2;

const CHAR_KEYS = Object.keys(CHARS) as CharKey[];
const FLAG_KEYS: readonly string[] = ['sheiTrap', 'mokuJoin', 'actGood', 'actSkip'];

/** 原型污染护栏：这些键一律拒绝。 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function serializeSession(s: Session): string {
  return JSON.stringify({
    v: SAVE_VERSION, ip: s.ip, state: s.state, history: s.history, progress: s.progress,
  });
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonNegInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function parseHistory(raw: unknown): LogEntry[] | null {
  if (!Array.isArray(raw)) return null;

  const out: LogEntry[] = [];
  for (const e of raw) {
    if (!isObj(e)) return null;

    if (e.kind === 'say') {
      if (typeof e.text !== 'string') return null;
      const who = e.who;
      if (who !== 'me' && (typeof who !== 'string' || !CHAR_KEYS.includes(who as CharKey))) return null;
      out.push({ kind: 'say', who: who as Speaker, text: e.text });
    } else if (e.kind === 'sys' || e.kind === 'note') {
      if (typeof e.text !== 'string') return null;
      out.push({ kind: e.kind, text: e.text });
    } else {
      return null;
    }
  }
  return out;
}

function parseState(raw: unknown): GameState | null {
  if (!isObj(raw)) return null;

  // aff：必须含全部角色键，值为有限非负数
  if (!isObj(raw.aff)) return null;
  const aff = {} as Record<CharKey, number>;
  for (const k of CHAR_KEYS) {
    const v = raw.aff[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
    aff[k] = v;
  }

  // 资质：z/r/m/q/w，值为有限非负数（v2 及更早的存档没有它，由 migrateState 补零）
  if (!isObj(raw.stats)) return null;
  const stats = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    const v = raw.stats[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
    stats[k] = v;
  }

  // flags：只认已知标记，值必须是布尔
  if (!isObj(raw.flags)) return null;
  const flags: Partial<Record<FlagKey, boolean>> = {};
  for (const [k, v] of Object.entries(raw.flags)) {
    if (FORBIDDEN_KEYS.has(k) || !FLAG_KEYS.includes(k) || typeof v !== 'boolean') return null;
    flags[k as FlagKey] = v;
  }

  // hub：键是剧本里的选项 id，值必须是布尔
  if (!isObj(raw.hub)) return null;
  const hub: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw.hub)) {
    if (FORBIDDEN_KEYS.has(k) || typeof v !== 'boolean') return null;
    hub[k] = v;
  }

  // 已回收结局：BE key / ge_<key>
  if (!Array.isArray(raw.unlocked)) return null;
  const unlocked: string[] = [];
  for (const k of raw.unlocked) {
    if (typeof k !== 'string' || FORBIDDEN_KEYS.has(k)) return null;
    unlocked.push(k);
  }

  if (!isNonNegInt(raw.water)) return null;
  if (!isNonNegInt(raw.members)) return null;
  if (!isNonNegInt(raw.repeatN)) return null;
  if (!isNonNegInt(raw.turn)) return null;
  if (typeof raw.lastRepeat !== 'string') return null;

  const target = raw.target;
  if (target !== null && (typeof target !== 'string' || !CHAR_KEYS.includes(target as CharKey))) return null;

  return {
    schemaVersion: isNonNegInt(raw.schemaVersion) ? raw.schemaVersion : SCHEMA_VERSION,
    aff,
    stats,
    flags,
    water: raw.water,
    members: raw.members,
    hub,
    lastRepeat: raw.lastRepeat,
    repeatN: raw.repeatN,
    target: target as CharKey | null,
    turn: raw.turn,
    unlocked,
  };
}

/** 路线图进度。三个字段都必须是「键为 label 的纯对象」，一处畸形即整份存档拒绝。 */
function parseProgress(raw: unknown): SessionProgress | null {
  if (!isObj(raw)) return null;

  // visited：值必须是 true
  if (!isObj(raw.visited)) return null;
  const visited: Record<string, true> = {};
  for (const [k, v] of Object.entries(raw.visited)) {
    if (FORBIDDEN_KEYS.has(k) || v !== true) return null;
    visited[k] = true;
  }

  // checkpoints：复用 parseState 做快照校验，再剥掉 schemaVersion
  if (!isObj(raw.checkpoints)) return null;
  const checkpoints: SessionProgress['checkpoints'] = {};
  for (const [k, v] of Object.entries(raw.checkpoints)) {
    if (FORBIDDEN_KEYS.has(k)) return null;
    const st = parseState(v);
    if (!st) return null;
    checkpoints[k] = toCheckpoint(st);
  }

  // historyLens：非负整数
  if (!isObj(raw.historyLens)) return null;
  const historyLens: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw.historyLens)) {
    if (FORBIDDEN_KEYS.has(k) || !isNonNegInt(v)) return null;
    historyLens[k] = v;
  }

  return { visited, checkpoints, historyLens };
}

/**
 * 把不可信输入收窄成 Session。
 * @param scriptLength 剧本节点总数——`ip` 必须落在 [0, scriptLength] 内
 * @returns 合法则返回 Session，任何畸形一律 null
 */
export function deserializeSession(raw: unknown, scriptLength: number): Session | null {
  if (!isObj(raw)) return null;
  if (raw.v !== SAVE_VERSION) return null;
  if (!isNonNegInt(raw.ip) || raw.ip > scriptLength) return null;

  const state = parseState(raw.state);
  if (!state) return null;

  const history = parseHistory(raw.history);
  if (!history) return null;

  const progress = parseProgress(raw.progress);
  if (!progress) return null;

  return { state, ip: raw.ip, history, progress };
}

/** 老存档的状态补齐：缺哪个字段就按新局的初值补。 */
function upgradeState(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  const init = createInitialState();
  return {
    ...raw,
    stats: isObj(raw.stats) ? raw.stats : init.stats,
    target: 'target' in raw ? raw.target : init.target,
    turn: isNonNegInt(raw.turn) ? raw.turn : init.turn,
    unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : init.unlocked,
  };
}

/**
 * 版本迁移入口。逐级把老存档升级到当前版本再交给 deserializeSession。
 *
 * - 无 `v` 的裸会话对象 / v1：补空 progress 与默认资质、回合字段后升到当前版本
 * - v2：补 stats / target / turn / unlocked 后升级
 * - 其它 / 来自未来的版本：一律拒绝（宁可读不出，也不要按旧规则误读新数据）
 */
export function migrateSave(raw: unknown, scriptLength: number): Session | null {
  if (!isObj(raw)) return null;

  if (!('v' in raw) || raw.v === V1 || raw.v === V2) {
    return deserializeSession({
      ...raw,
      v: SAVE_VERSION,
      state: upgradeState(raw.state),
      progress: isObj(raw.progress) ? raw.progress : createInitialProgress(),
    }, scriptLength);
  }

  if (raw.v !== SAVE_VERSION) return null;
  return deserializeSession(raw, scriptLength);
}
