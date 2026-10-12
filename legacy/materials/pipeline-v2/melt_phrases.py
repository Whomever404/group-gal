#!/usr/bin/env python3
"""melt 管线 · 第三级：习惯用语库（phrasebook）+ 喜好画像。

对每位群友（严格按 QQ 号）产出：
    legacy/materials/phrasebook/<QQ>.md    口头禅 / 句尾 / 标点与排版习惯 / 表情习惯 /
                                           称呼习惯 / 复读习惯 / 作息 / 话题喜好
    legacy/materials/phrasebook/README.md  方法与总表（每人一句「招牌口头禅」）
    legacy/materials/phrasebook/phrases.json  机器可读（供人设包证据复用）

「习惯用语」的判定是**区分度优先**：既频次高、又主要在 TA 嘴里出现的短语排前面
（score = 本人次数 / 全群次数），并做「长短语优先」去重，避免「的」「哈哈」这类原子。
"""
from __future__ import annotations

import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import melt  # noqa: E402

OUT = os.path.join(melt.MATERIALS, 'phrasebook')
JSON_OUT = os.path.join(OUT, 'phrases.json')

# 话题关键词组 → 喜好画像（每个命中都要求至少 3 次才写进画像）
TOPICS: dict[str, tuple[str, ...]] = {
    '音游（舞萌/范式/Arcaea）': ('舞萌', '范式', 'arcaea', 'arc', 'maimai', '音游', '谱', 'ptt', 'ap',
                        '成绩', '手速', '判定', 'ex', 'b50', 'r10', '曲', '打', '准度', '鸟加'),
    'AI / 模型 / token': ('ai', 'token', 'claude', 'gpt', 'gemini', 'kimi', '降智', '模型', 'api',
                          '额度', '对话', '上下文', '提示词', 'cursor', 'codex', 'deepseek'),
    'MC / 服务器': ('mc', 'minecraft', '服务器', '开服', '服主', '整合包', '机械动力', '红石', '掉落',
                  '栓绳', '村庄', '下界', '钻石', '开荒', '存档', 'mod', '模组'),
    '怪猎 / 其它游戏': ('怪猎', 'mh', '猎人', '狩猎', 'steam', '游戏', '联机', '开黑', '原神', '泰拉',
                   '群游', '桌游', '打游戏', '玩什么'),
    '学业 / 升学': ('考试', '期末', '作业', '论文', '考研', '高考', '学校', '大学', '专业', '绩点', '实训',
                 '课程', '保研', 'nju', '志愿', '成绩单', '挂科', '毕业'),
    '工作 / 实习 / 开发': ('实习', '工作', '上班', '加班', '项目', '开发', '代码', 'bug', '编译', '重构',
                    'unity', '前端', '后端', '接口', '测试', '需求', '产品', '面经', '简历'),
    '吃喝': ('吃', '外卖', '食堂', '奶茶', '咖啡', '宵夜', '夜宵', '肯德基', '香骨鸡', '面包', '泡面',
           '饿', '饭', '喝', '零食', '鸡', '火锅'),
    '身体 / 医院': ('医院', '体检', '药', '疼', '发烧', '感冒', '睡', '失眠', '熬夜', '头痛', '眼睛',
                '血压', '挂号', '复查', '牙', '胃', '病'),
    '情绪 / 关系': ('喜欢', '难过', '生气', '烦', '开心', '摆烂', '抑郁', '焦虑', '自卑', '朋友', '宝宝',
                '爱你', '对不起', '哭了', '破防', 'emo'),
    '群务 / 梗文化': ('群主', '管理员', '禁言', '复读', '卖弱', '梗', '整活', '外号', '名字', '群名',
                  '名片', '头像', '撤回', '踢', '拉人', '进群', '群规', '拍一拍', '头衔', '匿名'),
    '番剧 / 音乐 / 二次元': ('番', '动画', 'gal', '二游', '歌', '唱', '专辑', '音声', 'op', 'ed',
                     '剧场版', '漫画', '立绘', '同人', 'cos'),
}

