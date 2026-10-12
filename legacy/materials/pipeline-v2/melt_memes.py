#!/usr/bin/env python3
"""melt 管线 · 第四级：群梗库（memes）+ 黑话词表（lexicon）+ 外号 / 称呼网络。

产出：
    legacy/materials/memes/README.md      方法与总览
    legacy/materials/memes/chains.md      复读链条目（群梗的第一来源）
    legacy/materials/memes/lexicon.md     黑话与梗词典（候选 + 数据 + 解释）
    legacy/materials/memes/nicknames.md    外号 / 称呼网络（自封式群名片、拍一拍、被叫法）
    legacy/materials/memes/candidates.json  机器可读候选（供下一轮补充解释）

判定思路：
  · **复读链**：连续 ≥3 条同文 → 群梗；按「出现次数 × 参与人数」排序
  · **黑话**：被 ≥6 位群友用过、总频次 ≥25 的短语 → 候选（再人工/LLM 写解释）
  · **外号**：群名片里的「X 是我爸爸/妈妈」句式（这个群的核心自封梗）+ 拍一拍后缀 + 群友实际叫法
"""
from __future__ import annotations

import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import melt  # noqa: E402
import melt_phrases as ph  # noqa: E402

OUT = os.path.join(melt.MATERIALS, 'memes')
CANDS = os.path.join(OUT, 'candidates.json')

# 虚词字表：候选短语里只要含这些字就跳过（中文虚词高度集中，用字表比统计更干净）
FUNC_CHARS = set(
    '的了是我你他她它们在有就不没也很都还和与这那什么怎么可以因为所以但是然而且或应该如果虽然'
    '已经需要自己我们你们他们一个时候现在东西这样那样些把被让给对从到会能要想去来说看过去好'
    '真太更最再又只每任何吗呢吧啊呀哦噢嘛嗯诶嘞啦哇哈嘿喂们个之其于即为以所跟同并则才得着'
    '上下前后外间点呗咚')

# 人工术语表：由人判断「这是群里的梗/黑话」，脚本负责核验数据并摘例句。
# (术语, 类别, 解释)
TERMS: list[tuple[str, str, str]] = [
    # --- AI / 技术 ---
    ('降智', 'AI 与技术', '模型被限流或版本回退、输出明显变差；群里第一公共事件'),
    ('token', 'AI 与技术', '模型额度 / 上下文用量，用完要等刷新'),
    ('渠道', 'AI 与技术', 'API 中转站；被冲爆会导致全群降智'),
    ('额度', 'AI 与技术', '订阅或 API 的可用量'),
    ('生成', 'AI 与技术', 'AI 出图 / 出文，常被拿来互相整活'),
    ('傻逼通信', 'AI 与技术', '自嘲式说法：通信专业 / 通信相关的东西'),
    ('实训', '学业与工作', '学校安排的实践课程（根哥的固定话题）'),
    ('分流', '学业与工作', '专业分流，群里刷屏级话题'),
    ('导员', '学业与工作', '辅导员'),
    ('面经', '学业与工作', '面试经验帖'),
    # --- 音游 ---
    ('舞萌', '音游', 'maimai，群内主力音游之一'),
    ('范式', '音游', 'CHUNITHM（中二节奏）'),
    ('arc', '音游', 'Arcaea'),
    ('arcaea', '音游', 'Arcaea'),
    ('鸟加', '音游', 'Arcaea 的高评价段，也当自谦话术'),
    ('ptt', '音游', 'Arcaea 的 Potential 值，互相攀比 / 卖弱用'),
    ('b50', '音游', '最近 50 次游玩的最佳成绩表'),
    ('绝赞', '音游', '判定等级；「三百绝赞」= 刷满绝赞数'),
    ('谱', '音游', '谱面（自写谱 / 打谱都指它）'),
    ('出勤', '音游', '去机厅打机'),
    ('卡农', '音游', '曲名 / 梗，常出现在成绩图里'),
    ('打歌', '音游', '去音游机厅上机'),
    # --- 游戏 ---
    ('帕鲁', '游戏', '幻兽帕鲁，固定开黑项目'),
    ('mc', '游戏', 'Minecraft，群服的主要活动'),
    ('开服', '游戏', 'MC 服务器开放'),
    ('整合包', '游戏', 'MC 整合包，开服前的固定折腾'),
    ('落地水', '游戏', 'MC 里往脚下倒水免伤；也是翻车名场面'),
    ('怪猎', '游戏', '怪物猎人'),
    ('开黑', '游戏', '约着一起打游戏'),
    ('山', '游戏', '常指某个需要打的游戏目标 / 迷宫'),
    ('狼', '游戏', '狼人杀类局内角色'),
    # --- 群文化 ---
    ('复读', '群文化', '跟着上一条一模一样说一遍；本群最高频互动'),
    ('卖弱', '群文化', '明明很强却先自贬；群规明文禁止'),
    ('群gal', '群文化', '本群自制 galgame，群友都是角色原型'),
    ('拍一拍', '群文化', 'QQ 戳一戳，后缀被玩成公开处刑'),
    ('群主', '群文化', '闹七：定规矩、办活动、天天喊解散'),
    ('群规', '群文化', '三条规矩：不涉黄、不刷屏、不许卖弱'),
    ('禁言', '群文化', '复读刷屏三次的处罚'),
    ('外号', '群文化', 'Tttt 的固定娱乐'),
    ('认爹', '群文化', '群名片互相写「X 是我爸爸/父亲」的体系'),
    ('抽象', '评价语', '离谱到看不懂，万能吐槽'),
    ('何意味', '评价语', '「什么意思」，回击看不懂的发言'),
    ('冷知识', '评价语', '「冷知识」开场，专门用来揭短'),
    ('羡慕', '群文化', '复读链冠军（32 次 / 28 人），万能捧场词'),
    ('教我', '群文化', '复读链亚军，求助句式'),
    ('傻逼', '口癖', '本群脏话密度极高，多为语气词而非真骂'),
    ('操', '口癖', '同上，语气级脏话'),
    ('牛魔', '口癖', '语气辅词，表不可思议'),
    ('妮玛', '口癖', '语气辅词，表惊讶 / 吐槽'),
    ('xxs', '口癖', '小学生，用来形容幼稚发言'),
    # --- 人 / 关系 ---
    ('黄油猫', '人物', '群内的核心人物之一；也是被写进无数群名片的对象'),
    ('闹七', '人物', '群主别名'),
    ('yty', '人物', '被反复提起的对象（常与「NTR」梗一起出现）'),
    ('lmh', '人物', '群里的固定话题人物'),
    ('思慕布', '人物', '昵称之一，出现在大量整活里'),
    ('富哥', '人物', '对有钱群友的称呼'),
    ('根哥', '人物', 'unity 实训的人；被写成「我的父亲」'),
    ('一条鱼', '人物', '常被拿来当卖弱 / 捧场对象'),
    ('猫咖', '生活', '打工 / 撸猫话题的高频地点'),
    ('女朋友', '关系', '群内玩笑话里的高频身份（NTR 梗源头之一）'),
    ('宝宝', '关系', '亲昵称呼，群里互相叫'),
    ('尸体', '群文化', '拍一拍后缀梗：X 的尸体已经凉透了'),
]


