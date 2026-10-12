# 04 · 数据模型与剧本 DSL

> 本文以大整合后的**仓库根目录工程**（`src/`，Vite + TypeScript 重写版引擎与界面）为准，
> 描述三样东西：**剧本数据长什么样、怎么书写、状态对象有哪些字段**。
> 它是给「要加剧情的人」看的——不解释引擎怎么跑（那在 [03-核心引擎与关键函数](./03-核心引擎与关键函数.md)）。
>
> 一句话结论：**剧本有两套模型并存**——作者写的是 **DSL**（命名节点表 `Script`），
> 引擎跑的是 **扁平剧本**（指令表 `FlatScript`），`src/content/adapt.ts` 是两者之间**唯一**的转换点。
> 结局端子（`@be:` / `@ge:`）由 `adapt.ts` 从跳转目标里自动收集，写剧本的人**不需要手动定义它们**。

---

## 1. 两套模型一览

| 维度 | DSL（书写格式） | 扁平剧本（执行格式） |
|------|----------------|---------------------|
| 类型 | `Script = Readonly<Record<string, DslNode>>` | `FlatScript = readonly FlatNode[]` |
| 形态 | 以「节点 id → 节点对象」命名的字典 | 一维指令数组 + 线性 `ip` 指针 |
| 面向 | 剧本作者 | 引擎 `run()` |
| 跳转 | 按 id 命名引用（`next` / 选项第 2 位） | 按 label 名字引用（`goto.label`） |
| 内容行 | `b`（chat）/ `l`（avg）两种字段 | `say` / `sys` / `note` 三种指令 |
| 好处 | 命名、显式、中文注释友好 | 可达性 / 跳转 / 快照都能被机械校验 |
| 位置 | `src/content/script.ts`、`src/content/arcs/*.ts`、`src/content/events.ts` | `src/content/index.ts` 的 `SCRIPT`（=`buildFlat(NODES)`） |

**转换器 `src/content/adapt.ts`**：`buildFlat(script)` 逐节点把每个 `DslNode` 展平成一串 `FlatNode`，
再把结局端子追加到**末尾**。它是唯一转换点，因此「写作时的便利」与「执行时的可验证性」不会漂移。

同一个节点的两种形态（最小对比）：

```ts
// —— DSL：作者写的（content/script.ts）——
s_nao2: { m: 'chat', b: [['nanao', '行 有点意思']], next: 'loop' },
```

```ts
// —— 扁平剧本：adapt.ts 展平后引擎读的（同序遍历得到）——
{ kind: 'label', name: 's_nao2' },
{ kind: 'stage', who: null },          // chat 节点统一清空舞台立绘
{ kind: 'say', who: 'nanao', text: '行 有点意思' },
{ kind: 'goto', label: 'loop' },        // next → goto
```

> ⚠️ 顺序即执行顺序，`label` 存的是**绝对下标**。调整节点顺序后必须跑
> `npm run check:script` 确认可达性（脚本见 `package.json`，入口 `src/engine/validate.cli.ts`）。

---

## 2. DSL 节点速查

`DslNode`（见 `src/engine/types.ts`）里**所有字段都是可选的**——一个节点的「类型」由出现的字段组合决定，
没有独立的 `type` 字段。

| 字段 | 类型 | 含义 | 取值 | 必填 |
|------|------|------|------|------|
| `m` | `'chat' \| 'avg'` | 呈现模式 | `chat` 聊天流 / `avg` 场景独白 | 可省（缺省按 `chat` 处理） |
| `d` | `string` | 顶栏章节名 | 如 `"第一章 · 新人报道"` | 可省 |
| `bg` | `string` | 场景背景（新呈现里不直接使用，保留给未来差分） | 剧本中出现的：`room` / `night` / `mc` / `dusk` / `arcade` / `lab` | 可省 |
| `bgm` | `string` | 切换 BGM 曲目 | `daily` / `night` / `tense` / `end` | 可省 |
| `c` | `string \| null` | avg 场景立绘角色；`null` = 不显示 | 角色 key 或 `null`（`'you'` 等价于不显示） | 可省 |
| `b` | `readonly DslChatLine[]` | chat 内容行 | `[[说话人, 文本], …]` | chat 节点用它 |
| `l` | `readonly DslAvgLine[]` | avg 内容行 | `[[说话人\|null, 文本], …]` | avg 节点用它 |
| `o` | `readonly DslChoice[]` | 选项组 | 见下「选项四位结构」 | 与 `next` 二选一 |
| `next` | `string` | 线性推进目标 | 节点 id / `__end_*` / `__ge_*` | 与 `o` 二选一 |
| `fx` | `DslFx` | 节点自带加成（进入即结算一次） | 见下「fx」 | 可省 |
| `j` | `'branch'` | 分岔之夜：按「锁定对象 / 羁绊最高者」走向角色线 | 仅 `"branch"` | 可省 |
| `loop` | `boolean` | 回合循环中枢：由引擎按 state 动态生成「对象支线 + 随机事件」 | `true` | 可省 |
| `hub` | `boolean` | 一次性 hub 标记（DSL 保留位，**当前剧本未使用**） | `true` | 可省 |

