# -*- coding: utf-8 -*-
"""审计 v2：噪声过滤 + 空白归一化匹配"""
import json, re, glob, os

NORM = '/tmp/newdata/norm/messages.jsonl'
BASE = '/workspace/immortals-new/immortals'

def normspace(s):
    return re.sub(r'\s+', '', s)

pool = []
for line in open(NORM, encoding='utf-8'):
    r = json.loads(line)
    if r['sys']: continue
    if r['ptxt']: pool.append(r['ptxt'])
    if r['sig']: pool.append(r['sig'])
big = normspace('\n'.join(pool))
print('pool size:', len(big))

LABEL_RE = re.compile(r'^(很少跟复读|有时跟复读|喜欢复读.*|材料不足|连发折叠|未发现冲突|\S+-\S+|\S+—\S+|.*型|.*王|.*中枢|.*引擎|.*机$|.*者$|.*哥$|\S+频道|.*均\d.*|\S+×\d+.*|\S+x\d+.*|狂魔级|.*标签.*)$')
# 已知的元引用（文件引用、群名、别名表等）
META = {'【里】😂群聊', 'NihilitioR / NR / 誰 / 谁 / 所有人', '羡慕/爸爸', 'bzd / 恭喜 / 桂霞了',
        'ok/OK', '大神 → 教我 → 羡慕', 'X：Y', '浅色夏沫', 'G哥', '局头型', '程序员玩家',
        '厦大马校 / 京东大学', '喝彩 + 吐槽', '捧场王 + 复读机', '捧场中枢', '复读引擎',
        '高频应答者', '响应型活跃者', '潜水—冒泡型', '捧场型', '外放但不对抗', '安静围观 + 偶尔接梗',
        '潜水但活跃度稳定', '技术型', '内容消费', '复读氛围', '毕业/升学', '开学 / 打工', '谁都能聊两句',
        '闹七频道', '五邑大学', '我的女朋友'}

QUOTE_RE = re.compile(r'「([^「」]{2,90})」')
flags = []
checked = 0
for f in sorted(glob.glob(BASE + '/*/*.md')):
    slug = os.path.basename(os.path.dirname(f))
    is_doc = os.path.basename(f) in ('SKILL.md', 'manifest.json')
    for ln, line in enumerate(open(f, encoding='utf-8'), 1):
        for q in QUOTE_RE.findall(line):
            q2 = q.strip()
            if len(q2) < 3: continue
            if q2 in META: continue
            if LABEL_RE.match(q2): continue
            checked += 1
            nq = normspace(q2)
            if nq in big:
                continue
            parts = [p for p in re.split(r'[…]{1,}|\.{2,}|，', nq) if len(p) >= 4]
            if parts and all(p in big for p in parts):
                continue
            # 去掉尾部省略后匹配
            core = re.sub(r'[.…·]+$', '', nq)
            if len(core) >= 4 and (core in big):
                continue
            flags.append((slug, os.path.basename(f), ln, q2))
print('quotes checked:', checked, '| flagged:', len(flags))
cur = None
for slug, fn, ln, q in flags:
    print(f"[{slug}/{fn}:{ln}] {q}")
json.dump([{'slug': s, 'file': f, 'line': l, 'quote': q} for s, f, l, q in flags],
          open('/tmp/newdata/quote_flags.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)