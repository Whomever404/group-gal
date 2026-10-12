import type { GameState, ReaderPref, StatKey } from './types';

export const SAVEKEY = 'xqxq_gal_v2';
export const PREFKEY = 'xqxq_gal_pref';

export function freshState(): GameState {
  return {
    id: 'start',
    a: {},
    s: { z: 0, r: 0, m: 0, q: 0, w: 0 },
    f: {},
    fxDone: {},
    hubDone: {},
    unlocked: [],
    cp: null,
    se: true,
    bgm: true,
    trk: 'title',
    target: null,
    turn: 0,
  };
}

export function save(s: GameState): void {
  try { localStorage.setItem(SAVEKEY, JSON.stringify(s)); } catch { /* 忽略隐私模式等写入失败 */ }
}

export function loadSave(): GameState | null {
  try {
    const x = localStorage.getItem(SAVEKEY);
    return x ? (JSON.parse(x) as GameState) : null;
  } catch { return null; }
}

export function loadPref(): ReaderPref {
  try { return Object.assign({ auto: false, spd: 0 }, JSON.parse(localStorage.getItem(PREFKEY) || '{}')); }
  catch { return { auto: false, spd: 0 }; }
}

export function savePref(p: ReaderPref): void {
  try { localStorage.setItem(PREFKEY, JSON.stringify(p)); } catch { /* 同上 */ }
}

export const STAT_KEYS: readonly StatKey[] = ['z', 'r', 'm', 'q', 'w'];