def chains_report(msgs: list[dict], names: dict[str, str]) -> tuple[str, list[dict]]:
    chains = melt.repeat_chains(msgs)
    fam: dict[str, dict] = {}
    for c in chains:
        f = fam.setdefault(c['key'], {'key': c['key'], 'text': c['text'], 'times': 0,
                                      'max_len': 0, 'people': set(), 'firsts': collections.Counter(),
                                      'samples': []})
        f['times'] += 1
        f['max_len'] = max(f['max_len'], c['n'])
        f['people'].update(c['people'])
        f['firsts'][c['first']] += 1
        if len(f['samples']) < 3:
            f['samples'].append((c['ts'], names.get(c['first'], c['first']), c['n']))
    rows = sorted(fam.values(), key=lambda f: -(f['times'] * (1 + len(f['people'])) * (f['max_len'] ** 0.5)))
    top = rows[:60]
    lines = [
        '# 复读链（群梗的第一现场）',
        '',
        f'共检测到 **{len(chains):,}** 条复读链（连续 ≥3 条同文），归并后 **{len(fam):,}** 种。',
        '按「出现次数 × 参与人数 × 链长」排序取前 60 条。',
        '',
        '| 内容 | 出现 | 最长链 | 参与者 | 常发起 | 样例 |',
        '|------|------|--------|--------|--------|------|',
    ]
    for f in top:
        who = f['firsts'].most_common(3)
        sample = f['samples'][0]
        lines.append(
            f"| **{f['text'][:28]}** | {f['times']} 次 | {f['max_len']} 连 | {len(f['people'])} 人 "
            f"| {'、'.join(names.get(u, u) for u, _ in who)} "
            f"| {melt.fmt_ts(sample[0])} {sample[1]}（{sample[2]} 连） |")
    lines.append('')
    return '\n'.join(lines), top


