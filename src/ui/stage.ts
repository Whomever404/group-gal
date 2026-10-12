import type { ReaderPref } from '../engine/types';
import { PREFKEY } from '../engine/state';

/** 三档文字速度：打字间隔、标点停顿、自动播放的句末停留。 */
export const SPEEDS: readonly {
  n: string; type: number; punc: number; autoWait: (len: number) => number;
}[] = [
  { n: '慢', type: 42, punc: 120, autoWait: len => 950 + len * 62 },
  { n: '普', type: 26, punc: 72, autoWait: len => 680 + len * 40 },
  { n: '快', type: 13, punc: 34, autoWait: len => 460 + len * 24 },
];

export function loadPref(): ReaderPref {
  try {
    return Object.assign({ auto: false, spd: 0 }, JSON.parse(localStorage.getItem(PREFKEY) || '{}'));
  } catch {
    return { auto: false, spd: 0 };
  }
}

export function savePref(p: ReaderPref): void {
  try { localStorage.setItem(PREFKEY, JSON.stringify(p)); } catch { /* 隐私模式写入失败可忽略 */ }
}