RE_BRACKET = re.compile(r'\[[^\]]*\]')
RE_ALNUM_ONLY = re.compile(r'^[a-z0-9\s\W]+$', re.I)


def grams_of(text: str) -> list[str]:
    """一句里抽全部 2~8 字连续短语（只保留纯中文/中文+字母的片段）。"""
    t = re.sub(r'/[^\s/]{1,10}', '', text)      # QQ 文字表情（/撇嘴）不算口头禅
    t = RE_BRACKET.sub('', t)
    t = re.sub(r'[\s\u2005]+', '', t)
    if len(t) < 2:
        return []
    out = []
    for n in range(2, 9):
        for i in range(0, len(t) - n + 1):
            g = t[i:i + n]
            if RE_ALNUM_ONLY.match(g):
                continue
            if not re.search(r'[\u4e00-\u9fff]', g):
                continue
            out.append(g)
    return out


def build_counts(msgs: list[dict]) -> tuple[dict[str, collections.Counter], collections.Counter, dict[str, list[str]]]:
    """每人 n-gram 计数 + 全群计数 + 每人候选例句（短语 → 原句）。"""
    per: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    glob: collections.Counter = collections.Counter()
    samples: dict[str, dict[str, str]] = collections.defaultdict(dict)
    for m in msgs:
        if m['system'] or m.get('repeat_of') is not None:
            continue                      # 复读不算「自己的用词」
        sp = m['speech']
        if not sp or sp in melt.DECOR or len(sp) > 60:
            continue
        u = m['uin']
        seen = set()
        for g in grams_of(sp):
            if g in seen:
                continue
            seen.add(g)
            per[u][g] += 1
            glob[g] += 1
            samples[u].setdefault(g, sp)
    return per, glob, samples


STOP = set((
    '这个 那个 什么 怎么 可以 没有 就是 不是 现在 知道 感觉 可能 因为 所以 但是 而且 然后 '
    '真的 应该 一样 东西 时候 时间 问题 一个 这些 那些 一下 我们 你们 他们 自己 大家 还是 '
    '已经 需要 直接 好像 有点 我是 你是 他是 也是 都是 就会 还能 不会 不能 什么样 哈哈 '
    '哈哈哈哈 哈哈哈 捏 吧 吗 啊 呢 了 的 我 你 他 她 它 在 有 和 就 都 很 也 还 不 没').split())


def is_qqface(t: str) -> bool:
    """QQ 表情的文字写法，如 /糗大了、/呲牙。"""
    return bool(re.fullmatch(r'/[^\s/]{1,10}', t))


def qqfaces(msgs: list[dict], uin: str) -> collections.Counter:
    """QQ 文字表情的使用频次（属于表情习惯，不算口头禅）。"""
    c: collections.Counter = collections.Counter()
    for m in msgs:
        if m['uin'] != uin or m['system']:
            continue
        for t in re.findall(r'/[^\s/]{1,10}', m['speech']):
            if is_qqface(t):
                c[t] += 1
    return c


def top_phrases(counter: collections.Counter, glob: collections.Counter,
                min_count: int = 5, top: int = 14) -> list[tuple[str, int, float]]:
    """区分度优先的口头禅榜：score = 次数 × 专属度²，短词要求更高专属度。

    专属度 = 本人次数 / 全群该短语次数——因此「这个词主要是 TA 在说」的排前面，
    通用的「这个」「可以」只有在该人独占多数时才可能上榜。
    """
    cand = []
    for g, c in counter.items():
        if c < min_count or g in STOP or is_qqface(g):
            continue
        share = c / glob[g]
        if len(g) <= 3 and share < 0.5:
            continue
        if share < 0.15:
            continue
        score = c * (share ** 2.2) * (1 + 0.06 * (len(g) - 2))
        cand.append((g, c, share, score))
    cand.sort(key=lambda x: -x[3])
    picked: list[tuple[str, int, float]] = []
    for g, c, share, _ in cand:
        picked.append((g, c, share))
        if len(picked) >= top * 3:
            break
    # 同族（互为子串）只留最长代表，避免「怎么都这么吊 / 都这么吊 / 么都这么」连排
    picked.sort(key=lambda x: -len(x[0]))
    keep: list[tuple[str, int, float]] = []
    for g, c, share in picked:
        if any(g in k[0] for k in keep):
            continue
        keep.append((g, c, share))
        if len(keep) >= top:
            break
    return keep


