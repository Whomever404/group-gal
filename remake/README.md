# remake/ · 群聊 Galgame 空骨架

**只有游戏架构，没有剧情。** 引擎、界面、存档、回想、路线图、结局回收室、夜晚回合循环都在，
剧本被清空成一份占位示例（节点数 **97**，对比根目录完整版的 1249）。
新剧情全部写在 [`src/content/`](src/content/)，其余目录不用动。

```bash
npm install
npm run dev            # 开发服务器（改 content/ 即时热更新）
npm run build          # 产出可玩的单文件 dist/index.html（双击即玩）
npm run check:script   # 剧本图校验：跳转 / 角色键 / 结局文案 / 可达性 / 循环去重键
npm run smoke          # 无头引擎测试：跑一遍完整流程
npm run check:build    # 用 jsdom 真加载产物走一遍
```

## 哪些要改，哪些不要动

| 目录 | 角色 | 说明 |
|------|------|------|
| `src/content/` | ✍️ **要改的只有这里** | 剧本、角色、事件、结局、运营配置 |
| `src/engine/` | 🔒 架构 | 节点解释器、校验器、存档、结算。零 DOM 依赖 |
| `src/ui/` | 🔒 架构 | QQ 群聊界面、galgame 排版、各面板 |
| `src/audio/` `src/styles/` | 🔒 架构 | Web Audio 合成 BGM、四块样式 |
| `tools/` | 🔧 测试 | 断言里有少量剧情关键字，改剧情后可能要跟着改 |

`src/content/` 里每个文件现在都是**占位示例**，逐条读一遍就知道格式：

| 文件 | 内容 | 现在是什么 |
|------|------|-----------|
| [`script.ts`](src/content/script.ts) | 主线剧本 | 序章(avg) → 开场群聊(chat + 3 选项) → 推进 → 回合循环 → 分岔之夜 |
| [`arcs/demo.ts`](src/content/arcs/demo.ts) | 支线样板 | ① 群日常段(chat) ② 深夜私聊段(avg)，两段都回中枢 |
| [`events.ts`](src/content/events.ts) | 随机事件池 | 1 个日常 + 1 个风险 |
| [`loop.ts`](src/content/loop.ts) | 夜晚运营配置 | 15 个候选、15 个支线槽位（全指向 demo）、羁绊阈值 12 |
| [`route.ts`](src/content/route.ts) | 分岔之夜去向 | 15 条线全部直连各自的好结局端子 |
| [`endings.ts`](src/content/endings.ts) | 结局数据 | 4 个示例坏结局 + 15 个好结局槽位 |
| [`characters.ts`](src/content/characters.ts) | 角色表 | **保留**：16 位群友（15 可攻略 + 反派蘑菇汤），键名与立绘配件不变 |
| [`rules.ts`](src/content/rules.ts) | 群规数值 | 复读刷屏、空気结局落哪个 BE |
| [`adapt.ts`](src/content/adapt.ts) [`index.ts`](src/content/index.ts) | 架构 | DSL → 执行格式的唯一转换点与内容索引，一般不用动 |

## 写一章新剧情的流程

1. **主线**：在 `script.ts` 里加节点。节点是「id → 定义」的映射，`o:[...]` 就是选择点，
   `next:"id"` 是直线推进；`__end_<坏结局 id>` 跳坏结局，`__ge_<角色键>` 跳该角色的好结局。
2. **支线**：照 `arcs/demo.ts` 新建 `arcs/<角色键>.ts`，写好后把 `loop.ts` 里
   `ARC_STEPS` 那一行的 `['demo_seg1','demo_seg2']` 换成你自己的两个节点 id。
3. **随机事件**：在 `events.ts` 的 `EVENTS` 里加一条，`entry` 指向你写的节点，节点以 `next:"loop"` 收尾。
4. **第四章（分岔之夜之后）**：在 `script.ts` 里给角色写收尾节点，把 `route.ts` 的
   `ROUTE_START` 从 `__ge_<角色键>` 改成那个节点 id。
5. **坏结局**：在 `endings.ts` 的 `BEDATA` 里加条目，剧本里用 `__end_<id>` 触发。
   （`engine/types.ts` 的 `BeId` 现在留成 `string`；结局写定后可以收成联合，拼错就会被类型检查拦下。）
6. **校验**：`npm run check:script`。它会拦住拼错的跳转、不存在的角色键、缺文案的结局、
   不可达的节点、撞车的循环去重键——**构建也会先跑它**，剧本写坏则构建失败。

## 已就位的机制（不用重新实现）

- **夜晚回合循环**：首轮从 15 人里锁定一名攻略对象（+2 羁绊），之后每晚只出 TA 的本命支线
  与 1~2 个随机事件；羁绊到阈值或支线走完即可推进主线。
- **资质**：真诚 / 嘴臭 / 卖弱 / 空気 / 水群，选项上用 `s:{z:1}` 这类写法加；
  分岔之夜看空気（≥3 落坏结局）。
- **复读 / 禁言**：同一句话连续复读 3 次会被禁言（播哪个结局见 `rules.ts`）。
- **结局回收室**：坏结局按 `BEDATA` 收集，好结局按 15 个槽位收集；未解锁只显示占位。
- **其它**：自动存档 + 3 个手动槽（v1/v2 老存档自动迁移）、回想、路线图、设置、音量、
  「点击 / 空格推进」、无外部资源的 SVG 剪影立绘与 Web Audio 合成 BGM。

## 与根目录版本的关系

根目录是**当前完整版**（统一版：同一套架构 + 我们写的 15 条角色线剧本），
`remake/` 是从它复制出来的**剧情清零副本**——因此两边引擎同源，改这里不会影响根目录。
如果决定用这份骨架重建剧情，可以反向操作：让根目录换成这份骨架，再删掉这个副本（避免两份代码漂移）。