/* 剧本与游戏的类型定义。此文件不含任何运行时代码。
 *
 * 这里并存**两套剧本模型**，各有明确分工：
 *
 * 1. **DSL（书写格式）**：`Script = Record<节点 id, DslNode>`。剧本作者直接写的就是它
 *    —— 命名节点、显式跳转、中文注释友好。见 content/script.ts 与 content/arcs/。
 * 2. **扁平剧本（执行格式）**：`FlatScript = FlatNode[]`，由 content/adapt.ts 从 DSL 生成。
 *    引擎只认这一种——指令表 + 线性 ip 指针，因此可达性、跳转、快照都能被机械校验。
 *
 * 换句话说：写作时用 DSM 的便利，执行时用扁平表的可验证性，adapt.ts 是唯一转换点。
 */

export type TrackName = 'chat' | 'night' | 'tension' | 'warm';

export type SilhouetteShape =
  | 'crown' | 'fish' | 'cat' | 'star' | 'garlic' | 'mask' | 'egg'
  | 'fin' | 'bucket' | 'moon' | 'bread' | 'wrench' | 'wave'
  | 'mushroom' | 'pill' | 'chart' | 'dot';

/** 可攻略角色（15）+ 反派（1）。玩家自己走 'me'，不进角色表。 */
export type CharKey =
  | 'nanao' | 'yu' | 'cat' | 'g' | 'shisuan' | 'tttt' | 'shei'
  | 'shiban' | 'taffy' | 'c30586' | 'mianbao'
  | 'mibu' | 'linxi' | 'gen' | 'aka' | 'moku';

/** 玩家自己。渲染成右侧气泡，不计好感度。 */
export type Speaker = CharKey | 'me';

export interface Character {
  readonly name: string;
  readonly sub: string;
  readonly emoji: string;
  readonly color: string;
  readonly role: string;
  readonly desc: string;
  /** 是否计入好感度（= 可攻略角色） */
  readonly hero: boolean;
  readonly shape: SilhouetteShape;
}

export type CharTable = Readonly<Record<CharKey, Character>>;

export type AffDelta = Partial<Record<CharKey, number>>;

/** 资质：z 真诚 / r 嘴臭 / m 卖弱 / q 空気 / w 水群。 */
export type StatKey = 'z' | 'r' | 'm' | 'q' | 'w';
export type StatDelta = Partial<Record<StatKey, number>>;

/** 现状剧本里出现的全部标记，收成联合以拦住拼写错误。 */
export type FlagKey = 'sheiTrap' | 'mokuJoin' | 'actGood' | 'actSkip';

/** 23 个 Bad End。全部由剧本节点显式触发（见 content/script.ts 的 `__end_*` 跳转）。 */
export type BeId =
  | 'b01' | 'b02' | 'b05' | 'b10' | 'b17' | 'b19' | 'b20' | 'b24' | 'b81'
  | 'bn' | 'by' | 'bcat' | 'bg' | 'bss' | 'bt' | 'bshei' | 'bban' | 'btaf'
  | 'b305' | 'bmibu' | 'blin' | 'bgen' | 'baka';

/** label 是数据里定义的自由字符串，由校验器保证引用有效。 */
export type Label = string;

/* ============================ DSL（书写格式） ============================ */

/** DSL 选项的加成：a 羁绊 / s 资质 / f 标记。 */
export interface DslFx {
  readonly a?: Readonly<Record<string, number>>;
  readonly s?: StatDelta;
  readonly f?: string;
}

/** DSL 选项：[按钮文案, 跳转目标, 加成?, 一次性标记?]。 */
export type DslChoice = readonly [string, string, (DslFx | null)?, string?];
/** chat 行：[角色 key 或 '#'（系统消息）, 文本]。 */
export type DslChatLine = readonly [string, string];
/** avg 行：[角色 key / null（旁白）/ '#'（系统消息）, 文本]。 */
export type DslAvgLine = readonly [string | null, string];

