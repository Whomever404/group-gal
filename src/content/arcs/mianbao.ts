import type { Script } from '../../engine/types';

/** 面包 · 第三段专属支线（模块化引擎追加内容）。 */
export const mianbao_ARC: Script = {
  mianbao_x1:{m:"chat",bgm:"daily",
   b:[["mianbao","（私聊）"],
      ["mianbao","[图片]"],
      ["mianbao","[图片]"],
      ["mianbao","。"],
      ["tttt","面包！！"],
      ["you","（他给全群发图，只给你发了两个句号。）"]],
   o:[["两个句号，是想问我点什么吧。说，我听着","mianbao_x2",{a:{mianbao:3},s:{z:1}}],
      ["图收了。今天就这样","mianbao_x2",{a:{mianbao:1}}],
      ["你除了发图还会别的吗","__end_b17",{s:{r:2}}]]},
  mianbao_x2:{m:"avg",bg:"dusk",bgm:"daily",c:"mianbao",
   l:[[null,"面包店靠窗的位置。桌上照旧放着第三个纸袋。"],
      ["mianbao","（推过来一张便利贴）"],
      ["you","（上面写着：「第 365 张，是想问你喜欢哪一种。」）"],
      ["mianbao","。"],
      ["you","（他把所有想说的话，都折进了一张图里。）"]],
   next:"loop"}
};