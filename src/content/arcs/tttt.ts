import type { Script } from '../../engine/types';

/** Tttt · 第三段专属支线（模块化引擎追加内容）。 */
export const tttt_ARC: Script = {
  tttt_x1:{m:"chat",bgm:"daily",
   b:[["#","18:20　Tttt 的私聊亮了"],
      ["tttt","（私聊）小狗叫"],
      ["tttt","问你 外号要不要换一个"],
      ["tttt","小狗叫是给好人的 我想给你个更好的"],
      ["tttt","你自己挑 还是我来定"],
      ["you","（她说过，外号是有分工的。）"]],
   o:[["你定。能被点名，总比在群里消失强","tttt_x2",{a:{tttt:3},s:{z:1}}],
      ["随便，你起什么我都收","tttt_x2",{a:{tttt:1}}],
      ["小狗叫？这名我不接受，别乱叫","__end_bt",{s:{r:2}}]]},
  tttt_x2:{m:"avg",bg:"dusk",bgm:"daily",c:"tttt",
   l:[["tttt","……那我就定了。"],
      ["tttt","还叫小狗叫。定性了 改不了。"],
      ["tttt","我最近在冲 w6 就为了有资格陪你们玩"],
      ["you","（她把这句话说得像在念一条群规。）"],
      ["tttt","了子。面包分你一半 别外传。"]],
   next:"loop"}
};