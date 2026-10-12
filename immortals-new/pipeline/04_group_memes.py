# -*- coding: utf-8 -*-
"""群级分析：昵称演化 / 复读链梗排行 / 跨成员高频短语 / 家族关系 / 分享内容 / 媒体使用"""
import json, glob, re, collections, datetime

BASE = '/tmp/newdata/chatdb/group_【里】😂群聊_行_1058585968_20261012_162110010_chunked_jsonl'
NORM = '/tmp/newdata/norm/messages.jsonl'
CHAINS = '/tmp/newdata/norm/repeat_chains.jsonl'
OUT = '/tmp/newdata/norm'

MEMBERS = json.load(open('/tmp/newdata/norm/members_summary.json', encoding='utf-8'))
UIN2NAME = {v['uin']: v['name'] for v in MEMBERS.values()}
UIN2SLUG = {v['uin']: k for k, v in MEMBERS.items()}

def fmt(ts):
    return datetime.datetime.fromtimestamp(ts / 1000, datetime.UTC).strftime('%Y-%m-%d')

msgs = [json.loads(l) for l in open(NORM, encoding='utf-8')]
msgs.sort(key=lambda r: r['seq'])

# ---- 昵称演化（全部 76 个发送者，重点 21 人）----
names = collections.defaultdict(collections.Counter)
name_first, name_last = {}, {}
for r in msgs:
    if not r['uin'] or r['sys']: continue
    nm = r['name']
    if not nm: continue
    names[r['uin']][nm] += 1
    key = (r['uin'], nm)
    if key not in name_first: name_first[key] = r['ts']
    name_last[key] = r['ts']

nick_timeline = {}
for uin, cnt in names.items():
    rows = []
    for nm, c in cnt.most_common():
        rows.append({'name': nm, 'count': c, 'first': fmt(name_first[(uin, nm)]), 'last': fmt(name_last[(uin, nm)])})
    nick_timeline[uin] = rows