### 2.1 两种呈现模式的写法差异

- **`m:'chat'`（聊天流）**：内容写在 `b` 里，每行 `[说话人, 文本]`。说话人是**角色 key** 或 `'#'`（系统消息）。
  节点里**不产生立绘**（`adapt.ts` 对 chat 节点统一 push `{ kind:'stage', who:null }`，`c` 字段在 chat 下不被读取）。
- **`m:'avg'`（场景独白）**：内容写在 `l` 里，每行 `[说话人 | null, 文本]`——`null` 是**旁白**、`'#'` 是**系统消息**、
  其余是角色发言。节点用 `c` 设置舞台立绘：`adapt.ts` 会**先重置舞台再按 `c` 立起来**。

```ts
// chat：聊天三连 + 选项（节选自 s_nao1 / s_nao2）
s_nao1: { m: 'chat', bgm: 'tense',
  b: [['nanao', '@全体成员 我点个名'],
      ['tttt', '不是我'],
      ['nanao', '谁不服 现在说 别憋着']],
  o: [['@闹七 你说得对，但你也别每次都用解散吓人。这两件事我都认', 's_nao2', { a: { nanao: 3 }, s: { z: 1 } }],
      ['群主凶什么凶，一天到晚装什么', 's_nao2', { a: { nanao: -2, g: 1 }, s: { r: 2 } }]] },

// avg：旁白 + 立绘 + 角色独白（节选自 start）
start: { m: 'avg', bg: 'room', bgm: 'night', d: '序章', c: null,
  l: [[null, '十一点四十七分。宿舍熄灯，充电器在枕边发烫，屏幕是屋里唯一的光。'],
      ['gen', '（消息）拉你进个群。里面人都挺好的。']],
  next: 'a1' },
```

### 2.2 选项 `o` 的四位结构

`DslChoice = readonly [按钮文案, 跳转目标, 加成?, 一次性标记?]`

| 位 | 类型 | 含义 | 必填 |
|----|------|------|------|
| `o[0]` | `string` | 按钮文案。若整体被**中文括号**包住（如 `（先不说话……）`），会被 `adapt.ts` 判定为**动作型选项** | ✅ |
| `o[1]` | `string` | 跳转目标：节点 id / `__end_*` / `__ge_*` | ✅ |
| `o[2]` | `DslFx \| null` | 该选项的加成 | 可省 |
| `o[3]` | `string` | 一次性标记（**保留位**：当前 `adapt.ts` 不读取它；回合循环的去重改由引擎生成的 `pick_/seg/ev_` 键负责） | 可省 |

### 2.3 加成 `DslFx`

`DslFx = { a?: Record<string, number>; s?: StatDelta; f?: string }`

| 键 | 含义 | 取值 | 当前接线情况 |
|----|------|------|-------------|
| `a` | **羁绊**（好感度） | `{ 角色key: 增减值 }`，支持负值；非 hero 角色会被引擎忽略 | `adapt.toFx` 转成扁平 `eff`（`AffDelta`） |
| `s` | **资质** | `{ z/r/m/q/w: 增减值 }`（`StatDelta`） | `adapt.toFx` 转成扁平 `stat` |
| `f` | **标记**（flag） | 标志名字符串 | 类型里已声明；当前 `adapt.ts` **只转 `a`/`s`**，`f` 尚未接线到扁平 `set` 节点 |

