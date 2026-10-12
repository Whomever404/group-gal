#!/usr/bin/env python3
"""新语料熔炼管线（v2）—— 214,905 条 QQ 群聊 → 对白集 / 习惯用语库 / 群梗库 / 人设包证据。

数据来源：QQChatExporter 导出的 chunked jsonl（`corpus-v2/`）。与旧管线（../pipeline/）的区别：
  · 输入是 jsonl 分片（不再是 zip 里的 markdown），字段更全（mentions / reply / 表情 / 撤回）
  · 身份主键是 **QQ 号（uin）**，昵称与群名片只作展示——改名不改身份，绝不混淆
  · 新增 **复读检测**：连续窗口内同文的后来者记为「复读」，内容归第一位发言者
  · 新增 **习惯用语库**（phrasebook）与 **群梗库**（memes）两个产出

用法（在仓库根目录执行）：
    python3 legacy/materials/pipeline-v2/melt.py chunks   # 解析 jsonl → 归一化缓存
    python3 legacy/materials/pipeline-v2/melt.py split    # 按人拆分 + 复读标注 + 索引
    python3 legacy/materials/pipeline-v2/melt.py phrases  # 习惯用语库
    python3 legacy/materials/pipeline-v2/melt.py memes    # 群梗库 / 黑话
    python3 legacy/materials/pipeline-v2/melt.py evidence # 每人一份人设包证据
    python3 legacy/materials/pipeline-v2/melt.py all      # 以上全部
"""
from __future__ import annotations

import collections
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta

# ---------------------------------------------------------------- 路径

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
MATERIALS = os.path.join(REPO, 'legacy', 'materials')
RAW_GLOB = '/tmp/corpus-v2/*/chunks/*.jsonl'          # 解包后的 jsonl 分片
AVATARS_GLOB = '/tmp/corpus-v2/*/avatars.json'
MANIFEST_GLOB = '/tmp/corpus-v2/*/manifest.json'
NORM_CACHE = '/tmp/corpus-v2/_norm.jsonl'             # 归一化缓存（不提交）
DIALOGUES = os.path.join(MATERIALS, 'dialogues-v2')
PHRASEBOOK = os.path.join(MATERIALS, 'phrasebook')
MEMES = os.path.join(MATERIALS, 'memes')
EVIDENCE = os.path.join(MATERIALS, 'skills', 'immortals-v2', '_evidence')
STATS_JSON = os.path.join(MATERIALS, 'corpus-v2', 'stats.json')

CST = timezone(timedelta(hours=8))                    # 群聊按东八区看作息

# ---------------------------------------------------------------- 归一化

RE_IMG = re.compile(r'\[图片:[^\]]*\]')
RE_IMG_BARE = re.compile(r'\[图片\]')
RE_FACE = re.compile(r'\[\[([^\]]+)\]\]')             # [[撅嘴]] 表情包名
RE_REPLY = re.compile(r'^\[回复消息\]@?[^\s]*')
RE_FORWARD = re.compile(r'^\[转发消息:\s*(\d+)条\]')
RE_AT = re.compile(r'@[^\s@]{1,24}')
RE_URL = re.compile(r'https?://\S+')

# 纯装饰 / 无内容的消息，不参与「习惯用语」统计
DECOR = {'[图片]', '[[图片]]', '[动画表情]', '[表情]', '[视频]', '[语音]', '[文件]', '[JSON消息]',
         '[音乐]', '[位置]', '[链接]', '[合并转发]', '[红包]', '[转账]', '[礼物]', '[分享]'}


def clean_speech(text: str) -> str:
    """剥掉媒体占位、回复前缀、@ 前缀与链接，留下「人说的话」。"""
    t = text or ''
    t = RE_REPLY.sub('', t)
    t = RE_FORWARD.sub('', t)
    t = RE_IMG.sub('[图片]', t)
    t = RE_URL.sub('[链接]', t)
    t = RE_AT.sub('', t)
    t = t.replace('\u2005', ' ').replace('\u00a0', ' ')
    return t.strip()


