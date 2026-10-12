#!/usr/bin/env python3
"""为数字永生（immortal-skill）蒸馏提取「语料摘要」。

用法：
    python3 tools/mine-persona-evidence.py                 # 全部 20 位
    python3 tools/mine-persona-evidence.py nanao cat       # 指定 slug

输入：dialogues/<昵称>_<QQ>.md（由 pipeline/split-dialogues.py 生成）
输出：skills/immortals/_evidence/<slug>.md（供蒸馏时引用与核对，非交付产物）
说明：摘要中含 TA 本人的原话（verbatim）；他人提及只作 impression 参考。
"""
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DLG = os.path.join(ROOT, "dialogues")
OUT = os.path.join(ROOT, "skills", "immortals", "_evidence")

# slug -> (显示名, 对话文件名, 备注)
PEOPLE = {
    "nanao":  ("闹七（群主）", "我的弱小被你们说是狗叫，，_3433786233.md", "曾用名片「实名上网李雨根（国内）」"),
    "cat":    ("黄油猫", "黄油猫是我妈妈，_2929988459.md", ""),
    "shisuan":("石蒜", "我的父亲是根哥_2937622574.md", "曾用名片「我们就这样永远都要在一起好吗」"),
    "gen":    ("根哥", "unity实训开发_1696226367.md", ""),
    "tttt":   ("Tttt", "Tttt_3810258469.md", ""),
    "shei":   ("誰 / 蛋蛋", "蛋蛋。。。_1478863784.md", ""),
    "aka":    ("aka", "aka_2156285785.md", ""),
    "mianbao":("面包", "键鼠交互_430684039.md", ""),
    "c30586": ("30586", "3237lluN_3042435218.md", "曾用名片「CraZy Thursday Vme50」"),
    "mibu":   ("咪猫布", "咪猫布_3569177448.md", ""),
    "shiban": ("石斑鱼", "🪨🦓🐟_1505397142.md", ""),
    "moku":   ("蘑菇汤", "藤原氏蘑菇汤_2054013788.md", ""),
    "linxi":  ("凛～～熙", "凛～～熙_2484501006.md", ""),
    "taffy":  ("taffy", "石蒜神是我爸爸_3077017046.md", ""),
    "fuqin":  ("根哥是我的父亲", "根哥是我的父亲_1993307050.md", "曾用名片「石蒜的爸爸是浪游」"),
    "obra":   ("Obra Dinn", "即将玩_Return of the Obra Dinn_3634435920.md", "名片「即将玩：Return of the Obra Dinn」"),
    "lusi":   ("音符露丝", "正在攒钱购入音符露丝_1620090731.md", ""),
    "liuli":  ("墨染琉璃", "墨染琉璃_2911386671.md", ""),
    "xiuxi":  ("休息段", "休息段也很多难点是绝赞较多_2194145484.md", ""),
    "li":     ("李", "李_2581804638.md", ""),
}

THEMES = {
    "音游/舞萌/成绩": ["舞萌", "maimai", "音游", "arc", "Arc", "成绩", "w5", "w6", "w4", "w3", "推分", "鸟了", "理论", "定数", "紫潘", "圣剑", "尾杀", "出勤", "拼机", "机厅", "打卡"],
    "写谱/制作": ["写谱", "谱面", "谱师", "配置", "采音", "鼓点", "做谱", "玩谱", "搓谱"],
    "MC/服务器": ["mc", "MC", "服务器", "服主", "开服", "躲猫猫", "方块", "机械动力", "红石", "水车", "落地水", "虚空", "白名单", "帕鲁"],
    "AI/token": ["token", "模型", "降智", "subagent", "gpt", "GPT", "claude", "渠道", "翻译", "限额", "网页版", "deepseek"],
    "吃饭/生活": ["吃", "饭", "香骨鸡", "麦当劳", "萨莉亚", "蛋挞", "奶茶", "睡", "困", "上课", "课表", "早八", "考试", "答辩", "作业", "实训", "点名"],
    "卖弱/自贬": ["我太菜", "太菜了", "我是废物", "废物了", "菜到", "手残", "不会", "卖弱", "我好菜", "弱爆", "废物", "大专", "废物点心"],
    "嘴臭/攻击": ["傻逼", "弱智", "脑残", "死妈", "操你", "妈的", "他妈", "傻卵", "煞笔", "妈的", "滚", "nmsl"],
    "性别/性向梗": ["男娘", "娘", "女装", "老婆", "宝宝", "妈妈", "爸爸", "儿子", "宝贝", "亲亲", "贴贴", "调情"],
    "组织/活动": ["@全体成员", "活动", "报名", "集结", "语音", "直播", "团建", "面基", "周年"],
    "情绪/存在感": ["我很伤心", "伤心", "难受", "想死", "不存在", "没人", "退群", "解散", "孤立", "被无视"],
    "学历/工作": ["九八五", "985", "高考", "考研", "学历", "实习", "面试", "求职", "工作", "工资", "项目"],
}

PLACEHOLDER_RE = re.compile(r"^\[(图片|表情|语音|视频|文件|合并转发|video|file|record|json|撞|表情：.*?)\]")


def load(path):
    msgs = []
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        m = re.match(r"- `(\d{2}-\d{2} \d{2}:\d{2})`\s+(.*)$", line)
        if m:
            msgs.append((m.group(1), m.group(2).strip()))
    return msgs


