#!/usr/bin/env python3
"""melt 管线 · 第二级：按人拆分（严格按 QQ 号）+ 复读标注 + 索引 + 统计。

产出：
    legacy/materials/dialogues-v2/<昵称>_<QQ>.md   每人一份对白（含复读标注）
    legacy/materials/dialogues-v2/INDEX.md         全部说话人索引
    legacy/materials/dialogues-v2/_system.md       系统消息（拍一拍 / 撤回等，群梗来源）
    legacy/materials/corpus-v2/stats.json          机器可读的每人统计（供后续各级复用）
"""
from __future__ import annotations

import collections
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import melt  # noqa: E402  （同目录的工具库）


# ---------------------------------------------------------------- 旧语料的角色表

def old_roles() -> dict[str, str]:
    """旧语料 INDEX 里有群内角色（owner/admin/member），按 QQ 号搬到新语料。"""
    path = os.path.join(melt.MATERIALS, 'dialogues', 'INDEX.md')
    roles: dict[str, str] = {}
    if not os.path.exists(path):
        return roles
    for line in open(path, encoding='utf-8'):
        m = re.match(r'\|\s*\d+\s*\|[^|]*\|[^|]*\|\s*(\w+)\s*\|[^|]*\|[^|]*\|.*?_(\d+)\.md', line)
        if m:
            roles[m.group(2)] = m.group(1)
    return roles


def self_uin() -> str:
    files = glob.glob(melt.MANIFEST_GLOB)
    if files:
        try:
            mf = json.load(open(files[0], encoding='utf-8'))
            return str((mf.get('chatInfo') or {}).get('selfUin') or '')
        except Exception:
            pass
    return ''


# ---------------------------------------------------------------- 转录行渲染

def display(m: dict) -> str:
    """一条消息在转录里的显示形式：媒体占位、表情名、回复关系都标出来。"""
    t = m['text'] or ''
    t = re.sub(r'\[图片:[^\]]*\]', '[图片]', t)
    t = re.sub(r'^\[回复消息\]@?[^\s]*\s*', '', t)
    t = re.sub(r'\[\[([^\]]+)\]\]', r'[表情：\1]', t)
    fm = re.match(r'^\[转发消息:\s*(\d+)条\]', t)
    if fm:
        t = f'[转发 {fm.group(1)} 条]'
    t = re.sub(r'\n+', ' ⏎ ', t).strip()
    if m['recalled']:
        t = (t + ' ' if t else '') + '[已撤回]'
    if not t:
        t = {'image': '[图片]', 'sticker': '[贴图]', 'face': '[表情]', 'forward': '[转发]',
             'json': '[分享卡片]', 'video': '[视频]', 'audio': '[语音]', 'file': '[文件]'}.get(m['kind'], '[空]')
    return t


# ---------------------------------------------------------------- 写对白集

