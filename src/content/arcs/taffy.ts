import type { Script } from '../../engine/types';

/** taffy · 第三段专属支线（模块化引擎追加内容）。 */
export const taffy_ARC: Script = {
  taffy_x1:{m:"chat",bgm:"daily",
   b:[["taffy","（私聊）新人！"],
      ["taffy","落地水我练到第 20 次了"],
      ["taffy","你要不要来看"],
      ["c30586","何时mc"],
      ["taffy","别催了 我在练"],
      ["you","（她问得很快，像怕话一多就会被嫌。）"]],
   o:[["来。第 20 次，我给你数三二一","taffy_x2",{a:{taffy:3},s:{z:1}}],
      ["练得挺勤，加油","taffy_x2",{a:{taffy:1}}],
      ["练这么多次还失败，要不别练了","__end_btaf",{s:{r:2}}]]},
  taffy_x2:{m:"avg",bg:"mc",bgm:"daily",c:"taffy",
   l:[[null,"高处，她抱着水桶站定——第九次掉进虚空之后，又一次自己爬了上来。"],
      ["taffy","三。二。一——"],
      ["#","水桶落了地，还是早了半秒。她笑着复活。"],
      ["taffy","9191。……你没失望吧"],
      ["you","（她怕的从来不是掉进虚空，是掉进别人眼里。）"]],
   next:"loop"}
};