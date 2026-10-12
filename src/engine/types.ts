/* 剧本与游戏的类型定义。此文件不含任何运行时代码。 */

/** 角色 key —— 沿用 v0.2（group-chat-galgame.html）的命名。 */
export type CharKey =
  | 'nanao' | 'yu' | 'cat' | 'g' | 'shisuan' | 'tttt' | 'shei'
  | 'shiban' | 'taffy' | 'c30586' | 'mianbao' | 'mibu' | 'linxi'
  | 'gen' | 'aka' | 'moku' | 'you';

/** 说话人：角色 key / '#'（系统消息）/ null（旁白）。 */
export type Speaker = CharKey | '#' | null;

export interface Character {
  /** 昵称 */
  readonly n: string;
  /** emoji 头像 */
  readonly e: string;
  /** 主题色 */
  readonly c: string;
  /** 立绘配件 key */
  readonly h: string;
  /** 群名片 / 副标题 */
  readonly sub: string;
}
export type CharTable = Readonly<Record<CharKey, Character>>;

/** 资质：z 真诚 / r 嘴臭 / m 卖弱 / q 空気 / w 水群 */
export type StatKey = 'z' | 'r' | 'm' | 'q' | 'w';

export interface Fx {
  /** 羁绊加成：角色 key → 点数 */
  readonly a?: Readonly<Record<string, number>>;
  /** 资质加成 */
  readonly s?: Readonly<Partial<Record<StatKey, number>>>;
  /** 置位标记（flag） */
  readonly f?: string;
}

/** chat 模式下的一行：key 为角色 key 或 '#'（系统消息）。 */
export type ChatLine = readonly [string, string];
/** avg 模式下的一行：key 为角色 key 或 null（旁白）。 */
export type AvgLine = readonly [string | null, string];
/** 一个选项：[按钮文案, 跳转目标, 加成?, 一次性标记?]。加成位允许 null（v2 数据里用 null 占位）。 */
export type Choice = readonly [string, string, (Fx | null)?, string?];

export interface Node {
  /** 呈现模式：chat=聊天流 / avg=AVG 对话框。 */
  readonly m?: 'chat' | 'avg';
  /** 顶栏章节名。 */
  readonly d?: string;
  /** AVG 背景 class 后缀。 */
  readonly bg?: string;
  /** 切换 BGM 曲目。 */
  readonly bgm?: string;
  /** AVG 立绘角色；null 表示不显示。 */
  readonly c?: string | null;
  /** chat 内容行。 */
  readonly b?: readonly ChatLine[];
  /** avg 内容行。 */
  readonly l?: readonly AvgLine[];
  /** 选项组。 */
  readonly o?: readonly Choice[];
  /** 线性推进目标。 */
  readonly next?: string;
  /** 节点自带加成（只结算一次）。 */
  readonly fx?: Fx;
  /** 分岔节点标记：按羁绊最高者走向角色线。 */
  readonly j?: 'branch';
  /** hub 节点标记：选项带第 4 位「一次性」标记。 */
  readonly hub?: boolean;
}

export type Script = Readonly<Record<string, Node>>;

export interface BadEndData {
  readonly who: string;
  readonly name: string;
  readonly desc: string;
}

/** 存档状态。字段均为纯 JSON，可直接序列化。 */
export interface GameState {
  /** 当前节点 id */
  id: string;
  /** 羁绊：角色 key → 点数 */
  a: Record<string, number>;
  /** 资质 */
  s: Record<StatKey, number>;
  /** 标记 */
  f: Record<string, boolean>;
  /** 已结算过的节点级 fx */
  fxDone: Record<string, number>;
  /** 已体验过的一次性支线 id */
  hubDone: Record<string, number>;
  /** 已回收结局（BE key / ge_<key>） */
  unlocked: string[];
  /** 回滚点（分岔前状态快照，JSON 字符串） */
  cp: string | null;
  /** 音效开关 */
  se: boolean;
  /** BGM 开关 */
  bgm: boolean;
  /** 当前曲目 */
  trk: string;
  /** 上次分岔走向 */
  lastRoute?: string;
}

/** 阅读偏好：手动/自动 + 三档速度。 */
export interface ReaderPref { auto: boolean; spd: number; }

export type EndingResolution =
  | { readonly kind: 'be'; readonly key: string }
  | { readonly kind: 'ge'; readonly key: string };

/**
 * 引擎驱动界面的唯一出口。引擎不含 DOM，所有副作用经此发生；
 * 测试可注入一个记录调用序列的 FakeRenderer，从而无头跑通整张剧情图。
 */
export interface Renderer {
  setDay(d: string | undefined): void;
  bgm(track: string): void;
  sfx(type: string): void;
  beginChat(): void;
  beginAvg(node: Node): void;
  /** 输出一句台词（chat 气泡 / avg 文本框），resolve 时表示这一句已读完。 */
  say(who: string | null, text: string): Promise<void>;
  /** 输出一条系统消息。 */
  sys(text: string): Promise<void>;
  /** 等待玩家在若干选项中选择，返回所选下标（基于传入的 opts）。 */
  askChoices(node: Node, opts: readonly Choice[]): Promise<number>;
  /** 节点末的「点击继续」：提示并等待玩家推进。 */
  awaitAdvance(): Promise<void>;
  showEnd(res: EndingResolution, state: GameState): void;
  /** 顶栏资质变化：更新显示并闪烁。 */
  statChanged(key: StatKey, value: number): void;
  toast(text: string): void;
}