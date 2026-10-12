import type { Node } from '../engine/types';

/** 取结局节点最后一句旁白，作为结局卡的摘要文案（与 v2 showEnd 一致）。 */
export function lastNarration(node: Node | undefined): string {
  const l = node?.l;
  if (!l) return '';
  for (let i = l.length - 1; i >= 0; i--) {
    if (l[i]![0] === null) return l[i]![1];
  }
  return '';
}