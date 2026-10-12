/* 回合循环配置 —— 夜晚运营机制（架构自带，不是剧情）。
 *
 * 机制：首轮从 15 名可攻略角色里挑一个锁定；之后每晚只出 TA 的本命支线 + 1~2 个随机事件；
 *      羁绊攒到阈值就能推进主线。改剧情时你只需要动下面的文案与槽位指向。
 */
import type { CharKey } from '../engine/types';

/** 羁绊阈值：达到即解锁「推进主线」。 */
export const THRESHOLD = 12;

/** 锁定对象时的一次性羁绊加成。 */
export const LOCK_BONUS = 2;

/** 一轮里最多出现的随机事件数（1~2）。 */
export const EVENTS_PER_TURN = 2;

export interface Candidate {
  /** 攻略对象 */
  readonly key: CharKey;
  /** 首轮选项文案 */
  readonly label: string;
}

/** 首轮全员支线：每个可攻略角色一条。文案与角色表（characters.ts）保持一致。 */
export const CANDIDATES: readonly Candidate[] = [
  { key: 'nanao',   label: '👑 闹七 ·【占位】今晚的第一步' },
  { key: 'yu',      label: '🐟 一条鱼 ·【占位】今晚的第一步' },
  { key: 'cat',     label: '🐱 黄油猫 ·【占位】今晚的第一步' },
  { key: 'g',       label: '🅶 G ·【占位】今晚的第一步' },
  { key: 'shisuan', label: '🧄 石蒜 ·【占位】今晚的第一步' },
  { key: 'tttt',    label: '🎭 Tttt ·【占位】今晚的第一步' },
  { key: 'shei',    label: '🥚 誰 ·【占位】今晚的第一步' },
  { key: 'shiban',  label: '🐠 石斑鱼 ·【占位】今晚的第一步' },
  { key: 'taffy',   label: '🧦 taffy ·【占位】今晚的第一步' },
  { key: 'c30586',  label: '🍗 30586 ·【占位】今晚的第一步' },
  { key: 'mianbao', label: '🥖 面包 ·【占位】今晚的第一步' },
  { key: 'mibu',    label: '💊 咪猫布 ·【占位】今晚的第一步' },
  { key: 'linxi',   label: '📈 凛～～熙 ·【占位】今晚的第一步' },
  { key: 'gen',     label: '🧑‍🔧 根哥 ·【占位】今晚的第一步' },
  { key: 'aka',     label: '📉 aka ·【占位】今晚的第一步' },
];

/**
 * 每个对象的支线分两段：① 群日常段 ② 深夜私聊段，锁定后逐段解锁。
 *
 * 现在全部指向同一个示例支线（arcs/demo.ts）。给某个角色单独写线时：
 *   新建 arcs/<角色键>.ts → 把下面那一行换成 ['<你的段1>', '<你的段2>']。
 */
export const ARC_STEPS: Readonly<Record<string, readonly [string, string]>> = {
  nanao:   ['demo_seg1', 'demo_seg2'],
  yu:      ['demo_seg1', 'demo_seg2'],
  cat:     ['demo_seg1', 'demo_seg2'],
  g:       ['demo_seg1', 'demo_seg2'],
  shisuan: ['demo_seg1', 'demo_seg2'],
  tttt:    ['demo_seg1', 'demo_seg2'],
  shei:    ['demo_seg1', 'demo_seg2'],
  shiban:  ['demo_seg1', 'demo_seg2'],
  taffy:   ['demo_seg1', 'demo_seg2'],
  c30586:  ['demo_seg1', 'demo_seg2'],
  mianbao: ['demo_seg1', 'demo_seg2'],
  mibu:    ['demo_seg1', 'demo_seg2'],
  linxi:   ['demo_seg1', 'demo_seg2'],
  gen:     ['demo_seg1', 'demo_seg2'],
  aka:     ['demo_seg1', 'demo_seg2'],
};

/** 达成阈值 / 支线走完后的主线推进目标（分岔之夜的入口）。 */
export const LOOP_ADVANCE = 'night';

/** 每条支线的段数。 */
export const ARC_SEG_N = 2;