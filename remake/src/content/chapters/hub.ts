import type { Script } from '../../engine/types';

/**
 * 支线枢纽与七条支线。逐字搬运自原版单文件；
 * 阶段 5 按人设档案统一口癖，并做两处结构性补全：
 *
 * 1. 新增 `s_quiet`「今晚谁也不找，挂机潜水」——唯一会**降低**好感的支线，
 *    让 BE23「第 81 人」（总分 ≤4）真正可达（见 tests/equivalence）。
 * 2. 蘑菇汤支线的 a/b 分支从内联 `be` 改为 `goto` 到 ch3 的 BE19 / BE20 标签，
 *    使这两组标签不再是无引用死节点。
 * 3. 原先「只写不读」的 `mokuJoin` 标记换成真实分支：附和 TA 就真的走上同化的路。
 *
 * hub 选项新增了稳定 `id`（取代现状用按钮文字当去重键的做法）：
 * 改文案不再丢失「只触发一次」的进度。
 */
export const HUB: Script = [
  { kind: 'label', name: 'hub' },
  { kind: 'hub', prompt: '今晚去哪边混？', options: [
    { id: 's_mc', label: '一条鱼叫你去 MC 机械动力服', once: true, goto: 's_mc' },
    { id: 's_arc', label: '跟 G 和面包去拼机出勤', once: true, goto: 's_arc' },
    { id: 's_chart', label: '陪石蒜通宵写谱', once: true, goto: 's_chart' },
    { id: 's_food', label: '跟黄油猫他们去干饭', once: true, goto: 's_food' },
    { id: 's_mh', label: '找石斑鱼打怪猎', once: true, goto: 's_mh' },
    { id: 's_moku', label: '蘑菇汤在群里阴阳你 去会一会', once: true, goto: 's_moku' },
    { id: 's_quiet', label: '今晚谁也不找 一个人挂机潜水', once: true, goto: 's_quiet' },
    { id: 'main', label: '不混了 直接推进主线', goto: 'ch3' },
  ] },

  /* ---- 支线：MC 机械动力 ---- */
  { kind: 'label', name: 's_mc' },
  { kind: 'bgm', track: 'chat' },
  { kind: 'sys', text: '你被拉进了 MC 服' },
  { kind: 'card', who: 'yu' },
  { kind: 'say', who: 'yu', text: '来 先教你做水车，' },
  { kind: 'say', who: 'c30586', text: '何时 mc 老大 我等一晚上了，' },
  { kind: 'say', who: 'taffy', text: '复活 我来了我来了' },
  { kind: 'say', who: 'taffy', text: '看我落地水' },
  { kind: 'sys', text: 'taffy 掉进了虚空' },
  { kind: 'say', who: 'tttt', text: '？？？ 了子' },
  { kind: 'say', who: 'g', text: '经典 逗我呢？' },
  { kind: 'say', who: 'cat', text: 'taffy 你能不能行，' },
  { kind: 'choice', prompt: '怎么反应', options: [
    { label: '别急 落地水的时机我教你', eff: { yu: 1, taffy: 2 }, goto: 's_mc2' },
    { label: '哈哈哈哈哈笑死', eff: { taffy: -1 }, goto: 's_mc2' },
    { label: '虚空了 下次稳点就好', eff: { taffy: 1 }, goto: 's_mc2' },
  ] },
  { kind: 'label', name: 's_mc2' },
  { kind: 'say', who: 'taffy', text: '哎 谢谢你们不笑我' },
  { kind: 'say', who: 'c30586', text: '下次记得 @我 我随时都在 何时 mc 啊' },
  { kind: 'say', who: 'yu', text: '新人 农场搭好了 来看看，' },
  { kind: 'choice', prompt: '看看农场', options: [
    { label: '厉害啊 这条流水线绝了', eff: { yu: 2, c30586: 1 }, goto: 's_mc3' },
    { label: '我再给你加个自动分类', eff: { yu: 1, g: 1 }, goto: 's_mc3' },
  ] },
  { kind: 'label', name: 's_mc3' },
  { kind: 'say', who: 'yu', text: '你比他们会玩，' },
  { kind: 'say', who: 'yu', text: '下次还来吗 宝宝' },
  { kind: 'goto', label: 'hub' },

  /* ---- 支线：拼机出勤 ---- */
  { kind: 'label', name: 's_arc' },
  { kind: 'bgm', track: 'chat' },
  { kind: 'card', who: 'g' },
  { kind: 'say', who: 'g', text: '来了 我教你打这张 12 二见鸟加' },
  { kind: 'say', who: 'mianbao', text: '我是拍框大王 判定够宽直接拍 别学我，' },
  { kind: 'say', who: 'g', text: '尾杀手序别炸 底力上去了就随便打' },
  { kind: 'choice', prompt: '打一轮', options: [
    { label: '我试试 打不过也无所谓', eff: { g: 2 }, goto: 's_arc2' },
    { label: '这不有手就行', goto: 'BE02' },
    { label: '我不行 我太菜了', eff: { g: 1, shei: 1 }, goto: 's_arc2' },
  ] },
  { kind: 'label', name: 's_arc2' },
  { kind: 'say', who: 'g', text: '行 比某些人老实 逗你玩' },
  { kind: 'say', who: 'mianbao', text: '这人心态可以，加个好友，' },
  { kind: 'choice', prompt: '要不要加好友', options: [
    { label: '加 下次还一起出勤', eff: { g: 1, mianbao: 2 }, goto: 's_arc3' },
    { label: '再说吧 我最近有点忙', eff: { mianbao: -1 }, goto: 's_arc3' },
  ] },
  { kind: 'label', name: 's_arc3' },
  { kind: 'say', who: 'g', text: '加都加了 别装死 你闲的吗' },
  { kind: 'goto', label: 'hub' },

  /* ---- 支线：通宵写谱 ---- */
  { kind: 'label', name: 's_chart' },
  { kind: 'bgm', track: 'night' },
  { kind: 'card', who: 'shisuan' },
  { kind: 'say', who: 'shisuan', text: '你陪我写会儿谱吧 一个人真写不下去 写谱快写自闭了' },
  { kind: 'say', who: 'g', text: '我监督他 别摆烂 我惹你了？' },
  { kind: 'say', who: 'shisuan', text: '左手食指又起硬皮了 我非常的肥胖' },
  { kind: 'choice', prompt: '怎么回', options: [
    { label: '歇会儿吧 谱子明天再写', eff: { shisuan: 2 }, goto: 's_chart2' },
    { label: '这段再改改 节奏有点赶', eff: { shisuan: 1, g: 1 }, goto: 's_chart2' },
    { label: '写谱有啥意思 打游戏不香吗', eff: { shisuan: -1 }, goto: 's_chart2' },
  ] },
  { kind: 'label', name: 's_chart2' },
  { kind: 'say', who: 'shisuan', text: '好久没人陪我写到这么晚了 神了' },
  { kind: 'say', who: 'shisuan', text: '你也在群里多待待吧 饱饱' },
  { kind: 'goto', label: 'hub' },

  /* ---- 支线：干饭 ---- */
  { kind: 'label', name: 's_food' },
  { kind: 'bgm', track: 'chat' },
  { kind: 'card', who: 'cat' },
  { kind: 'say', who: 'cat', text: '走 麦当劳 我请，' },
  { kind: 'say', who: 'yu', text: '我要嫩牛五方，我爽吃，' },
  { kind: 'say', who: 'shei', text: '有没有不用 token 不用吃饭不用睡觉也能帮我干活的呀，' },
  { kind: 'say', who: 'cat', text: '没有，滚，' },
  { kind: 'choice', prompt: '点单', options: [
    { label: '我要巨无霸 加个麦旋风', eff: { cat: 1, shei: 1 }, goto: 's_food2' },
    { label: '学姐我来买单', eff: { cat: 2 }, goto: 's_food2' },
    { label: '讲个黄段子下饭', goto: 'BE05' },
  ] },
  { kind: 'label', name: 's_food2' },
  { kind: 'say', who: 'cat', text: '新人还行，能处，' },
  { kind: 'say', who: 'yu', text: '下次带你去新开的那家，' },
  { kind: 'goto', label: 'hub' },

  /* ---- 支线：怪猎 ---- */
  { kind: 'label', name: 's_mh' },
  { kind: 'bgm', track: 'chat' },
  { kind: 'card', who: 'shiban' },
  { kind: 'say', who: 'shiban', text: '来打猎 我最近菜到神他妈牛逼了' },
  { kind: 'say', who: 'shiban', text: '不会 DA 开头 你别笑我 好了我真可以卸载阿卡一了' },
  { kind: 'choice', prompt: '怎么回', options: [
    { label: '没事 我带你 慢慢来', eff: { shiban: 2 }, goto: 's_mh2' },
    { label: '我也不会 菜鸡互啄', eff: { shiban: 1 }, goto: 's_mh2' },
    { label: '你这也太菜了吧', eff: { shiban: -1 }, goto: 's_mh2' },
  ] },
  { kind: 'label', name: 's_mh2' },
  { kind: 'say', who: 'shiban', text: '你可比群里那帮人有耐心 装逼。。。。' },
  { kind: 'say', who: 'shiban', text: '以后缺人喊我 0 氪二游的来' },
  { kind: 'goto', label: 'hub' },

  /* ---- 支线：反派蘑菇汤 ---- */
  { kind: 'label', name: 's_moku' },
  { kind: 'bgm', track: 'tension' },
  { kind: 'card', who: 'moku' },
  { kind: 'say', who: 'moku', text: '喵呜喵呜 新人 看你两天了 挺会来事啊' },
  { kind: 'say', who: 'moku', text: '这群里没一个好东西 尤其你们群主 闹大总管' },
  { kind: 'choice', prompt: '怎么接', options: [
    { label: '群主挺护着大家的 你别乱说', eff: { nanao: 2 }, goto: 's_moku_a' },
    { label: '好像是有点 哈哈', eff: { moku: 1 }, goto: 's_moku_b' },
    { label: '有事说事 别在群里阴阳怪气', goto: 's_moku_c' },
  ] },
  { kind: 'label', name: 's_moku_a' },
  { kind: 'say', who: 'moku', text: '护着？你也一样 天真得可怜 乐死我了' },
  { kind: 'say', who: 'moku', text: '那我先拿你开刀吧' },
  { kind: 'goto', label: 'BE19' },
  { kind: 'label', name: 's_moku_b' },
  { kind: 'say', who: 'moku', text: '这就对了 跟着我 没人敢说你 呵呵' },
  { kind: 'say', who: 'moku', text: '来 我们把群主那点破事做成表情包 咋不告老师' },
  { kind: 'note', text: '你开始学着 TA 的语气说话。你比谁都清楚这样不对。' },
  { kind: 'goto', label: 'BE20' },
  { kind: 'label', name: 's_moku_c' },
  { kind: 'say', who: 'moku', text: '……' },
  { kind: 'say', who: 'moku', text: '有意思 你是这个群里第一个这么跟我说话的' },
  { kind: 'say', who: 'moku', text: '行 这次放过你' },
  { kind: 'note', text: '蘑菇汤把你从仇人名单上划掉了。这在群里是个没人达成过的成就。' },
  { kind: 'goto', label: 'hub' },

  /* ---- 支线：挂机潜水（唯一会降好感的路线，通往 BE23） ---- */
  { kind: 'label', name: 's_quiet' },
  { kind: 'bgm', track: 'night' },
  { kind: 'sys', text: '今晚你谁也没找，只是把群挂着。' },
  { kind: 'say', who: 'c30586', text: '何时 mc 老大 我等一晚上了，' },
  { kind: 'say', who: 'shei', text: '群里今天怎么这么安静呀，' },
  { kind: 'say', who: 'nanao', text: '人呢，，算上你现在就仨人' },
  { kind: 'note', text: '消息一条条滑过去。没有一条是 @ 你的。' },
  { kind: 'choice', prompt: '要不要出声', options: [
    { label: '还是潜水吧 谁也不理', eff: { shei: -2, cat: -2, g: -1 }, goto: 's_quiet_away' },
    { label: '太无聊了 去群里复读刷屏找存在感', goto: 'BE24' },
    { label: '冒个泡 我在的', eff: { nanao: 1 }, goto: 's_quiet_back' },
  ] },
  { kind: 'label', name: 's_quiet_away' },
  { kind: 'note', text: '你看着消息一条条滑过去，始终没接上话。' },
  { kind: 'say', who: 'g', text: '干嘛呀……群里怎么越来越冷清了' },
  { kind: 'goto', label: 'hub' },
  { kind: 'label', name: 's_quiet_back' },
  { kind: 'say', who: 'nanao', text: '哦 你还在啊，，' },
  { kind: 'say', who: 'nanao', text: '在就多冒冒泡 别学他们一个个装死' },
  { kind: 'goto', label: 'hub' },
];
