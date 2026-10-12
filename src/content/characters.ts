import type { CharKey, CharTable } from '../engine/types';

/**
 * 16 个角色：15 名可攻略 + 1 名反派（蘑菇汤，不可攻略）。
 *
 * 文案与群名片沿用 v2 重写版的设定（`sub` 是群里的自我签名）；
 * `role` / `desc` 是界面用的短标签与简介，只在新版呈现里出现。
 */
export const CHARS: CharTable = {
  nanao: {
    name: '闹七', sub: 'Null7323 · 群主 / 服主', emoji: '👑', color: '#ff6ec7', role: '傲娇暴君',
    desc: '自建 MC / 帕鲁服务器，还是 Arcaea 谱师。嘴上天天喊解散群，真踢起人来一次也没舍得。',
    hero: true, shape: 'crown',
  },
  yu: {
    name: '一条鱼', sub: '别问她为什么叫鱼', emoji: '🐟', color: '#5ce1e6', role: '天然呆',
    desc: 'MC 机械动力工程师。平时话不多，一聊红石就停不下来；做的东西从来不敢给人看。',
    hero: true, shape: 'fish',
  },
  cat: {
    name: '黄油猫', sub: '黄油猫是我妈妈', emoji: '🐱', color: '#ffd76e', role: '守门猫',
    desc: '医学系学姐，一条鱼的恋人。段子最多，心最软；谁欺负一条鱼她跟谁急。',
    hero: true, shape: 'cat',
  },
  g: {
    name: 'G', sub: 'Lriltu · 反骨管理员', emoji: '🅶', color: '#a06bff', role: '矛盾系大佬',
    desc: '舞萌 / 写谱大佬，管理员。最爱嘴上杠群主，技术优越感和自卑来回横跳。',
    hero: true, shape: 'star',
  },
  shisuan: {
    name: '石蒜', sub: '信这个不如信我是男娘', emoji: '🧄', color: '#8be08b', role: '孤岛写谱人',
    desc: '中二、自黑、写谱狂魔。他自己说过：社交渠道几乎全在这个群里了。',
    hero: true, shape: 'garlic',
  },
  tttt: {
    name: 'Tttt', sub: '起外号专家', emoji: '🎭', color: '#ff9f6e', role: '梗王 · 管理员',
    desc: '起外号一绝，阴阳怪气但心软。名言：面包是我的。',
    hero: true, shape: 'mask',
  },
  shei: {
    name: '誰', sub: '又名蛋蛋', emoji: '🥚', color: '#cfcfe8', role: 'meta 攻略宅',
    desc: '情绪化、AI token 依赖，正在把整个群当成 galgame 攻略，还写了剧本。',
    hero: true, shape: 'egg',
  },
  shiban: {
    name: '石斑鱼', sub: '🪨🦓🐟 · 猎团', emoji: '🐠', color: '#7fe0c0', role: '卖弱阴阳人',
    desc: '怪猎党，单曲循环《冷漠群友不请我吃肯德基》。卖弱与阴阳并存。',
    hero: true, shape: 'fin',
  },
  taffy: {
    name: 'taffy', sub: '看我落地水！', emoji: '🧦', color: '#ffb3d9', role: '落地水',
    desc: 'MC 里永远的经典：喊一句看我落地水，然后掉进虚空。群里笑了她一个月。',
    hero: true, shape: 'bucket',
  },
  c30586: {
    name: '30586', sub: '何时mc · 不来我人没了', emoji: '🍗', color: '#ffcf6e', role: '催活动',
    desc: '每周准时上线催 MC，办了十九次躲猫猫，报名表上永远差三个人。',
    hero: true, shape: 'moon',
  },
  mianbao: {
    name: '面包', sub: '高冷发图人 · 拍框大王', emoji: '🥖', color: '#f0c98a', role: '拍框大王',
    desc: '连发二十张图也不配一句话。Tttt 喜欢的那块面包就是他。',
    hero: true, shape: 'bread',
  },
  mibu: {
    name: '咪猫布', sub: '医学系 · 一百三十斤的大飞猪', emoji: '💊', color: '#7ad0c0', role: '校医院常客',
    desc: '自封一百三十斤的大飞猪。操心别人穿得够不够，自己的体检单上列了十七种可能。',
    hero: true, shape: 'pill',
  },
  linxi: {
    name: '凛～～熙', sub: '我是努力b！', emoji: '📈', color: '#9fc8ff', role: '成绩图轰炸机',
    desc: '一屏十二张成绩图，配文永远是「我还是太菜了」。被捧一次就崩一次。',
    hero: true, shape: 'chart',
  },
  gen: {
    name: '根哥', sub: 'Unity 实训开发 · 不是爸爸', emoji: '🧑‍🔧', color: '#7fb0ff', role: '领路人',
    desc: '把你拉进群的人。实训死线前六小时还在群里问作业，只有 aka 回他「不会 下一个」。',
    hero: true, shape: 'wrench',
  },
  aka: {
    name: 'aka', sub: 'token 情报商 · 降智预警', emoji: '📉', color: '#9ad0ff', role: '渠道运营商',
    desc: '模型一降智就在群里嚎，手上一把渠道清单——被冲爆过，也被救回来过。',
    hero: true, shape: 'wave',
  },
  moku: {
    name: '蘑菇汤', sub: '藤原氏', emoji: '🍄', color: '#ff5a78', role: '反派',
    desc: '群规挑战者，专挑群主和新人下嘴。至今没人当面顶过他。',
    hero: false, shape: 'mushroom',
  },
};

/** 计入好感度的角色（顺序即界面显示顺序，也就是结局评选的平票优先序）。 */
export const HERO_KEYS: readonly CharKey[] = [
  'nanao', 'yu', 'cat', 'g', 'shisuan', 'tttt', 'shei',
  'shiban', 'taffy', 'c30586', 'mianbao', 'mibu', 'linxi', 'gen', 'aka',
];