def norm_key(text: str) -> str:
    """复读判定用的归一化键：去空白、去装饰标点，但保留文字本身。"""
    t = clean_speech(text)
    t = re.sub(r'[\s\u2005]', '', t)
    t = t.strip('。，、！？~～.!,?')
    return t


def is_rep_repeatable(k: str) -> bool:
    """只有「文字」才算复读：纯媒体占位（[图片]/[贴图]/[表情：x]）不算。"""
    if len(k) < MIN_KEY_LEN:
        return False
    if k in DECOR:
        return False
    if re.fullmatch(r'(\[[^\[\]]{1,12}\]|\[表情：[^\[\]]{1,12}\])+', k):
        return False
    return True


def kind_of(m: dict, elems: list, text: str) -> str:
    """粗分消息类型：text / image / sticker / face / reply / forward / json / system / other。"""
    if m.get('system'):
        return 'system'
    types = {e.get('type') for e in elems}
    if 'forward' in types:
        return 'forward'
    if 'json' in types:
        return 'json'
    if 'market_face' in types:
        return 'face'
    if RE_FACE.search(text or ''):
        return 'face'
    if 'reply' in types:
        return 'reply'
    for e in elems:
        if e.get('type') == 'image' and (e.get('data') or {}).get('subType') == 'sticker':
            return 'sticker'
    if 'image' in types:
        return 'image'
    if m.get('recalled'):
        return 'recalled'
    return m.get('type') or 'other'


def loads_chunks() -> list[dict]:
    """读取全部分片，归一化成统一记录。"""
    import glob
    out: list[dict] = []
    files = sorted(glob.glob(RAW_GLOB))
    if not files:
        sys.exit(f'找不到分片：{RAW_GLOB}（先解包 zip 到 /tmp/corpus-v2/）')
    for path in files:
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    m = json.loads(line)
                except json.JSONDecodeError:
                    continue
                s = m.get('sender') or {}
                c = m.get('content') or {}
                elems = c.get('elements') or []
                text = c.get('text') or ''
                uin = str(s.get('uin') or s.get('uid') or '0')
                reply_to = None
                ats: list[str] = []
                for e in elems:
                    d = e.get('data') or {}
                    if e.get('type') == 'reply':
                        reply_to = str(d.get('senderUin') or '') or None
                    elif e.get('type') == 'at':
                        if d.get('uin'):
                            ats.append(str(d['uin']))
                for mn in (c.get('mentions') or []):
                    if mn.get('uin') and str(mn['uin']) not in ats:
                        ats.append(str(mn['uin']))
                sticker = ''
                for e in elems:
                    if e.get('type') == 'market_face':
                        sticker = ((e.get('data') or {}).get('name') or '').strip('[]')
                out.append({
                    'ts': int(m.get('timestamp') or 0),
                    'seq': int(m.get('seq') or 0),
                    'uin': uin,
                    'name': (s.get('name') or '').strip(),
                    'card': (s.get('groupCard') or '').strip(),
                    'title': (s.get('title') or '').strip(),
                    'type': m.get('type') or '',
                    'kind': kind_of(m, elems, text),
                    'text': text,
                    'speech': clean_speech(text),
                    'key': norm_key(text),
                    'reply_to': reply_to,
                    'ats': ats,
                    'sticker': sticker,
                    'system': bool(m.get('system')),
                    'recalled': bool(m.get('recalled')),
                })
    out.sort(key=lambda r: (r['ts'], r['seq']))
    return out


# ---------------------------------------------------------------- 复读检测

WINDOW_MSGS = 8        # 往回看几条
WINDOW_SEC = 180       # 或往回看多少秒
MIN_KEY_LEN = 2        # 太短的（「?」「。」）不算复读