def write_split(msgs: list[dict], prof: dict, rep: dict) -> None:
    os.makedirs(melt.DIALOGUES, exist_ok=True)
    roles = old_roles()
    me = self_uin()
    names = {u: (d['cards'][-1] if d['cards'] else (d['names'][-1] if d['names'] else ''))
             for u, d in prof.items()}

    def role_of(u: str) -> str:
        if u == me:
            return '本人（数据提供者）'
        if u == '0' or not u.isdigit():
            return '未知'
        if roles.get(u):
            return {'owner': '群主', 'admin': '管理员', 'member': '成员'}.get(roles[u], roles[u])
        nm = names.get(u, '')
        if 'Bot' in nm or 'bot' in nm or '机器人' in nm:
            return '机器人'
        return '成员'

    by_person: dict[str, list[dict]] = collections.defaultdict(list)
    systems: list[dict] = []
    for m in msgs:
        if m['system'] or m['uin'] in ('0', '未知') or not m['uin'].isdigit():
            systems.append(m)
        else:
            by_person[m['uin']].append(m)

    # 每人一份
    for uin, rows in by_person.items():
        d = prof[uin]
        nm = names.get(uin) or f'群友{uin}'
        fname = f'{melt.safe_name(nm)}_{uin}.md'
        d['file'] = fname
        head = [
            f'# {nm}',
            '',
            f"> QQ `{uin}` · **{role_of(uin)}** · {len(rows):,} 条（含系统 {d['n_system']}）"
            f" · {melt.fmt_ts(d['first'])} ~ {melt.fmt_ts(d['last'])}",
        ]
        if len(d['cards']) > 1 or (d['cards'] and d['cards'][0] != nm):
            head.append('> 群名片历史：' + ' → '.join(d['cards'][-6:]))
        if len(d['names']) > 1:
            head.append('> 昵称历史：' + ' → '.join(d['names'][-6:]))
        n = max(d['n'], 1)
        head.append(
            f"> 复读：主动复读 **{d['repeats']:,}** 条（占 {d['repeats'] / n:.1%}）"
            f" · 被复读 **{d['repeated_by']:,}** 次"
            f" · 参与复读链 **{d['chains']:,}** 条（发起 {d['chains_first']:,} 条）")
        top_hours = '、'.join(f'{h}时' for h, _ in d['hours'].most_common(3))
        head.append(f'> 活跃时段：{top_hours} · 连发率 {d["burst"] / n:.0%}'
                    f' · 图片/贴图/表情 {d["kinds"]["image"] + d["kinds"]["sticker"] + d["kinds"]["face"]:,} 条'
                    f' · 习惯用语见 `../../phrasebook/{uin}.md`')
        head += ['', '## 对话记录', '']
        lines = list(head)
        for m in rows:
            stamp = melt.fmt_ts(m['ts'])
            if m.get('repeat_of') is not None:
                src = msgs[m['repeat_of']]
                who = names.get(src['uin'], src['uin'])
                lines.append(f'- `{stamp}`  ↻ 复读 **{who}**：「{display(src)}」')
                continue
            body = display(m)
            if m['kind'] == 'reply' and m['reply_to']:
                who = names.get(m['reply_to'], m['reply_to'])
                body = f'↳ 回复 {who}：{body}'
            lines.append(f'- `{stamp}`  {body}')
        if d['repeated_texts']:
            lines += ['', '## 被复读最多的话', '']
            for txt, c in d['repeated_texts'].most_common(10):
                lines.append(f'- 「{txt}」× {c}')
        open(os.path.join(melt.DIALOGUES, fname), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

    # 系统消息
    sys_lines = [f'# 系统消息（拍一拍等）', '', f'> 共 {len(systems):,} 条 · 群梗与关系网的来源之一', '', '## 记录', '']
    for m in systems[:4000]:
        sys_lines.append(f'- `{melt.fmt_ts(m["ts"])}`  {display(m)}')
    if len(systems) > 4000:
        sys_lines.append(f'- ……（其余 {len(systems) - 4000:,} 条略）')
    open(os.path.join(melt.DIALOGUES, '_system.md'), 'w', encoding='utf-8').write('\n'.join(sys_lines) + '\n')

    # 索引
    order = sorted(by_person, key=lambda u: -prof[u]['n'])
    idx = [
        '# 群友对话索引（v2）',
        '',
        f'共 **{len(order)}** 位说话人 / **{sum(prof[u]["n"] for u in order):,}** 条消息'
        f'（{melt.fmt_ts(min(m["ts"] for m in msgs))} ~ {melt.fmt_ts(max(m["ts"] for m in msgs))}）。',
        '由 `pipeline-v2/melt.py` 从 chunked jsonl 按 **QQ 号**拆分——昵称会改，QQ 号不变，因此不会混淆。',
        '',
        '`复读` = 本人复读别人的条数；`被复读` = 本人发言被别人复读的次数；`链` = 参与的复读链条数。',
        '',
        '| # | 昵称 | 角色 | 条数 | 复读 | 被复读 | 链 | 时间范围 | 文件 |',
        '|---|------|------|------|------|--------|-----|----------|------|',
    ]
    for i, u in enumerate(order, 1):
        d = prof[u]
        idx.append(
            f'| {i} | {names.get(u) or u} | {role_of(u)} | {d["n"]:,} | {d["repeats"]:,} '
            f'| {d["repeated_by"]:,} | {d["chains"]:,} '
            f'| {melt.fmt_ts(d["first"])} ~ {melt.fmt_ts(d["last"])} '
            f'| [{d["file"]}](./{d["file"]}) |')
    open(os.path.join(melt.DIALOGUES, 'INDEX.md'), 'w', encoding='utf-8').write('\n'.join(idx) + '\n')

    # 机器可读统计
    os.makedirs(os.path.dirname(melt.STATS_JSON), exist_ok=True)
    payload = {
        'generated_at': melt.datetime.now(melt.CST).isoformat(timespec='seconds'),
        'total_messages': len(msgs),
        'speakers': len(order),
        'self_uin': me,
        'names': names,
        'roles': {u: role_of(u) for u in order},
        'people': {},
    }
    for u in order:
        d = prof[u]
        payload['people'][u] = {
            'name': names.get(u, ''),
            'role': role_of(u),
            'n': d['n'], 'first': d['first'], 'last': d['last'],
            'kinds': dict(d['kinds']), 'repeats': d['repeats'], 'repeated_by': d['repeated_by'],
            'chains': d['chains'], 'chains_first': d['chains_first'],
            'hours': dict(d['hours']), 'burst': d['burst'],
            'top_lines': d['lines'].most_common(40),
            'top_stickers': d['stickers'].most_common(10),
            'top_repeat_texts': d['own_repeat_texts'].most_common(10),
            'repeated_texts': d['repeated_texts'].most_common(10),
            'at': d['at'].most_common(8), 'replied_to': d['replied_to'].most_common(8),
            'at_by': d['at_by'].most_common(8), 'replied_by': d['replied_by'].most_common(8),
            'names_history': d['names'][-8:], 'cards_history': d['cards'][-8:],
            'len_avg': round(d['len_sum'] / max(d['len_n'], 1), 1),
            'short_ratio': round(d['short'] / max(d['len_n'], 1), 3),
            'no_punct_ratio': round(d['no_punct'] / max(d['len_n'], 1), 3),
            'tilde': d['tilde'], 'ellipsis': d['ellipsis'], 'bang': d['bang'],
        }
    json.dump(payload, open(melt.STATS_JSON, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'对白集：{len(order)} 人 → {melt.DIALOGUES}')
    print(f'统计：{melt.STATS_JSON}')


def run() -> None:
    msgs = melt.load_norm()
    prof = melt.person_stats(msgs)
    rep = melt.repeat_summary(prof, msgs)
    write_split(msgs, prof, rep)
    top = sorted(prof, key=lambda u: -prof[u]['repeats'])[:10]
    names = {u: (prof[u]['cards'][-1] if prof[u]['cards'] else '') for u in prof}
    print('\n最爱复读 Top 10：')
    for u in top:
        d = prof[u]
        print(f'  {d["repeats"]:>6,} 条（{d["repeats"] / max(d["n"], 1):>5.1%}）'
              f'  被复读 {d["repeated_by"]:>6,} 次  {names[u] or u}  [{u}]')


if __name__ == '__main__':
    run()