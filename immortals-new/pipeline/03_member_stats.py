# -*- coding: utf-8 -*-
"""逐人独立分析（21 名映射成员）：
- 活跃统计（小时/周几/月度/天数）
- 回复/@ 互动关系
- 词频 / 短语挖掘（jieba 分词 n-gram + 字符 n-gram）+ 组内辨识度（log-odds）
- 整句复现（口头禅候选）
- 复读统计（原创主 / 复读者）
内容池已剔除「复读链跟随消息」（归给原创主），保证每人分析独立不混淆。
输出 /tmp/newdata/norm/member_<slug>.json 与 members_summary.json
"""
import json, glob, re, collections, math, sys

NORM = '/tmp/newdata/norm/messages.jsonl'
CHAINS = '/tmp/newdata/norm/repeat_chains.jsonl'
OUTDIR = '/tmp/newdata/norm'

MEMBERS = {
    '3433786233': ('闹七', 'naoqi'),
    '2929988459': ('一条鱼', 'yitiaoyu'),
    '1993307050': ('G哥', 'gge'),
    '3810258469': ('Tttt.', 'tttt'),
    '3365814005': ('LanGYou', 'langyou'),
    '1696226367': ('根哥', 'genge'),
    '3102895019': ('没关系，5元', 'wuyuan'),
    '3042435218': ('30586', 'c30586'),
    '2937622574': ('石蒜', 'shisuan'),
    '2031805090': ('PW', 'pw'),
    '2156285785': ('aka', 'aka'),
    '2194145484': ('R哥', 'rge'),
    '2681612361': ('费的', 'feide'),
    '364617408': ('ndylgywsz', 'ndylgywsz'),
    '3569177448': ('黄油猫', 'huangyoumao'),
    '2054013788': ('藤原氏蘑菇汤', 'mogutang'),
    '3077017046': ('taffy', 'taffy'),
    '1195756468': ('硫酸铜', 'liusuantong'),
    '1505397142': ('石斑鱼', 'shibanyu'),
    '430684039': ('面包', 'mianbao'),
    '1478863784': ('蛋蛋', 'dandan'),
}

STOP = set('''
的 了 是 我 你 他 她 它 们 我们 你们 他们 这 那 这个 那个 这些 那些 一个 什么 怎么 为什么 哪 哪个 谁 吗 呢 吧 啊 呀 哦 噢 嗯 呃 诶 哎 唉 哈 哈哈 哈哈哈 就 也 都 还 又 再 才 只 被 把 让 给 对 从 到 在 和 与 跟 或 者 而 但 但是 不过 因为 所以 如果 要是 就是 还是 或者 而且 然后 现在 时候 以后 以前 今天 昨天 明天 昨天 可以 不能 不会 不是 没有 没 有 要 想 会 能 说 做 去 来 上 下 好 不好 很 太 更 最 真 真的 有点 可能 应该 觉得 知道 感觉 东西 事情 问题 时间 地方 一下 一起 一样 一点 已经 一直 其实 反正 确实 完全 直接 具体 基本 大概 应该 需要 出来 起来 进去 进去 回来 过来 过去 下去 上去 开 关 大 小 多 少 高 低 快 慢 新 老 有的 一些 这些 那种 这样 那样 怎么样 什么样 干啥 啥 咋 玩 吃 看 听 打 睡 买 卖 用 拿 放 走 跑 坐 站 找 问 答 叫 喊 笑 哭
'''.split())

EXTRA_DICT = ['闹七','n7','石蒜','蘑菇汤','黄油猫','黄油','面包','蛋蛋','塔菲','taffy','阿卡','aka','硫酸铜','炼铜','石斑鱼','根哥','浪游','卖弱','复读','打断','禁言','撤回','群主','管理','上号','打歌','音游','段位','拇指','四指','手台','maimai','舞萌','Phigros','phigros','Arcaea','arcaea','osu','chunithm','中二','红谱','紫谱','飞升','掉段','飞币','咪猫布','薄雾布','眉目布','思慕布','司马布','游牧布','黛阿瑞凯特','思慕','布','大佬','萌新','群友','飞机','飞机场','上分','下分','开摆','摆烂','润','答辩','研究生','考研','实习','上班','下班','作业','论文','老板','导师','学妹','学长','学姐','打胶','摸鱼','内卷','躺平','寄','绷','乐','典','急','赢','麻','草','孝','甜','嗨','绝','6','666','6666','hhh','hhhh','草草','笑死','好耶','好耶！','来了','走了','睡了','醒了','晚安','早安','午安','哈基米','猫','狗狗','狗叫','小团体','一眼','盯','戳','揉','路过','冒泡','打卡','签到']

