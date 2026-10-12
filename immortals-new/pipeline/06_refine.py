# -*- coding: utf-8 -*-
"""精炼：突发去重（连发折叠）后重新统计口头禅/短语；话题关键词矩阵"""
import json, re, collections, datetime, os

NORM = '/tmp/newdata/norm/messages.jsonl'
OUTDIR = '/tmp/newdata/digest2'
os.makedirs(OUTDIR, exist_ok=True)
MEMBERS = json.load(open('/tmp/newdata/norm/members_summary.json', encoding='utf-8'))

msgs = [json.loads(l) for l in open(NORM, encoding='utf-8')]
msgs.sort(key=lambda r: r['seq'])

# 突发去重：同一人、内容相同、与上一条内容消息间隔 < 3 分钟 → 折叠
BURST_MS = 3 * 60 * 1000
last_by_uin = {}
dedup = []
for r in msgs:
    if r['sys'] or r['recall'] or not r['sig']:
        continue
    key = (r['uin'], r['sig'])
    prev = last_by_uin.get(r['uin'])
    if prev is not None and prev[0] == r['sig'] and (r['ts'] - prev[1]) < BURST_MS:
        last_by_uin[r['uin']] = (r['sig'], r['ts'])
        continue
    dedup.append(r)
    last_by_uin[r['uin']] = (r['sig'], r['ts'])
print('raw content', sum(1 for r in msgs if not r['sys'] and not r['recall'] and r['sig']), '-> dedup', len(dedup))

import jieba
EXTRA = ['羡慕','帕鲁','舞萌','maimai','范式','音游','打歌','写谱','谱面','闹七','石蒜','黄油猫','蘑菇汤','石斑鱼','根哥','浪游','阿卡','aka','塔菲','taffy','硫酸铜','面包','蛋蛋','大一','大二','大三','大四','高中','初中','食堂','外卖','奶茶','麦当劳','肯德基','雪王','蜜雪冰城','麦克风','女装','福瑞','手台','段位','飞升','掉段','卖弱','装逼','复读','直播','棉花娃娃','谷子','演唱会','音乐节','舞萌dx','w6','w5','w4','w3','w2','w1','b50','b35']
for w in EXTRA: jieba.add_word(w)
STOP = set('的 了 是 我 你 他 她 它 们 我们 你们 他们 这 那 这个 那个 这些 那些 一个 什么 怎么 为什么 哪 哪个 谁 吗 呢 吧 啊 呀 哦 噢 嗯 呃 诶 哎 唉 哈 就 也 都 还 又 再 才 只 被 把 让 给 对 从 到 在 和 与 跟 或 者 而 但 但是 不过 因为 所以 如果 要是 就是 还是 或者 而且 然后 现在 时候 以后 以前 今天 昨天 明天 可以 不能 不会 不是 没有 没 有 要 想 会 能 说 做 去 来 上 下 好 很 太 更 最 真 真的 有点 可能 应该 觉得 知道 感觉 东西 事情 问题 时间 地方 一下 一起 一样 一点 已经 一直 其实 反正 确实 完全 直接 具体 基本 大概 需要 出来 起来 回来 过来 过去 下去 上去 开 关 大 小 多 少 高 低 快 慢 新 老 啥 咋'.split())
PUNCT = set('，。！？、…~ .!?；：""''（）「」【】《》@#￥%……&*+-=/\\|·')

KW = {
 '音游-舞萌': ['舞萌','maimai','麦'],
 '音游-范式': ['范式','paradigm'],
 '音游-Arcaea': ['Arcaea','arcaea','arc'],
 '音游-Phigros': ['Phigros','phigros','屁股肉'],
 '音游-中二': ['中二','chunithm'],
 '音游-写谱': ['写谱','自制谱','谱面','制谱'],
 '音游-通用': ['音游','打歌','打音游','出勤','刷段'],
 '游戏-帕鲁': ['帕鲁'],
 '游戏-其他': ['原神','崩铁','星铁','王者','lol','云顶','瓦','csgo','三角洲','我的世界','mc','泰拉瑞亚','缺氧','群星','steam','switch','gal','galgame','单机','二游'],
 '学习-考试': ['考研','保研','高考','考试','挂科','补考','期末','四级','六级'],
 '学习-学校': ['大学','学校','上课','课','老师','导师','实验室','论文','答辩','毕业','开学','放假','军训'],
 '工作-打工': ['打工','上班','工作','工资','实习','offer','面试','裁员','失业','入职','离职','加班','老板','公司'],
 '生活-吃': ['麦当劳','麦门','肯德基','kfc','奶茶','咖啡','外卖','食堂','吃','雪王','蜜雪'],
 '生活-睡眠': ['睡觉','睡了','失眠','熬夜','晚安','早起'],
 '生活-宠物': ['猫','狗','仓鼠','鸟','鱼'],
 '生活-运动': ['健身','跑步','篮球','羽毛球','游泳','骑车','爬山'],
 '网络-抽象': ['抽象','整活','乐子','节目效果','小丑','破防','急','典','绷','孝','赢麻'],
 '关系-卖弱': ['卖弱','装弱','太强','大手子','大佬','萌新'],
 '关系-装逼': ['装逼','抽象人','高手'],
 '社交-群': ['群主','管理','禁言','撤回','复读','爆照','发红包','打卡'],
 '内容-女装/福瑞': ['女装','福瑞','furry','兽人'],
 '内容-动漫': ['动漫','番','二次元','手办','棉花娃娃','谷子','漫画','轻小说'],
 '设备-AI': ['ai','AI','服务器','显卡','电脑','手机','python','代码','编程'],
}

def tag_kw(uin):
    cnt = collections.Counter()
    for r in dedup:
        if r['uin'] != uin or not r['ptxt']: continue
        t = r['ptxt']
        for k, words in KW.items():
            if any(w in t for w in words): cnt[k] += 1
    return cnt

for slug, info in MEMBERS.items():
    uin, name = info['uin'], info['name']
    mine = [r for r in dedup if r['uin'] == uin and r['ptxt']]
    L = [f"# {name} ({slug}) 精炼摘要\n"]
    whole = collections.Counter(r['ptxt'] for r in mine if 2 <= len(r['ptxt']) <= 40)
    L.append("- 突发去重后整句 TOP40: " + " | ".join(f"{t[:20]}x{c}" for t, c in whole.most_common(40) if c >= 3))
    tok = collections.Counter()
    for r in mine:
        toks = [w for w in jieba.lcut(r['ptxt']) if w.strip() and w not in STOP and w not in PUNCT and len(w) >= 1]
        for n in (2, 3):
            for i in range(len(toks) - n + 1):
                gram = toks[i:i + n]
                if any(x in STOP or x in PUNCT for x in gram): continue
                tok[''.join(gram)] += 1
    L.append("- 高频短语 TOP50: " + " | ".join(f"{g}x{c}" for g, c in tok.most_common(50) if c >= 5))
    kw = tag_kw(uin)
    L.append("- 话题关键词: " + " | ".join(f"{k}:{c}" for k, c in kw.most_common(18)))
    # 休息/时段
    L.append("")
    open(f'{OUTDIR}/{slug}.md', 'w', encoding='utf-8').write("\n".join(L))

# 关键词矩阵（全成员）
matrix = {}
for slug, info in MEMBERS.items():
    matrix[info['name']] = dict(tag_kw(info['uin']))
json.dump(matrix, open('/tmp/newdata/norm/keyword_matrix.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('done. sample matrix rows:')
for nm, d in list(matrix.items())[:5]:
    print(nm, dict(sorted(d.items(), key=lambda kv: -kv[1])[:8]))