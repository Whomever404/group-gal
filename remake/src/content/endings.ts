/* 结局数据。
 *
 * 坏结局（Bad End）：剧本里用 `__end_<id>` 跳转，文案写在这里；结局回收室按这里的条目收集。
 * 好结局：不需要写文案——`__ge_<角色键>` 的端子会自动生成，标题与正文取自该线 `ge_<角色键>`
 *        场景里的 chapter / note 节点（见 index.ts 的 ROUTE_ENDINGS）。
 *
 * 这里只留两个示例坏结局：一个来自第一章踩群规，一个来自分岔之夜的空気判定。
 * 写完新结局后，记得在 engine/types.ts 的 BeId 里补上 id（留成 string 也可以）。
 */
import type { BadEndData, BeId, CharKey } from '../engine/types';

export const BEDATA: Readonly<Record<BeId, BadEndData>> = {
  b_rule: {
    tag: 'BAD END', who: '全群', title: '【占位】踩群规 END',
    text: '【占位】坏结局文案写在这里。\n\n空行分段、段内换行原样保留，结局卡与回收室都读这一份。',
  },
  b_airless: {
    tag: 'BAD END', who: '全群', title: '【占位】没人记住你 END',
    text: '【占位】分岔之夜的空気判定落这里的文案——改 adapt.ts 的 BRANCH.beWhenAirless 可以换成别的结局。',
  },
  b_wrong: {
    tag: 'BAD END', who: '示例', title: '【占位】说错话 END',
    text: '【占位】支线里说错话的坏结局文案。',
  },
  b_spam: {
    tag: 'BAD END', who: '群规', title: '【占位】刷屏被禁言 END',
    text: '【占位】同一句话复读到第 3 次触发的坏结局文案（id 由 content/rules.ts 的 REPEAT_BE 指定）。',
  },
};

/** 15 条角色线（= 好结局槽位），顺序即结局回收室的显示顺序。 */
export const GE_SLOTS: readonly CharKey[] = [
  'nanao', 'yu', 'cat', 'g', 'shisuan', 'tttt', 'shei',
  'shiban', 'taffy', 'c30586', 'mianbao', 'mibu', 'linxi', 'gen', 'aka',
];

/** 全部 Bad End 的 id，供校验器与回收室遍历。 */
export const BE_IDS = Object.keys(BEDATA) as BeId[];