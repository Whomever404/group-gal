# group-gal

😂😂😂😂😂😂

把两批真实 QQ 群聊记录（`members.zip`，5,325 条 / 52 名发言者）与一份成员画像分析报告（`report.pdf`）
改编成的**单文件离线 Galgame**：《😂群聊 · 全群攻陷计划》。

## 快速开始

```bash
# 方式一（推荐）：启动脚本 —— 本地服务器 + file:// 双保险
./start.sh            # 默认 8931 端口；产物在 dist/index.html

# 方式二：直接双击单文件离线版（无需服务器，file:// 可玩）
#   group-chat-galgame-v2-modular.html        ← 当前主版本（模块化引擎构建）

# 方式三：自行构建
npm install && npm run build     # → dist/index.html（vite-plugin-singlefile 单文件）
```

- 结构：序章 → 第一章 新人报道 → 第二章「群日常」（**回合循环中枢**）→ 第三章 躲猫猫之夜 → 分岔 → **15 条角色线**
- 运营机制：**首轮**从 15 条全员支线里锁定一名攻略对象 → 此后每回合只出 TA 的**两段本命支线** + **1~2 个随机事件**（日常为主、少量风险）→ 羁绊达阈值即推进主线
- 结局：**15 个好结局 + 23 个坏结局**，全部可回收（结局回收室）
- 玩法：点击 / 空格推进，`A` 自动播放，`S` 文字速度，`Esc` 关闭弹窗；顶栏可看「群成员羁绊」与「复读」彩蛋

## 文件

| 文件 | 说明 |
|------|------|
| `group-chat-galgame-v2-modular.html` | ★ 当前主版本（模块化引擎构建，含回合循环运营机制，file:// 可玩） |
| `dist/index.html` | `npm run build` 生成的单文件产物（与上式同源） |
| `start.sh` | 启动脚本：本地服务器 + file:// 双保险 |
| `src/` | 模块化工程源码（引擎 / 内容 / UI 三层解耦，Vite + TypeScript） |
| `group-chat-galgame-v2.html` | v2.0 剧本版（单文件，剧情重写基线） |
| `group-chat-galgame-v1.html` | v1.0 合并版（以豆包版剧情为底 + 机制合并 + 缺陷修复） |
| `group-chat-galgame.html` | 版本一：v0.2 可玩 Demo（世界观与角色来源） |
| `啥子豆包版本.html` | 版本二：豆包版 v1.0（引擎能力来源） |
| `members.zip` / `report.pdf` | 群聊记录（原始导出）/ 综合分析报告 |
| `dialogues/` | 群友对话按人拆分（52 个文件 + INDEX.md，见 `tools/split-dialogues.py`） |
| `skills/immortals/` | **20 位群友的数字永生人设包**（immortal-skill 框架，索引见 [skills/immortals/README.md](skills/immortals/README.md)） |
| `skills/immortal-skill/` | 数字永生框架本体（vendored：SKILL.md / personas / prompts / kit） |
| `docs/` | Code Wiki（架构、引擎、剧本 DSL、运行方式、素材管线、版本对比） |
| `tools/validate.js` | 剧本完整性 + 全路线可达性校验（`node tools/validate.js`，零依赖） |
| `tools/smoke-loop.ts` | 无头引擎冒烟测试（`npm run smoke`）：回合循环 / 锁定 / 阈值推进 / 闹七支线 / 结局 |
| `tools/split-dialogues.py` · `tools/mine-persona-evidence.py` · `tools/verify-personas.py` · `tools/audit-quotes.py` | 对话拆分 / 语料摘要 / 人设包质检 / 引文溯源审计 |

## 版本关系

```
group-chat-galgame.html (v0.2)  ──世界观 / 角色 / 机制──►  group-chat-galgame-v2.html ★
啥子豆包版本.html (v1)          ──引擎能力──►  v1.0 合并版  ──引擎继承──►        （剧情全部重写）
```

> 所有角色均为基于群聊行为特征的二次虚构，与现实人物无关。