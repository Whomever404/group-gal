/* 示例支线 —— 样板文件：给某个角色写专属支线时，照它的结构新建 `arcs/<角色键>.ts`，
 * 然后在 loop.ts 的 ARC_STEPS 里把那个角色的槽位指过来。
 *
 * 一条本命支线惯例分两段：
 *   ① 群日常段（m:'chat'）  ② 深夜私聊段（m:'avg'）
 * 两段都以 next:"loop" 收尾，回到夜晚中枢继续下一晚。
 *
 * 当前所有 15 个可攻略角色的槽位都指向这里的两个节点，
 * 所以任何角色都是同一段占位内容 —— 这就是「空骨架」的样子。
 */
import type { Script } from '../../engine/types';

export const demo_ARC: Script = {
/* ① 本命支线 · 群日常段：示范 chat 节点 + 3 个选项 */
demo_seg1:{m:"chat",bgm:"daily",
 b:[["nanao","【占位】这一段的群聊台词写在 b 里，第一列是角色键（见 characters.ts）"],
    ["#","【占位】系统消息用 \"#\" 作第一列"],
    ["tttt","【占位】群友的插话"]],
 o:[["【占位】接住 TA 的话（好感 +3）","demo_seg2",{a:{nanao:3},s:{z:1}}],
    ["【占位】把话题岔开（水群 +1）","demo_seg2",{s:{w:1}}],
    ["【占位】说错话（落坏结局）","__end_b_wrong",{s:{r:2}}]]},

/* ② 深夜私聊段：示范 avg 节点（立绘 + 旁白），收尾回中枢 */
demo_seg2:{m:"avg",bg:"night",bgm:"night",c:"nanao",
 l:[[null,"【占位】深夜的旁白：这一段用 avg 节点，c 是站在画面里的角色键。"],
    ["nanao","【占位】TA 的私聊台词"],
    ["you","【占位】你自己的心理活动（第一列写 you）"]],
 next:"loop"},
};