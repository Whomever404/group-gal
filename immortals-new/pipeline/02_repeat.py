# -*- coding: utf-8 -*-
"""复读检测：
- 连续同内容（text/sticker/image 签名相同）且相邻的消息构成「复读链」
- 规则：链长>=2 且包含 >=2 个不同发言者 → 复读链
- 归属：链中第一条消息记给第一位群友（原创主）；其余发言者为「复读者」+1
- 同一人自连发（1 名发言者、链长>=3）另计为刷屏
输出：
  /tmp/newdata/norm/repeat_chains.jsonl
  /tmp/newdata/norm/repeat_member_stats.json
"""
import json, collections

IN = '/tmp/newdata/norm/messages.jsonl'
CHAINS = '/tmp/newdata/norm/repeat_chains.jsonl'
STATS = '/tmp/newdata/norm/repeat_member_stats.json'

MAX_GAP_MS = 15 * 60 * 1000  # 链内相邻消息最大间隔 15 分钟
MIN_CHAIN = 2

def main():
    # 读取、按 seq 排序
    msgs = []
    for line in open(IN, encoding='utf-8'):
        r = json.loads(line)
        if r['sys'] or r['recall']:
            continue  # 系统/撤回消息不参与
        if not r['sig']:
            continue
        msgs.append(r)
    msgs.sort(key=lambda r: r['seq'])
    print('content msgs with sig:', len(msgs))

    chains = []
    cur = []
    for r in msgs:
        if cur and r['sig'] == cur[-1]['sig'] and (r['ts'] - cur[-1]['ts']) <= MAX_GAP_MS:
            cur.append(r)
        else:
            if len(cur) >= MIN_CHAIN:
                chains.append(cur)
            cur = [r]
    if len(cur) >= MIN_CHAIN:
        chains.append(cur)

    origin_cnt = collections.Counter()
    follower_cnt = collections.Counter()
    sanity = collections.Counter()
    chain_objs = []
    for ch in chains:
        senders = [r['uin'] for r in ch]
        uniq = set(senders)
        if len(uniq) >= 2:
            kind = 'repeat'
        elif len(ch) >= 3:
            kind = 'selfspam'
        else:
            kind = 'pair_self'  # 同一人连发两次
        origin = ch[0]['uin']
        if kind == 'repeat':
            origin_cnt[origin] += 1
            for r in ch[1:]:
                if r['uin'] != origin:
                    follower_cnt[r['uin']] += 1
        sanity[kind] += 1
        chain_objs.append({
            'kind': kind,
            'len': len(ch),
            'seq0': ch[0]['seq'], 'ts0': ch[0]['ts'], 'ts1': ch[-1]['ts'],
            'sig': ch[0]['sig'],
            'text': ch[0]['ptxt'] or ch[0]['sig'],
            'origin_uin': origin,
            'senders': senders,
        })

    with open(CHAINS, 'w', encoding='utf-8') as f:
        for o in chain_objs:
            f.write(json.dumps(o, ensure_ascii=False) + '\n')

    # 统计每个成员
    all_uins = set(origin_cnt) | set(follower_cnt)
    stats = {}
    for u in all_uins:
        stats[u] = {'origin': origin_cnt.get(u, 0), 'follower': follower_cnt.get(u, 0)}
    with open(STATS, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=1)
    print('chains:', len(chain_objs), dict(sanity))
    for u, s in sorted(stats.items(), key=lambda kv: -kv[1]['follower'])[:25]:
        print(f"uin={u} origin={s['origin']} follower={s['follower']}")

if __name__ == '__main__':
    main()