def mark_repeats(msgs: list[dict]) -> None:
    """就地标注复读。

    规则：一条消息若在「前 8 条 / 前 180 秒」内出现过同文（归一化后相同、且不是自己发的），
    则视为复读——内容归第一位发言者，本条记 `repeat_of` 指向原发言的序号。
    """
    recent: collections.deque = collections.deque()
    for i, m in enumerate(msgs):
        m['repeat_of'] = None
        k = m['key']
        if is_rep_repeatable(k) and not m['system']:
            for j, kk, ts, uin in reversed(recent):
                if ts < m['ts'] - WINDOW_SEC * 1000:
                    break
                if kk == k and uin != m['uin']:
                    m['repeat_of'] = j
                    break
        recent.append((i, k, m['ts'], m['uin']))
        while len(recent) > WINDOW_MSGS:
            recent.popleft()


def repeat_chains(msgs: list[dict]) -> list[dict]:
    """复读链：连续同文（≥3 条）的片段，群梗的重要来源。"""
    chains = []
    i = 0
    while i < len(msgs):
        k = msgs[i]['key']
        if not is_rep_repeatable(k):
            i += 1
            continue
        j = i + 1
        while j < len(msgs) and msgs[j]['key'] == k and msgs[j]['ts'] - msgs[j - 1]['ts'] <= WINDOW_SEC * 1000:
            j += 1
        if j - i >= 3:
            chains.append({
                'key': k, 'start': i, 'n': j - i,
                'ts': msgs[i]['ts'],
                'text': msgs[i]['speech'] or msgs[i]['text'],
                'people': [msgs[x]['uin'] for x in range(i, j)],
                'first': msgs[i]['uin'],
            })
            i = j
        else:
            i += 1
    return chains


# ---------------------------------------------------------------- 工具

def fmt_ts(ts: int, with_date: bool = True) -> str:
    d = datetime.fromtimestamp(ts / 1000, CST)
    return d.strftime('%m-%d %H:%M') if with_date else d.strftime('%H:%M')


def safe_name(name: str) -> str:
    n = re.sub(r'[\\/:*?"<>|\n\r\t]', '_', name or '').strip().strip('.')
    n = re.sub(r'\s+', ' ', n)
    return (n or '无名')[:40]


def load_norm(force: bool = False) -> list[dict]:
    if not force and os.path.exists(NORM_CACHE):
        out = []
        with open(NORM_CACHE, encoding='utf-8') as f:
            for line in f:
                out.append(json.loads(line))
        print(f'读取归一化缓存：{len(out):,} 条')
    else:
        t0 = time.time()
        out = loads_chunks()
        with open(NORM_CACHE, 'w', encoding='utf-8') as f:
            for m in out:
                f.write(json.dumps(m, ensure_ascii=False) + '\n')
        print(f'解析完成：{len(out):,} 条 · {time.time() - t0:.1f}s')
    mark_repeats(out)
    return out


PUNCT_END = '。！？!?~～…，,、'
SHORT_PUNCT_END = '。.!?！？'


# ---------------------------------------------------------------- 每人统计