def topic_profile(msgs: list[dict], uin: str) -> list[tuple[str, int, list[str]]]:
    """话题喜好：关键词命中次数 + 例句。"""
    hits: dict[str, list[str]] = collections.defaultdict(list)
    for m in msgs:
        if m['uin'] != uin or m['system'] or m.get('repeat_of') is not None:
            continue
        low = m['speech'].lower()
        if not low or len(low) > 80:
            continue
        for name, words in TOPICS.items():
            if any(w in low for w in words):
                hits[name].append(m['speech'])
    out = []
    for name, rows in hits.items():
        if len(rows) >= 3:
            out.append((name, len(rows), rows[:3]))
    return sorted(out, key=lambda x: -x[1])


def tail_habits(msgs: list[dict], uin: str) -> collections.Counter:
    c = collections.Counter()
    for m in msgs:
        if m['uin'] != uin or m['system'] or m.get('repeat_of') is not None:
            continue
        sp = m['speech']
        if sp and sp not in melt.DECOR:
            c[sp[-1]] += 1
            if len(sp) >= 2:
                c[sp[-2:]] += 1
    return c


def main_profile(stats: dict, uin: str) -> dict:
    return stats['people'].get(uin, {})


def render_md(uin: str, st: dict, phrases: list[tuple[str, int, float]],
              samples: dict[str, str], topics: list[tuple[str, int, list[str]]],
              tails: collections.Counter, kinds: dict[str, int], names: dict[str, str],
              repeat_rank: tuple[int, int], tag_repeat: bool,
              faces: collections.Counter | None = None) -> str:
    name = names.get(uin, uin)
    n = max(st.get('n', 0), 1)
    lines = [
        f'# 习惯用语库 · {name}（QQ {uin}）',
        '',
        f"> 语料：本人 **{n:,} 条**（{melt.fmt_ts(st.get('first', 0))} ~ {melt.fmt_ts(st.get('last', 0))}）"
        f" · 复读 {st.get('repeats', 0):,} 条（{st.get('repeats', 0) / n:.1%}，全群第 {repeat_rank[0]}/{repeat_rank[1]} 名）"
        + ("　→ **喜欢复读**" if tag_repeat else ''),
        '> 统计口径：**复读的条目不记在复读者名下**（内容归第一位发言者），因此下面每一条都是 TA 自己的话。',
        '',
        '## 一、招牌口头禅（区分度优先：又常出现、又主要是 TA 在用）',
        '',
        '| 短语 | 本人次数 | 占全群该短语 | 例句 |',
        '|------|---------|-------------|------|',
    ]
    for g, c, share in phrases:
        ex = samples.get(g, '')
        ex = ex if len(ex) <= 30 else ex[:30] + '…'
        lines.append(f'| **{g}** | {c} | {share:.0%} | {ex} |')

    lines += ['', '## 二、句尾与标点习惯', '']
    tail_top = [t for t in tails.most_common(24) if len(t[0]) == 1][:8]
    tail2_top = [t for t in tails.most_common(60) if len(t[0]) == 2][:6]
    lines.append('- 常收尾的字：' + '、'.join(f'「{c}」{n}次' for c, n in tail_top))
    lines.append('- 常见二字收尾：' + '、'.join(f'「{c}」{n}次' for c, n in tail2_top))
    lines.append(f"- 句末不带标点：{st.get('no_punct_ratio', 0):.0%}（群聊式换行断句）"
                 f" · 平均每句 {st.get('len_avg', 0)} 字 · 三字以内短句 {st.get('short_ratio', 0):.0%}")
    lines.append(f"- 语气符号：波浪号 {st.get('tilde', 0):,} 处 · 省略号 {st.get('ellipsis', 0):,} 处"
                 f" · 感叹号 {st.get('bang', 0):,} 处")
    lines.append(f"- 连发率 {st.get('burst', 0) / n:.0%}（60 秒内连着发的比例——TA 习惯把一句话拆成几条）")

    lines += ['', '## 三、表情 / 贴图 / 媒体习惯', '']
    k = kinds
    lines.append(f"- 消息构成：文字 {k.get('text', 0):,} · 回复 {k.get('reply', 0):,} · 图片 {k.get('image', 0):,}"
                 f" · 贴图 {k.get('sticker', 0):,} · 表情 {k.get('face', 0):,} · 转发 {k.get('forward', 0):,}")
    tops = st.get('top_stickers') or []
    if tops:
        lines.append('- 常用表情包：' + '、'.join(f'{s}({c})' for s, c in tops[:8]))
    else:
        lines.append('- 很少用 QQ 表情包，主要靠文字与图片。')
    if faces:
        lines.append('- 常用文字表情：' + '、'.join(f'{s}({c})' for s, c in faces.most_common(8)))

    lines += ['', '## 四、称呼与社交习惯', '']
    at = st.get('at') or []
    if at:
        lines.append('- @ 最多：' + '、'.join(f'{names.get(u, u)}({c})' for u, c in at[:6]))
    rt = st.get('replied_to') or []
    if rt:
        lines.append('- 回复最多：' + '、'.join(f'{names.get(u, u)}({c})' for u, c in rt[:6]))
    by = st.get('replied_by') or []
    if by:
        lines.append('- 最常被谁回复：' + '、'.join(f'{names.get(u, u)}({c})' for u, c in by[:6]))

    lines += ['', '## 五、复读习惯', '']
    lines.append(f"- 主动复读 {st.get('repeats', 0):,} 条（{st.get('repeats', 0) / n:.1%}）"
                 f"，被复读 {st.get('repeated_by', 0):,} 次"
                 f"，参与复读链 {st.get('chains', 0):,} 条（发起 {st.get('chains_first', 0):,} 条）")
    trt = st.get('repeat_targets') or []
    if trt:
        lines.append('- 最爱复读谁：' + '、'.join(f'{names.get(u, u)}({c})' for u, c in trt[:5]))
    ort = st.get('top_repeat_texts') or []
    if ort:
        lines.append('- 自己复读最多的话：' + '；'.join(f'「{t}」×{c}' for t, c in ort[:6]))
    rep = st.get('repeated_texts') or []
    if rep:
        lines.append('- TA 的话被复读最多：' + '；'.join(f'「{t}」×{c}' for t, c in rep[:6]))

    lines += ['', '## 六、作息', '']
    hours = st.get('hours') or {}
    if hours:
        hh = sorted(((int(h), c) for h, c in hours.items()), key=lambda x: x[0])
        spark = ''.join('▁▂▃▄▅▆▇█'[min(7, int(c / max(1, max(x[1] for x in hh)) * 7))] for _, c in hh)
        lines.append(f'- 24 小时分布：`{spark}`（0→23 时）')
        top3 = sorted(hh, key=lambda x: -x[1])[:3]
        lines.append('- 高峰：' + '、'.join(f'{h} 时' for h, _ in sorted(top3)))
        night = sum(c for h, c in hh if 0 <= h < 6)
        lines.append(f'- 凌晨 0~6 点发言 {night:,} 条（占 {night / n:.1%}）')

    lines += ['', '## 七、喜好画像（关键词命中次数，取前 6）', '']
    for name_, c, ex in topics[:6]:
        lines.append(f'- **{name_}**（{c} 次）：' + ' ／ '.join(f'「{e[:26]}」' for e in ex))
    lines.append('')
    lines.append('> 例皆为原话（`verbatim`），可在 `../dialogues-v2/` 对应文件中逐字核验。')
    return '\n'.join(lines) + '\n'