export interface DslNode {
  /** 呈现模式：chat=聊天流 / avg=场景独白。 */
  readonly m?: 'chat' | 'avg';
  /** 顶栏章节名。 */
  readonly d?: string;
  /** 场景背景（新呈现里不直接使用，保留给未来的差分）。 */
  readonly bg?: string;
  /** 切换 BGM 曲目（daily/night/tense/end）。 */
  readonly bgm?: string;
  /** 场景立绘角色；null 表示不显示。 */
  readonly c?: string | null;
  /** chat 内容行。 */
  readonly b?: readonly DslChatLine[];
  /** avg 内容行。 */
  readonly l?: readonly DslAvgLine[];
  /** 选项组。 */
  readonly o?: readonly DslChoice[];
  /** 线性推进目标。 */
  readonly next?: string;
  /** 节点自带加成（只结算一次）。 */
  readonly fx?: DslFx;
  /** 分岔之夜标记：按「锁定对象 / 羁绊最高者」走向角色线。 */
  readonly j?: 'branch';
  /** 回合循环中枢标记：由引擎按 state 动态生成「对象支线 + 随机事件」。 */
  readonly loop?: boolean;
  /** 一次性 hub 标记（DSL 保留位，当前剧本未使用）。 */
  readonly hub?: boolean;
}

export type Script = Readonly<Record<string, DslNode>>;

/* ========================== 扁平剧本（执行格式） ========================== */

export interface ChoiceOption {
  readonly label: string;
  /** 实际发出的消息，缺省时等于 label */
  readonly say?: string;
  /** 纯动作型选项（文案是括号）：不当作发言，而是以旁白形式记入聊天流。 */
  readonly act?: boolean;
  readonly eff?: AffDelta;
  readonly stat?: StatDelta;
  readonly set?: FlagKey;
  readonly goto: Label;
}

export interface HubOption {
  /** 稳定去重键。 */
  readonly id: string;
  readonly label: string;
  readonly once?: boolean;
  readonly eff?: AffDelta;
  readonly stat?: StatDelta;
  readonly set?: FlagKey;
  readonly goto: Label;
}

/** 首轮的全员候选。 */
export interface LoopCandidate {
  readonly key: CharKey;
  readonly label: string;
  readonly entry: Label;
}

/** 锁定对象后的本命支线：每段一条，按顺序解锁。 */
export interface LoopSegment {
  readonly label: string;
  readonly entry: Label;
}

/** 随机事件池的一条。 */
export interface LoopEvent {
  readonly id: string;
  readonly label: string;
  readonly entry: Label;
  readonly risk?: boolean;
}

/** 回合循环中枢的全部配置——数据随节点走，因此校验器能看见它的每一条边。 */
export interface LoopConfig {
  readonly prompt: string;
  readonly candidates: readonly LoopCandidate[];
  readonly arcs: Readonly<Record<string, readonly LoopSegment[]>>;
  readonly events: readonly LoopEvent[];
  /** 羁绊阈值：达标即可推进主线 */
  readonly threshold: number;
  /** 锁定对象时的一次性羁绊加成 */
  readonly lockBonus: number;
  /** 每回合最多出现的随机事件数 */
  readonly eventsPerTurn: number;
  /** 「推进主线」的去向 */
  readonly advance: Label;
}

/** 分岔之夜：空気≥3 落「第 81 人」；否则走锁定对象（未锁定则取羁绊最高者）。 */
export interface BranchConfig {
  readonly prompt: string;
  readonly routes: Readonly<Record<string, Label>>;
  readonly beWhenAirless: BeId;
  readonly fallbackOrder: readonly CharKey[];
}

export type FlatNode =
  | { readonly kind: 'label'; name: Label }
  | { readonly kind: 'say'; readonly who: Speaker; readonly text: string }
  | { readonly kind: 'sys'; readonly text: string }
  | { readonly kind: 'note'; readonly text: string }
  | { readonly kind: 'card'; readonly who: CharKey }
  /** 舞台立绘：设置/清除右下角剪影，不产生消息。 */
  | { readonly kind: 'stage'; readonly who: CharKey | null }
  /** 切换顶栏章节名。 */
  | { readonly kind: 'chapter'; readonly title: string }
  | { readonly kind: 'bgm'; readonly track: TrackName }
  | { readonly kind: 'aff'; readonly eff: AffDelta }
  | { readonly kind: 'stat'; readonly delta: StatDelta }
  | { readonly kind: 'set'; readonly flag: FlagKey }
  | { readonly kind: 'goto'; readonly label: Label }
  | { readonly kind: 'choice'; readonly prompt: string; readonly options: readonly ChoiceOption[] }
  | { readonly kind: 'hub'; readonly prompt: string; readonly options: readonly HubOption[] }
  | { readonly kind: 'loop'; readonly config: LoopConfig }
  | { readonly kind: 'branch'; readonly config: BranchConfig }
  | { readonly kind: 'be'; readonly id: BeId }
  /** 角色线好结局：直接按 key 展示对应路线结局。 */
  | { readonly kind: 'ge'; readonly key: CharKey };

