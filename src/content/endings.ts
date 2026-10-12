import type { BadEndData, BeId, CharKey } from '../engine/types';

/**
 * 23 个 Bad End。全部由剧本节点显式触发（`__end_*` 跳转）。
 *
 * 文案来自 v2 重写版，一字未改；只按结局卡的分段渲染补了空行
 * （空行分段、段内换行保留，见 ui/overlay.ts 的 paras）。
 */
export const BEDATA: Readonly<Record<BeId, BadEndData>> = {
  /* ---- 主线 / 群规类 ---- */
  b01: { tag: 'BAD END', who: '全群', title: '老傻子 END',
    text: '你在群里公开纠正群主的名片。\n下一秒，全群整齐地刷起了「老傻子」。\n\n没有人真的生气——但也没有人再接你的话。' },
  b02: { tag: 'BAD END', who: 'G', title: '越级骂谱 END',
    text: '你当众点评 G 的谱「配置稀烂」。\n他把这条消息置顶了三天，配文：新人第一次评价我的谱。\n面包在下面补了一刀。' },
  b05: { tag: 'BAD END', who: '黄油猫', title: '成年话题 END',
    text: '你刚起了个头，黄油猫就笑着把话题按死了：「这群不聊这个。」\n\n三分钟后，你的消息变成一条灰色的小横线。' },
  b10: { tag: 'BAD END', who: '闹七', title: '我很伤心 END',
    text: '你鸽了那晚的活动。闹七只发了四个字——「我很伤心」。\n没有 @任何人，也没有下一句。\n\n那个天天喊着解散群的人，这次自己安静了。' },
  b17: { tag: 'BAD END', who: '面包', title: '面包没了 END',
    text: '你把他的图挂成了自己的群名片。\n第二天，他撤回了所有发出去的图，包括给你的那三张。\n\n群里从此少了一个发图的人。' },
  b19: { tag: 'BAD END', who: '蘑菇汤', title: '被挂 END',
    text: '你替群主说了句公道话。\n当晚，一张以你为主角的鬼畜图在几个群里传开——落款是蘑菇汤。\n\n你退了群，比被踢出去体面一点点。' },
  b20: { tag: 'BAD END', who: '蘑菇汤', title: '同化 END',
    text: '你开始学他的语气，挑最软的人下嘴。\n某天，全群开始整齐地复读你的名字——用的是当初对付他的方式。' },
  b24: { tag: 'BAD END', who: '群规', title: '刷屏 END',
    text: '同一句话刷到第三遍。\n闹七没有生气，只回了一句：「规矩就是规矩，新人，冷静十分钟。」\n\n群里没人笑你，但你的输入框灰了。' },
  b81: { tag: 'BAD END', who: '全群', title: '第 81 人 END',
    text: '没有冲突、没有翻车，也没有人记住你。\n群成员从 81 悄悄变回 80。\n\n你最后一条消息还是那句「大家好」——没有人回复。' },

  /* ---- 角色线失败 ---- */
  bn: { tag: 'BAD END', who: '闹七', title: '群主辞职 END',
    text: '她半夜跟你说真心话，你回了句「不就是个群吗」。\n\n第二天，群还开着，但闹七的头像再没亮起来。' },
  by: { tag: 'BAD END', who: '一条鱼', title: '3fps END',
    text: '你把她卡成幻灯片的作品当成笑料发回了群里。\n\n从那天起，她再也没有发过任何作品——备注栏里，你的名字被删了。' },
  bcat: { tag: 'BAD END', who: '黄油猫', title: '猫爪 END',
    text: '你越过守门猫，拿她的鱼开了个过火的玩笑。\n黄油猫笑着回了你一个字：「哦。」\n\n从那天起，你发的每条消息都像投进了棉花里。' },
  bg: { tag: 'BAD END', who: 'G', title: '背刺 END',
    text: '她只在你面前说过一次真心话。\n第二天，群里多了一张截图。\n\nG 没有发火，只是把管理员群退了。' },
  bss: { tag: 'BAD END', who: '石蒜', title: '无人点开 END',
    text: '他把新谱发给你，你回了句「还行吧」。\n那首曲子被他自己设成了私密。\n\n草稿箱里躺着十七个被删掉的版本。' },
  bt: { tag: 'BAD END', who: 'Tttt', title: '对号入座 END',
    text: '你把「老傻子」这三个字认真当成了攻击，在群里翻了脸。\n\nTttt 再没给你起过外号，也再没跟你说过话。' },
  bshei: { tag: 'BAD END', who: '誰', title: '攻略失败 END',
    text: '你说她的剧本是把大家当 NPC。\n她笑着点头，然后把写你的那一条支线，整段删掉了。' },
  bban: { tag: 'BAD END', who: '石斑鱼', title: '围观 END',
    text: '你跟着群友一起笑话她的战绩。\n她只回了一个「哦」，然后把名字改了回去——🪨🦓🐟，继续蹲在集会所的角落。' },
  btaf: { tag: 'BAD END', who: 'taffy', title: '鬼畜素材 END',
    text: '你把她的落地水剪成了鬼畜视频。\n视频火了，她也火了。\n\n她笑着回了「哈哈」，然后一个月没再上过线。' },
  b305: { tag: 'BAD END', who: '30586', title: '报名表 END',
    text: '你说「每次都差四个，别办了」。\n她发了张空报名表的截图，配文：好的。\n\n第 19 届，没有办。' },
  bmibu: { tag: 'BAD END', who: '咪猫布', title: '副作用 END',
    text: '你拿她等体检结果的那几天开玩笑。\n她删掉了那张列了十七种可能的表格，也删掉了和你的对话框。' },
  blin: { tag: 'BAD END', who: '凛～～熙', title: '捧杀 END',
    text: '你带头把她捧成了「凛神」。\n她的下一屏成绩图，配文变成了「凛神崩了」。\n\n她再也不发了。' },
  bgen: { tag: 'BAD END', who: '根哥', title: 'Ctrl+Z END',
    text: '她导出的前一秒，你的手滑碰了键盘。\n凌晨两点的进度条倒回了原点。\n\n她盯着屏幕很久，只回了一个「哦」。' },
  baka: { tag: 'BAD END', who: 'aka', title: '爆仓 END',
    text: '你把她的渠道清单转手发进了大群。\n一小时后被冲爆，全群降智。\n\n她没骂你，只是把你的备注改回了你的名字。' },
};

/** 15 条角色线（= 好结局槽位），顺序即结局回收室的显示顺序。 */
export const GE_SLOTS: readonly CharKey[] = [
  'nanao', 'yu', 'cat', 'g', 'shisuan', 'tttt', 'shei',
  'shiban', 'taffy', 'c30586', 'mianbao', 'mibu', 'linxi', 'gen', 'aka',
];

/** 全部 Bad End 的 id，供校验器与回收室遍历。 */
export const BE_IDS = Object.keys(BEDATA) as BeId[];