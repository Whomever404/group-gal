import type { CharKey, CharTable } from '../engine/types';

/**
 * 14 个角色。搬运自原版单文件，**文案一字未改**。
 * 唯一变化：外层对象键提升为 CharTable 的键类型；gen/aka/moku 补上 hero:false
 * （源文件里它们没有 hero 字段，即非可攻略）。
 */
export const CHARS: CharTable = {
  nanao: {
    name: '闹七', sub: 'null7323 · 群主', emoji: '👑', color: '#ff6ec7', role: '傲娇暴君',
    desc: '😂群聊的群主，自己开着 MC / 帕鲁服务器，还是 Arcaea 知名谱师、写谱高手。嘴硬心软，护短——嘴上天天喊解散群，真踢起人来一次也没舍得。',
    hero: true, shape: 'crown',
  },
  yu: {
    name: '一条鱼', sub: '别问她为什么叫鱼', emoji: '🐟', color: '#5ce1e6', role: '天然呆',
    desc: '这个群最单纯的人，MC 机械动力工程师。平时话不多，一聊红石就停不下来。',
    hero: true, shape: 'fish',
  },
  cat: {
    name: '黄油猫', sub: '不是那个号', emoji: '🐱', color: '#ffd76e', role: '守门猫',
    desc: '一条鱼的恋人，医学系学姐。嘴上段子最多，心最软、最护短。谁欺负一条鱼她跟谁急。',
    hero: true, shape: 'cat',
  },
  g: {
    name: 'G', sub: 'Lriltu', emoji: '🅶', color: '#a06bff', role: '矛盾系大佬',
    desc: '舞萌 / 写谱大佬，管理员，反骨，最爱嘴上杠群主。技术优越感和自卑来回横跳。',
    hero: true, shape: 'star',
  },
  shisuan: {
    name: '石蒜', sub: '我的父亲是根哥', emoji: '🧄', color: '#8be08b', role: '孤岛写谱人',
    desc: '中二、自黑、写谱狂魔。他说：我的社交渠道，几乎全在这个群里了。',
    hero: true, shape: 'garlic',
  },
  tttt: {
    name: 'Tttt', sub: '起外号专家', emoji: '🎭', color: '#ff9f6e', role: '梗王 · 管理员',
    desc: '起外号一绝，阴阳怪气但心软。名言：面包是我的。',
    hero: true, shape: 'mask',
  },
  shei: {
    name: '誰', sub: '就是蛋蛋', emoji: '🥚', color: '#cfcfe8', role: 'meta 攻略宅',
    desc: '情绪化、AI token 依赖，正在把整个群当成 galgame 攻略。',
    hero: true, shape: 'egg',
  },
  shiban: {
    name: '石斑鱼', sub: '🪨🦓🐟', emoji: '🐠', color: '#7fe0c0', role: '猎团',
    desc: '怪猎党，卖弱与阴阳并存。名言：我菜到神他妈牛逼了。',
    hero: true, shape: 'fin',
  },
  taffy: {
    name: 'taffy', sub: '石蒜神是我爸爸', emoji: '🧦', color: '#ffb3d9', role: '落地水',
    desc: 'MC 里永远的经典：喊一句看我落地水，然后掉进虚空。群里笑了她一个月。',
    hero: true, shape: 'bucket',
  },
  c30586: {
    name: '30586', sub: 'CraZy Thursday Vme50', emoji: '🍗', color: '#ffcf6e', role: '催活动',
    desc: '每周四准时上线催 MC。名言：何时 mc，不来我人没了。',
    hero: true, shape: 'moon',
  },
  mianbao: {
    name: '面包', sub: '键鼠交互', emoji: '🥖', color: '#f0c98a', role: '拍框大王',
    desc: '管理员，锐评谱面一绝，自称拍框大王。Tttt 喜欢的那块面包就是他。',
    hero: true, shape: 'bread',
  },
  gen: {
    name: '根哥', sub: 'unity实训', emoji: '🧑‍🔧', color: '#7fb0ff', role: '助攻',
    desc: '把你拉进群的人。', hero: false, shape: 'wrench',
  },
  aka: {
    name: 'aka', sub: 'token 情报商', emoji: '📉', color: '#9ad0ff', role: '助攻',
    desc: '模型一降智就在群里嚎。', hero: false, shape: 'wave',
  },
  moku: {
    name: '蘑菇汤', sub: '藤原氏', emoji: '🍄', color: '#ff5a78', role: '反派',
    desc: '群规挑战者，专挑群主和新人下嘴。', hero: false, shape: 'mushroom',
  },
};

/** 计入好感度的角色（= 现状的 AFFKEYS，顺序即界面显示顺序） */
export const HERO_KEYS: readonly CharKey[] = [
  'nanao', 'yu', 'cat', 'g', 'shisuan', 'tttt', 'shei',
  'shiban', 'taffy', 'c30586', 'mianbao',
];

/** 参与路线结局评选的角色（= 现状的 MAIN） */
export const MAIN_KEYS: readonly CharKey[] = [
  'nanao', 'yu', 'cat', 'g', 'shisuan', 'tttt', 'shei',
];