其中 `a` 的键是 `CharKey`，`s` 的键是 `StatKey = 'z' | 'r' | 'm' | 'q' | 'w'`，中文分别是
**z 真诚 / r 嘴臭 / m 卖弱 / q 空気 / w 水群**（见 `src/engine/effects.ts` 的 `STAT_NAME`）。

> 节点级 `fx` 与选项级 `o[2]` 都用同一个 `DslFx`。节点级 `fx` 会被 `adapt.ts` 放成紧跟 `label` 的
> `aff` / `stat` 节点（只结算一次）；选项级 `fx` 挂在 `ChoiceOption` 的 `eff` / `stat` 上。

---

## 3. 跳转与结局端子

### 3.1 两种跳转写法

- **线性推进**：节点写 `next:'<目标>'`，`adapt.ts` 转成扁平 `{ kind:'goto', label:<目标> }`。
- **分支跳转**：选项写 `o:[['文案', '<目标>', fx?], …]`，每个选项的 `o[1]` 转成该 `ChoiceOption` 的 `goto`。

目标既可以是普通节点 id，也可以是两个**特殊目标**：

| 写法 | 含义 |
|------|------|
| `'__end_<id>'` | 进入 Bad End，`<id>` 是 `BeId`（如 `__end_b24` → `b24 刷屏 END`、`__end_bn` → 群主辞职 END） |
| `'__ge_<key>'` | 进入某条角色线好结局，`<key>` 是 `CharKey`（如 `__ge_nanao`） |

### 3.2 特殊目标如何被收集成端子

`adapt.ts` 里有两个配合的函数：

- `targetLabel(t)`：把 `__end_*` / `__ge_*` 换算成端子 label——
  `__end_` → `@be:<id>`、`__ge_` → `@ge:<key>`；普通目标原样返回。
- `collectTerminals(script)`：遍历 **每个节点的 `next` 与每个选项的 `o[1]`**，
  凡是以 `__end_` / `__ge_` 开头的目标，就在端子表里登记一条；`buildFlat` 最后把这些端子
  **按 `label` + 端子节点的形式追加到扁平剧本末尾**：

```ts
// buildFlat 末尾生成的端子（标签形如 @be:b24 / @ge:nanao）
for (const [label, node] of terminals) {
  out.push({ kind: 'label', name: label }, node);
}
// __end_b24 → { kind:'label', name:'@be:b24' } + { kind:'be', id:'b24' }
// __ge_nanao → { kind:'label', name:'@ge:nanao' } + { kind:'ge', key:'nanao' }
```

因此写剧本的人**只需要在 `next` / `o[1]` 里写 `__end_*` / `__ge_*`**，
端子节点、`@be:` / `@ge:` 这些 label 都由 `adapt.ts` 机械生成——**不需要手动定义**。
（把端子放在末尾而不是内联，正是为了让「剧本数据」与「机械生成的端子」在结构上分开。）

> 佐证：`content/script.ts` 里 15 条角色线的 GE 节点最后一句都是 `next:'__ge_<key>'`，
> 例如 `ge_nanao` 的 `next:'__ge_nanao'`、`ge_aka` 的 `next:'__ge_aka'`；角色线失败则收束到 `__end_*`。

---

## 4. 扁平节点全表（18 种 `FlatNode`）

引擎只认这一种。`FlatNode` 是一个以 `kind` 区分的联合（见 `src/engine/types.ts`）。

| `kind` | 字段 | 用途 |
|--------|------|------|
| `label` | `name: Label` | 节点起点标记；`buildLabelIndex` 记录其**绝对下标** |
| `say` | `who: Speaker`，`text: string` | 一条发言（角色气泡）；`who` 可为 `me` |
| `sys` | `text: string` | 系统消息（chat 的 `'#'` 行 / avg 的 `'#'` 行） |
| `note` | `text: string` | 旁白（avg 的 `null` 行） |
| `card` | `who: CharKey` | 角色卡片亮相（带停顿，比 `stage` 重） |
| `stage` | `who: CharKey \| null` | 舞台立绘：设置/清除右下角剪影，不产生消息 |
| `chapter` | `title: string` | 切换顶栏章节名 |
| `bgm` | `track: TrackName` | 切换 BGM（`chat` / `night` / `tension` / `warm`） |
| `aff` | `eff: AffDelta` | 结算一次羁绊变化 |
| `stat` | `delta: StatDelta` | 结算一次资质变化 |
| `set` | `flag: FlagKey` | 置一个剧情 flag |
| `goto` | `label: Label` | 无条件跳转 |
| `choice` | `prompt: string`，`options: readonly ChoiceOption[]` | 普通选项组 |
| `hub` | `prompt: string`，`options: readonly HubOption[]` | 一次性选项组（`once` 选项触发后隐藏；当前剧本未用） |
| `loop` | `config: LoopConfig` | 回合循环中枢：按 state 动态生成候选/支线/事件 |
| `branch` | `config: BranchConfig` | 分岔之夜：按 state 决定走向 |
| `be` | `id: BeId` | Bad End 端子 |
| `ge` | `key: CharKey` | 角色线好结局端子 |