def is_placeholder(text):
    return bool(PLACEHOLDER_RE.match(text))


def clean_for_quote(t, limit=120):
    t = re.sub(r"↳ 回复 ([^：]{1,24})：", r"↳\1：", t)
    return t[:limit] + ("…" if len(t) > limit else "")


def digest(slug, name, fname, note, all_files):
    path = os.path.join(DLG, fname)
    if not os.path.exists(path):
        return f"# 语料摘要：{name}\n\n（找不到对话文件：{fname}）\n"
    msgs = load(path)
    texts = [(t, x) for t, x in msgs if not is_placeholder(x)]
    days = Counter(t[:5] for t, _ in msgs)
    lengths = [len(x) for _, x in texts]
    avg = sum(lengths) / max(1, len(lengths))

    # 高频短语
    short = [x for _, x in texts if 2 <= len(x) <= 14]
    freq = Counter(short)
    top = [(w, c) for w, c in freq.most_common(40) if c >= 2]

    # 回复/@ 对象
    reply = Counter()
    at = Counter()
    for _, x in msgs:
        m = re.match(r"↳ 回复 ([^：]{1,24})：", x)
        if m:
            reply[m.group(1).strip()] += 1
        for a in re.findall(r"@([^\s，,：:@]{1,20})", x):
            at[a.strip()] += 1

    # 关键词主题
    theme_hits = []
    for theme, kws in THEMES.items():
        cnt = 0
        sample = ""
        for _, x in msgs:
            for k in kws:
                if k in x:
                    cnt += 1
                    if not sample and not is_placeholder(x):
                        sample = clean_for_quote(x, 60)
                    break
        if cnt:
            theme_hits.append((cnt, theme, sample))
    theme_hits.sort(reverse=True)

    # 长发言
    long_msgs = sorted(texts, key=lambda p: len(p[1]), reverse=True)[:8]

    # 深夜/凌晨发言
    night = [x for t, x in texts if t[6:8] in ("00", "01", "02", "03", "23")]

    # 他人提及
    mentions = []
    for other_f, other_name in all_files:
        if other_f == fname:
            continue
        for t, x in load(os.path.join(DLG, other_f)):
            if name.split("（")[0][:4] and (name.split("（")[0][:5] in x) and not is_placeholder(x):
                mentions.append((other_name, t, clean_for_quote(x, 100)))
    mentions = mentions[:18]

    L = []
    L.append(f"# 语料摘要：{name}（{slug}）")
    L.append("")
    L.append(f"<!-- channel: qq-export | confidence: verbatim | scope: all | source: dialogues/{fname} -->")
    if note:
        L.append(f"> 备注：{note}")
    L.append(f"> 时间范围：{msgs[0][0]} ~ {msgs[-1][0]}" if msgs else "> 无发言")
    L.append("")
    L.append("## 1. 基础统计")
    L.append(f"- 总发言：{len(msgs)} 条（其中纯文字 {len(texts)} 条，占位内容 {len(msgs)-len(texts)} 条）")
    L.append(f"- 纯文字平均长度：{avg:.1f} 字；最长 {max(lengths) if lengths else 0} 字")
    L.append(f"- 逐日分布：" + "；".join(f"{d} {c}条" for d, c in sorted(days.items())))
    L.append(f"- 深夜/凌晨（23/00/01/02/03 点）发言：{len(night)} 条")
    L.append("")
    L.append("## 2. 高频短语（出现 ≥2 次的短句，可直接用作口头禅证据）")
    for w, c in top[:30]:
        L.append(f"- ×{c}　{w}")
    L.append("")
    L.append("## 3. 关键词主题命中（每条为该主题下的发言条数）")
    for cnt, theme, sample in theme_hits:
        L.append(f"- {theme}：{cnt} 条　　例：{sample}")
    L.append("")
    L.append("## 4. 代表性长发言（按字数，各截 120 字）")
    for t, x in long_msgs:
        L.append(f"- `{t}`　{clean_for_quote(x, 120)}")
    L.append("")
    L.append("## 5. 互动对象统计")
    L.append("- 回复最多的对象：" + "、".join(f"{k}（{v}）" for k, v in reply.most_common(10)))
    L.append("- @最多的对象：" + "、".join(f"{k}（{v}）" for k, v in at.most_common(10)))
    L.append("")
    L.append("## 6. 他人提及 TA（来自其他成员的文件，仅供 impression / memory 参考，勿当 verbatim）")
    for who, t, x in mentions:
        L.append(f"- 【{who}】`{t}`　{x}")
    L.append("")
    return "\n".join(L) + "\n"


def main():
    slugs = sys.argv[1:] or list(PEOPLE.keys())
    os.makedirs(OUT, exist_ok=True)
    all_files = [(v[1], v[0]) for v in PEOPLE.values()]
    for slug in slugs:
        name, fname, note = PEOPLE[slug]
        text = digest(slug, name, fname, note, all_files)
        p = os.path.join(OUT, f"{slug}.md")
        open(p, "w", encoding="utf-8").write(text)
        print(f"✓ {slug:<9} {name:<14} → {os.path.relpath(p, ROOT)}")


if __name__ == "__main__":
    main()