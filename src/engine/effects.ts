import type { GameState, Fx, StatKey } from './types';

/** 结算一次 fx 加成（就地修改 state），返回此次发生变化的资质键。 */
export function applyFx(s: GameState, fx?: Fx | null): StatKey[] {
  const changed: StatKey[] = [];
  if (!fx) return changed;
  if (fx.a) for (const k in fx.a) s.a[k] = (s.a[k] || 0) + fx.a[k];
  if (fx.s) {
    for (const k in fx.s) {
      const key = k as StatKey;
      s.s[key] = (s.s[key] || 0) + (fx.s[key] as number);
      changed.push(key);
    }
  }
  if (fx.f) s.f[fx.f] = true;
  return changed;
}

/** 羁绊阶段：无视 → 眼熟 → 嘴替 → 宝宝 → 沦陷。 */
export function stageOf(a: number): string {
  return a <= 0 ? '无视' : a <= 2 ? '眼熟' : a <= 4 ? '嘴替' : a <= 6 ? '宝宝' : '沦陷';
}