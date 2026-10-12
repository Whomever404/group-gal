# 人设档案室 · immortals

用 [`immortal-skill`](../immortal-skill/SKILL.md)（数字永生框架）把群聊记录蒸馏成的 **20 个「朋友」人设 Skill 包**。
每个包都是一份可加载的 Agent Skill：`SKILL.md` + 三个维度文件 + 冲突裁定 + `manifest.json` 指纹。

> 伦理声明：`ethics_note = personal-memorial` —— 产出物是**个人回忆与角色扮演练习的辅助工具**，
> 不构成对真人的冒充授权。包内不含 QQ 号与真实姓名；攻击性 / 成人向内容仅作行为描述，不复述原句；
> 其他群友的发言不纳入蒸馏（仅在印象区作为「他人提及」保留）。

## 人物一览（20 位）

| slug | 群友 | 群内身份 | 游戏角色 | 语料 | 证据（v/a/i） |
|---|---|---|---|---|---|
| [`nanao`](./nanao/) | **闹七（群主）** | 群主 / 服主 / 写谱者 | 闹七 | 1153 条 | interaction=14v+6a+3i; memory=8v+4a+2i; personality=14v+6a+3i |
| [`cat`](./cat/) | **黄油猫** | 守门猫 · 医学系 · 段子手 | 黄油猫 | 883 条 | personality=24v+5a+3i; interaction=15v+7a+3i; memory=13v+7a+3i |
| [`fuqin`](./fuqin/) | **根哥是我的父亲** | 管理员 · 写谱核心 | —（疑似 G 原型） | 543 条 | personality=20v+6a+3i; interaction=17v+4a+3i; memory=14v+4a+3i |
| [`shisuan`](./shisuan/) | **石蒜** | 写谱狂魔 · 本群即社交 | 石蒜 | 322 条 | personality=25v+3a+3i; interaction=18v+3a+3i; memory=16v+4a+3i |
| [`obra`](./obra/) | **Obra Dinn** | 深夜组队 · 游戏鉴赏 | — | 253 条 | personality=21v+7a+3i; interaction=17v+5a+3i; memory=15v+3a+2i |
| [`tttt`](./tttt/) | **Tttt** | 管理员 · 起外号/阴阳 | Tttt | 234 条 | personality=21v+7a+4i; interaction=17v+5a+3i; memory=14v+3a+2i |
| [`shei`](./shei/) | **誰 / 蛋蛋** | 群gal 攻略宅 · token 依赖 | 誰 | 233 条 | personality=23v+6a+3i; interaction=21v+2a+3i; memory=15v+2a+2i |
| [`aka`](./aka/) | **aka** | token 情报商 · 降智播报 | aka | 177 条 | interaction=17v+2a+3i; memory=14v+4a+2i; personality=22v+5a+3i |
| [`lusi`](./lusi/) | **音符露丝** | 资料管理员 · 教写谱 | — | 174 条 | interaction=12v+4a+3i; memory=14v+3a+2i; personality=19v+5a+3i |
| [`mianbao`](./mianbao/) | **面包** | 管理员 · 锐评谱面 · 拍框大王 | 面包 | 152 条 | interaction=15v+3a+3i; memory=13v+3a+3i; personality=20v+4a+3i |
| [`gen`](./gen/) | **根哥** | unity 实训 · 被叫「父亲」 | 根哥 | 151 条 | interaction=13v+5a+3i; memory=13v+4a+2i; personality=21v+5a+3i |
| [`c30586`](./c30586/) | **30586** | 催活动 · 报名表 | 30586 | 146 条 | interaction=13v+3a+3i; memory=12v+5a+2i; personality=20v+4a+3i |
| [`mibu`](./mibu/) | **咪猫布** | 医学系 · 体检/吃药话题 | 咪猫布 | 88 条 | personality=21v+5a+3i; interaction=11v+7a+3i; memory=8v+6a+2i |
| [`liuli`](./liuli/) | **墨染琉璃** | 跑步/运动 · 抬杠式夸人 | — | 81 条 | personality=21v+4a+4i; interaction=11v+8a+3i; memory=12v+1a+2i |
| [`shiban`](./shiban/) | **石斑鱼** | 怪猎党 · 卖弱+阴阳 | 石斑鱼 | 78 条 | personality=23v+3a+3i; interaction=12v+6a+3i; memory=10v+1a+2i |
| [`xiuxi`](./xiuxi/) | **休息段** | 管理员 · 作息吐槽 | — | 74 条 | personality=22v+4a+3i; interaction=12v+5a+3i; memory=9v+2a+2i |
| [`moku`](./moku/) | **蘑菇汤** | 群规挑战者 · 攻击性强 | 蘑菇汤 | 73 条 | interaction=4v+6a+3i; memory=5v+6a+2i; personality=11v+10a+3i |
| [`linxi`](./linxi/) | **凛～～熙** | 成绩图轰炸机 | 凛～～熙 | 66 条 | interaction=8v+2a+3i; memory=10v+1a+2i; personality=17v+4a+3i |
| [`taffy`](./taffy/) | **taffy** | MC 落地水翻车梗 | taffy | 53 条 | interaction=5v+4a+3i; memory=8v+3a+2i; personality=10v+7a+3i |
| [`li`](./li/) | **李** | 管理员 · 升学/区位话题 | — | 50 条 | interaction=6v+3a+3i; memory=9v+1a+2i; personality=14v+3a+3i |

