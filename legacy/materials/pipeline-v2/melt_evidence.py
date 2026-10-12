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
    'nanao': '群主 / 服主 / 写谱者',
    'cat': '守门猫 · 医学系 · 段子手',
    'fuqin': '管理员 · 写谱核心 · 被全群认成「父亲」',
    'shisuan': '写谱狂魔 · 本群即社交',
    'obra': '深夜组队 · 游戏鉴赏',
    'tttt': '管理员 · 起外号与阴阳',
    'shei': '群gal 攻略宅 · token 依赖',
    'aka': 'token 情报商 · 降智播报',
    'lusi': '资料管理员 · 教写谱',
    'mianbao': '管理员 · 锐评谱面 · 拍框大王',
    'gen': 'unity 实训 · 被叫「父亲」',
    'c30586': '催活动 · 报名表',
    'mibu': '医学系 · 体检吃药话题',
    'liuli': '跑步 / 运动 · 抬杠式夸人',
    'shiban': '怪猎党 · 卖弱 + 阴阳',
    'xiuxi': '管理员 · 作息吐槽',
    'moku': '群规挑战者 · 攻击性强',
    'linxi': '成绩图轰炸机',
    'taffy': 'MC 落地水翻车梗',
    'li': '管理员 · 升学 / 区位话题',
}


def slug_uin_map() -> dict[str, str]:
    """旧包 manifest → 来源对话文件名里的 QQ 号。"""
    out: dict[str, str] = {}
    for mf in sorted(glob.glob(os.path.join(OLD, '*', 'manifest.json'))):
        slug = os.path.basename(os.path.dirname(mf))
        try:
            data = json.load(open(mf, encoding='utf-8'))
        except Exception:
            continue
        for src in data.get('sources_summarized') or []:
            m = re.search(r'(\d{6,12})\.md', src)
            if m:
                out[slug] = m.group(1)
                break
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


def run() -> None:
    msgs = melt.load_norm()
    stats = json.load(open(melt.STATS_JSON, encoding='utf-8'))
    names = stats['names']
    prof = melt.person_stats(msgs)
    phr = json.load(open(os.path.join(melt.MATERIALS, 'phrasebook', 'phrases.json'), encoding='utf-8'))
    mapping = slug_uin_map()
    os.makedirs(EVID, exist_ok=True)

    rows = []
    for slug, uin in sorted(mapping.items()):
        st = stats['people'].get(uin)
        if not st:
            print(f'  ✗ {slug}: QQ {uin} 在新语料里没有发言，跳过')
            continue
        data = phr.get(uin) or {}
        md = render(slug, uin, prof, names, data, msgs, stats)
        open(os.path.join(EVID, f'{slug}.md'), 'w', encoding='utf-8').write(md)
        rows.append((slug, uin, names.get(uin, ''), st.get('n', 0), st.get('repeats', 0),
                     st.get('repeated_by', 0), data.get('repeat', {}).get('tag', False)))

    rows.sort(key=lambda r: -r[3])
    lines = ['# 人设包 v2 · slug ↔ QQ ↔ 语料对照', '',
             '新语料（214,905 条 / 2026-07-12 ~ 10-12）比旧语料大 40 倍，'
             '因此这轮人设包按 QQ 号重新绑定后重写。', '',
             '| slug | QQ | 现在的叫法 | 条数 | 主动复读 | 被复读 | 喜欢复读 | 证据包 |',
             '|------|----|-----------|------|---------|--------|---------|--------|']
    for slug, uin, nm, n, rep, by, tag in rows:
        lines.append(f'| `{slug}` | {uin} | {nm} | {n:,} | {rep:,} | {by:,} | {"✅" if tag else "—"} '
                     f'| [evidence](./_evidence/{slug}.md) |')
    lines += ['', f'共 {len(rows)} 位（与旧包一一对应）。', '']
    open(os.path.join(V2, '_mapping.md'), 'w', encoding='utf-8').write('\n'.join(lines))

    print(f'证据包：{len(rows)} 份 → {EVID}')
    for slug, uin, nm, n, rep, by, tag in rows[:12]:
        print(f'  {slug:<8} {nm[:16]:<18} {n:>7,} 条' + ('　✅喜欢复读' if tag else ''))


if __name__ == '__main__':
    run()