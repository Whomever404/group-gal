# group-gal · 《😂群聊 · 全群攻陷计划》

把两批真实 QQ 音游群聊记录（`members.zip`，5,325 条 / 52 名发言者）与一份成员画像分析报告（`report.pdf`）
改编成的**单文件离线 Galgame**：你作为第 81 位群友入群，在一群嘴硬心软的人中间选择怎么说话。

- **15 条角色线 + 23 个坏结局**，剧本按群友的说话方式整体重写
- **夜间运营**：先锁定一名攻略对象，之后每晚只走 TA 的本命支线 + 1~2 个随机事件
- 引擎（Vite + TypeScript）与剧本数据分离：`src/engine/` 零 DOM 依赖，整张剧情图可被无头测试
- 剧本图校验器是**构建前置**：跳转写错、角色键拼错、Bad End 缺文案、节点不可达都会让构建失败
- 构建产物是自包含单文件（`dist/index.html`），双击即玩、离线可玩、可直接发给别人

## 快速开始

```bash
npm install
npm run dev        # 开发服务器 + HMR
npm run build      # 产出单文件：dist/index.html

./start.sh         # 起本地服务器（默认 8931），并打印 file:// 直开链接
```

不想装环境？直接双击仓库根目录的 **`group-chat-galgame-v2-modular.html`**（就是 `dist/index.html` 的副本）。

## 玩法

| 操作 | 说明 |
|------|------|
| 点击 / 空格 | 推进对话 |
| 选项 | 在 QQ 输入条上方「弹出」的候选里挑一句发出去 |
| ⋯ 群工具 | 群成员羁绊 / 回想 / 存档（3 槽 + 自动）/ 设置 / 路线图 / 结局回收室 |
| 复读 | 复读上一条群消息涨水群值；同一句连续刷 3 次会被禁言（Bad End） |
| 快进 | 跳过等待延时 |

**运营机制**：第二章是回合循环中枢。首轮从 15 条全员支线里挑一个攻略对象（选中即锁定，羁绊 +2）；
此后每回合只出 TA 的**两段本命支线** + **1~2 条随机事件**（日常为主、少量风险）；
羁绊攒到阈值（12）或支线走完，就解锁「推进主线」。散场之夜按已锁定对象走向各自角色线；
若「空気」攒到 3 以上，则落「第 81 人」Bad End——没有人记得你来过。

## 结构

```
序章 → 第一章 新人报道 → 第二章 群日常（回合循环运营）→ 第三章 躲猫猫之夜 → 第四章 分岔 → 15 条角色线
```

## 工程结构

```
src/
  engine/          引擎：零 DOM，全部副作用经注入的 Renderer 发生
    types.ts       两套剧本模型的类型：DSL（书写）与扁平剧本（执行）
    runner.ts      指令表解释器 + 回合循环 / 分岔之夜的运行规则
    validate.ts    剧本图校验（跳转、角色键、BE 文案、可达性、循环去重键）
    route-map.ts   路线图推导 + 关键节点状态快照
    persist.ts     存档序列化与**防御性**反序列化（坏存档一律拒绝，不白屏）
    effects.ts     羁绊 / 资质结算、复读判定
  content/         剧本：写作格式是命名节点表，由 adapt.ts 展平成指令表
    script.ts      主线（序章 / 第一章 / 中枢 / 第三、四章 / 15 条角色线 / 15 段好结局）
    arcs/*.ts      15 名角色的追加支线（每人两段）
    events.ts      随机事件池（6 日常 + 4 风险）
    loop.ts        回合循环配置（候选 / 支线 / 阈值）
    characters.ts  16 名角色（15 可攻略 + 1 反派）
    endings.ts     23 个 Bad End 文案
    adapt.ts       DSL → 扁平剧本的唯一转换点
  ui/              界面：QQ 群聊客户端 + galgame 排版，含回想 / 存档 / 设置 / 路线图 / 回收室
  audio/bgm.ts     内置 Web Audio 实时合成 BGM（免版权、离线可播）
tools/
  smoke.ts         无头引擎测试（npm run smoke）：运营机制 / 支线 / 阈值 / 分岔 / 结局 / 存档往返
  boot-check.mjs   构建产物端到端测试（npm run check:build）：真加载单文件 HTML 走一遍流程
```

## 校验

```bash
npm run typecheck          # TypeScript 零错误
npm run check:script       # 剧本图：1249 个节点、165 个 label、0 错误 0 警告
npm run smoke              # 无头引擎测试
npm run build              # 单文件产物 + 校验前置
npm run check:build        # 用 jsdom 加载产物，跑到回合循环并验证运营规则
```

## 仓库里的其它东西

| 文件 | 说明 |
|------|------|
| `group-chat-galgame-v2-modular.html` | ★ 当前版本的单文件构建（即 `dist/index.html`） |
| `group-chat-galgame-v2.html` | v2.0 剧本单文件（重写版剧本的原始出处，历史版本） |
| `group-chat-galgame-v1.html` | v1.0 合并版（以豆包版剧情为底 + 机制合并） |
| `group-chat-galgame.html` | 版本一：v0.2 可玩 Demo（世界观与角色来源） |
| `啥子豆包版本.html` | 版本二：豆包版 v1.0（引擎能力来源） |
| `members.zip` / `report.pdf` | 群聊记录（原始导出）/ 综合分析报告 |
| `dialogues/` | 群友对话按人拆分（52 个文件 + INDEX.md） |
| `skills/immortals/` | **20 位群友的数字永生人设包**（immortal-skill 框架） |
| `skills/immortal-skill/` | 数字永生框架本体（vendored） |
| `docs/` | Code Wiki（架构 / 引擎 / 剧本 DSL / 素材管线 / 版本对比）。其中涉及旧 `src/` 的部分写于本次整合之前 |
| `tools/*.py` | 语料管线：对话拆分 / 语料摘要 / 人设包质检 / 引文溯源审计 |

## 版本关系

```
group-chat-galgame.html (v0.2) ──世界观 / 角色──► v2.0 剧本重写 ──┐
啥子豆包版本.html (v1)         ──引擎能力──────► v1.0 合并版 ──┤
                                                              ▼
                              Vite + TypeScript 模块化引擎（LanGYou 的两版重写）
                                                              ▼
                                  本版：统一的工程 + 重写剧本 + 夜间运营机制
```

> 所有角色均为基于群聊行为特征的二次虚构，与现实人物无关。