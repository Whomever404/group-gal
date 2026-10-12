/* 内容索引：把 DSL 剧本、扁平剧本、角色与结局文案收在一处。
 *
 * main.ts / 校验器 / 无头测试都从这里取内容——只有这一处知道
 * 「剧本怎么拼起来」，因此不存在两处拼接顺序漂移的可能。
 */
import type { CharKey, FlatNode, FlatScript, LabelIndex, RouteEndingData } from '../engine/types';
import { buildLabelIndex } from '../engine/validate';
import { buildFlat } from './adapt';
import { NODES } from './script';
import { CHARS, HERO_KEYS } from './characters';
import { GE_SLOTS } from './endings';

/** 扁平剧本（执行格式）。顺序即执行顺序——label 存的是绝对下标。 */
export const SCRIPT: FlatScript = buildFlat(NODES);

/** 复用校验器里的同一实现，避免两处索引逻辑漂移。 */
export const LABELS: LabelIndex = buildLabelIndex(SCRIPT);

/** 某个 label 名下的节点区间：从该 label 起，到下一个 label 或剧本末尾。 */
function segmentOf(label: string): readonly FlatNode[] {
  const from = LABELS[label];
  if (from === undefined) return [];
  const out: FlatNode[] = [];
  for (let i = from + 1; i < SCRIPT.length; i++) {
    const n = SCRIPT[i]!;
    if (n.kind === 'label') break;
    out.push(n);
  }
  return out;
}

/**
 * 15 条角色线结局。标题与正文直接取自 `ge_<key>` 场景节点——
 * 也就是玩家在游戏里真正读到的那段收尾，因此不存在「结局卡与正文不一致」。
 */
export const ROUTE_ENDINGS: Readonly<Record<CharKey, RouteEndingData>> = Object.fromEntries(
  GE_SLOTS.map(key => {
    const seg = segmentOf('ge_' + key);
    const title = seg.find(n => n.kind === 'chapter')?.title;
    const text = seg.filter(n => n.kind === 'note').map(n => n.text).join('\n');
    return [key, {
      title: title ?? `${CHARS[key].name} 线 · GOOD END`,
      text: text || '（这条线的收尾没有旁白。）',
    }];
  }),
) as Record<CharKey, RouteEndingData>;

export { CHARS, HERO_KEYS, GE_SLOTS };