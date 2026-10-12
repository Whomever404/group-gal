# -*- coding: utf-8 -*-
"""按正则检索归一化消息，输出 发送者/日期/内容，用于澄清梗的语境"""
import json, re, sys, datetime

pat = sys.argv[1]
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 8
members = json.load(open('/tmp/newdata/norm/members_summary.json', encoding='utf-8'))
UIN2NAME = {v['uin']: v['name'] for v in members.values()}
RE = re.compile(pat)
n = 0
last_ts = 0
for line in open('/tmp/newdata/norm/messages.jsonl', encoding='utf-8'):
    r = json.loads(line)
    if r['sys'] or not r['ptxt']: continue
    if RE.search(r['ptxt']):
        dt = datetime.datetime.fromtimestamp(r['ts'] / 1000, datetime.timezone(datetime.timedelta(hours=8))).strftime('%m-%d %H:%M')
        nm = UIN2NAME.get(r['uin']) or (r['name'] or r['uin'])
        print(f"[{nm} {dt}] {r['ptxt'][:110]}")
        n += 1
        if n >= limit: break
if n == 0:
    print("(no match)")