配套的选项类型：

- `ChoiceOption`：`label`（按钮/发言文案）、`say?`（实际发出的消息，缺省等于 `label`）、
  `act?`（纯动作型，不当作发言）、`eff?`、`stat?`、`set?: FlagKey`、`goto`。
- `HubOption`：`id`（**稳定去重键**）、`label`、`once?`、`eff?`、`stat?`、`set?`、`goto`。
- `Speaker`：`CharKey | 'me'`；`TrackName`：`'chat' | 'night' | 'tension' | 'warm'`。

---

## 5. 回合循环的数据

回合循环（`loop` 节点）是第二章「群日常」的运营中枢。**配置随节点走**（`LoopConfig` 直接挂在
扁平 `loop` 节点上），所以校验器能看见它的每一条边。它的实际数据分三处：

```ts
export interface LoopConfig {
  readonly prompt: string;                              // 中枢提问文案（adapt.ts 常量：'今晚去哪边混？'）
  readonly candidates: readonly LoopCandidate[];        // 首轮全员候选
  readonly arcs: Readonly<Record<string, readonly LoopSegment[]>>; // 锁定后的本命支线
  readonly events: readonly LoopEvent[];                // 随机事件池
  readonly threshold: number;                           // 羁绊阈值：达标即可推进主线
  readonly lockBonus: number;                           // 锁定对象时的一次性羁绊加成
  readonly eventsPerTurn: number;                       // 每回合最多出现的随机事件数
  readonly advance: Label;                              // 「推进主线」的去向
}
```

| 字段 | 值来源 | 具体 |
|------|--------|------|
| `prompt` | `adapt.ts` 常量 `LOOP` | `'今晚去哪边混？'` |
| `candidates` | `content/loop.ts` 的 `CANDIDATES` | 每个可攻略角色一条，`entry` 取 `ARC_STEPS[key][0]` |
| `arcs` | `content/loop.ts` 的 `ARC_STEPS` | 每 key **两段**（群日常段 / 深夜私聊段），label 由 `adapt.ts` 生成（第一段 `【本命支线】…`、第二段 `【深夜私聊】…`） |
| `events` | `content/events.ts` 的 `EVENTS` | `entry` 取自每条事件的 `entry`，风险事件 label 前缀 `🎲 [风险] ` |
| `threshold` | `content/loop.ts` 的 `THRESHOLD` | `12` |
| `lockBonus` | `content/loop.ts` 的 `LOCK_BONUS` | `2` |
| `eventsPerTurn` | `content/loop.ts` 的 `EVENTS_PER_TURN` | `2` |
| `advance` | `content/loop.ts` 的 `LOOP_ADVANCE` | `'e1'`（第三章 · 躲猫猫之夜） |

**选项去重键的命名规则**（写入 `state.hub`，值为 `true`）：

| 键 | 生成方 | 对应 |
|----|--------|------|
| `pick_<key>` | `loopOptions` 首轮 | 首次选定的攻略对象（`<key>` 是 `CharKey`） |
| `seg<i>_<key>` | 锁定后的本命支线 | 第 `i` 段（0 起） |
| `ev_<id>` | 随机事件 | `<id>` 是事件的 `id`（如 `snack` / `flame` / `moku`） |
| `adv` | 阈值达标 / 支线走完 / 无其它选项时的兜底 | 「▶ 差不多了，推进主线」 |

**分岔之夜 `BranchConfig`**（`j:'branch'` 节点，数据来自 `content/route.ts`）：

