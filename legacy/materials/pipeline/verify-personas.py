#!/usr/bin/env python3
"""数字永生人设包 · 最终质检（结构 + 证据纪律 + 引文真实性 + 脱敏）。

检查项：
  1. 文件齐全：SKILL.md / personality.md / interaction.md / memory.md / conflicts.md / manifest.json
  2. SKILL.md：<100 行、name==slug、metadata 为单行 JSON、ethics_note=personal-memorial、persona=friend
  3. 证据纪律：`---` 分隔线以上不得出现 `impression`；分隔线以下不建议出现 `verbatim`/`artifact`
  4. 引文真实性：带 `verbatim` 的行内「…」引文须能在本人对话文件中找到（省略号分段核验）
  5. 脱敏：全文不得出现 QQ 号与已知真实姓名
用法：python3 tools/verify-personas.py [slug ...]
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "skills", "immortals")
EV = os.path.join(PKG, "_evidence")
DLG = os.path.join(ROOT, "dialogues")
FILES = ["SKILL.md", "personality.md", "interaction.md", "memory.md", "conflicts.md", "manifest.json"]
CONTENT = ["SKILL.md", "personality.md", "interaction.md", "memory.md", "conflicts.md"]
PUNCT = re.compile(r"[\s，。、！？；：,.!?;:~～·…\-—（）()【】\[\]「」『』*#`|/@]")
QUOTE = re.compile(r"「([^「」]{3,160}?)」")
QQ = re.compile(r"(?<!\d)\d{7,12}(?!\d)")
REAL_NAMES = ["李雨根", "马浩峻"]
ALLOW = ("他人发言", "他人提及", "他人评价", "群规", "跨成员", "群友称", "他人转述", "群内称", "群友用", "他人补充", "群友的")

norm = lambda s: PUNCT.sub("", s)


def check(slug, dlg):
    errs, warns, st = [], [], {}
    d = os.path.join(PKG, slug)
    for f in FILES:
        if not os.path.exists(os.path.join(d, f)):
            errs.append(f"缺少 {f}")
            return errs, warns, st

    src = None
    evp = os.path.join(EV, slug + ".md")
    if os.path.exists(evp):
        m = re.search(r"source: dialogues/(.+?)\s*-->", open(evp, encoding="utf-8").read())
        src = m.group(1) if m else None
    own = dlg.get(src, "")

    skill = open(os.path.join(d, "SKILL.md"), encoding="utf-8").read()
    st["lines"] = len(skill.splitlines())
    if st["lines"] >= 100:
        errs.append(f"SKILL.md {st['lines']} 行（需 <100）")
    m = re.search(r"^name:\s*(\S+)\s*$", skill, re.M)
    if not m or m.group(1) != slug:
        errs.append(f"name 与 slug 不一致：{m and m.group(1)}")
    md = re.search(r"^metadata:\s*(\{.*\})\s*$", skill, re.M)
    if not md:
        errs.append("metadata 不是单行 JSON")
    else:
        try:
            meta = json.loads(md.group(1))
            if meta.get("ethics_note") != "personal-memorial":
                errs.append("ethics_note 应为 personal-memorial")
            if meta.get("persona") != "friend":
                errs.append("persona 应为 friend")
            st["evidence"] = meta.get("evidence", "")
        except Exception as e:
            errs.append(f"metadata 解析失败：{e}")

    q_ok = q_other = 0
    for f in CONTENT:
        text = open(os.path.join(d, f), encoding="utf-8").read()
        parts = re.split(r"^---+\s*$", text, maxsplit=1, flags=re.M)
        body, tail = parts[0], (parts[1] if len(parts) > 1 else "")
        if "`impression`" in body:
            errs.append(f"{f}: 正文出现 impression")
        if f != "conflicts.md" and ("`verbatim`" in tail or "`artifact`" in tail):
            warns.append(f"{f}: 印象区出现 verbatim/artifact")
        for line in text.splitlines():
            if "verbatim" in line:
                for q in QUOTE.findall(line):
                    frags = [x for x in re.split(r"[…\.]{1,}", q) if len(norm(x)) >= 4]
                    if not frags:
                        frags = [q] if len(norm(q)) >= 4 else []
                    if not frags:
                        continue  # 过短（≤3 字）无法核验，视为口头禅片段
                    if all(norm(fr) in own for fr in frags):
                        q_ok += 1
                    elif any(w in line for w in ALLOW):
                        q_other += 1
                    else:
                        errs.append(f"{f}: 引文不可核验 → 「{q[:36]}」")
        for hit in QQ.findall(text):
            errs.append(f"{f}: 出现疑似 QQ 号 {hit}")
        for n in REAL_NAMES:
            if n in text:
                errs.append(f"{f}: 出现真实姓名 {n}")
    st["quotes"] = q_ok
    st["quotes_other"] = q_other
    return errs, warns, st


def main():
    slugs = sys.argv[1:] or sorted(x for x in os.listdir(PKG) if os.path.isdir(os.path.join(PKG, x)) and not x.startswith("_"))
    dlg = {f: norm(open(os.path.join(DLG, f), encoding="utf-8").read()) for f in os.listdir(DLG)}
    print(f"{'slug':<9}{'行数':>5}{'引文':>6}{'他人':>5}  {'状态'}")
    bad = 0
    for slug in slugs:
        errs, warns, st = check(slug, dlg)
        bad += len(errs)
        status = "OK ✓" if not errs else "；".join(errs[:3])
        print(f"{slug:<9}{st.get('lines','-'):>5}{st.get('quotes','-'):>6}{st.get('quotes_other','-'):>5}  {status}")
        for w in warns[:2]:
            print(f"{'':<9}  ⚠ {w}")
    print(f"\n共 {len(slugs)} 个包 · 问题 {bad} 处" + (" → 需修复" if bad else " → 全部通过 ✓"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())