export type FlatScript = readonly FlatNode[];

export type LabelIndex = Readonly<Record<Label, number>>;

/** Bad End 文案。`tag` 恒为 "BAD END"，`who` 是这条结局的责任人。 */
export interface BadEndData {
  readonly tag: string;
  readonly who: string;
  readonly title: string;
  readonly text: string;
}

/** 路线结局文案（15 名可攻略角色各一条）。 */
export interface RouteEndingData {
  readonly title: string;
  readonly text: string;
}

export interface GameState {
  readonly schemaVersion: number;
  readonly aff: Record<CharKey, number>;
  /** 资质：z 真诚 / r 嘴臭 / m 卖弱 / q 空気 / w 水群 */
  readonly stats: Record<StatKey, number>;
  readonly flags: Partial<Record<FlagKey, boolean>>;
  readonly water: number;
  readonly members: number;
  /** 一次性标记：回合循环的支线 / 事件 / 锁定，键为 `seg0_<key>`、`ev_<id>`、`pick_<key>` */
  readonly hub: Record<string, boolean>;
  /** 复读检测：上一句被复读的内容 */
  readonly lastRepeat: string;
  /** 连续复读次数 */
  readonly repeatN: number;
  /** 回合循环：首次选定的攻略对象（锁定后不再更换） */
  readonly target: CharKey | null;
  /** 回合循环：已进行的回合数 */
  readonly turn: number;
  /** 已回收的结局（BE key / ge_<key>），供结局回收室显示 */
  readonly unlocked: readonly string[];
}

export type LogEntry =
  | { readonly kind: 'say'; readonly who: Speaker; readonly text: string }
  | { readonly kind: 'sys'; readonly text: string }
  | { readonly kind: 'note'; readonly text: string };

/** 关键节点首次抵达时的状态快照（不含 schemaVersion）。 */
export type CheckpointState = Omit<GameState, 'schemaVersion'>;

/** 游玩进度。属于 Session（存档单位），随存档一起序列化。 */
export interface SessionProgress {
  readonly visited: Record<string, true>;
  readonly checkpoints: Record<string, CheckpointState>;
  readonly historyLens: Record<string, number>;
}

/** 存档单位：状态 + 剧本指针 + 历史 + 进度。四者都是纯 JSON。 */
export interface Session {
  state: GameState;
  /** 剧本节点指针：指向「下一个待执行节点」 */
  ip: number;
  history: LogEntry[];
  progress: SessionProgress;
}

/** 等待时长策略。快进开关在这里生效。 */
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

export interface StatToastItem {
  readonly key: StatKey;
  readonly delta: number;
}

/** 引擎驱动界面的唯一出口。引擎不含 DOM，所有副作用经此发生。 */
export interface Renderer {
  /** 切换顶栏章节名。 */
  setChapter(title: string): void;
  say(who: Speaker, text: string): Promise<void>;
  sys(text: string): Promise<void>;
  note(text: string): Promise<void>;
  card(who: CharKey): Promise<void>;
  /** 舞台立绘：常驻右下角的剪影，比 card 轻。 */
  stage(who: CharKey | null): void;
  bgm(track: TrackName): void;
  /** 羁绊度变化：状态已由引擎结算，这里只负责展示 */
  affToast(items: readonly AffToastItem[]): void;
  /** 资质变化：状态已由引擎结算，这里只负责展示 */
  statToast(items: readonly StatToastItem[]): void;
  toast(text: string): void;
  askChoice(prompt: string, options: readonly ChoiceOption[]): Promise<number>;
  askHub(prompt: string, options: readonly HubOption[]): Promise<number>;
  showBE(id: BeId): Promise<void>;
  showEnding(resolution: EndingResolution, session: Session): Promise<void>;
  readonly delays: DelayPolicy;
}