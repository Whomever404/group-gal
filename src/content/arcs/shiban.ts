import type { Script } from '../../engine/types';

/** 石斑鱼 · 第三段专属支线（模块化引擎追加内容）。 */
export const shiban_ARC: Script = {
  shiban_x1:{m:"chat",bgm:"night",
   b:[["shiban","（私聊）新人"],
      ["shiban","集会所那张桌子 我还留着"],
      ["shiban","你要不要 固定来打猎"],
      ["shiban","先说好 我很菜"],
      ["shiban","菜到神他妈牛逼那种"],
      ["you","（他把邀请说成自贬，像在提前替对方找退路。）"]],
   o:[["固定队算我一个。每周三晚，我不到你就骂我","shiban_x2",{a:{shiban:3},s:{z:1}}],
      ["来玩就叫上我","shiban_x2",{a:{shiban:1}}],
      ["你这水平 还是先自己练练吧","__end_bban",{s:{r:2}}]]},
  shiban_x2:{m:"avg",bg:"arcade",bgm:"daily",c:"shiban",
   l:[[null,"深夜的集会所，只剩两个人的身影，和一排没点亮的营地。"],
      ["shiban","好。"],
      ["shiban","那这张桌子 我写你名字了"],
      ["shiban","（语音的音量依旧很小 像怕吵到谁）"],
      ["you","（一个总喊「退群」的人，先给自己留了张长期席位。）"]],
   next:"loop"}
};