import type { Script } from '../../engine/types';

/**
 * 逐字搬运自原版单文件。
 * 阶段 5 按人设档案（docs/persona/）统一口癖：闹七的「，，」尾缀与立规腔、
 * Tttt 的起外号、G 的「干嘛呀」、一条鱼/黄油猫的「，」收尾。
 * 剧情走向、分支结构、选项数量与顺序、eff / goto 一律未动。
 */
export const PROLOGUE: Script = [
  { kind: 'label', name: 'start' },
  { kind: 'sys', text: '「根哥」把你拉进了群聊 😂群聊' },
  { kind: 'sys', text: '群成员 80 → 81' },
  { kind: 'note', text: '你还没来得及打招呼，屏幕已经被刷屏淹没了。' },
  { kind: 'say', who: 'gen', text: '@全体成员 来活人了 都收着点' },
  { kind: 'say', who: 'tttt', text: '新人？' },
  { kind: 'say', who: 'shisuan', text: '新人？' },
  { kind: 'say', who: 'yu', text: '新人？' },
  { kind: 'say', who: 'tttt', text: '复读机是吧 那我先给你起个外号 就叫你新子' },
  { kind: 'say', who: 'cat', text: '行了行了 别把新人吓跑了，' },
  { kind: 'say', who: 'g', text: '稀奇 这破群仨月没进过人了 干嘛呀' },
  { kind: 'say', who: 'nanao', text: '来了个新的，，' },
  { kind: 'say', who: 'nanao', text: '先说明 这儿嘴上没把门的 别玻璃心 我命令你们谁都不许欺负新人，，' },
  { kind: 'choice', prompt: '说点什么', options: [
    { label: '音游萌新 求大佬带带', eff: { g: 1, shisuan: 1 }, goto: 'intro_done' },
    { label: '我 token 管够 谁要借号说话', eff: { nanao: 2, shei: 2 }, goto: 'intro_done' },
    { label: '打打 Arcaea 也就一菜鸡', eff: { nanao: 1, g: 1 }, goto: 'intro_done' },
    { label: '发个猫猫头', say: '🐱', eff: { cat: 1, nanao: 1 }, goto: 'intro_done' },
  ] },
];
