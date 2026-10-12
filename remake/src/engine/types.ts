/* 剧本与游戏的类型定义。此文件不含任何运行时代码。 */

export type TrackName = 'chat' | 'night' | 'tension' | 'warm';

export type SilhouetteShape =
  | 'crown' | 'fish' | 'cat' | 'star' | 'garlic' | 'mask' | 'egg'
  | 'fin' | 'bucket' | 'moon' | 'bread' | 'wrench' | 'wave'
  | 'mushroom' | 'dot';

/** 可攻略角色 + 助攻/反派。 */
export type CharKey =
  | 'nanao' | 'yu' | 'cat' | 'g' | 'shisuan' | 'tttt' | 'shei'
  | 'shiban' | 'taffy' | 'c30586' | 'mianbao'
  | 'gen' | 'aka' | 'moku';

/** 玩家自己。渲染成右侧气泡，不计好感度。 */
export type Speaker = CharKey | 'me';

export interface Character {
  readonly name: string;
  readonly sub: string;
  readonly emoji: string;
  readonly color: string;
  readonly role: string;
  readonly desc: string;
  /** 是否计入好感度（= 现状的 AFFKEYS 成员） */
  readonly hero: boolean;
  readonly shape: SilhouetteShape;
}

export type CharTable = Readonly<Record<CharKey, Character>>;

export type AffDelta = Partial<Record<CharKey, number>>;

/** 现状剧本里出现的全部标记，收成联合以拦住拼写错误。 */
export type FlagKey = 'sheiTrap' | 'mokuJoin' | 'actGood' | 'actSkip';

/** 7 个由剧本节点触发 + 2 个由结局判定触发。 */
export type BeId =
  | 'BE01' | 'BE02' | 'BE05' | 'BE17' | 'BE19' | 'BE20' | 'BE24'
  | 'BE10' | 'BE23';

/** label 是数据里定义的自由字符串，由校验器保证引用有效。 */
export type Label = string;

export interface ChoiceOption {
  readonly label: string;
  /** 实际发出的消息，缺省时等于 label */
  readonly say?: string;
  readonly eff?: AffDelta;
  readonly set?: FlagKey;
  readonly goto: Label;
}

export interface HubOption {
  /** 稳定去重键。取代现状用按钮文字当键的做法。 */
  readonly id: string;
  readonly label: string;
  readonly once?: boolean;
  readonly eff?: AffDelta;
  readonly set?: FlagKey;
  readonly goto: Label;
}

export type Node =
  | { readonly kind: 'label';  readonly name: Label }
  | { readonly kind: 'say';    readonly who: Speaker; readonly text: string }
  | { readonly kind: 'sys';    readonly text: string }
  | { readonly kind: 'note';   readonly text: string }
  | { readonly kind: 'card';   readonly who: CharKey }
  | { readonly kind: 'bgm';    readonly track: TrackName }
  | { readonly kind: 'aff';    readonly eff: AffDelta }
  | { readonly kind: 'set';    readonly flag: FlagKey }
  | { readonly kind: 'goto';   readonly label: Label }
  | { readonly kind: 'choice'; readonly prompt: string; readonly options: readonly ChoiceOption[] }
  | { readonly kind: 'hub';    readonly prompt: string; readonly options: readonly HubOption[] }
  | { readonly kind: 'be';     readonly id: BeId }
  | { readonly kind: 'ending' };

export type Script = readonly Node[];

export type LabelIndex = Readonly<Record<Label, number>>;

/** Bad End 文案。`tag` 恒为 "BAD END"（源文件里每条都显式写了）。 */
export interface BadEndData {
  readonly tag: string;
  readonly title: string;
  readonly text: string;
}

/**
 * 路线结局文案。**没有 `tag`** —— 源文件的 ENDING 条目只有 title/text，
 * 弹窗上的「END · 路线序章」是渲染层硬编码的（见 :823）。
 */
export interface RouteEndingData {
  readonly title: string;
  readonly text: string;
}

export interface GameState {
  readonly schemaVersion: number;
  readonly aff: Record<CharKey, number>;
  readonly flags: Partial<Record<FlagKey, boolean>>;
  readonly water: number;
  readonly members: number;
  /** hub 选项 id → 是否已触发 */
  readonly hub: Record<string, boolean>;
  /** 复读检测：上一句被复读的内容 */
  readonly lastRepeat: string;
  /** 连续复读次数 */
  readonly repeatN: number;
}

export type LogEntry =
  | { readonly kind: 'say';  readonly who: Speaker; readonly text: string }
  | { readonly kind: 'sys';  readonly text: string }
  | { readonly kind: 'note'; readonly text: string };

/**
 * 关键节点首次抵达时的状态快照。
 *
 * **故意不含 `schemaVersion`**：那是存档格式的版本，随存档一起走，
 * 不属于某一次游玩进度。恢复快照时再补回当前版本（见 route-map.ts 的 fromCheckpoint）。
 */
export type CheckpointState = Omit<GameState, 'schemaVersion'>;

/** 游玩进度。属于 Session（存档单位），随存档一起序列化。 */
export interface SessionProgress {
  /** 抵达过的 label */
  visited: Record<string, true>;
  /** 关键节点（choice / hub）首次抵达时的状态快照，键为 label */
  checkpoints: Record<string, CheckpointState>;
  /**
   * 关键节点首次抵达时的 `history` 长度。
   *
   * 跳转时据此把历史截断回那一刻——否则从该 label 重跑会把「被打断之后
   * 已经入队」的消息再追加一遍，回想与聊天流都会出现重复。
   */
  historyLens: Record<string, number>;
}

/** 存档单位：状态 + 剧本指针 + 历史 + 进度。四者都是纯 JSON。
 *  字段可变——`run()` 把它当作可变工作副本就地推进。 */
export interface Session {
  state: GameState;
  /** 剧本节点指针：指向「下一个待执行节点」 */
  ip: number;
  history: LogEntry[];
  /** 路线图进度：抵达过的 label 与关键节点的状态快照。 */
  progress: SessionProgress;
}

/** 等待时长策略。快进开关在这里生效。
 *  字段可变——main.ts 直接翻转 `fast`，Renderer 每次读取时即时生效。 */
export interface DelayPolicy {
  me: number;
  msg: number;
  sys: number;
  note: number;
  card: number;
  /** 快进时为 true，所有等待被钳制到上限 */
  fast: boolean;
}

export type EndingResolution =
  | { readonly kind: 'be'; readonly id: BeId }
  | { readonly kind: 'route'; readonly key: CharKey };

export interface AffToastItem {
  readonly who: CharKey;
  readonly delta: number;
}

/** 引擎驱动界面的唯一出口。引擎不含 DOM，所有副作用经此发生。 */
export interface Renderer {
  say(who: Speaker, text: string): Promise<void>;
  sys(text: string): Promise<void>;
  note(text: string): Promise<void>;
  card(who: CharKey): Promise<void>;
  bgm(track: TrackName): void;
  /** 好感度变化：状态已由引擎结算，这里只负责展示 */
  affToast(items: readonly AffToastItem[]): void;
  toast(text: string): void;
  askChoice(prompt: string, options: readonly ChoiceOption[]): Promise<number>;
  askHub(prompt: string, options: readonly HubOption[]): Promise<number>;
  showBE(id: BeId): Promise<void>;
  showEnding(resolution: EndingResolution, session: Session): Promise<void>;
  readonly delays: DelayPolicy;
}
