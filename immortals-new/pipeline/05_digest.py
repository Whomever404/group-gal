# -*- coding: utf-8 -*-
"""为每位成员生成可读摘要 digest/<slug>.md（供撰写 skill 用）"""
import json, re, collections, datetime, os

NORM = '/tmp/newdata/norm/messages.jsonl'
CHAINS = '/tmp/newdata/norm/repeat_chains.jsonl'
OUTDIR = '/tmp/newdata/digest'
os.makedirs(OUTDIR, exist_ok=True)

MEMBERS = json.load(open(NORM.replace('messages.jsonl', 'members_summary.json'), encoding='utf-8'))
UIN2NAME = {v['uin']: v['name'] for v in MEMBERS.values()}
UIN2SLUG = {v['uin']: k for k, v in MEMBERS.items()}
EMAIL = {u: (n['name'] if False else None) for u, n in []}

msgs = [json.loads(l) for l in open(NORM, encoding='utf-8')]
msgs.sort(key=lambda r: r['seq'])
content = [r for r in msgs if not r['sys'] and not r['recall'] and r['sig']]

# 重建复读链（与 02/03 一致）
MAX_GAP_MS = 15 * 60 * 1000
all_chains, cur = [], []
for r in content:
    if cur and r['sig'] == cur[-1]['sig'] and (r['ts'] - cur[-1]['ts']) <= MAX_GAP_MS:
        cur.append(r)
    else:
        if len(cur) >= 2: all_chains.append(cur)
        cur = [r]
if len(cur) >= 2: all_chains.append(cur)

orig_of = collections.defaultdict(collections.Counter)   # uin -> sig -> count(作为原创主)
follow_of = collections.defaultdict(collections.Counter) # uin -> sig -> count(作为复读者)
sig_text = {}
sig_first = {}
for ch in all_chains:
    senders = [x['uin'] for x in ch]
    if len(set(senders)) < 2: continue
    sig = ch[0]['sig']; sig_text.setdefault(sig, ch[0]['ptxt'] or sig)
    sig_first.setdefault(sig, ch[0]['ts'])
    o = ch[0]['uin']
    orig_of[o][sig] += 1
    for x in ch[1:]:
        if x['uin'] != o:
            follow_of[x['uin']][sig] += 1

repstats = json.load(open('/tmp/newdata/norm/repeat_member_stats.json', encoding='utf-8'))
nick = json.load(open('/tmp/newdata/norm/nickname_timeline.json', encoding='utf-8'))
shares = json.load(open('/tmp/newdata/norm/shares.json', encoding='utf-8'))
media = json.load(open('/tmp/newdata/norm/media_use.json', encoding='utf-8'))
emoji = json.load(open('/tmp/newdata/norm/emoji.json', encoding='utf-8'))
emoji_by_uin = {e: dict(l) for e, l in emoji.get('emoji_uin', {}).items()}

TZ = datetime.timezone(datetime.timedelta(hours=8))
def fmt(ts): return datetime.datetime.fromtimestamp(ts / 1000, TZ).strftime('%Y-%m-%d')

EVENT_RE = re.compile(r'(生日|失业|入职|离职|面试|offer|上岸|录取|考试|答辩|毕业|搬家|生病|医院|感冒|发烧|受伤|骨折|失恋|分手|相亲|录取|保研|考研|挂科|补考|驾照|驾照|军训|开学|放假|打工|工资|涨薪|裁员|房租|结婚)')

