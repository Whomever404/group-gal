/* 回合循环配置 —— 第二章「群日常」的运营中枢。
   首轮：从全员支线里挑一个攻略对象；此后只出当前对象的支线 + 随机事件；
   羁绊攒到阈值即可推进主线。取代原先的一次性 hub。 */
import type { CharKey } from '../engine/types';

/** 羁绊阈值：达到即解锁「推进主线」。 */
export const THRESHOLD = 6;

/** 锁定对象时的一次性羁绊加成（选中即给，鼓励运营）。 */
export const LOCK_BONUS = 2;

/** 一轮里最多出现的随机事件数（1~2）。 */
export const EVENTS_PER_TURN = 2;

export interface Candidate {
  /** 攻略对象 */
  readonly key: CharKey;
  /** 首轮选项文案 */
  readonly label: string;
}

/** 首轮全员支线（每个可攻略角色恰好一条）。 */
export const CANDIDATES: readonly Candidate[] = [
  { key: 'nanao',   label: '👑 闹七：群主又在群里开团训人了' },
  { key: 'yu',      label: '🐟 一条鱼：说要教我玩机械动力' },
  { key: 'cat',     label: '🐱 黄油猫：在群里喊香骨鸡（15 块那种）' },
  { key: 'g',       label: '🅶 G：要去拼机，说可以捎我一个' },
  { key: 'shisuan', label: '🧄 石蒜：半夜发了一句「写完了」，然后没了下文' },
  { key: 'tttt',    label: '🎭 Tttt：正在给全群起外号' },
  { key: 'shei',    label: '🥚 誰：在公布她的群gal剧本进度' },
  { key: 'shiban',  label: '🐠 石斑鱼：在单曲循环一首歌' },
  { key: 'taffy',   label: '🧦 taffy：说这次一定教会我落地水' },
  { key: 'c30586',  label: '🍗 30586：第 20 届躲猫猫报名表' },
  { key: 'mianbao', label: '🥖 面包：连发二十张图，群里没人接' },
  { key: 'mibu',    label: '💊 咪猫布：让你陪她去趟校医院' },
  { key: 'linxi',   label: '📈 凛～～熙：又发了一整屏成绩图' },
  { key: 'gen',     label: '🧑‍🔧 根哥：实训死线还剩 6 小时' },
  { key: 'aka',     label: '📉 aka：在抢救渠道，快炸了' },
];

/** 每个对象的支线分两段：① 群日常段 ② 深夜私聊段。锁定后逐段解锁。 */
export const ARC_STEPS: Readonly<Record<string, readonly [string, string]>> = {
  nanao:   ['s_nao1',  'nanao_x1'],
  yu:      ['s_mc1',   'yu_x1'],
  cat:     ['s_food1', 'cat_x1'],
  g:       ['s_arc1',  'g_x1'],
  shisuan: ['s_chart1','shisuan_x1'],
  tttt:    ['s_tttt1', 'tttt_x1'],
  shei:    ['s_shei1', 'shei_x1'],
  shiban:  ['s_shiban1','shiban_x1'],
  taffy:   ['s_taffy1','taffy_x1'],
  c30586:  ['s_3051',  'c30586_x1'],
  mianbao: ['s_img1',  'mianbao_x1'],
  mibu:    ['s_mibu1', 'mibu_x1'],
  linxi:   ['s_linxi1','linxi_x1'],
  gen:     ['s_gen1',  'gen_x1'],
  aka:     ['s_aka1',  'aka_x1'],
};

/** 达成阈值 / 支线走完后的主线推进目标（第三章 · 躲猫猫之夜）。 */
export const LOOP_ADVANCE = 'e1';

export const ARC_SEG_N = 2;