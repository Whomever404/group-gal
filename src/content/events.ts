/* 随机事件池 —— 回合循环里每回合附带 1~2 个。
   以日常为主、少量风险（挑事 / 对线 / 越线 / 刷屏）。所有事件都以 loop 收尾。 */
import type { Script } from '../engine/types';

export type EventKind = 'daily' | 'risk';

export interface EventDef {
  readonly id: string;
  readonly kind: EventKind;
  readonly label: string;
  /** 事件入口节点 */
  readonly entry: string;
}

/** 池内顺序即抽取顺序（每回合取前若干个未触发过的）。 */
export const EVENTS: readonly EventDef[] = [
  { id: 'snack',  kind: 'daily', label: '🥖 深夜有人发了一整屏宵夜图',       entry: 'ev_snack' },
  { id: 'score',  kind: 'daily', label: '📈 群里又下起成绩图暴雨',             entry: 'ev_score' },
  { id: 'game',   kind: 'daily', label: '🎮 有人在安利一款冷门游戏',           entry: 'ev_game' },
  { id: 'hw',     kind: 'daily', label: '📚 期末作业互助帖，没人搭理',         entry: 'ev_hw' },
  { id: 'pet',    kind: 'daily', label: '🐱 一张猫图刷了三十条',               entry: 'ev_pet' },
  { id: 'rain',   kind: 'daily', label: '🌧 降温了，群里开始互相提醒加衣',     entry: 'ev_rain' },
  { id: 'flame',  kind: 'risk',  label: '🔥 深夜有人开团，两拨人较上劲了',     entry: 'ev_flame' },
  { id: 'moku',   kind: 'risk',  label: '🍄 蘑菇汤在群里阴阳怪气',             entry: 's_moku1' },
  { id: 'adult',  kind: 'risk',  label: '⚠️ 有人试探着往成人话题上拐',         entry: 'ev_adult' },
  { id: 'spam',   kind: 'risk',  label: '⚠️ 有人开始带头复读刷屏',             entry: 'ev_spam' },
];

export const EVENT_NODES: Script = {
  /* ---------------- 日常 ---------------- */
  ev_snack:{m:"chat",bgm:"daily",
   b:[["mianbao","[图片]"],
      ["tttt","面包是我的"],
      ["mibu","这个点发这个 你是想让我死"],
      ["shisuan","叫外卖啊 光发图有什么用"],
      ["mianbao","。"]],
   o:[["@面包 图里那家在哪？明晚我请，去的人举手","loop",{a:{mianbao:1,tttt:1},s:{z:1}}],
      ["图片存了。谢谢面包老师","loop",{a:{mianbao:1}}],
      ["这个点看饿了，怪你","loop",{s:{m:1}}]]},

  ev_score:{m:"chat",bgm:"daily",
   b:[["#","凛～～熙 一口气发了十二张成绩图。"],
      ["linxi","[图片] ×12"],
      ["linxi","我还是太菜了"],
      ["shiban","装逼。。。。"],
      ["linxi","我真没有！"]],
   o:[["第十二张我看了，那个段位卡很久了吧","loop",{a:{linxi:2},s:{z:1}}],
      ["太强了","loop",{a:{linxi:1}}],
      ["又开始发了，连个图都不配字","loop",{a:{linxi:-1},s:{r:1}}]]},

  ev_game:{m:"chat",bgm:"daily",
   b:[["g","安利个游戏 冷门 但真的顶"],
      ["g","两小时通关 别谢我"],
      ["shei","有攻略吗 我全成就党"],
      ["g","自己打 那才有意思"]],
   o:[["买一份试试。卡关了我再来问你","loop",{a:{g:2,shei:1}}],
      ["记下了，等打折","loop",{s:{q:1}}],
      ["两小时？那不就是小品","loop",{a:{g:-1},s:{r:1}}]]},

  ev_hw:{m:"chat",bgm:"daily",
   b:[["#","期末互助帖发出来四十分钟，零回复。"],
      ["gen","没人会 还是没人理我"],
      ["gen","拓扑最后一题 谁救一下"],
      ["aka","不会 下一个"]],
   o:[["把题发我，我今晚算一版给你","loop",{a:{gen:2},s:{z:1}}],
      ["我也不会 但可以陪你一起摆烂","loop",{a:{gen:1,aka:1},s:{m:1}}],
      ["群里问作业的 一般没人回","loop",{a:{gen:-1}}]]},

  ev_pet:{m:"chat",bgm:"daily",
   b:[["cat","[图片：一只黄油猫]"],
      ["shisuan","可爱"],
      ["mibu","这只猫 一看就随你"],
      ["cat","？"],
      ["yu","哈哈哈"]],
   o:[["这猫的眼神确实像你，欠欠的","loop",{a:{cat:2,yu:1}}],
      ["可爱。多发点","loop",{a:{cat:1}}],
      ["这图我用过了 别刷了","loop",{a:{cat:-1},s:{r:1}}]]},

  ev_rain:{m:"chat",bgm:"night",
   b:[["mibu","降温了 明天别穿少的 会低烧"],
      ["mibu","别问我怎么知道的"],
      ["nanao","操心别人之前 先操心你自己"],
      ["mibu","我穿得可多了"]],
   o:[["收到。你也是，别又半夜咳","loop",{a:{mibu:2,nanao:1},s:{z:1}}],
      ["谢谢提醒","loop",{a:{mibu:1}}],
      ["妈味太重了 收一收","loop",{a:{mibu:-1},s:{r:1}}]]},

  /* ---------------- 风险 ---------------- */
  ev_flame:{m:"chat",bgm:"tense",
   b:[["#","两个人在群里就一条群规较上了劲，消息越刷越快。"],
      ["g","规矩是他一个人定的 凭什么"],
      ["nanao","群规 有意见私聊"],
      ["g","我就不私聊"],
      ["tttt","瓜子已备好"]],
   o:[["@G @闹七 都停一下。要吵就事论事，别在群里升堂","loop",{a:{g:1,nanao:1},s:{z:1}}],
      ["（起哄）开团开团","loop",{s:{r:2}}],
      ["@G 你先冷静，@闹七 你也是","loop",{a:{nanao:1}}]]},

  ev_adult:{m:"chat",bgm:"tense",
   b:[["you","（有人把话题往边上带，越带越偏。）"],
      ["cat","这个话题 到这里为止啊"],
      ["cat","这群不聊这个 说好的"]],
   o:[["收。换个话题，谁要吃香骨鸡","loop",{a:{cat:1},s:{z:1}}],
      ["（跟着往下接了半句）","__end_b05",{s:{r:2}}],
      ["（把这条折叠，装没看见）","loop",{s:{q:1}}]]},

  ev_spam:{m:"chat",bgm:"tense",
   b:[["#","有人起了个头，群里开始整整齐齐地复读同一句。"],
      ["tttt","复读机成精了"],
      ["nanao","三遍了 群里不许复读"],
      ["#","但队伍没有停。"]],
   o:[["（跟着又刷了一遍）","__end_b24",{s:{r:2}}],
      ["停了停了，谁再刷我点名","loop",{s:{z:1}}],
      ["（默默退出这场复读）","loop",{s:{q:1}}]]},
};