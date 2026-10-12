#!/usr/bin/env python3
"""人设包「引文来源审计」——最终版。

对被 `verbatim` 标注的 「…」 引文做三段核验（引文内的省略号分段）：
  1. own      —— 出现在本人对话文件 → 正确；
  2. quoted   —— 行内明确标注为他人/群规/跨成员材料 → 允许（来源为他人发言）；
  3. risk     —— 既非本人原话、也未标注为他人发言 → 归属风险，必须修。

用法：
  python3 tools/audit-quotes.py            # 汇总
  python3 tools/audit-quotes.py --detail   # 逐条列出 risk（含行号与上下文）
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "skills", "immortals")
DLG = os.path.join(ROOT, "dialogues")
EV = os.path.join(PKG, "_evidence")
PUNCT = re.compile(r"[\s，。、！？；：,.!?;:~～·…\-—（）()【】\[\]「」『』*#`|/@]")
QUOTE = re.compile(r"「([^「」]{3,160}?)」")
FILES = ["SKILL.md", "personality.md", "interaction.md", "memory.md", "conflicts.md"]
# 允许「非本人原话」的标注词
ALLOW = ("他人发言", "他人提及", "他人评价", "群规", "跨成员", "群友称", "他人转述", "群内称", "群友用", "他人补充", "群友的")


def norm(s):
    return PUNCT.sub("", s)


def main():
    dlg = {f: norm(open(os.path.join(DLG, f), encoding="utf-8").read()) for f in os.listdir(DLG)}
    slug_src = {}
    for f in os.listdir(EV):
        m = re.search(r"source: dialogues/(.+?)\s*-->", open(os.path.join(EV, f), encoding="utf-8").read())
        if m:
            slug_src[f[:-3]] = m.group(1)

    tot = {"own": 0, "quoted": 0, "risk": 0, "label": 0}
    risks, quoted = [], []
    for slug, src in sorted(slug_src.items()):
        own = dlg[src]
        for f in FILES:
            p = os.path.join(PKG, slug, f)
            if not os.path.exists(p):
                continue
            for i, line in enumerate(open(p, encoding="utf-8"), 1):
                if "verbatim" not in line:
                    continue
                for q in QUOTE.findall(line):
                    frags = [x for x in re.split(r"[…\.]{1,}", q) if len(norm(x)) >= 4]
                    if not frags or all(norm(fr) in own for fr in frags):
                        tot["own"] += 1
                        continue
                    if any(w in line for w in ALLOW):
                        tot["quoted"] += 1
                        quoted.append((slug, f, i, q))
                        continue
                    # 判断是否只是标签式引用（短、含斜杠/加号等枚举特征）
                    if len(norm(q)) <= 14 and re.search(r"[/+、]| / | \+ ", q):
                        tot["label"] += 1
                        continue
                    tot["risk"] += 1
                    risks.append((slug, f, i, q, line.strip()))

    print(f"{'类别':<22}{'数量':>6}")
    for k, label in [("own", "本人原文可核验"), ("quoted", "已标注为人他人发言"), ("label", "标签式引用（非引文）"), ("risk", "★归属风险（须修）")]:
        print(f"{label:<22}{tot[k]:>6}")
    if "--detail" in sys.argv:
        print(f"\n===== risk（{len(risks)} 条）=====")
        for slug, f, i, q, line in risks:
            print(f"\n[{slug}/{f}:{i}]\n  引文：「{q}」\n  原行：{line[:200]}")
    return 1 if tot["risk"] else 0


if __name__ == "__main__":
    sys.exit(main())