json.dump(nick_timeline, open(OUT + '/nickname_timeline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---- 复读链梗排行 ----
sig_agg = collections.defaultdict(lambda: {'chains': 0, 'repeats': 0, 'origins': collections.Counter(),
                                           'senders': collections.Counter(), 'first_ts': None, 'sample': ''})
for l in open(CHAINS, encoding='utf-8'):
    ch = json.loads(l)
    if ch['kind'] != 'repeat': continue
    a = sig_agg[ch['sig']]
    a['chains'] += 1
    a['repeats'] += ch['len'] - 1
    a['origins'][ch['origin_uin']] += 1
    for s in ch['senders']: a['senders'][s] += 1
    if a['first_ts'] is None or ch['ts0'] < a['first_ts']: a['first_ts'] = ch['ts0']
    if not a['sample']: a['sample'] = ch['text']
memes = []
for sig, a in sig_agg.items():
    if a['repeats'] < 8: continue
    memes.append({
        'sig': sig[:80], 'text': a['sample'][:60], 'chains': a['chains'], 'repeats': a['repeats'],
        'origin_uin': a['origins'].most_common(3), 'participants': len(a['senders']),
        'first': fmt(a['first_ts']),
    })
memes.sort(key=lambda x: -x['repeats'])
json.dump(memes[:300], open(OUT + '/top_repeat_memes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('repeat memes >=8 repeats:', len(memes))
print('----- TOP 40 复读梗 -----')
for m in memes[:40]:
    o = UIN2NAME.get(m['origin_uin'][0][0], m['origin_uin'][0][0]) if m['origin_uin'] else '?'
    print(f"x{m['repeats']:<5}链{m['chains']:<4}首现{m['first']} 带头:{o} | {m['text'][:42]}")

# ---- 跨成员字符 n-gram 群短语 ----
STOPCHARS = set('的了是我你他她它们这那一个什么怎么吗呢吧啊呀哦嗯呃诶哎唉就也都还又再才只被把让给对从到在和与跟或者而但不过因为所以如果要是就是还是或者而且然后现在时候以后以前今天昨天明天可以不能不会不是没有没要有想会说做去来上下好很太更最真有点可能应该觉得知道感觉东西事情问题时间地方一下一起一样一点已经一直其实反正确实完全直接具体基本大概需要出来起来进去回来过来过去下去上去开关大小多少高低快慢新老')
def char_ngrams(text, maxn=6):
    t = re.sub(r'[\s]+', '', text)
    t = re.sub(r'\[.*?\]', '', t)
    out = []
    for n in range(2, maxn + 1):
        for i in range(len(t) - n + 1):
            g = t[i:i + n]
            if re.search(r'[0-9a-zA-Z]', g): continue
            out.append(g)
    return out

ng_doc = collections.defaultdict(set)
ng_cnt = collections.Counter()
ng_uin = collections.defaultdict(collections.Counter)
own_text_msgs = []
for r in msgs:
    if r['sys'] or not r['ptxt']: continue
    own_text_msgs.append(r)
for r in own_text_msgs:
    for g in char_ngrams(r['ptxt']):
        ng_cnt[g] += 1
        ng_doc[g].add(r['uin'])
        ng_uin[g][r['uin']] += 1
shared = []
for g, c in ng_cnt.items():
    df = len(ng_doc[g])
    if c < 40 or df < 5: continue
    # 排除纯停顿词组合
    if len(set(g) - STOPCHARS) == 0: continue
    top = ng_uin[g].most_common(5)
    shared.append({'ng': g, 'count': c, 'members': df,
                   'top': [(UIN2NAME.get(u, u), n) for u, n in top]})
shared.sort(key=lambda x: -(x['members'] * 3 + x['count']))
json.dump(shared[:400], open(OUT + '/shared_phrases.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n----- 跨成员短语 TOP 60 -----')
for s in shared[:60]:
    print(f"{s['ng']:<10} 次数{s['count']:<5} 成员{s['members']:<3} {s['top'][:3]}")

# ---- 家族关系模式 ----
rel_re = re.compile(r'([\u4e00-\u9fa5A-Za-z0-9，,、]{1,8})(是|的|当)(我的|你|我)?(爸爸|妈妈|父亲|母亲|爹|儿子|女儿|爹妈|父亲大人|妈妈桑|老父亲|亲爹|爹地)')
rels = collections.Counter()
for r in own_text_msgs:
    for m in rel_re.finditer(r['ptxt']):
        rels[r['ptxt'][:40]] += 1
rel_list = [{'text': t, 'count': c} for t, c in rels.most_common(120)]
json.dump(rel_list, open(OUT + '/family_relations.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n----- 家族/关系句式 TOP 25 -----')
for x in rel_list[:25]:
    print(f"x{x['count']:<3} {x['text'][:48]}")

# ---- 分享内容（json 小程序 / 转发 / 文件 / 视频）----
import glob as g2
shares = collections.defaultdict(lambda: collections.Counter())
share_examples = collections.defaultdict(list)
for cf in sorted(g2.glob(BASE + '/chunks/*.jsonl')):
    for line in open(cf, encoding='utf-8'):
        m = json.loads(line)
        s = m.get('sender') or {}
        uin = str(s.get('uin') or '')
        if not uin: continue
        typ = m.get('type')
        c = m.get('content') or {}
        if typ == 'json':
            for el in (c.get('elements') or []):
                if el.get('type') == 'json':
                    try:
                        inner = json.loads((el.get('data') or {}).get('content') or '{}')
                    except Exception:
                        continue
                    prompt = inner.get('prompt') or inner.get('meta', {}).get('detail_1', {}).get('title') or ''
                    desc = (inner.get('meta', {}).get('detail_1', {}) or {}).get('desc') or ''
                    key = ('小程序: ' + prompt)[:70]
                    shares[uin][key] += 1
                    if len(share_examples[key]) < 1:
                        share_examples[key].append({'uin': uin, 'desc': desc[:60]})
        elif typ == 'forward':
            txt = (c.get('text') or '')[:60]
            shares[uin]['转发: ' + re.sub(r'\s+', ' ', txt)] += 1
        elif typ == 'video':
            for el in (c.get('elements') or []):
                if el.get('type') == 'video':
                    d = el.get('data') or {}
                    shares[uin]['视频: ' + str(d.get('filename') or '')[:40]] += 1
        elif typ == 'file':
            for el in (c.get('elements') or []):
                if el.get('type') == 'file':
                    d = el.get('data') or {}
                    shares[uin]['文件: ' + str(d.get('filename') or d.get('name') or '')[:40]] += 1
share_out = {}
for uin, cnt in shares.items():
    share_out[uin] = {'name': UIN2NAME.get(uin, ''), 'top': cnt.most_common(40)}
json.dump(share_out, open(OUT + '/shares.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n----- 分享 TOP （21 人节选） -----')
for uin, d in share_out.items():
    if uin in UIN2NAME:
        tops = d['top'][:6]
        if tops:
            print(f"[{UIN2NAME[uin]}]")
            for t, c in tops:
                print(f"   x{c} {t[:64]}")

# ---- 媒体使用（每人）----
media_use = collections.defaultdict(collections.Counter)
for r in msgs:
    if r['sys'] or not r['media']: continue
    kind = r['media'][0][0]
    media_use[r['uin']][kind] += 1
media_out = {u: {'name': UIN2NAME.get(u, ''), 'S_sticker': c.get('S', 0), 'I_image': c.get('I', 0),
                 'V_video': c.get('V', 0), 'D_file': c.get('D', 0), 'A_audio': c.get('A', 0)}
             for u, c in media_use.items()}
json.dump(media_out, open(OUT + '/media_use.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---- meta 用语：复读/禁言/撤回/打断 ----
meta_terms = ['复读', '打断', '禁言', '撤回', '群主', '管理', '爆照', '爆金币', '发红包', '打卡', '签到']
meta_cnt = collections.Counter()
meta_uin = collections.defaultdict(collections.Counter)
for r in own_text_msgs:
    for term in meta_terms:
        if term in r['ptxt']:
            meta_cnt[term] += 1
            meta_uin[term][r['uin']] += 1
print('\n----- meta 用语 -----')
for t, c in meta_cnt.most_common():
    print(f"{t}: {c}  top={[(UIN2NAME.get(u,u), n) for u, n in meta_uin[t].most_common(3)]}")

# ---- 表情/emoji（整体）----
emoji_re = re.compile('[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]')
emoji_cnt = collections.Counter(); emoji_uin = collections.defaultdict(collections.Counter)
for r in own_text_msgs:
    for e in emoji_re.findall(r['ptxt']):
        emoji_cnt[e] += 1
        emoji_uin[e][r['uin']] += 1
print('\n----- emoji TOP 25 -----')
for e, c in emoji_cnt.most_common(25):
    print(f"{e}: {c}  top={[(UIN2NAME.get(u,u), n) for u, n in emoji_uin[e].most_common(3)]}")
json.dump({'emoji': emoji_cnt.most_common(120),
           'emoji_uin': {e: [(UIN2NAME.get(u, u), n) for u, n in c.most_common(6)] for e, c in list(emoji_uin.items())[:60]}},
          open(OUT + '/emoji.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\nall group-level outputs written.')