```ts
{ prompt: '第四章 · 分岔',
  routes: ROUTE_START,        // 每个 CharKey → 角色线入口节点（如 nanao → 'r_nao1'）
  beWhenAirless: 'b81',       // 空気 ≥ 3 时落「第 81 人 END」
  fallbackOrder: PRIORITY }   // 未锁定时按羁绊最高者；平票按此顺序，靠前者胜
```

`PRIORITY` 与 `ROUTE_START` 都在 `content/route.ts`；`content/events.ts` 的事件节点（`EVENT_NODES`）
每条也以 `"loop"` 作为选项收尾，因此事件结束后回到中枢。

---

## 6. 角色表

`CharKey` 共 **16** 个：15 名可攻略角色 + 1 名反派。玩家自己走 `'me'`，**不进角色表**。

`Character`（见 `src/engine/types.ts`，表在 `content/characters.ts` 的 `CHARS`）：

| 字段 | 类型 | 含义 |
|------|------|------|
| `name` | `string` | 群昵称 |
| `sub` | `string` | 群里的自我签名（群名片） |
| `emoji` | `string` | 头像 emoji |
| `color` | `string` | 主题色 |
| `role` | `string` | 界面用的短标签 |
| `desc` | `string` | 简介（新版呈现里出现） |
| `hero` | `boolean` | **是否计入好感度**（= 可攻略角色） |
| `shape` | `SilhouetteShape` | 剪影形状（立绘配件） |

| key | name | emoji | shape | hero |
|-----|------|-------|-------|------|
| `nanao` | 闹七 | 👑 | `crown` | ✅ |
| `yu` | 一条鱼 | 🐟 | `fish` | ✅ |
| `cat` | 黄油猫 | 🐱 | `cat` | ✅ |
| `g` | G | 🅶 | `star` | ✅ |
| `shisuan` | 石蒜 | 🧄 | `garlic` | ✅ |
| `tttt` | Tttt | 🎭 | `mask` | ✅ |
| `shei` | 誰 | 🥚 | `egg` | ✅ |
| `shiban` | 石斑鱼 | 🐠 | `fin` | ✅ |
| `taffy` | taffy | 🧦 | `bucket` | ✅ |
| `c30586` | 30586 | 🍗 | `moon` | ✅ |
| `mianbao` | 面包 | 🥖 | `bread` | ✅ |
| `mibu` | 咪猫布 | 💊 | `pill` | ✅ |
| `linxi` | 凛～～熙 | 📈 | `chart` | ✅ |
| `gen` | 根哥 | 🧑‍🔧 | `wrench` | ✅ |
| `aka` | aka | 📉 | `wave` | ✅ |
| `moku` | 蘑菇汤 | 🍄 | `mushroom` | ❌ |

- `HERO_KEYS`（`content/characters.ts`）就是上表**除 `moku` 外的 15 人**，顺序即界面显示顺序，
  也是结局评选的**平票优先序**。
- **`moku` 是唯一的非可攻略角色**（`hero:false`，即反派蘑菇汤）：`applyEff` 按 `hero` 拒绝改动它的羁绊，
  因此它的 `aff` 恒为 `0`；它只会以反派出场（如风险事件「🍄 蘑菇汤在群里阴阳怪气」的 `s_moku1`、
  第三章 `e2a` 的「……我也来」），**没有角色线、没有 GE 槽位**。
- `SilhouetteShape` 取值：`crown / fish / cat / star / garlic / mask / egg / fin / bucket / moon /
  bread / wrench / wave / mushroom / pill / chart / dot`。

---

## 7. 状态对象

### 7.1 `GameState`（每局的状态）

| 字段 | 类型 | 含义 |
|------|------|------|
| `schemaVersion` | `number` | 状态结构版本（`SCHEMA_VERSION = 3`，见 `effects.ts`） |
| `aff` | `Record<CharKey, number>` | **羁绊**：16 个角色键全都要在，值 ≥ 0（非 hero 恒 0） |
| `stats` | `Record<StatKey, number>` | **资质**：`z/r/m/q/w` 五个键全都要在，值 ≥ 0 |
| `flags` | `Partial<Record<FlagKey, boolean>>` | 剧情 flag；`FlagKey = 'sheiTrap' | 'mokuJoin' | 'actGood' | 'actSkip'` |
| `water` | `number` | 水群值（复读累加） |
| `members` | `number` | 群成员数（初始 81） |
| `hub` | `Record<string, boolean>` | **一次性标记**：回合循环的支线 / 事件 / 锁定，键为 `seg<i>_<key>`、`ev_<id>`、`pick_<key>` |
| `lastRepeat` | `string` | 复读检测：上一句被复读的内容 |
| `repeatN` | `number` | 连续复读次数 |
| `target` | `CharKey \| null` | 回合循环：首次选定的攻略对象（锁定后不再更换） |
| `turn` | `number` | 回合循环：已进行的回合数 |
| `unlocked` | `readonly string[]` | 已回收的结局（BE key / `ge_<key>`），供结局回收室显示 |

