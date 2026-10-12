#!/usr/bin/env python3
"""melt 管线 · 第五级：人设包证据（每位群友一份）。

产出：
    legacy/materials/skills/immortals-v2/_mapping.md      slug ↔ QQ ↔ 旧包 对照表
    legacy/materials/skills/immortals-v2/_evidence/<slug>.md   每人一份证据包（写人设包的输入）

映射方式：旧人设包的 manifest.json 里记着来源文件名 `<slug>_<QQ>.md`，据此把 slug 绑到 QQ，
再用 QQ 去新语料取数据——**身份只认 QQ 号**，昵称改了也不会串人。
"""
from __future__ import annotations

import collections
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import melt  # noqa: E402
import melt_phrases as ph  # noqa: E402

V2 = os.path.join(melt.MATERIALS, 'skills', 'immortals-v2')
EVID = os.path.join(V2, '_evidence')
OLD = os.path.join(melt.MATERIALS, 'skills', 'immortals')

# 每个 slug 的写作定位（沿用旧包的判断，供写手参考）
ROLE_HINT = {
    'nanao': '群主 / 服主 / 写谱者（游戏角色「闹七」）',
    'yu': '一条鱼 / yty：本群发言最多的人（游戏角色「一条鱼」）',
    'cat': '黄油猫（游戏角色「黄油猫」；语料里名片写「咪猫布」）',
    'g': 'G / Lriltu：反骨管理员（游戏角色「G」）',
    'shisuan': '石蒜 / Lycoris Radiata：写谱狂魔（游戏角色「石蒜」）',
    'tttt': 'Tttt.：管理员 · 起外号与阴阳（游戏角色「Tttt」）',
    'shei': '蛋蛋：群gal 攻略宅 · token 依赖（游戏角色「誰」）',
    'shiban': '石斑鱼：怪猎党 · 卖弱 + 阴阳（游戏角色「石斑鱼」）',
    'taffy': 'taffy / 塔菲：MC 落地水翻车梗（游戏角色「taffy」）',
    'c30586': '30586：催活动 · 报名表（游戏角色「30586」）',
    'mianbao': '面包 / pandesu：锐评谱面 · 拍框大王（游戏角色「面包」；语料里名片写「键鼠交互」）',
    'linxi': '凛～～熙：成绩图轰炸机（游戏角色「凛～～熙」）',
    'gen': '根哥 / 浅色夏沫：unity 实训（游戏角色「根哥」）',
    'aka': 'aka / akahoshi：token 情报商 · 降智播报（游戏角色「aka」）',
    'moku': '藤原氏蘑菇汤：群规挑战者（游戏角色「蘑菇汤」）',
    '5yuan': '没关系，5元：表内成员，旧包没有',
    'ndy': 'ndylgywsz / 你大爷：表内成员；语料判定「喜欢复读」（7.9%）',
    'pw': 'PW / 一般通过PW老人：表内成员',
    'fei': '费的 / 薄雾布是我妈妈：表内成员',
    'liusuan': '硫酸铜 / qweCuSO4：表内成员',
    'xiuxi': 'R哥：管理员 · 作息吐槽（旧包 slug 叫 xiuxi）',
    'obra': '滚木 / Obra Dinn：表外老成员',
    'liuli': '墨染琉璃：表外老成员',
    'lusi': '王楚钦 / 音符露丝：表外老成员',
    'li': '李：表外老成员（语料偏少）',
}