for slug, info in sorted(MEMBERS.items(), key=lambda kv: -kv[1]['content_msgs']):
    uin, name = info['uin'], info['name']
    d = json.load(open(f'/tmp/newdata/norm/member_{slug}.json', encoding='utf-8'))
    m_msgs = [r for r in msgs if r['uin'] == uin]
    c_msgs = [r for r in m_msgs if not r['sys'] and not r['recall']]
    L = []
    ap = L.append
    ap(f"# {name} ({slug}) uin={uin}\n")
    # 基本量
    types = d['types']
    med = media.get(uin, {})
    ap(f"- 消息: total={d['total_msgs']} content={d['content_msgs']} own(excl复读跟随)={d['own_content_msgs']} 活跃天数={d['active_days']}/92")
    ap(f"- 月度: {d['months']}")
    ap(f"- 类型: {types}")
    ap(f"- 媒体: sticker={med.get('S_sticker')} image={med.get('I_image')} video={med.get('V_video')} file={med.get('D_file')} audio={med.get('A_audio')}")
    # 时段
    hours = {int(k): v for k, v in d['hours'].items()}
    hours = {(k+8) % 24: v for k, v in hours.items()}
    tot_h = sum(hours.values()) or 1
    seg = {'凌晨0-5': sum(v for k, v in hours.items() if 0 <= k < 6), '早6-11': sum(v for k, v in hours.items() if 6 <= k < 12),
           '午12-17': sum(v for k, v in hours.items() if 12 <= k < 18), '晚18-23': sum(v for k, v in hours.items() if 18 <= k < 24)}
    peak = sorted(hours.items(), key=lambda kv: -kv[1])[:4]  # 北京时间
    ap(f"- 时段: " + " ".join(f"{k}:{v/tot_h*100:.0f}%" for k, v in seg.items()) + f" | 峰值小时={peak}")
    wd = {int(k): v for k, v in d['wdays'].items()}
    ap(f"- 周几分布(0=周一): {wd}")
    # 复读
    rep = repstats.get(uin, {'origin': 0, 'follower': 0})
    rate = rep['follower'] / max(d['content_msgs'], 1) * 100
    ap(f"- 复读: 原创主={rep['origin']}次 复读跟随={rep['follower']}次 跟随率={rate:.2f}%")
    tops_o = orig_of[uin].most_common(8)
    if tops_o:
        ap(f"- 带头复读的梗 TOP: " + " | ".join(f"{sig_text[s][:18]}x{c}" for s, c in tops_o))
    tops_f = follow_of[uin].most_common(8)
    if tops_f:
        ap(f"- 跟过最多的梗 TOP: " + " | ".join(f"{sig_text[s][:18]}x{c}" for s, c in tops_f))
    # 昵称
    nk = nick.get(uin, [])[:12]
    ap(f"- 昵称变迁: " + " | ".join(f"{n['name']}({n['first']}~{n['last']},{n['count']}条)" for n in nk))
    # 互动
    def nn(u, c): return f"{UIN2NAME.get(u, u)}({c})"
    ap(f"- 回复最多: " + ", ".join(nn(u, c) for u, c in d['reply_to_top'][:8]))
    ap(f"- 被回复最多: " + ", ".join(nn(u, c) for u, c in d['replied_by_top'][:8]))
    ap(f"- @最多: " + ", ".join(nn(u, c) for u, c in d['at_to_top'][:8]))
    ap(f"- 被@最多: " + ", ".join(nn(u, c) for u, c in d['at_by_top'][:8]))
    # 整句复现
    ap(f"- 整句复现 TOP: " + " | ".join(f"{t['text'][:16]}x{t['count']}" for t in d['top_whole_msgs'][:25]))
    # 特征 ngram
    ap("- 组内辨识度 n-gram（前 45）：")
    for g in d['top_distinctive_ngrams'][:45]:
        ex = ''
        exs = d['examples'].get(g['ng']) or []
        if exs: ex = ' 例:' + exs[0]['text'][:36]
        ap(f"    {g['ng']} x{g['count']} df={g['df_members']} score={g['score']}{ex}")
    ap("- 高频分词短语（前 30）：" + " | ".join(f"{g}x{c}" for g, c in d['top_tok_ngrams'][:30]))
    # 分享
    sh = shares.get(uin, {}).get('top', [])
    if sh:
        ap("- 分享/转发 TOP: " + " | ".join(f"{t[:30]}({c})" for t, c in sh[:8]))
    # emoji
    es = [(e, dict(l).get(name, 0)) for e, l in emoji_by_uin.items() if name in dict(l)]
    es = sorted(es, key=lambda x: -x[1])[:8]
    if es: ap("- emoji: " + " ".join(f"{e}x{c}" for e, c in es if c))
    # 生活事件
    ev = []
    for r in c_msgs:
        if r['ptxt'] and EVENT_RE.search(r['ptxt']):
            ev.append(f"{fmt(r['ts'])}: {r['ptxt'][:44]}")
        if len(ev) >= 18: break
    if ev:
        ap("- 生活/事件候选：")
        for e in ev: ap(f"    {e}")
    ap("")
    open(f'{OUTDIR}/{slug}.md', 'w', encoding='utf-8').write("\n".join(L))
    print('digest done', slug, len(L))
print('ALL DONE')