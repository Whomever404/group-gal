import type { Script } from '../../engine/types';

/** 咪猫布 · 第三段专属支线（模块化引擎追加内容）。 */
export const mibu_ARC: Script = {
  mibu_x1:{m:"chat",bgm:"night",
   b:[["mibu","（私聊）新人 你睡了吗"],
      ["mibu","报告那事 我又加了一行"],
      ["mibu","十七种 变成十八种了"],
      ["mibu","我知道这样很蠢"],
      ["#","凌晨 1:12。"],
      ["you","（她又在半夜翻文献。）"]],
   o:[["第十八行划掉。现在睡，明天我陪你去复查","mibu_x2",{a:{mibu:3},s:{z:1}}],
      ["十八种里，多半是你自己吓自己","mibu_x2",{a:{mibu:1}}],
      ["这么多可能，发群里让大家乐一乐","__end_bmibu",{s:{r:2}}]]},
  mibu_x2:{m:"avg",bg:"night",bgm:"night",c:"mibu",
   l:[[null,"她把表格发了过来——最后多出一行小字。"],
      ["mibu","其实我不是怕那个指标"],
      ["mibu","我是怕等结果这几天 没人当真"],
      ["mibu","爸妈说我想太多 群友说我卖弱"],
      ["you","（第十八行写着：如果没事，这本书借给新人。）"]],
   next:"loop"}
};