# 用户提供的权威对照表（QQ号与群友的对应关系.xlsx）→ 已按 QQ 号逐条核验。
# 说明：旧一轮的人设包是按「当时的群名片」绑的 QQ，结果把两个人绑串了——
#   2929988459 名片写着「黄油猫是我妈妈，」，其实是**一条鱼（yty）**；
#   3569177448 名片写着「咪猫布」，其实是**黄油猫**。
# 因此本轮改以权威表为准：slug 用游戏角色键，QQ 号由表指定。
VERIFIED: dict[str, tuple[str, str]] = {
    'nanao':   ('3433786233', '闹七（null7323 / n7）'),
    'yu':      ('2929988459', '一条鱼 / yty / 颜'),
    'cat':     ('3569177448', '黄油猫'),
    'g':       ('1993307050', 'G哥 / Lriltu'),
    'shisuan': ('2937622574', '石蒜 / Lycoris Radiata'),
    'tttt':    ('3810258469', 'Tttt. / reSence / 四个t'),
    'shei':    ('1478863784', '蛋蛋（表外，语料 6,360 条）'),
    'shiban':  ('1505397142', '石斑鱼 / 🪨🦓🐟'),
    'taffy':   ('3077017046', 'taffy / Lesaen / 塔菲'),
    'c30586':  ('3042435218', '30586'),
    'mianbao': ('430684039', '面包 / pandesu / 潘德速'),
    'linxi':   ('2484501006', '凛～～熙（表外，语料 418 条）'),
    'gen':     ('1696226367', '根哥 / 浅色夏沫'),
    'aka':     ('2156285785', 'aka / akahoshi / 阿卡后室'),
    'moku':    ('2054013788', '藤原氏蘑菇汤'),
    '5yuan':   ('3102895019', '没关系，5元 / zgb / 这个逼'),
    'ndy':     ('364617408', 'ndylgywsz / 你大爷'),
    'pw':      ('2031805090', 'PW / 一般通过PW老人'),
    'fei':     ('2681612361', '费的 / 薄雾布是我妈妈'),
    'liusuan': ('1195756468', '硫酸铜 / qweCuSO4 / 炼铜'),
    'xiuxi':   ('2194145484', 'R哥（旧包 slug 叫 xiuxi）'),
    'obra':    ('3634435920', '滚木 / Obra Dinn（表外）'),
    'liuli':   ('2911386671', '墨染琉璃（表外）'),
    'lusi':    ('1620090731', '王楚钦 / 音符露丝（表外）'),
    'li':      ('2581804638', '李（表外，语料 130 条）'),
}


def slug_uin_map() -> dict[str, str]:
    """权威表核验过的 slug → QQ 映射（不再用旧 manifest 反推）。"""
    return {slug: uin for slug, (uin, _) in VERIFIED.items()}


def table_aliases() -> dict[str, str]:
    """读用户表：QQ → 昵称（用于核验）。"""
    path = os.path.join(melt.MATERIALS, 'corpus-v2', 'qq-aliases.json')
    out: dict[str, str] = {}
    if os.path.exists(path):
        for row in json.load(open(path, encoding='utf-8'))['rows']:
            if row and row[0]:
                out[str(row[0]).strip()] = (row[1] if len(row) > 1 else '')
    return out


def game_cast() -> dict[str, tuple[str, str]]:
    """读游戏角色表（src/content/characters.ts）的 name / sub，作为交叉核验的另一侧。"""
    path = os.path.join(melt.REPO, 'src', 'content', 'characters.ts')
    out: dict[str, tuple[str, str]] = {}
    if not os.path.exists(path):
        return out
    txt = open(path, encoding='utf-8').read()
    for m in re.finditer(r"(\w+):\s*\{[^}]*?name:\s*'([^']*)'[^}]*?sub:\s*'([^']*)'", txt, re.S):
        out[m.group(1)] = (m.group(2), m.group(3))
    return out


def aliases_for(uin: str, prof: dict, msgs: list[dict], names: dict[str, str]) -> list[tuple[str, int]]:
    """TA 被怎么叫：从昵称 / 群名片历史里切出短词，再看别人用得多不多。"""
    d = prof[uin]
    cand: set[str] = set()
    for s in list(d['names']) + list(d['cards']):
        for piece in re.split(r'[，,。.、（）()\[\]【】/|·\s]+', s):
            piece = piece.strip()
            if 2 <= len(piece) <= 6:
                cand.add(piece)
        m = re.match(r'^(.{2,6}?)(是|的)(我|他|你)?(爸爸|父亲|爹|妈妈|娘|妈妈，|主人)$', s)
        if m:
            cand.add(m.group(1))
    cand.discard(names.get(uin, ''))
    cnt: collections.Counter = collections.Counter()
    for m in msgs:
        if m['uin'] == uin or m['system']:
            continue
        sp = m['speech']
        if not sp or len(sp) > 60:
            continue
        for a in cand:
            if a in sp:
                cnt[a] += 1
    return cnt.most_common(6)


