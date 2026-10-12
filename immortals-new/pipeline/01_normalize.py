# -*- coding: utf-8 -*-
"""归一化 21.5 万条消息 → messages.jsonl（供复读检测与逐人分析）"""
import json, glob, re, sys, collections

BASE = '/tmp/newdata/chatdb/group_【里】😂群聊_行_1058585968_20261012_162110010_chunked_jsonl'
OUT = '/tmp/newdata/norm/messages.jsonl'

def norm_text(t: str) -> str:
    t = t.replace('\u2005', ' ')
    t = re.sub(r'[\s\u3000]+', ' ', t).strip()
    return t

def extract(m):
    """返回 (ptxt, sig, media, reply_uin, reply_name, at_uins)"""
    c = m.get('content') or {}
    els = c.get('elements') or []
    ptxt_parts, media_parts = [], []
    reply_uin = reply_name = ''
    at_uins = []
    for el in els:
        et = el.get('type'); d = el.get('data') or {}
        if et == 'text':
            t = d.get('text') or ''
            if t: ptxt_parts.append(t)
        elif et == 'at':
            u = d.get('uin') or ''
            if u: at_uins.append(str(u))
        elif et == 'reply':
            reply_uin = str(d.get('senderUin') or '')
            reply_name = d.get('senderName') or ''
        elif et in ('image',):
            sub = d.get('subType') or ''
            md5 = d.get('md5') or d.get('filename') or ''
            media_parts.append(('S' if sub == 'sticker' else 'I') + ':' + str(md5))
        elif et == 'video':
            media_parts.append('V:' + str(d.get('md5') or d.get('filename') or ''))
        elif et == 'file':
            media_parts.append('D:' + str(d.get('filename') or ''))
        elif et == 'ptt' or et == 'audio':
            media_parts.append('A:' + str(d.get('md5') or d.get('filename') or ''))
    ptxt = norm_text(''.join(ptxt_parts))
    if ptxt:
        sig = 'T:' + ptxt
    elif media_parts:
        sig = media_parts[0]
    else:
        sig = ''
    return ptxt, sig, media_parts, reply_uin, reply_name, at_uins

def main():
    chunks = sorted(glob.glob(BASE + '/chunks/*.jsonl'))
    fout = open(OUT, 'w', encoding='utf-8')
    stat = collections.Counter()
    uins = collections.Counter()
    n = 0
    for cf in chunks:
        for line in open(cf, encoding='utf-8'):
            m = json.loads(line)
            n += 1
            s = m.get('sender') or {}
            uin = str(s.get('uin') or '')
            typ = m.get('type') or '?'
            sysmsg = bool(m.get('system')) or typ == 'system'
            recall = bool(m.get('recalled'))
            ptxt, sig, media, reply_uin, reply_name, at_uins = extract(m)
            rec = {
                'seq': int(m.get('seq') or 0),
                'ts': int(m.get('timestamp') or 0),
                'uin': uin,
                'name': s.get('name') or s.get('groupCard') or '',
                'type': typ,
                'ptxt': ptxt,
                'sig': sig,
                'media': media,
                'reply_uin': reply_uin,
                'reply_name': reply_name,
                'at_uins': at_uins,
                'sys': sysmsg,
                'recall': recall,
            }
            fout.write(json.dumps(rec, ensure_ascii=False) + '\n')
            stat['sys' if sysmsg else 'content'] += 1
            if not sysmsg and sig: stat['with_sig'] += 1
            if ptxt: stat['with_text'] += 1
            if reply_uin: stat['with_reply'] += 1
            uins[uin] += 1
    fout.close()
    print('total', n, dict(stat))
    print('distinct uins:', len(uins))

if __name__ == '__main__':
    main()