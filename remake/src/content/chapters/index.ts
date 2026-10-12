import type { Script } from '../../engine/types';
import { buildLabelIndex } from '../../engine/validate';
import { PROLOGUE } from './prologue';
import { CH1 } from './ch1';
import { HUB } from './hub';
import { CH3 } from './ch3';

/**
 * 全剧本。
 *
 * ⚠️ **顺序即执行顺序**——label 存的是绝对下标，因此调整拼接顺序
 * 会改变跳转行为。若确需调整，跑 `npm run check:script` 确认无误。
 */
export const SCRIPT: Script = [...PROLOGUE, ...CH1, ...HUB, ...CH3];

/** 复用校验器里的同一实现，避免两处索引逻辑漂移。 */
export const LABELS = buildLabelIndex(SCRIPT);