### 7.2 `Session`（存档单位）与 `SessionProgress`

`Session` = 状态 + 剧本指针 + 历史 + 进度，**四者都是纯 JSON**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `state` | `GameState` | 上述状态 |
| `ip` | `number` | 剧本节点指针：指向「下一个待执行节点」，落在 `[0, scriptLength]` |
| `history` | `LogEntry[]` | 聊天记录（`say` / `sys` / `note` 三种） |
| `progress` | `SessionProgress` | 游玩进度 |

`SessionProgress`（随存档一起序列化）：

| 字段 | 类型 | 含义 |
|------|------|------|
| `visited` | `Record<string, true>` | 已抵达过的 label |
| `checkpoints` | `Record<string, CheckpointState>` | 关键节点首次抵达时的**状态快照**（`CheckpointState = Omit<GameState,'schemaVersion'>`，即不含版本号） |
| `historyLens` | `Record<string, number>` | 每个 label 处的历史回看游标（非负整数） |

### 7.3 「存档里会出现什么」示例

`serializeSession(session)` 输出的形状是 `{ v, ip, state, history, progress }`。
以下字段真实、值已缩短（角色键顺序与 `createInitialState` 一致）：

```json
{
  "v": 3,
  "ip": 214,
  "state": {
    "schemaVersion": 3,
    "aff": { "nanao": 12, "yu": 3, "cat": 0, "g": 0, "shisuan": 1, "tttt": 0,
             "shei": 0, "shiban": 0, "taffy": 0, "c30586": 0, "mianbao": 1,
             "mibu": 0, "linxi": 0, "gen": 2, "aka": 0, "moku": 0 },
    "stats": { "z": 4, "r": 1, "m": 0, "q": 1, "w": 2 },
    "flags": {},
    "water": 2,
    "members": 81,
    "hub": { "pick_nanao": true, "seg0_nanao": true, "ev_snack": true },
    "lastRepeat": "复读机成精了",
    "repeatN": 1,
    "target": "nanao",
    "turn": 3,
    "unlocked": ["b24"]
  },
  "history": [
    { "kind": "sys",  "text": "你被「根哥」邀请加入了群聊「😂群聊」" },
    { "kind": "say",  "who": "nanao", "text": "有新人 有新人" },
    { "kind": "say",  "who": "me",    "text": "各位好，根哥拉我进来的。" },
    { "kind": "note", "text": "（先不说话……）" }
  ],
  "progress": {
    "visited": { "start": true, "a1": true, "loop": true },
    "checkpoints": {
      "loop": {
        "aff": { "nanao": 4, "yu": 0, "cat": 0, "g": 0, "shisuan": 0, "tttt": 0,
                 "shei": 0, "shiban": 0, "taffy": 0, "c30586": 0, "mianbao": 0,
                 "mibu": 0, "linxi": 0, "gen": 1, "aka": 0, "moku": 0 },
        "stats": { "z": 2, "r": 0, "m": 0, "q": 0, "w": 0 },
        "flags": {}, "water": 0, "members": 81, "hub": {},
        "lastRepeat": "", "repeatN": 0, "target": null, "turn": 0, "unlocked": []
      }
    },
    "historyLens": { "loop": 42 }
  }
}
```

### 7.4 字段约束与迁移（`src/engine/persist.ts`）

存档来自 `localStorage`，属于**不可信输入**。反序列化的契约是：**任何畸形输入一律返回 `null`，
绝不抛错、绝不污染原型**（`__proto__` / `constructor` / `prototype` 一律拒绝）。

必存在 / 有硬约束的字段（否则整份存档作废）：