def others_mention(uin: str, alias_list: list[str], msgs: list[dict], names: dict[str, str],
                   limit: int = 12) -> list[tuple[str, str]]:
    """别人提到 TA 的原话（用于 impression 区，属于「他人印象」而非本人自述）。"""
    out: list[tuple[str, str]] = []
    if not alias_list:
        return out
    seen = set()
    for m in msgs:
        if m['uin'] == uin or m['system'] or m.get('repeat_of') is not None:
            continue
        sp = m['speech']
        if not sp or not (4 <= len(sp) <= 50):
            continue
        if any(a in sp for a in alias_list) and sp not in seen:
            seen.add(sp)
            out.append((m['uin'], sp))
            if len(out) >= limit * 2:
                break
    return out[:limit]


def night_or_emotion(msgs: list[dict], uin: str, limit: int = 10) -> list[tuple[str, str]]:
    """深夜长句与情绪句（写 memory / 情绪模式时最有用）。"""
    kw = ('难过', '开心', '哭', '烦', '累', '睡', '喜欢', '讨厌', '害怕', '焦虑', '谢谢', '对不起',
          '我是不是', '不想', '很难受', '好想')
    out = []
    for m in msgs:
        if m['uin'] != uin or m['system'] or m.get('repeat_of') is not None:
            continue
        sp = m['speech']
        if not sp or not (6 <= len(sp) <= 60):
            continue
        h = melt.datetime.fromtimestamp(m['ts'] / 1000, melt.CST).hour
        if h < 6 or any(k in sp for k in kw):
            out.append((m['ts'], sp))
    out.sort(key=lambda x: -x[0])
    return [(melt.fmt_ts(t), s) for t, s in out[:limit]]


