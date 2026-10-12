import type { Script } from '../../engine/types';

/** 誰 · 第三段专属支线（模块化引擎追加内容）。 */
export const shei_ARC: Script = {
  shei_x1:{m:"chat",bgm:"daily",
   b:[["shei","（私聊）新人。。"],
      ["shei","群gal 我改成长期企划了"],
      ["shei","每天一小段 你要不要接着走"],
      ["nanao","攻略宅又来拉人入坑了"],
      ["shei","攻略宅也有心。。"],
      ["you","（她把「长期」两个字，写得比谁都重。）"]],
   o:[["别省事。你写多少我回多少，一条不落","shei_x2",{a:{shei:3},s:{z:1}}],
      ["行，你更新我就走","shei_x2",{a:{shei:1}}],
      ["让 token 代写吧，反正大家就是 NPC","__end_bshei",{s:{r:2}}]]},
  shei_x2:{m:"avg",bg:"night",bgm:"night",c:"shei",
   l:[[null,"深夜。她的文档标题后面，多了一行小字：「v2.0 · 长期更新」。"],
      ["shei","我写了七天 每天一小段。。"],
      ["shei","不敢停 一停 存档就落灰"],
      ["shei","谢谢你还在第七天的存档里"],
      ["you","（她要的不是把游戏做完，是列表里每天都有回应。）"]],
   next:"loop"}
};