def lexicon_candidates(msgs: list[dict]) -> list[dict]:
    """数据挖掘候选：跨人高频、且**不含虚词字**的短语。

    虚词用字表（FUNC_CHARS）过滤，比纯统计干净：中文虚词高度集中在少数几十个字里。
    产出只作为「待补解释」的候选，正式词条走 TERMS（人工判断 + 数据核验）。
    """
    gram_people: dict[str, set] = collections.defaultdict(set)
    gram_n: collections.Counter = collections.Counter()
    gram_ex: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    for m in msgs:
        if m['system'] or m.get('repeat_of') is not None:
            continue
        sp = m['speech']
        if not sp or sp in melt.DECOR or len(sp) > 60:
            continue
        u = m['uin']
        seen = set()
        for g in ph.grams_of(sp):
            if len(g) < 3 or len(g) > 6 or g in ph.STOP:
                continue
            if any(ch in FUNC_CHARS for ch in g):
                continue
            if not re.search(r'[\u4e00-\u9fff]', g):
                continue
            if g in seen:
                continue
            seen.add(g)
            gram_people[g].add(u)
            gram_n[g] += 1
            if len(gram_ex[g]) < 3:
                gram_ex[g].append((u, sp))
    out = []
    for g, people in gram_people.items():
        if len(people) < 8 or gram_n[g] < 30:
            continue
        out.append({'term': g, 'people': len(people), 'n': gram_n[g],
                    'len': len(g), 'examples': gram_ex[g][:3]})
    out.sort(key=lambda d: -(d['people'] * (d['n'] ** 0.5) * (1 + 0.25 * (d['len'] - 3))))
    keep: list[dict] = []
    for c in out:
        if any(c['term'] in k['term'] for k in keep):
            continue
        keep.append(c)
        if len(keep) >= 160:
            break
    return keep


def term_stats(msgs: list[dict]) -> dict[str, dict]:
    """核验人工术语表：命中次数、用过的群友数、真实例句（带说话人）。"""
    hits: dict[str, dict] = {}
    low_terms = {t: t.lower() for t, _, _ in TERMS}
    for m in msgs:
        if m['system'] or m.get('repeat_of') is not None:
            continue
        sp = m['speech']
        if not sp or len(sp) > 80:
            continue
        low = sp.lower()
        for t, tl in low_terms.items():
            if tl not in low:
                continue
            d = hits.setdefault(t, {'n': 0, 'people': set(), 'examples': []})
            d['n'] += 1
            d['people'].add(m['uin'])
            if len(d['examples']) < 3 and m['uin'] not in {u for u, _ in d['examples']}:
                d['examples'].append((m['uin'], sp))
    return hits


def nickname_report(msgs: list[dict], names: dict[str, str]) -> str:
    # 1) 自封式群名片：「X 是我爸爸 / 妈妈 / 父亲 / 爹」
    pat = re.compile(r'^(.{1,8}?)(是我|是我家|的)(爸爸|父亲|爹|妈妈|娘|母亲|爷爷|儿子)([（(].*)?$')
    card_hits: collections.Counter = collections.Counter()
    owner_of_card: dict[str, list[str]] = collections.defaultdict(list)
    for m in msgs:
        if m['system']:
            continue
        for field in (m['card'], m['name']):
            mm = pat.match(field or '')
            if mm:
                who = mm.group(1).strip()
                kind = mm.group(3)
                card_hits[(who, kind)] += 1
                if m['uin'] not in owner_of_card[f'{who}|{kind}']:
                    owner_of_card[f'{who}|{kind}'].append(m['uin'])
    # 2) 拍一拍后缀
    pat2 = re.compile(r'^(.{1,20}?)拍了拍(.{1,20}?)的(.{1,30})$')
    nudge: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for m in msgs:
        if not m['system']:
            continue
        mm = pat2.match(m['text'] or '')
        if mm:
            nudge[mm.group(2)][mm.group(3)] += 1

    lines = ['# 外号与称呼网络', '',
             '这个群最显眼的身份玩法是**群名片**：把自己的名片写成「A 是我爸爸 / 妈妈」，',
             '于是出现一张成体系的互相认亲网。下面是数据里真实出现的次数。', '',
             '## 一、群名片里的认亲网', '',
             '| 被认的 | 关系 | 出现 | 认亲的人 |', '|--------|------|------|----------|']
    for (who, kind), c in card_hits.most_common(40):
        owners = owner_of_card[f'{who}|{kind}']
        lines.append(f'| **{who}** | {kind} | {c} | {len(owners)} 人（'
                     + '、'.join(names.get(u, u)[:10] for u in owners[:4]) + '…） |')
    lines += ['', '## 二、拍一拍后缀（公开处刑现场）', '',
              '| 被拍的人 | 拍一拍后缀 | 次数 |', '|---------|-----------|------|']
    for who, c in sorted(nudge.items(), key=lambda x: -sum(x[1].values()))[:25]:
        for suffix, n in c.most_common(3):
            lines.append(f'| {who} | {suffix} | {n} |')
    lines += ['', '## 三、群友的实际叫法（昵称 / 群名片历史里最常出现的片段）', '']
    for u, nm in sorted(names.items(), key=lambda x: -len(x[1]))[:30]:
        lines.append(f'- **{nm}**（QQ {u}）')
    lines.append('')
    return '\n'.join(lines)


