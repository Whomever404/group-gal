import type { Script } from '../../engine/types';

/** aka · 第三段专属支线（模块化引擎追加内容）。 */
export const aka_ARC: Script = {
  aka_x1:{m:"chat",bgm:"night",
   b:[["aka","（私聊）？"],
      ["aka","你还没睡"],
      ["aka","还在盯渠道 眼花了"],
      ["aka","。。"],
      ["#","凌晨 3:11。"],
      ["you","（她的输入框一直亮着。）"]],
   o:[["报错发我。渠道今晚我来盯，你去睡","aka_x2",{a:{aka:3},s:{z:1}}],
      ["又降智了？先别一个人急","aka_x2",{a:{aka:1}}],
      ["渠道本来就不稳，你可别赖我","__end_baka",{s:{r:2}}]]},
  aka_x2:{m:"avg",bg:"night",bgm:"night",c:"aka",
   l:[[null,"凌晨的屏幕上开着五个群，她还在一个个点开又关掉。"],
      ["aka","我的monthly刷新了 weekly没有刷新"],
      ["aka","又得我自己跑测试 测指纹"],
      ["aka","这两个字我都说腻了 自卑了"],
      ["you","（她说「自卑了」的时候，手指没停过。）"]],
   next:"loop"}
};