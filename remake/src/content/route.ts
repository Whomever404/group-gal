/* 分岔之夜的去向表与优先序。
 *
 * 分岔之夜（script.ts 的 night 节点）按两条规则选去向：
 *   1. 空気（资质 q）≥3 → 直接落坏结局 beWhenAirless（见 adapt.ts 的 BRANCH）；
 *   2. 否则走进「你锁定的那个人」；没锁定过就按 PRIORITY 取羁绊最高者。
 *
 * 现在所有角色都直接指向自己的好结局端子（__ge_<角色键>），也就是「没有第四章的剧情」。
 * 给某个角色写第四章时：新建节点（例如 r_nao1），把下面值改成那个节点 id，
 * 并让这条线以 __ge_nanao 收尾即可。
 */
import type { CharKey } from '../engine/types';

export const PRIORITY: readonly CharKey[] = [
  'nanao', 'yu', 'cat', 'g', 'shisuan', 'tttt', 'shei',
  'shiban', 'taffy', 'c30586', 'mianbao', 'mibu', 'linxi', 'gen', 'aka',
];

export const ROUTE_START: Record<string, string> = {
  nanao:   '__ge_nanao',
  yu:      '__ge_yu',
  cat:     '__ge_cat',
  g:       '__ge_g',
  shisuan: '__ge_shisuan',
  tttt:    '__ge_tttt',
  shei:    '__ge_shei',
  shiban:  '__ge_shiban',
  taffy:   '__ge_taffy',
  c30586:  '__ge_c30586',
  mianbao: '__ge_mianbao',
  mibu:    '__ge_mibu',
  linxi:   '__ge_linxi',
  gen:     '__ge_gen',
  aka:     '__ge_aka',
};