# -*- coding: utf-8 -*-
"""组装交付：习惯用语库.md（总库）+ _evidence 证据文件 + manifest 指纹"""
import json, os, glob, hashlib, shutil, re

BASE = '/workspace/immortals-new'
IMM = BASE + '/immortals'
EV = BASE + '/_evidence'
os.makedirs(EV, exist_ok=True)

MEMBERS = json.load(open('/tmp/newdata/norm/members_summary.json', encoding='utf-8'))
repstats = json.load(open('/tmp/newdata/norm/repeat_member_stats.json', encoding='utf-8'))

# ---------- 1. 复读标签规则与总表 ----------
def tag_of(rate, cnt):
    if rate >= 3 and cnt >= 30: return '喜欢复读'
    if rate >= 1.5: return '有时跟复读'
    return '很少跟复读'

rows = []
for slug, info in MEMBERS.items():
    uin = info['uin']
    rep = repstats.get(uin, {'origin': 0, 'follower': 0})
    rate = rep['follower'] / max(info['content_msgs'], 1) * 100
    rows.append((slug, info['name'], rep['origin'], rep['follower'], rate, tag_of(rate, rep['follower'])))
rows.sort(key=lambda r: -r[4])

lines = []
lines.append('# 习惯用语库 · 【里】😂群聊（2026-07-12 ~ 2026-10-12）\n')
lines.append('> 独立任务产出：基于本次上传的群聊数据库（214,905 条消息）逐人独立统计，不参考仓库内其他资料。')
lines.append('> 统计口径：整句频次做「连发折叠」（同内容 3 分钟内重复只计 1 次）；复读链中的跟随消息**归还原创主**，从跟随者内容池剔除（即用户要求的「复读归属第一位群友」）。')
lines.append('> 本章含 21 位成员各自的完整用语库（每人一节，独立分析、互不混淆），正文由各成员自己的语料统计得出。\n')
lines.append('## 复读检测规则与标签总表\n')
lines.append('- 复读链判定：按时间序的**连续同内容消息**（文本/表情签名一致、间隔 ≤15 分钟）构成链；链内**第一条记给第一位群友（原创主）**，其余发送者记一次「复读跟随」并加**「喜欢复读」标签**（按跟随率分级）。')
lines.append('- 标签分级：跟随率 ≥3%（且 ≥30 次）=「喜欢复读」；1.5%~3% =「有时跟复读」；<1.5% =「很少跟复读」。蛋蛋（11.64%）与 ndylgywsz（7.42%）为最高档。闹七虽跟随率 1.95%（因总发言量巨大），但**绝对跟随 601 次、原创主 637 次（双榜首）**。\n')
lines.append('| 成员 | slug | 原创主（被复读） | 复读跟随 | 跟随率 | 标签 |')
lines.append('|------|------|------|------|------|------|')
for slug, name, o, f, rate, tag in rows:
    lines.append(f'| {name} | `{slug}` | {o} | {f} | {rate:.2f}% | {tag} |')
lines.append('')
lines.append('---\n')
lines.append('## 成员分册\n')
for slug, name, o, f, rate, tag in sorted(rows, key=lambda r: -r[3]):
    lines.append(f'- **{name}**（`{slug}`）—— 跟随 {f} 次 / {rate:.2f}% → {tag}')
lines.append('')

# 追加各成员 phrasebook（H1 → H2）
for slug, name, *_ in sorted(rows, key=lambda r: -r[3]):
    f = f'{IMM}/{slug}/phrasebook.md'
    if not os.path.exists(f):
        lines.append(f'\n## {name}（{slug}）\n\n> 材料缺失\n')
        continue
    txt = open(f, encoding='utf-8').read().strip()
    txt = re.sub(r'^# ', '## ', txt, count=1)
    txt = txt.replace('## 复读行为与标签', '### 复读行为与标签')
    txt = txt.replace('## 高频短语表', '### 高频短语表')
    txt = txt.replace('## 句式与语气特征', '### 句式与语气特征')
    txt = txt.replace('## 表情与媒体习惯', '### 表情与媒体习惯')
    txt = txt.replace('## 代表原话摘录', '### 代表原话摘录')
    lines.append('\n---\n')
    lines.append(txt + '\n')
open(BASE + '/习惯用语库.md', 'w', encoding='utf-8').write('\n'.join(lines))
print('习惯用语库.md assembled:', os.path.getsize(BASE + '/习惯用语库.md'), 'bytes')

# ---------- 2. _evidence 证据文件 ----------
for slug, info in MEMBERS.items():
    d1 = f'/tmp/newdata/digest/{slug}.md'
    d2 = f'/tmp/newdata/digest2/{slug}.md'
    parts = [f'# 证据档案：{info["name"]}（{slug}）\n',
             f'> 数据窗口 2026-07-12 ~ 2026-10-12（北京时间）；样本 {info["content_msgs"]} 条有效发言。\n',
             '> 本文件为生成 skill 时使用的原始统计摘要（含连发去重口径），保留以供复核。\n']
    if os.path.exists(d1): parts.append('\n## 逐人统计摘要 1（活跃/复读/昵称/互动/特征 n-gram）\n\n' + open(d1, encoding='utf-8').read())
    if os.path.exists(d2): parts.append('\n## 逐人统计摘要 2（去重整句/高频短语/话题关键词）\n\n' + open(d2, encoding='utf-8').read())
    open(f'{EV}/{slug}.md', 'w', encoding='utf-8').write('\n'.join(parts))
print('evidence files:', len(glob.glob(EV + '/*.md')))

# 全局证据 JSON 拷贝
for src, dst in [
    ('/tmp/newdata/norm/repeat_member_stats.json', EV + '/复读统计-成员.json'),
    ('/tmp/newdata/norm/top_repeat_memes.json', EV + '/复读统计-热门梗.json'),
    ('/tmp/newdata/norm/shared_phrases.json', EV + '/跨成员短语.json'),
    ('/tmp/newdata/norm/nickname_timeline.json', EV + '/昵称变迁.json'),
    ('/tmp/newdata/norm/keyword_matrix.json', EV + '/话题关键词矩阵.json'),
]:
    if os.path.exists(src): shutil.copy(src, dst)
print('global evidence copied.')

# ---------- 3. manifest 指纹 ----------
def sha256(f):
    h = hashlib.sha256()
    h.update(open(f, 'rb').read())
    return h.hexdigest()[:16]

for slug in MEMBERS:
    mf = f'{IMM}/{slug}/manifest.json'
    if not os.path.exists(mf): continue
    m = json.load(open(mf, encoding='utf-8'))
    fps = {}
    for fn in ['SKILL.md', 'personality.md', 'interaction.md', 'memory.md', 'conflicts.md', 'phrasebook.md']:
        p = f'{IMM}/{slug}/{fn}'
        if os.path.exists(p): fps[fn] = sha256(p)
    m['fingerprints'] = fps
    json.dump(m, open(mf, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('fingerprints written for all manifests.')

# 清理空目录
empty = BASE + '/习惯用语库'
if os.path.isdir(empty) and not os.listdir(empty):
    os.rmdir(empty)
    print('removed empty dir 习惯用语库/')

# 概览统计
import collections
cnt = collections.Counter()
for f in glob.glob(IMM + '/*/*'):
    cnt[os.path.basename(f)] += 1
print('per-file counts:', dict(cnt))