- `aff`：必须含**全部**角色键，值为有限非负数；`stats`：必须含 z/r/m/q/w，值为有限非负数。
- `flags`：只认 4 个已知 `FlagKey`，值必须是布尔。
- `hub`：键为任意字符串、值必须是布尔。
- `unlocked`：字符串数组。
- `water` / `members` / `repeatN` / `turn`：非负整数。
- `lastRepeat`：字符串；`target`：`null` 或合法 `CharKey`。
- `ip`：非负整数且在 `[0, scriptLength]` 内。

可缺省 / 由迁移补齐：

- `schemaVersion` 缺失时回落为 `SCHEMA_VERSION`。
- `SAVE_VERSION = 3`；`stats` / `target` / `turn` / `unlocked` 是自 v3 起新增，
  更早的存档由 `migrateSave` → `upgradeState` 逐级补齐（缺哪个字段就按新局初值补，
  初值来自 `createInitialState`）；无 `v` 的裸会话对象 / v1 / v2 都会先补默认资质、回合字段
  与空 `progress`（`createInitialProgress`）再升级；来自「未来」的版本一律拒绝。

---

## 8. 结局数据

### 8.1 两种结局文案

```ts
/** Bad End 文案。`tag` 恒为 "BAD END"，`who` 是这条结局的责任人。 */
export interface BadEndData {
  readonly tag: string;    // 恒为 "BAD END"
  readonly who: string;    // 责任人（角色名 / 「全群」/「群规」/「蘑菇汤」等）
  readonly title: string;  // 结局名，如 "刷屏 END"
  readonly text: string;   // 正文（空行分段、段内换行保留）
}

/** 路线结局文案（15 名可攻略角色各一条）。 */
export interface RouteEndingData {
  readonly title: string;
  readonly text: string;
}
```

`BEDATA`（`content/endings.ts`）是 `Record<BeId, BadEndData>`，**23 条**：

| `BeId` | who | title |
|--------|-----|-------|
| `b01` | 全群 | 老傻子 END |
| `b02` | G | 越级骂谱 END |
| `b05` | 黄油猫 | 成年话题 END |
| `b10` | 闹七 | 我很伤心 END |
| `b17` | 面包 | 面包没了 END |
| `b19` | 蘑菇汤 | 被挂 END |
| `b20` | 蘑菇汤 | 同化 END |
| `b24` | 群规 | 刷屏 END |
| `b81` | 全群 | 第 81 人 END |
| `bn` | 闹七 | 群主辞职 END |
| `by` | 一条鱼 | 3fps END |
| `bcat` | 黄油猫 | 猫爪 END |
| `bg` | G | 背刺 END |
| `bss` | 石蒜 | 无人点开 END |
| `bt` | Tttt | 对号入座 END |
| `bshei` | 誰 | 攻略失败 END |
| `bban` | 石斑鱼 | 围观 END |
| `btaf` | taffy | 鬼畜素材 END |
| `b305` | 30586 | 报名表 END |
| `bmibu` | 咪猫布 | 副作用 END |
| `blin` | 凛～～熙 | 捧杀 END |
| `bgen` | 根哥 | Ctrl+Z END |
| `baka` | aka | 爆仓 END |

> `BE_IDS = Object.keys(BEDATA)`；`BeId` 是这 23 个 key 的联合类型，全部由剧本节点显式触发
> （即 `next` / `o[1]` 里的 `__end_*`）。

### 8.2 好结局槽位与「文案即正文」

`GE_SLOTS`（`content/endings.ts`）是 **15** 个可攻略角色的 `CharKey` 数组，顺序即结局回收室的显示顺序：
`nanao, yu, cat, g, shisuan, tttt, shei, shiban, taffy, c30586, mianbao, mibu, linxi, gen, aka`。

**好结局文案是从 `ge_<key>` 场景节点里推导出来的**——见 `content/index.ts` 的 `ROUTE_ENDINGS`：

```ts
export const ROUTE_ENDINGS = Object.fromEntries(
  GE_SLOTS.map(key => {
    const seg = segmentOf('ge_' + key);                                 // 该 GE 节点名下的扁平区间
    const title = seg.find(n => n.kind === 'chapter')?.title;           // 取区间里的 chapter 标题
    const text  = seg.filter(n => n.kind === 'note').map(n => n.text).join('\n'); // 取区间里的全部旁白
    return [key, { title: title ?? `${CHARS[key].name} 线 · GOOD END`,
                   text: text || '（这条线的收尾没有旁白。）' }];
  }),
);
```

