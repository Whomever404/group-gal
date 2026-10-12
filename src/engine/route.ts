import type { CharKey, GameState } from './types';
import { PRIORITY, ROUTE_START } from '../content/route';
import { CH } from '../content/characters';
import { save } from './state';

/**
 * 分岔之夜：返回羁绊最高的角色 key（平票按 PRIORITY 顺序，靠前者胜）。
 * 注意：必须返回角色 key —— 早期缺陷是返回了路线节点 id，导致渲染分岔时 CH[...] 为 undefined 而崩溃。
 */
export function pickRoute(s: GameState): CharKey {
  if (!s.cp) { s.cp = JSON.stringify(s); save(s); }
  let best: CharKey = PRIORITY[0];
  let bv = -999;
  PRIORITY.forEach((k) => {
    const v = s.a[k] || 0;
    if (v > bv) { bv = v; best = k; }
  });
  s.lastRoute = best;
  save(s);
  return best;
}

export function routeStartOf(k: CharKey): string {
  return ROUTE_START[k];
}

export function pickRouteLabel(k: string): string {
  const ch = CH[k as CharKey] || { e: '❔', n: k };
  return '▶ 点开 TA 的私信 —— ' + ch.e + ' ' + ch.n;
}