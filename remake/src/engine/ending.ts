import type { CharKey, EndingResolution, Session } from './types';
import { HERO_KEYS, MAIN_KEYS } from '../content/characters';

/**
 * 结局判定。纯函数。
 *
 * 与重构前 **行为完全一致**：
 *   1. 放过鸽子(actSkip) 且 总好感 ≤6 → BE10「我很伤心」
 *   2. 总好感 ≤4 → BE23「第 81 人」
 *   3. 否则取 MAIN_KEYS 中好感最高者；并列取靠前者
 *
 * 注意判定顺序：actSkip 分支优先于总分阈值分支。
 */
export function resolveEnding(session: Session): EndingResolution {
  const { aff, flags } = session.state;
  const total = HERO_KEYS.reduce((sum, k) => sum + (aff[k] ?? 0), 0);

  if (flags.actSkip && total <= 6) return { kind: 'be', id: 'BE10' };
  if (total <= 4) return { kind: 'be', id: 'BE23' };

  let top: CharKey = MAIN_KEYS[0]!;
  for (const k of MAIN_KEYS) {
    if ((aff[k] ?? 0) > (aff[top] ?? 0)) top = k;
  }
  return { kind: 'route', key: top };
}
