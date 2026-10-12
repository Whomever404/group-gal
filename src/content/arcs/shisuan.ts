import type { Script } from '../../engine/types';

/** 石蒜 · 第三段专属支线（模块化引擎追加内容）。 */
export const shisuan_ARC: Script = {
  shisuan_x1:{m:"chat",bgm:"night",
   b:[["#","02:14　石蒜的私聊亮了"],
      ["shisuan","（私聊）新人"],
      ["shisuan","那首谱 今晚又改了一版"],
      ["shisuan","发群里还是没人点开"],
      ["shisuan","我是不是该把它也删了"],
      ["you","（他上一条，是 23:47 那句「写完了」。）"]],
   o:[["别删。今晚点开的人，从我开始","shisuan_x2",{a:{shisuan:3},s:{z:1}}],
      ["先睡吧，明天再改也不迟","shisuan_x2",{a:{shisuan:1}}],
      ["听完了。还行吧。","__end_bss",{s:{r:2}}]]},
  shisuan_x2:{m:"avg",bg:"night",bgm:"night",c:"shisuan",
   l:[["shisuan","……你又点开了"],
      ["shisuan","点开过的 到现在 还是只有你"],
      ["shisuan","我社交渠道 几乎全在这一个群"],
      ["you","（屏幕另一头，是三十多个标着他名字的草稿箱。）"],
      ["shisuan","好。那先不删 留一版 给点开的人。"]],
   next:"loop"}
};