也就是说：玩家在游戏里**真正读到的那段收尾**（`ge_<key>` 节点里的 `chapter` + `note`）
就是结局卡的标题与正文，二者同源——因此**不存在「结局卡与正文不一致」**。
`segmentOf(label)` 取的是从该 label 起、到下一个 label 或剧本末尾之间的扁平节点。

---

## 9. 加剧情的操作步骤

以「给某个可攻略角色**新增一段支线**」为例：

1. **写节点**：在 `src/content/script.ts` 里（或该角色的 `src/content/arcs/<key>.ts` 模块里）新增
   `DslNode`。用例：`m:'chat'` 写 `b`，`m:'avg'` 写 `l` + `c`；用 `next` 或 `o` 串起来。
2. **收尾回到中枢**：普通支线段的最后一句写 `next:'loop'`，让玩家结束后回到回合循环中枢。
   （参考 `content/arcs/nanao.ts`、`yu.ts`、`g.ts`、`shei.ts` 的写法，它们都以 `next:'loop'` 收尾。）
3. **登记进中枢**：
   - 若是**首轮全员候选**：在 `src/content/loop.ts` 的 `CANDIDATES` 加一条 `{ key, label }`；
   - 若是**锁定后的本命支线**：在 `src/content/loop.ts` 的 `ARC_STEPS` 里给该 key 的段数组追加入口节点 id
     （第 0 段 = 群日常段，第 1 段 = 深夜私聊段）。
4. **（可选）新增随机事件**：在 `src/content/events.ts` 的 `EVENTS` 里加一条 `EventDef`
   （`id` / `kind:'daily'|'risk'` / `label` / `entry`），并把事件节点写进同文件的 `EVENT_NODES`；
   事件节点同样以 `"loop"` 收尾。
5. **（可选）结局**：若新支线要触发结局，直接 `next:'__end_<id>'` 或用选项 `o` 的第 2 位写
   `'__end_<id>'` / `'__ge_<key>'`；**端子节点不用手写**（见 §3）。
6. **验证**：跑 `npm run check:script`。它会检查起始 / 重复 label、跳转目标是否存在、角色键、
   BE 文案、`loop` 去重键是否冲突、可达性（`unreachable` 为 warn）、以及 flag 使用情况；
   **error 会让 `npm run build` 失败**。

> 去重键是自动的：候选 → `pick_<key>`、本命支线 → `seg<i>_<key>`、事件 → `ev_<id>`。
> 只要不重复登记同一节点，就不会撞键。

---

## 10. 写法约束（最容易踩的坑）

- **`'#'` 是系统消息**：在 chat 的 `b` 和 avg 的 `l` 里，说话人写 `'#'` 都会转成扁平 `sys` 节点
  （居中胶囊提示，不当作角色发言）。
- **`null` 是旁白**：只在 avg 的 `l` 里用；`[null, 文本]` 会转成扁平 `note` 节点（灰字旁白）。
  chat 的 `b` **没有**旁白位，用 `'#'` 表示系统消息。
- **`'you'` 是玩家自己的化名**：DSL 里写 `['you', 文本]`，`adapt.speakerOf` 会把它转成扁平侧的
  `'me'`（渲染成右侧气泡，不计好感度）。玩家自己**不在角色表**里。
- **选项文案整体被括号包住 = 动作**：`（先不说话……）` 这种**整体**被中文全角括号包住的文案，
  会被 `adapt.isAct` 判定为**动作型选项**——引擎把它以旁白（`note`）形式记入聊天流，
  **不当作「我」发出的消息**（不会写进 `history` 的 `say`，也不在右侧气泡里）。
  注意判定正则是 `/^（.*）$/`：必须是**首尾**都是全角括号的整句。
- **`fx` 的方向**：`a` 支持负值（掉好感），`s` 支持负值（如 `s:{r:1}` 只在嘴上加分）；
  `applyEff` 只会改动 `hero:true` 的角色，且结果**下限钳到 0**。
- **节点顺序即执行顺序**：扁平剧本的 `label` 存绝对下标，改动 `content/script.ts` 的节点顺序后，
  务必重跑 `npm run check:script`。