def load_msgs():
    msgs = []
    for line in open(NORM, encoding='utf-8'):
        msgs.append(json.loads(line))
    msgs.sort(key=lambda r: r['seq'])
    return msgs

def follower_seqs(msgs):
    """复读链中非首条消息的 seq 集合（内容池排除）"""
    fs = set()
    for line in open(CHAINS, encoding='utf-8'):
        ch = json.loads(line)
        if ch['kind'] not in ('repeat', 'selfspam'):
            continue
        chain_seqs = None
    # 需要重新按链读取 seq；chains 文件只存了 seq0，重新计算：
    return fs

def build_chains():
    chains = []
    for line in open(CHAINS, encoding='utf-8'):
        chains.append(json.loads(line))
    return chains

def main():
    import jieba
    for w in EXTRA_DICT:
        jieba.add_word(w)
    msgs = load_msgs()
    chains = build_chains()

    # 复读跟随消息 seq 集合：需要链内全部 seq，chains 文件只有 seq0/senders。
    # 重新精确重建：按 sig 连续段匹评估太麻烦——直接从输出重建：
    # 02 脚本写出的 senders 顺序与 len 齐全，但 seq 只记录了首条。
    # 因此这里重新扫描一遍链（与 02 同样的算法）以获得每条链的全部消息。
    content = [r for r in msgs if not r['sys'] and not r['recall'] and r['sig']]
    MAX_GAP_MS = 15 * 60 * 1000
    follower_seq = set()
    chain_first_seq = {}
    cur = []
    all_chains = []
    for r in content:
        if cur and r['sig'] == cur[-1]['sig'] and (r['ts'] - cur[-1]['ts']) <= MAX_GAP_MS:
            cur.append(r)
        else:
            if len(cur) >= 2: all_chains.append(cur)
            cur = [r]
    if len(cur) >= 2: all_chains.append(cur)
    for ch in all_chains:
        senders = set(x['uin'] for x in ch)
        if len(senders) >= 2 or len(ch) >= 3:
            for r in ch[1:]:
                follower_seq.add(r['seq'])

    # ---- 全局字符 n-gram 计数（背景，用于辨识度） ----
    def char_ngrams(text, maxn=5):
        t = re.sub(r'[\s]+', '', text)
        out = []
        for n in range(2, maxn + 1):
            for i in range(len(t) - n + 1):
                g = t[i:i + n]
                if re.search(r'[0-9]', g): continue
                out.append(g)
        return out

    global_ng = collections.Counter()
    global_total = 0
    global_doc = collections.defaultdict(set)
    for r in content:
        if r['seq'] in follower_seq: continue
        t = r['ptxt']
        if not t: continue
        for g in char_ngrams(t):
            global_ng[g] += 1
            global_total += 1
            global_doc[g].add(r['uin'])

    # 每成员统计
    summary = {}
    for uin, (name, slug) in MEMBERS.items():
        m_msgs = [r for r in msgs if r['uin'] == uin]
        c_msgs = [r for r in m_msgs if not r['sys'] and not r['recall']]
        own_msgs = [r for r in c_msgs if r['seq'] not in follower_seq and r['ptxt']]
        texts = [r['ptxt'] for r in own_msgs if r['ptxt']]
        # 活跃
        hours = collections.Counter()
        wdays = collections.Counter()
        months = collections.Counter()
        days = set()
        import datetime
        for r in c_msgs:
            dt = datetime.datetime.fromtimestamp(r['ts'] / 1000, datetime.UTC)
            hours[dt.hour] += 1
            wdays[dt.weekday()] += 1
            months[dt.strftime('%Y-%m')] += 1
            days.add(dt.strftime('%Y-%m-%d'))
        # 类型
        types = collections.Counter(r['type'] for r in c_msgs)
        # 复读
        rep = json.load(open(OUTDIR + '/repeat_member_stats.json', encoding='utf-8')).get(uin, {'origin': 0, 'follower': 0})
        # 互动
        reply_to = collections.Counter(r['reply_uin'] for r in c_msgs if r['reply_uin'])
        at_to = collections.Counter(u for r in c_msgs for u in r['at_uins'])
        replied_by = collections.Counter(r['uin'] for r in content if r['reply_uin'] == uin)
        at_by = collections.Counter(r['uin'] for r in content for u in r['at_uins'] if u == uin)
        # 词与短语
        tok_ng = collections.Counter()
        for t in texts:
            toks = [w for w in jieba.lcut(t) if w.strip() and w not in STOP and len(w) > 1 or (len(w) == 1 and w not in '，。！？、…~ .!?')]
            for n in (2, 3, 4):
                for i in range(len(toks) - n + 1):
                    g = ' '.join(toks[i:i + n])
                    if any(x in STOP for x in toks[i:i + n]): continue
                    tok_ng[g] += 1
        ch_ng = collections.Counter()
        for t in texts:
            ch_ng.update(char_ngrams(t))
        whole = collections.Counter(t for t in texts if 2 <= len(t) <= 30)
        # 辨识度（log-odds with informative Dirichlet prior）
        def logodds(cnt_m, cnt_g, n_m, n_g):
            if cnt_m < 5: return -999
            a0 = 500.0
            a_i = a0 * (cnt_m + cnt_g) / max(n_m + n_g, 1)
            num = (cnt_m + a_i) / max(n_m + a0 - cnt_m - a_i, 1)
            den = (cnt_g + a_i) / max(n_g + a0 - cnt_g - a_i, 1)
            return math.log(num / den)
        # member 总量
        n_m = sum(ch_ng.values())
        n_g = global_total
        dist_ng = []
        for g, c in ch_ng.items():
            if c < 8: continue
            gc = global_ng.get(g, c) - c
            score = logodds(c, gc, n_m, n_g)
            if score > -900:
                dist_ng.append((g, c, score, len(global_doc.get(g, set()))))
        dist_ng.sort(key=lambda x: -x[2])
        dist_tok = [(g, c) for g, c in tok_ng.most_common(200)]
        # 例子
        def examples_of(sub, limit=3, minlen=2):
            out = []
            for r in own_msgs:
                t = r['ptxt']
                if t and sub in t and len(t) >= minlen:
                    out.append({'ts': r['ts'], 'text': t})
                    if len(out) >= limit: break
            return out
        top_dist = []
        for g, c, score, docf in dist_ng[:400]:
            top_dist.append({'ng': g, 'count': c, 'score': round(score, 3), 'df_members': docf})
        top_whole = []
        for t, c in whole.most_common(120):
            if c >= 3:
                top_whole.append({'text': t, 'count': c})
        out = {
            'uin': uin, 'name': name, 'slug': slug,
            'total_msgs': len(m_msgs), 'content_msgs': len(c_msgs),
            'own_content_msgs': len(own_msgs),
            'text_msgs': sum(1 for r in c_msgs if r['ptxt']),
            'types': dict(types),
            'hours': dict(sorted(hours.items())),
            'wdays': dict(sorted(wdays.items())),
            'months': dict(sorted(months.items())),
            'active_days': len(days),
            'repeat': rep,
            'reply_to_top': reply_to.most_common(15),
            'at_to_top': at_to.most_common(15),
            'replied_by_top': replied_by.most_common(15),
            'at_by_top': at_by.most_common(15),
            'top_whole_msgs': top_whole,
            'top_distinctive_ngrams': top_dist[:200],
            'top_tok_ngrams': dist_tok[:120],
            'char_ng_top': ch_ng.most_common(150),
            'examples': {g['ng']: examples_of(g['ng']) for g in top_dist[:60]},
        }
        with open(f'{OUTDIR}/member_{slug}.json', 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        summary[slug] = {'uin': uin, 'name': name, 'content_msgs': len(c_msgs), 'own': len(own_msgs),
                         'repeat': rep}
        print(f"done {name} ({slug}) own={len(own_msgs)}")
    with open(f'{OUTDIR}/members_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()