## 每个包的结构

```
<slug>/
├── SKILL.md          # 入口（< 100 行）：背景一句 + 运行规则 + 局限
├── personality.md    # 性格与价值观：核心价值观 / 口头禅 / 情绪模式 / 社交偏好 / 兴趣审美 / 自我认知 vs 他人印象
├── interaction.md    # 互动与态度：沟通方式 / 提问推回 / 质疑挑战 / 冲突应对 / 排斥场景 / 情感互动
├── memory.md         # 记忆与经历：人生转折 / 反复讲述的故事 / 共同记忆 / 情感地图 / 时代印记
├── conflicts.md      # 待决冲突：C1…（说法 A / 说法 B / 临时裁定 / 裁定理由）
└── manifest.json     # slug / persona / built_at / 来源 / 五文件 sha256 指纹
```

**证据分级**（贯穿全部维度文件）：

| 标签 | 含义 |
|------|------|
| `verbatim` | 本人原话，可在 `../../dialogues/` 对应文件中逐字核验 |
| `artifact` | 从可观测行为统计得出的结论（发言频率、回复对象、话题分布等） |
| `impression` | 数据提供者的主观印象 —— **一律隔离在 `---` 分隔线以下** |

## 怎么用

**方式一：作为 Agent Skill 加载**（推荐）
把某个 `<slug>/` 目录放进你的 agent 技能目录（OpenClaw / Claude Skills / Cursor 等），
加载后 agent 会先读 `SKILL.md`，再按运行规则按需读 `personality.md → interaction.md → memory.md`，
遇到矛盾查 `conflicts.md`。

**方式二：直接投喂**
把 `SKILL.md` + 你想要的两个维度文件一起粘进对话，并加一句：
「请按这份人设档案的语气与价值观回应，不要伪造对外承诺，不要复述攻击性表达」。

**方式三：用于游戏开发**
游戏《😂群聊 · 全群攻陷计划》v2.0 的角色台词即取材于同一批语料；
写新剧情时可直接引用对应包的 `personality.md`（口头禅）与 `memory.md`（共同记忆）。

## 生成方式（可复现）

```bash
# 1) 把 members.zip 拆成一人一文件的对话集（52 人 / 5325 条）
python3 tools/split-dialogues.py

# 2) 为每位蒸馏对象生成语料摘要（高频短语 / 主题计数 / 互动对象 / 他人提及）
python3 tools/mine-persona-evidence.py            # → skills/immortals/_evidence/<slug>.md

# 3) 按 immortal-skill 的 Phase 0-7 蒸馏：初始化目录 → 写维度文件 → 封包
python3 skills/immortal-skill/kit/manifest_tool.py init  --slug <slug> --base skills/immortals --persona friend
python3 skills/immortal-skill/kit/manifest_tool.py stamp --slug <slug> --base skills/immortals --sources "对话集 dialogues/…"
```

## 质检（全部通过）

```bash
python3 tools/verify-personas.py     # 结构 + 证据纪律 + 引文真实性 + 脱敏
python3 tools/audit-quotes.py        # 引文来源审计（省略号分段核验）
```

- **结构**：20/20 包文件齐全；`SKILL.md` 全部 < 100 行；`metadata` 均为单行 JSON（`ethics_note=personal-memorial`、`persona=friend`）。
- **引文真实性**：1,639 条 `verbatim` 引文逐条可在本人对话文件中定位；26 条为「他人发言」（已标注）；**0 条无法溯源**。
- **证据纪律**：正文（分隔线以上）无 `impression`；印象区不混入原话。
- **脱敏**：全库无 QQ 号、无真实姓名；攻击性与成人向内容仅作主题性描述。

## 版本管理（追加材料时）

```bash
python3 skills/immortal-skill/kit/version_tool.py snapshot --slug nanao --base skills/immortals --note "追加前"
# 追加新材料 → 按 Phase 2-6 增量更新 → 再 stamp
python3 skills/immortal-skill/kit/version_tool.py list --slug nanao --base skills/immortals
```

## 已知局限

- 语料窗口仅 **2026-10-08 ~ 10-10**（Obra Dinn / 音符露丝为 09-26~09-29 旧批次），跨期变化无法判断。
- 全部为**多人群聊**场景，缺少一对一深聊；私下的说话方式可能不同。
- 语料少的成员（蘑菇汤 73 条、李 50 条、taffy 53 条）在 memory 等维度已如实标注「材料不足」。
- 每条 `impression` 仅为数据提供者视角，不代表事实。
- `_evidence/` 目录是蒸馏时使用的语料摘要（工作材料，非交付产物），保留以便复核与再蒸馏。