/* 随机事件池 —— 回合循环里每回合附带 1~2 个（去重，每条只出一次）。
 * 这里只留两个样板：一个日常、一个风险。写完新事件后，把 entry 指向 events.ts 里的节点即可。
 */
import type { Script } from '../engine/types';

export type EventKind = 'daily' | 'risk';

export interface EventDef {
  readonly id: string;
  readonly kind: EventKind;
  /** 中枢里显示的选项文案 */
  readonly label: string;
  /** 事件入口节点 */
  readonly entry: string;
}

/** 池内顺序即抽取顺序（每回合取前若干个未触发过的）。 */
export const EVENTS: readonly EventDef[] = [
  { id: 'demo_daily', kind: 'daily', label: '【占位】示例日常事件', entry: 'ev_demo_daily' },
  { id: 'demo_risk',  kind: 'risk',  label: '【占位】示例风险事件', entry: 'ev_demo_risk' },
];

export const EVENT_NODES: Script = {
/* 日常事件：示范「一屏群聊 + 一个选择，然后回中枢」 */
ev_demo_daily:{m:"chat",bgm:"daily",
 b:[["#","【占位】示例日常事件：群里发生了什么"],
    ["mianbao","【占位】事件里的台词"],
    ["tttt","【占位】另一个人的反应"]],
 o:[["【占位】跟着一起玩（好感 +1）","loop",{a:{mianbao:1},s:{w:1}}],
    ["【占位】旁观不掺和（空気 +1）","loop",{s:{q:1}}]]},

/* 风险事件：示范「风险选项会掉好感 / 触发坏结局」 */
ev_demo_risk:{m:"chat",bgm:"tense",
 b:[["#","【占位】示例风险事件：有人开始对线"],
    ["moku","【占位】挑事的人（反派 moku 是不可攻略角色）"]],
 o:[["【占位】把话头按下去（真诚 +2）","loop",{a:{nanao:1},s:{z:2}}],
    ["【占位】站队跟着骂（嘴臭 +2、好感 -2）","loop",{a:{moku:1,nanao:-2},s:{r:2}}]]},
};