def render(slug: str, uin: str, prof: dict, names: dict[str, str], data: dict,
           msgs: list[dict], stats: dict) -> str:
    phrases = data.get('phrases', [])
    topics = data.get('topics', [])
    tails = [(t, c) for t, c in (data.get('tails') or []) if len(t) == 1][:8]
    st = stats['people'].get(uin, {})
    d = prof[uin]
    n = max(st.get('n', 0), 1)
    alias = aliases_for(uin, prof, msgs, names)
    alias_list = [a for a, _ in alias]
    lines = [
        f'# 证据包 · {slug}（{names.get(uin, uin)} / QQ {uin}）',
        '',
        f'> 定位参考：{ROLE_HINT.get(slug, "（未标注）")}',
        f'> 语料：**{n:,} 条** · {melt.fmt_ts(st.get("first", 0))} ~ {melt.fmt_ts(st.get("last", 0))}'
        f' · 平均每句 {st.get("len_avg", 0)} 字 · 短句率 {st.get("short_ratio", 0):.0%}'
        f' · 连发率 {d["burst"] / n:.0%}',
        f'> 复读：主动 {st.get("repeats", 0):,} 条（{st.get("repeats", 0) / n:.1%}）'
        f' · 被复读 {st.get("repeated_by", 0):,} 次 · 复读链 {st.get("chains", 0):,} 条（发起 {st.get("chains_first", 0):,}）',
        '',
        '## 1. 招牌口头禅（区分度优先）',
        '',
        '| 短语 | 次数 | 专属度 | 例句 |', '|------|------|--------|------|',
    ]
    for p in phrases[:12]:
        lines.append(f"| **{p['text']}** | {p['n']} | {p['share']:.0%} | {p['example'][:30]} |")

    lines += ['', '## 2. 句尾 / 标点 / 表情习惯', '',
              '- 常收尾的字：' + '、'.join(f'「{c}」{k}次' for c, k in tails),
              f"- 句末不带标点 {st.get('no_punct_ratio', 0):.0%} · 波浪号 {st.get('tilde', 0):,} · 省略号 {st.get('ellipsis', 0):,} · 感叹号 {st.get('bang', 0):,}",
              f"- 常用贴图/表情：" + ('、'.join(f'{s}({c})' for s, c in (st.get('top_stickers') or [])[:8]) or '（很少用）'),
              '- 常用文字表情：' + ('、'.join(f'{s}({c})' for s, c in (data.get('qqfaces') or [])[:8]) or '（几乎没有）')]

    lines += ['', '## 3. 喜好画像（关键词命中 + 原话）', '']
    for t in topics[:8]:
        lines.append(f"- **{t['name']}**（{t['n']} 次）：" + ' ／ '.join(f'「{e[:30]}」' for e in t['examples']))

    lines += ['', '## 4. 可引用的高频原话（不含复读；均可在 dialogues-v2 逐字核验）', '']
    for text, c in (st.get('top_lines') or [])[:36]:
        if 2 <= len(text) <= 40:
            lines.append(f'- 「{text}」（{c} 次）')

    lines += ['', '## 5. 复读行为', '',
              f"- 主动复读最多的话：" + '；'.join(f'「{t}」×{c}' for t, c in (st.get('top_repeat_texts') or [])[:6]),
              f"- 最爱复读谁：" + '、'.join(f'{names.get(u, u)}({c})' for u, c in (st.get('repeat_targets') or [])[:5]),
              f"- TA 的话被复读最多：" + '；'.join(f'「{t}」×{c}' for t, c in (st.get('repeated_texts') or [])[:6])]

    lines += ['', '## 6. 关系网络', '',
              '- @ 最多：' + '、'.join(f'{names.get(u, u)}({c})' for u, c in (st.get('at') or [])[:6]),
              '- 回复最多：' + '、'.join(f'{names.get(u, u)}({c})' for u, c in (st.get('replied_to') or [])[:6]),
              '- 最常被谁回复：' + '、'.join(f'{names.get(u, u)}({c})' for u, c in (st.get('replied_by') or [])[:6]),
              '- 昵称/群名片历史：' + ' → '.join((st.get('cards_history') or [])[-5:] or (st.get('names_history') or [])[-5:]),
              '- 别人怎么叫 TA：' + '、'.join(f'{a}({c})' for a, c in alias[:6])]

    lines += ['', '## 7. 他人提及（他人印象，写 impression 区用）', '']
    for u, s in others_mention(uin, alias_list, msgs, names):
        lines.append(f'- {names.get(u, u)}：「{s}」')

    lines += ['', '## 8. 深夜 / 情绪片段', '']
    for ts, s in night_or_emotion(msgs, uin):
        lines.append(f'- `{ts}`  {s}')

    lines += ['', '---', '',
              '> 使用约定：本文档里**本人原话**为 `verbatim`，统计数据为 `artifact`，'
              '第 7 节属于他人印象（`impression`）。写人设包时三者不得混用；'
              '包内不得出现 QQ 号与真实姓名。', '']
    return '\n'.join(lines)


def verify_row(slug: str, uin: str, prof: dict, names: dict[str, str],
                table: dict[str, str], cast: dict[str, tuple[str, str]]) -> tuple[str, str, str]:
    """核验一人：返回（表里的昵称, 语料里的叫法, 判定）。"""
    d = prof[uin]
    blob = ' '.join(d['cards'] + d['names'] + d['titles']).lower()
    who = names.get(uin, uin)
    alias = table.get(uin, '')
    gname, gsub = cast.get(slug, ('', ''))
    blob_game = (gname + ' ' + gsub).lower()
    if not alias:
        return '', who, '表外（老成员，语料自带昵称）'
    tokens = [t.strip().lower() for t in re.split(r'[/、（）()]', alias) if len(t.strip()) >= 2]
    gname_l = gname.lower()
    hit = [t for t in tokens if t in blob or t in blob_game or t in gsub.lower()
           or (gname_l and (t.startswith(gname_l) or gname_l.startswith(t)))]
    if hit:
        return alias, who, f'✓ 一致（命中「{hit[0]}」）'
    if slug in cast:
        return alias, who, f'⚠ 需人工确认（表「{alias}」vs 游戏「{gname}」vs 语料「{who}」）'
    return alias, who, '表内成员（无游戏角色，昵称随名片变化）'