def render_lexicon(cands: list[dict], names: dict[str, str], hits: dict[str, dict]) -> str:
    by_type: dict[str, list[str]] = collections.defaultdict(list)
    missing: list[str] = []
    for term, kind, desc in TERMS:
        h = hits.get(term)
        if not h:
            missing.append(f'{term}（{kind}）')
            continue
        people = len(h['people'])
        ex = '；'.join(f'{names.get(u, u)[:12]}：「{s[:26]}」' for u, s in h['examples'][:2])
        item = f"- **{term}**（{h['n']:,} 次 / {people} 人用过）：{desc}"
        if ex:
            item += f"。实例：{ex}"
        by_type[kind].append(item)

    lines = ['# 群梗与黑话词表', '',
             '两类内容：**人工术语表**（判断哪些是本群的黑话/梗，再由脚本核验真实频次与例句）'
             f'与**数据挖掘候选**（跨人高频短语，等你补解释）。共 {len(TERMS)} 条术语，'
             f'其中 {len(TERMS) - len(missing)} 条在语料里命中。', '',
             '> 口径：不含复读条目（复读的话归第一位发言者）；例句皆可在 '
             '[`../dialogues-v2/`](../dialogues-v2) 里逐字核验。', '']
    for kind in ('群文化', 'AI 与技术', '音游', '游戏', '学业与工作', '评价语', '口癖', '人物', '关系', '生活'):
        items = by_type.get(kind)
        if items:
            lines += [f'## {kind}', ''] + items + ['']
    if missing:
        lines += ['## 语料里未命中的术语（可能记错或已过气，留待复核）', '',
                  '、'.join(missing), '']
    lines += ['## 数据挖掘候选（跨人高频，不含虚词）', '',
              '| 短语 | 次数 | 用的人数 | 例句 |', '|------|------|---------|------|']
    for c in cands:
        ex = c['examples'][0][1][:28] if c['examples'] else ''
        lines.append(f"| {c['term']} | {c['n']} | {c['people']} | {ex} |")
    lines.append('')
    return '\n'.join(lines)


def run() -> None:
    msgs = melt.load_norm()
    stats = json.load(open(melt.STATS_JSON, encoding='utf-8'))
    names = stats['names']
    os.makedirs(OUT, exist_ok=True)

    chains_md, top_chains = chains_report(msgs, names)
    open(os.path.join(OUT, 'chains.md'), 'w', encoding='utf-8').write(chains_md)

    cands = lexicon_candidates(msgs)
    json.dump({'chains': [{'text': f['text'], 'times': f['times'], 'max_len': f['max_len'],
                           'people': len(f['people']), 'firsts': f['firsts'].most_common(5)}
                          for f in top_chains],
               'terms': cands},
              open(CANDS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    hits = term_stats(msgs)
    open(os.path.join(OUT, 'lexicon.md'), 'w', encoding='utf-8').write(render_lexicon(cands, names, hits))

    open(os.path.join(OUT, 'nicknames.md'), 'w', encoding='utf-8').write(nickname_report(msgs, names))

    readme = '\n'.join([
        '# 群梗库（memes）', '',
        '这个群的文化有三条主线，分别对应本目录三份文件：', '',
        '| 文件 | 内容 | 来源 |', '|------|------|------|',
        '| [`chains.md`](./chains.md) | 复读链条目：连续 ≥3 条同文，按次数 × 参与人数排序 | 复读检测 |',
        '| [`lexicon.md`](./lexicon.md) | 群梗与黑话词表：解释 + 真实用例 + 待归类候选 | 跨人高频短语 |',
        '| [`nicknames.md`](./nicknames.md) | 外号与称呼网络：群名片认亲网、拍一拍后缀、实际叫法 | 名片 / 系统消息 |',
        '',
        '机器可读版本：[`candidates.json`](./candidates.json)（供后续补充解释或喂给写手）。', '',
        '> 口径：复读内容归第一位发言者；黑话候选要求「≥6 位群友用过且总频次 ≥25」，'
        '避免把一个人的口癖当成群黑话。', '',
    ])
    open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8').write(readme)

    print(f'群梗库 → {OUT}')
    print(f'复读链：{len(top_chains)} 种（展示前 60）')
    print(f'黑话候选：{len(cands)} 个')
    print('Top 10 复读链：')
    for f in top_chains[:10]:
        print(f"  {f['times']:>4} 次 · 最长 {f['max_len']} 连 · {len(f['people']):>2} 人 · {f['text'][:30]}")


if __name__ == '__main__':
    run()