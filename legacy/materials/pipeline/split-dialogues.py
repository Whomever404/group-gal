#!/usr/bin/env python3
"""把 members.zip（按 QQ 号归档的群聊记录）拆分为「一人一文件」的对话文本。

用法：
    python3 legacy/materials/pipeline/split-dialogues.py [members.zip] [输出目录]
默认：
    python3 legacy/materials/pipeline/split-dialogues.py   # members.zip -> dialogues/

输出：
    dialogues/<昵称>_<QQ号>.md    每位群友一个文件（含时间戳的对话行）
    dialogues/INDEX.md            全部成员的索引（按发言条数排序）
处理：
    · [图片](链接) / [视频](链接) 等 → 去掉链接，保留 [图片] 等占位
    · [表情 {json...}] → [表情] 或 [表情：/名称]
    · 时间戳、回复引用、合并转发等原样保留
"""
import os
import re
import sys
import zipfile

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "members.zip")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "dialogues")

RE_LINK = re.compile(r"\[(图片|视频|语音|文件|video|file|record)\]\([^)]*\)")
RE_FACE = re.compile(r"\[表情\s*(\{[^\]]*\})\]")
RE_HEAD = re.compile(r"^#\s+(.+?)\s*\((\d+)\)\s*$")
RE_META = re.compile(r"^群名片\s+(.+?)\s*·\s*角色\s+(\w+)\s*·\s*(\d+)\s*条\s*$")


def safe_name(name, qq):
    n = re.sub(r'[\\/:*?"<>|\r\n\t]', "_", name)
    n = re.sub(r"\s+", " ", n).strip().strip(".")
    if len(n) > 30:
        n = n[:30]
    if not n or n in ("（无）", "无"):
        n = "群友"
    return f"{n}_{qq}"


def clean(text):
    text = RE_LINK.sub(lambda m: f"[{m.group(1)}]", text)

    def face(m):
        inner = m.group(1)
        hit = re.search(r"'faceText':\s*'([^']+)'", inner)
        return f"[表情：{hit.group(1)}]" if hit else "[表情]"

    text = RE_FACE.sub(face, text)
    return text


def parse(raw):
    lines = raw.splitlines()
    nick, qq = "群友", "unknown"
    if lines and RE_HEAD.match(lines[0]):
        m = RE_HEAD.match(lines[0])
        nick, qq = m.group(1).strip(), m.group(2)
    card, role, stated, period = "（无）", "member", "", ""
    for l in lines[1:5]:
        m = RE_META.match(l.strip())
        if m:
            card, role, stated = m.group(1), m.group(2), m.group(3)
        elif re.match(r"^\d{2}-\d{2} \d{2}:\d{2} ~ ", l.strip()):
            period = l.strip()
    msgs = [clean(l.strip()[2:].strip()) for l in lines if l.strip().startswith("- ")]
    return dict(nick=nick, qq=qq, card=card, role=role, stated=stated, period=period, msgs=msgs)


def main():
    if not os.path.exists(SRC):
        sys.exit(f"找不到源文件：{SRC}")
    os.makedirs(OUT, exist_ok=True)
    people = []
    with zipfile.ZipFile(SRC) as z:
        names = [n for n in z.namelist() if n.endswith(".md")]
        for n in sorted(names):
            people.append(parse(z.read(n).decode("utf-8")))
    people.sort(key=lambda p: len(p["msgs"]), reverse=True)

    total = 0
    index_rows = []
    for i, p in enumerate(people, 1):
        total += len(p["msgs"])
        fname = safe_name(p["nick"], p["qq"]) + ".md"
        body = [
            f"# {p['nick']}",
            "",
            f"> {p['card']} · 角色：{p['role']} · {len(p['msgs'])} 条 · {p['period']}",
            f"> 由 members.zip 按人拆分；图片 / 表情 / 语音等以 [占位] 标注。",
            "",
            "## 对话记录",
            "",
        ]
        body += [f"- {m}" for m in p["msgs"]]
        body.append("")
        with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
            f.write("\n".join(body))
        index_rows.append((i, p, fname))

    with open(os.path.join(OUT, "INDEX.md"), "w", encoding="utf-8") as f:
        f.write("# 群友对话索引\n\n")
        f.write(f"共 {len(people)} 位群友 / {total} 条消息，由 `members.zip` 按人拆分。\n\n")
        f.write("| # | 昵称 | 群名片 | 角色 | 条数 | 时间范围 | 文件 |\n")
        f.write("|---|------|--------|------|------|----------|------|\n")
        for i, p, fname in index_rows:
            f.write(f"| {i} | {p['nick']} | {p['card']} | {p['role']} | {len(p['msgs'])} | {p['period']} | [{fname}](./{fname}) |\n")
    print(f"完成：{len(people)} 位群友 / {total} 条消息 → {os.path.abspath(OUT)}")


if __name__ == "__main__":
    main()