def person_stats(msgs: list[dict]) -> dict:
    """按人聚合：条目数、类型分布、复读、作息、标点与表情习惯、@ 与回复网络。"""
    prof: dict[str, dict] = {}

    def p(uin: str) -> dict:
        return prof.setdefault(uin, {
            'uin': uin, 'names': [], 'cards': [], 'titles': [],
            'n': 0, 'n_system': 0, 'first': None, 'last': None,
            'kinds': collections.Counter(), 'repeats': 0,
            'repeated_by': 0, 'repeat_targets': collections.Counter(),
            'repeated_texts': collections.Counter(), 'own_repeat_texts': collections.Counter(),
            'at': collections.Counter(), 'replied_to': collections.Counter(),
            'at_by': collections.Counter(), 'replied_by': collections.Counter(),
            'hours': collections.Counter(), 'weekday': collections.Counter(),
            'len_sum': 0, 'len_n': 0, 'short': 0, 'no_punct': 0, 'spacey': 0,
            'emoji': collections.Counter(), 'stickers': collections.Counter(),
            'tilde': 0, 'ellipsis': 0, 'bang': 0, 'lines': collections.Counter(),
            'burst': 0,
        })

    last_by: dict[str, int] = {}
    for m in msgs:
        uin = m['uin']
        d = p(uin)
        if m['name'] and (not d['names'] or d['names'][-1] != m['name']):
            d['names'].append(m['name'])
        if m['card'] and (not d['cards'] or d['cards'][-1] != m['card']):
            d['cards'].append(m['card'])
        if m['title'] and m['title'] not in d['titles']:
            d['titles'].append(m['title'])
        if m['system']:
            d['n_system'] += 1
            continue

        d['n'] += 1
        d['first'] = m['ts'] if d['first'] is None else min(d['first'], m['ts'])
        d['last'] = m['ts'] if d['last'] is None else max(d['last'], m['ts'])
        d['kinds'][m['kind']] += 1
        dt = datetime.fromtimestamp(m['ts'] / 1000, CST)
        d['hours'][dt.hour] += 1
        d['weekday'][dt.weekday()] += 1

        for a in m['ats']:
            d['at'][a] += 1
            p(a)['at_by'][uin] += 1
        if m['reply_to']:
            d['replied_to'][m['reply_to']] += 1
            p(m['reply_to'])['replied_by'][uin] += 1

        if m.get('repeat_of') is not None:
            d['repeats'] += 1
            d['own_repeat_texts'][m['speech'] or m['text']] += 1
            src = msgs[m['repeat_of']]
            d['repeat_targets'][src['uin']] += 1
            p(src['uin'])['repeated_by'] += 1
            p(src['uin'])['repeated_texts'][src['speech'] or src['text']] += 1

        sp = m['speech']
        if sp and sp not in DECOR:
            d['len_sum'] += len(sp)
            d['len_n'] += 1
            if len(sp) <= 3:
                d['short'] += 1
            if sp[-1] not in PUNCT_END:
                d['no_punct'] += 1
            if ' ' in sp and not any(c in sp for c in SHORT_PUNCT_END):
                d['spacey'] += 1
            if '~' in sp or '～' in sp:
                d['tilde'] += 1
            if '……' in sp or '...' in sp or '。。。' in sp:
                d['ellipsis'] += 1
            if '！' in sp or '!' in sp:
                d['bang'] += 1
            d['lines'][sp] += 1
        for ch in sp:
            if ord(ch) > 0x1F000:
                d['emoji'][ch] += 1
        if m['sticker']:
            d['stickers'][m['sticker']] += 1

        prev = last_by.get(uin)
        if prev is not None and m['ts'] - prev <= 60_000:
            d['burst'] += 1
        last_by[uin] = m['ts']

    return prof


def repeat_summary(prof: dict, msgs: list[dict]) -> dict:
    """复读相关的收敛指标：谁最爱复读、谁的发言最常被复读、复读链常客。"""
    chains = repeat_chains(msgs)
    chain_member = collections.Counter()
    chain_first = collections.Counter()
    for c in chains:
        for u in set(c['people']):
            chain_member[u] += 1
        chain_first[c['first']] += 1
    for u, d in prof.items():
        d['chains'] = chain_member.get(u, 0)
        d['chains_first'] = chain_first.get(u, 0)
    return {'chains': chains, 'chain_member': chain_member, 'chain_first': chain_first}


# ---------------------------------------------------------------- CLI

STAGES = ('chunks', 'split', 'phrases', 'memes', 'evidence')
MODULES = {'split': 'melt_split', 'phrases': 'melt_phrases', 'memes': 'melt_memes', 'evidence': 'melt_evidence'}


def main() -> None:
    import importlib

    args = sys.argv[1:] or ['all']
    if args[0] == 'chunks':
        msgs = load_norm(force=True)
        n_rep = sum(1 for m in msgs if m.get('repeat_of') is not None)
        print(f'复读判定：{n_rep:,} 条（{n_rep / max(len(msgs), 1):.2%}）'
              f' · 缓存 → {NORM_CACHE}')
        return

    todo = STAGES[1:] if args[0] == 'all' else args
    for stage in todo:
        if stage not in MODULES:
            sys.exit(f'未知阶段：{stage}（可选：{", ".join(STAGES)}）')
        mod = importlib.import_module(MODULES[stage])
        print(f'\n===== {stage} =====')
        mod.run()


if __name__ == '__main__':
    main()