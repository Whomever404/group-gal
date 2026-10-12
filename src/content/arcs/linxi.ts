import type { Script } from '../../engine/types';

/** 凛～～熙 · 第三段专属支线（模块化引擎追加内容）。 */
export const linxi_ARC: Script = {
  linxi_x1:{m:"chat",bgm:"night",
   b:[["linxi","（私聊）新人 在吗"],
      ["linxi","我把相册翻到头了"],
      ["linxi","第一张是两年前的今天"],
      ["linxi","那时候我还没打maimai"],
      ["#","她发来一张很糊的截图。"],
      ["you","（四百多张里的第一张。）"]],
   o:[["别删。从今往后，你的图我第一个接","linxi_x2",{a:{linxi:3},s:{z:1}}],
      ["删不删都行，反正我都看","linxi_x2",{a:{linxi:1}}],
      ["你早就是凛神了，还装什么努力b","__end_blin",{s:{r:2}}]]},
  linxi_x2:{m:"avg",bg:"night",bgm:"night",c:"linxi",
   l:[[null,"她盯着那张糊图看了很久。"],
      ["linxi","我靠 你真翻到底了"],
      ["linxi","我发图 其实就想有人接一句"],
      ["linxi","接住了 我才敢发下一张"],
      ["you","（两年，四百多张。她在等第一个回复。）"]],
   next:"loop"}
};