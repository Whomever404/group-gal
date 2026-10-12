import type { Script } from '../../engine/types';

/**
 * 第三章与结局标签区。逐字搬运自原版单文件。
 * 阶段 5 按人设档案统一口癖。
 *
 * 注意最后 7 组 label+be：它们是 BE 的落点，由各处的 goto 直接引用
 * （BE19/BE20 来自蘑菇汤支线，BE24 来自挂机潜水支线的「复读刷屏」分支）。
 * BE10 与 BE23 **不在这里**——它们只由 resolveEnding 触发。
 */
export const CH3: Script = [
  { kind: 'label', name: 'ch3' },
  { kind: 'bgm', track: 'chat' },
  { kind: 'sys', text: '一周后' },
  { kind: 'say', who: 'nanao', text: '@全体成员 就今晚 MC 服 谁不来我解散群 我很伤心，，' },
  { kind: 'say', who: 'g', text: '又来了又来了 干嘛呀……' },
  { kind: 'say', who: 'cat', text: '来，' },
  { kind: 'say', who: 'yu', text: '来，' },
  { kind: 'say', who: 'shei', text: '来呀，' },
  { kind: 'say', who: 'shisuan', text: '写完了 来 神了' },
  { kind: 'say', who: 'tttt', text: '算我一个 了子' },
  { kind: 'say', who: 'nanao', text: '新人 你拉人拉了好几天了 今晚别掉链子 我命令你们都得来，，' },
  { kind: 'choice', prompt: '今晚', options: [
    { label: '放心 我一个个 @过去 保证满员',
      eff: { nanao: 2, g: 1, tttt: 1, shei: 1, yu: 1, cat: 1, shisuan: 1 },
      set: 'actGood', goto: 'ch3b' },
    { label: '我尽量叫人吧', eff: { nanao: 1 }, goto: 'ch3b' },
    { label: '算了我今晚有事', eff: { nanao: -2 }, set: 'actSkip', goto: 'ch3b' },
  ] },
  { kind: 'label', name: 'ch3b' },
  { kind: 'sys', text: '当晚 MC 服上线人数' },
  { kind: 'say', who: 'nanao', text: '……居然满员了，，' },
  { kind: 'say', who: 'cat', text: '一条鱼说这是她见过最热闹的一次，' },
  { kind: 'say', who: 'yu', text: '新人 下次还来，' },
  { kind: 'say', who: 'nanao', text: '……谢了，，' },
  { kind: 'note', text: '闹七第一次没有说 我很伤心。' },
  { kind: 'ending' },

  /* ======== 结局标签 ======== */
  { kind: 'label', name: 'BE01' }, { kind: 'be', id: 'BE01' },
  { kind: 'label', name: 'BE02' }, { kind: 'be', id: 'BE02' },
  { kind: 'label', name: 'BE05' }, { kind: 'be', id: 'BE05' },
  { kind: 'label', name: 'BE17' }, { kind: 'be', id: 'BE17' },
  { kind: 'label', name: 'BE19' }, { kind: 'be', id: 'BE19' },
  { kind: 'label', name: 'BE20' }, { kind: 'be', id: 'BE20' },
  { kind: 'label', name: 'BE24' }, { kind: 'be', id: 'BE24' },
];
