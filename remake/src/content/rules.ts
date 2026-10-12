/* 群规类数值 —— 与剧情无关的机制开关，但文案要落在你自己的结局上。
 *
 * 复读：同一句话连续刷 3 次会被禁言（判定写在 engine/effects.ts 的 applyRepeat）。
 * 这里的 REPEAT_BE 决定「被禁言」时播哪个坏结局，请确保 id 在 endings.ts 的 BEDATA 里存在。
 */
export const REPEAT_BE = 'b_spam';

/** 分岔之夜：空気（资质 q）≥3 时落的坏结局。 */
export const AIRLESS_BE = 'b_airless';