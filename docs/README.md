# Code Wiki · group-gal

> 《😂群聊 · 全群攻陷计划》—— 把真实 QQ 群聊记录与成员画像报告改编成的 **单文件离线 Galgame**。
> 本 Wiki 覆盖**当前版本**（仓库根目录的 Vite + TypeScript 工程）以及历史资产
> （两代单文件 HTML、群聊记录、分析报告、人设包）。

---

## 1. 项目一句话

把 5,325 条 QQ 群聊记录（52 名发言者 / 80 人名册）与一份成员画像分析报告，改写成一款
**双击即玩、无需联网、零运行时依赖**的聊天流 Galgame：序章 → 第一章 → 第二章「群日常」（夜间运营）→
第三、四章 → **15 条角色线**；另有 **23 个坏结局**可在「结局回收室」收集。

## 2. 当前版本速览

| 项 | 值 |
|----|----|
| 工程 | Vite 7 + TypeScript（strict），根目录 `src/`（engine / content / ui / audio / styles） |
| 产物 | `npm run build` → **`dist/index.html`**（自包含单文件，零外部引用，约 145 kB） |
| 立刻玩 | 双击仓库根目录的 `group-chat-galgame-v2-modular.html`，或 `./start.sh` 起本地服务器 |
| 内容规模 | 角色 16（可攻略 15）· 扁平节点 1249（label 165）· 坏结局 23 · 角色线 15 |
| 校验 | `npm run check:script` 是**构建前置**（写坏则构建失败）；`npm run typecheck` / `npm run smoke` / `npm run check:build` |

## 3. 文档地图

| # | 文档 | 内容 |
|---|------|------|
| 01 | [项目总览](./01-项目总览.md) | 项目定位、当前仓库结构、三代版本谱系、技术栈、玩法概述、素材来源 |
| 02 | [整体架构](./02-整体架构.md) | 四层架构、两套剧本模型、数据流、`Renderer` 唯一接缝、界面结构、模块职责速查 |
| 03 | [核心引擎与关键函数](./03-核心引擎与关键函数.md) | 节点解释器、18 种节点、回合循环、分岔之夜、结局、结算、复读、校验器、存档、函数速查 |
| 04 | [数据模型与剧本 DSL](./04-数据模型与剧本DSL.md) | 怎么写剧本：DSL 字段速查、扁平节点全表、循环配置、状态对象、结局数据、加剧情的步骤 |
| 05 | [依赖关系与运行方式](./05-依赖关系与运行方式.md) | 环境要求、依赖、全部命令、三种游玩方式、构建产物、校验与测试、键位、存档、常见问题 |
| 06 | [参考素材与内容管线](./06-参考素材与内容管线.md) | 素材（`legacy/materials/` 里的 members.zip / report.pdf）解读、角色映射表、群文化 → 机制映射、内容生产流程、伦理红线 |
| 07 | [版本对比与合并说明](./07-版本对比与v1.0合并说明.md) | v0.2 / 豆包版 / v1.0 / v2.0 对比与合并过程、修过的缺陷、结局总表、**§9 统一版（当前主版本）** |

## 4. 我想做什么 → 看哪一篇

| 我想… | 怎么做 |
|-------|--------|
| 直接玩 | 双击 `group-chat-galgame-v2-modular.html`（**不要**双击 `index.html`，那是开发入口） |
| 起本地服务器玩 | `./start.sh`（默认 8931，同时打印 `file://` 直开链接） |
| 改代码做开发 | `npm install && npm run dev` |
| 了解工程怎么分层 | [02-整体架构](./02-整体架构.md) |
| 看懂引擎怎么跑 | [03-核心引擎与关键函数](./03-核心引擎与关键函数.md) |
| 加一段剧情 | [04-数据模型与剧本 DSL](./04-数据模型与剧本DSL.md) 的「加剧情的操作步骤」 |
| 确认剧本没写坏 | `npm run check:script`（跳转 / 角色键 / BE 文案 / 可达性都会检查） |
| 跑一遍自动化验证 | `npm run smoke`（无头引擎）+ `npm run check:build`（真加载产物走一遍） |
| 看群友人设档案 | [legacy/materials/skills/immortals/README.md](../legacy/materials/skills/immortals/README.md)（20 位群友的语料蒸馏人设包） |
| 查历史版本 | [07-版本对比与合并说明](./07-版本对比与v1.0合并说明.md) |

## 5. 三代版本速查

| 代 | 代表文件 | 引擎特征 | 剧本 | 结局 |
|----|---------|---------|------|------|
| 单文件 v0.2 | `legacy/versions/group-chat-galgame.html` | 数组剧本 + 线性播放；复读 / 水群值 / 成员抽屉 | 原作 | 7 线序章 + 9 BE |
| 单文件 豆包版 | `legacy/versions/啥子豆包版本.html` | 节点图 + 打字机 + 存档 + 回收室（含 3 处缺陷） | 豆包创作 | 15 线 + 18 BE |
| 单文件 v1.0 | `legacy/versions/group-chat-galgame-v1.html` | 豆包版引擎 + v0.2 机制合并 + 缺陷修复 | 豆包剧情为底 | 15 线 + 23 BE |
| 单文件 v2.0 | `legacy/versions/group-chat-galgame-v2.html` | v1 引擎 + hub 一次性支线 + 配件立绘 | **全部重写**（零引用豆包台词） | 15 线 + 23 BE |
| Vite + TS 重写 | （LanGYou 的 `remake`，已并入本版） | 引擎零 DOM、剧本图校验器、回想 / 多槽存档 / 路线图 | 原版搬运 | 11 线 + 9 BE |
| **统一版** ★ | 根目录工程 + `dist/index.html` | **remake 的引擎与界面 + 我们的剧本与夜间运营** | **v2.0 重写版** | **15 线 + 23 BE** |

## 6. 仓库文件一览

**根目录只留当前版本**（工程、产物、文档）；上一代的东西全部收在 `legacy/`。

```
/workspace
├── README.md                              # 仓库根说明
├── index.html                             # Vite 开发入口（含启动兜底提示）
├── package.json / package-lock.json / vite.config.ts / tsconfig.json
├── start.sh                               # 本地服务器 + file:// 双保险
├── group-chat-galgame-v2-modular.html     # ★ 当前版本的单文件构建（dist/index.html 的副本）
├── src/
│   ├── engine/                            # types / runner / effects / validate / route-map / persist
│   ├── content/                           # script + arcs/* + events + loop + characters + endings + adapt
│   ├── ui/                                # shell / chat / composer / overlay / 各面板 / renderer
│   ├── audio/bgm.ts                       # Web Audio 实时合成
│   └── styles/                            # tokens / title / chat / chrome
├── tools/
│   ├── smoke.ts                           # 无头引擎测试（npm run smoke）
│   └── boot-check.mjs                     # 构建产物端到端测试（npm run check:build）
├── dist/                                  # npm run build 的产物（gitignore）
├── docs/                                  # 本 Code Wiki
└── legacy/                                # 历史资产：旧版本 / 老工具 / 源素材与人设管线
    ├── README.md                          # 这里是什么、怎么跑
    ├── versions/                          # v0.2 / 豆包版 / v1.0 / v2.0 四份单文件历史版本（都能双击玩）
    ├── tools/                             # validate.js · smoke-test.js（上一代单文件版的校验与冒烟）
    └── materials/                         # members.zip · report.pdf · dialogues/ · skills/
        └── pipeline/                      # 语料管线：split-dialogues / mine-persona-evidence / verify-personas / audit-quotes
```