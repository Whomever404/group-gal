# legacy · 历史资产

这个目录放着**当前版本不需要、但不想删**的东西：上一代单文件版、它们的校验工具、以及源素材与人设管线。
仓库根目录只保留当前版本（Vite + TypeScript 工程 + 单文件产物），历史一律收在这里。

> 当前版本在哪：根目录 `group-chat-galgame-v2-modular.html`（双击即玩），
> 工程与说明见 [../README.md](../README.md) 与 [../docs/README.md](../docs/README.md)。

```
legacy/
├── versions/           # 上一代单文件版（都能双击直接玩）
│   ├── group-chat-galgame.html        # v0.2 可玩 Demo：世界观 / 角色 / 机制的出处
│   ├── 啥子豆包版本.html               # 豆包版 v1.0：引擎能力的出处（15 线 + 18 BE，含 3 处缺陷）
│   ├── group-chat-galgame-v1.html     # v1.0 合并版：两版合并 + 缺陷修复（15 线 + 23 BE）
│   └── group-chat-galgame-v2.html     # v2.0 完整版：剧情全部重写（当前版本剧本的出处）
├── tools/              # 上一代单文件版的校验 / 冒烟（**不属于**当前工程的 npm scripts）
│   ├── validate.js                    # 剧本完整性 + 全路线可达性（node，零依赖）
│   └── smoke-test.js                  # jsdom 端到端冒烟（需 jsdom）
└── materials/          # 源素材与人设管线
    ├── members.zip                    # 两批 QQ 群聊记录原始导出（52 份 / 5,325 条）
    ├── report.pdf                     # 群氛围与成员画像分析报告（23 页）
    ├── dialogues/                     # members.zip 按人拆分后的对话集（52 个 md + INDEX.md）
    ├── skills/
    │   ├── immortal-skill/            # 数字永生框架本体（vendored）
    │   └── immortals/                 # 20 位群友的人设包（SKILL.md + 三维度 + conflicts + manifest）
    └── pipeline/                      # 语料管线脚本
        ├── split-dialogues.py         # members.zip → dialogues/
        ├── mine-persona-evidence.py   # dialogues/ → skills/immortals/_evidence/
        ├── verify-personas.py         # 人设包质检（结构 / 证据纪律 / 引文真实性 / 脱敏）
        └── audit-quotes.py            # 引文溯源审计
```

## 怎么用

上一代单文件版：双击 `legacy/versions/*.html` 就能玩（它们不依赖任何服务器与资源）。

上一代校验工具（在仓库根目录执行即可，脚本自己找默认目标）：

```bash
node legacy/tools/validate.js                 # 默认校验 legacy/versions/group-chat-galgame-v2.html
node legacy/tools/smoke-test.js               # 需先 npm i -D jsdom
```

> 这两个脚本是 CommonJS 写法，而仓库根的 `package.json` 声明了 `type: module`；
> `legacy/tools/package.json` 里就近声明了 `type: commonjs`，因此它们仍能被 `node` 直接运行。

语料管线（脚本用自身位置推算素材路径，因此放在这里也能直接跑）：

```bash
python3 legacy/materials/pipeline/split-dialogues.py            # members.zip → dialogues/
python3 legacy/materials/pipeline/mine-persona-evidence.py      # dialogues/ → skills/immortals/_evidence/
python3 legacy/materials/pipeline/verify-personas.py            # 人设包质检
python3 legacy/materials/pipeline/audit-quotes.py               # 引文溯源审计
```

`skills/immortal-skill/kit/` 里的 CLI 默认 `--base ./skills/immortals`，也就是需要在
`legacy/materials/` 目录下执行，或显式传 `--base legacy/materials/skills/immortals`。

## 为什么留着

- **剧本出处**：当前版本的 15 条角色线、45 段支线、23 个 Bad End 都来自 `versions/group-chat-galgame-v2.html` 的剧本。
- **素材溯源**：`materials/` 是「角色 → 真实群友」映射与引文审计的原始依据（见 [../docs/06-参考素材与内容管线.md](../docs/06-参考素材与内容管线.md)）。
- **人设包**：`skills/immortals/` 的 20 位群友档案是本次台词重写的主要依据，后续加剧情仍可继续用。

> 所有角色均为基于群内可见行为的二次虚构，与现实人物无关；`materials/` 含真实 QQ 号与原始聊天内容，请勿外传。