def run() -> None:
    msgs = melt.load_norm()
    stats = json.load(open(melt.STATS_JSON, encoding='utf-8'))
    names = stats['names']
    per, glob, samples = build_counts(msgs)

    order = sorted(per, key=lambda u: -stats['people'].get(u, {}).get('n', 0))
    # 复读排名（按占比，且条数 ≥ 150）
    ranked = sorted(order, key=lambda u: -(stats['people'].get(u, {}).get('repeats', 0)
                                           / max(stats['people'].get(u, {}).get('n', 0), 1)))
    rank_of = {u: i + 1 for i, u in enumerate(ranked)}

    os.makedirs(OUT, exist_ok=True)
    out_json: dict[str, dict] = {}
    summary_rows = []
    for u in order:
        st = stats['people'].get(u, {})
        if st.get('n', 0) < 30:
            continue                        # 语料太少，不做画像（文件里仍可查）
        ph = top_phrases(per[u], glob)
        tp = topic_profile(msgs, u)
        tails = tail_habits(msgs, u)
        tag = st.get('repeats', 0) >= 150 and st.get('repeats', 0) / max(st.get('n', 1), 1) >= 0.05
        md = render_md(u, st, ph, samples[u], tp, tails, st.get('kinds', {}), names,
                       (rank_of.get(u, 0), len(ranked)), tag, qqfaces(msgs, u))
        open(os.path.join(OUT, f'{u}.md'), 'w', encoding='utf-8').write(md)
        out_json[u] = {
            'name': names.get(u, ''), 'n': st.get('n', 0),
            'qqfaces': qqfaces(msgs, u).most_common(8),
            'phrases': [{'text': g, 'n': c, 'share': round(s, 3), 'example': samples[u].get(g, '')} for g, c, s in ph],
            'tails': [t for t in tails.most_common(30)],
            'topics': [{'name': nm, 'n': c, 'examples': ex} for nm, c, ex in tp[:8]],
            'repeat': {'n': st.get('repeats', 0), 'ratio': round(st.get('repeats', 0) / max(st.get('n', 1), 1), 3),
                       'rank': rank_of.get(u, 0), 'tag': tag},
            'hours': st.get('hours', {}),
        }
        summary_rows.append((st.get('n', 0), names.get(u, u), u, ph[0][0] if ph else '—',
                             '喜欢复读' if tag else '', st.get('repeats', 0),
                             st.get('repeats', 0) / max(st.get('n', 1), 1)))

    json.dump(out_json, open(JSON_OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # 总表
    rows = sorted(summary_rows, key=lambda r: -r[0])
    lines = [
        '# 习惯用语库（phrasebook）',
        '',
        f'从 **{len(msgs):,}** 条群聊里，按 **QQ 号**给 {len(rows)} 位群友各建一份习惯用语画像。',
        '每份包含：招牌口头禅（区分度优先）、句尾与标点习惯、表情/贴图习惯、称呼与社交习惯、复读习惯、作息、喜好画像。',
        '',
        '> 口径：**复读的内容不记在复读者名下**（归第一位发言者）；只统计本人原创发言。',
        '> 判定「喜欢复读」的条件：主动复读 ≥ 150 条且占本人发言 ≥ 5%。',
        '',
        '| 群友 | 条数 | 招牌口头禅 | 复读 | 复读占比 | 标签 | 详细 |',
        '|------|------|-----------|------|---------|------|------|',
    ]
    for n, nm, u, top1, tag, rn, rr in rows:
        lines.append(f'| {nm} | {n:,} | **{top1}** | {rn:,} | {rr:.1%} | {tag or "—"} '
                     f'| [{u}.md](./{u}.md) |')
    lines += ['', '机器可读版本：[`phrases.json`](./phrases.json)。', '']
    open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8').write('\n'.join(lines))

    tagged = [r for r in rows if r[4]]
    print(f'习惯用语库：{len(rows)} 人 → {OUT}')
    print(f'标记「喜欢复读」{len(tagged)} 人：'
          + '、'.join(f'{r[1]}({r[6]:.1%})' for r in sorted(tagged, key=lambda x: -x[6])))
    print('招牌口头禅样例：')
    for r in rows[:10]:
        print(f'  {r[1]:<16} {r[3]}')


if __name__ == '__main__':
    run()