def run() -> None:
    msgs = melt.load_norm()
    stats = json.load(open(melt.STATS_JSON, encoding='utf-8'))
    names = stats['names']
    prof = melt.person_stats(msgs)
    phr = json.load(open(os.path.join(melt.MATERIALS, 'phrasebook', 'phrases.json'), encoding='utf-8'))
    mapping = slug_uin_map()
    table = table_aliases()
    cast = game_cast()
    os.makedirs(EVID, exist_ok=True)

    rows = []
    for slug, uin in mapping.items():
        st = stats['people'].get(uin)
        if not st:
            print(f'  ✗ {slug}: QQ {uin} 在新语料里没有发言，跳过')
            continue
        data = phr.get(uin) or {}
        md = render(slug, uin, prof, names, data, msgs, stats)
        alias, who, verdict = verify_row(slug, uin, prof, names, table, cast)
        md = md.replace('> 定位参考：', f'> 核验：权威表「{alias or "—"}」· 语料「{who}」· {verdict}\n> 定位参考：')
        open(os.path.join(EVID, f'{slug}.md'), 'w', encoding='utf-8').write(md)
        rows.append((slug, uin, alias, who, st.get('n', 0), st.get('repeats', 0),
                     st.get('repeated_by', 0), data.get('repeat', {}).get('tag', False), verdict))

    rows.sort(key=lambda r: -r[4])
    lines = ['# 人设包 v2 · slug ↔ QQ ↔ 核验', '',
             '**本表按用户提供的《QQ号与群友的对应关系.xlsx》逐条核验**（该表已存 '
             '[`../../corpus-v2/QQ号与群友的对应关系.xlsx`](../../corpus-v2/QQ号与群友的对应关系.xlsx)）。',
             '',
             '> 上一轮的人设包是按「当时的群名片」绑 QQ，结果绑串了两个人，本轮已更正：',
             '> · `2929988459` 名片写着「黄油猫是我妈妈，」——其实是 **一条鱼（yty）**（游戏角色「一条鱼」）；',
             '> · `3569177448` 名片写着「咪猫布」——其实是 **黄油猫**（游戏角色「黄油猫」）；',
             '> · `1993307050` 是 **G / Lriltu**（旧 slug 叫 fuqin，因其名片写「根哥是我的父亲」）。',
             '',
             '| slug | QQ | 权威表 | 语料里的叫法 | 核验 | 条数 | 复读 | 证据包 |',
             '|------|----|--------|-------------|------|------|------|--------|']
    for slug, uin, alias, who, n, rep, by, tag, verdict in rows:
        lines.append(f'| `{slug}` | {uin} | {alias or "—"} | {who} | {verdict} | {n:,} | '
                     f'{rep:,}{"（喜欢复读）" if tag else ""} | [evidence](./_evidence/{slug}.md) |')
    lines += ['', f'共 {len(rows)} 人；其中权威表覆盖 '
                  f'{sum(1 for r in rows if r[2])} 人，其余为表外老成员（语料里另有 74 位说话人，未建包）。', '']
    open(os.path.join(V2, '_mapping.md'), 'w', encoding='utf-8').write('\n'.join(lines))

    print(f'证据包：{len(rows)} 份 → {EVID}')
    bad = [r for r in rows if r[8].startswith('⚠')]
    print(f'核验：一致 {sum(1 for r in rows if r[8].startswith("✓"))} · '
          f'需人工确认 {len(bad)} · 表外 {sum(1 for r in rows if "表外" in r[8])}')
    for r in bad:
        print(f'  ⚠ {r[0]}：{r[8]}')


if __name__ == '__main__':
    run()
