/* 无头冒烟测试 —— 用 FakeRenderer 直接跑通骨架的剧情图，不依赖浏览器。
 *
 * 用法： npm run smoke
 *
 * 覆盖：序章 / 第一章 → 第一个选择 → 夜晚回合循环
 *      （首轮 15 条全员候选 → 锁定攻略对象 → 一次性羁绊加成 → 本命支线两段 + 随机事件）
 *      → 阈值或支线走完 → 推进主线 → 分岔之夜 → 角色线 GOOD END
 *      → 空気 ≥3 落坏结局 → 存档往返（序列化 / 反序列化 / 坏存档拒绝）
 *
 * 你写完新剧情后，这个文件里的断言（文案关键字、候选数量）可能要跟着改；
 * 机制部分（回合循环、锁定、加成、结局端子）与剧情无关，一般不用动。
 */
import { createInitialProgress, createInitialState, STAT_KEYS } from '../src/engine/effects';
import { run } from '../src/engine/runner';
import { CHARS, LABELS, SCRIPT } from '../src/content';
import { BEDATA, GE_SLOTS } from '../src/content/endings';
import { LOOP } from '../src/content/adapt';
import type {
  AffToastItem, BeId, ChoiceOption, EndingResolution, HubOption,
  Renderer, Session, Speaker, StatToastItem,
} from '../src/engine/types';

/* ---------------- 假渲染器：记录调用序列，按策略作答 ---------------- */

class FakeRenderer implements Renderer {
  readonly hubAsks: { prompt: string; options: readonly HubOption[] }[] = [];
  readonly choiceAsks: { prompt: string; options: readonly ChoiceOption[] }[] = [];
  readonly endings: EndingResolution[] = [];
  readonly beShown: BeId[] = [];
  readonly chapters: string[] = [];
  readonly said: string[] = [];
  /** 每个选择题的作答策略；默认选第一项 */
  strategy: (kind: 'choice' | 'hub', options: readonly (ChoiceOption | HubOption)[]) => number = () => 0;
  /** 只允许这么多回合，超过就抛出（防死循环） */
  maxAsks = 200;

  readonly delays = { me: 0, msg: 0, sys: 0, note: 0, card: 0, fast: true };

  setChapter(title: string): void { this.chapters.push(title); }
  async say(_who: Speaker, text: string): Promise<void> { this.said.push(text); }
  async sys(text: string): Promise<void> { this.said.push(text); }
  async note(text: string): Promise<void> { this.said.push(text); }
  async card(): Promise<void> {}
  stage(): void {}
  bgm(): void {}
  affToast(_items: readonly AffToastItem[]): void {}
  statToast(_items: readonly StatToastItem[]): void {}
  toast(): void {}

  async askChoice(prompt: string, options: readonly ChoiceOption[]): Promise<number> {
    this.choiceAsks.push({ prompt, options });
    if (this.choiceAsks.length + this.hubAsks.length > this.maxAsks) throw new Error('选择题次数超限');
    return this.strategy('choice', options);
  }
  async askHub(prompt: string, options: readonly HubOption[]): Promise<number> {
    this.hubAsks.push({ prompt, options });
    if (this.choiceAsks.length + this.hubAsks.length > this.maxAsks) throw new Error('选择题次数超限');
    return this.strategy('hub', options);
  }
  async awaitAdvance(): Promise<void> {}

  async showBE(id: BeId): Promise<void> { this.beShown.push(id); this.endings.push({ kind: 'be', id }); }
  async showEnding(res: EndingResolution): Promise<void> { this.endings.push(res); }
}

function newSession(): Session {
  return { state: createInitialState(), ip: 0, history: [], progress: createInitialProgress() };
}

async function play(session: Session, r: FakeRenderer): Promise<void> {
  await run(session, { script: SCRIPT, labels: LABELS, chars: CHARS, beData: BEDATA }, r);
}

/* ---------------- 断言 ---------------- */

let failed = 0;
function ok(cond: boolean, label: string, extra?: unknown): void {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  if (!cond) failed++;
}

const texts = (opts: readonly (ChoiceOption | HubOption)[]): string[] => opts.map(o => o.label);

(async () => {
  console.log('== 0. 剧本规模 ==');
  console.log(`  节点 ${SCRIPT.length}（label ${Object.keys(LABELS).length}）`
    + ` · 角色 ${Object.keys(CHARS).length} · 坏结局 ${Object.keys(BEDATA).length}`
    + ` · 好结局槽位 ${GE_SLOTS.length}`);
  ok(SCRIPT.length > 0 && Object.keys(LABELS).includes('start'), 'start 标签存在');

  /* ---------- 1. 主线：序章 → 选择 → 回合循环 → 支线 → 分岔 → GOOD END ---------- */
  console.log('== 1. 走一遍完整流程 ==');
  const r = new FakeRenderer();
  r.strategy = (kind, options) => {
    const list = texts(options);
    if (kind === 'choice') return 0;                       // 第一章选第一项（不落坏结局）
    const locked = list.findIndex(t => /闹七/.test(t));    // 首轮：锁定闹七
    if (locked >= 0) return locked;
    const advance = list.findIndex(t => /推进主线/.test(t));
    if (advance >= 0) return advance;                      // 支线走完 → 推进主线
    return 0;                                              // 其余优先走本命支线
  };

  const s1 = newSession();
  await play(s1, r);

  ok(r.choiceAsks.length >= 1, '第一章有选择点', r.choiceAsks.length);
  ok(r.chapters.includes('序章'), '章节名进入渲染器', r.chapters);
  ok(r.said.some(t => /【占位】/.test(t)), '剧本台词已上屏', r.said.slice(0, 2));

  const firstHub = r.hubAsks[0]!;
  ok(firstHub.options.length === LOOP.candidates.length,
    `首轮给出全部 ${LOOP.candidates.length} 条全员支线`, firstHub.options.length);
  ok((s1.state.aff.nanao ?? 0) >= LOOP.lockBonus, `锁定加成 +${LOOP.lockBonus} 已计入羁绊`, s1.state.aff.nanao);

  const secondHub = r.hubAsks[1]!;
  ok(secondHub !== undefined, '支线走完回到中枢');
  if (secondHub) {
    const list = texts(secondHub.options);
    ok(list.length <= 4, '第二回合选项变少（支线 + 随机事件 + 推进）', list);
    ok(list.filter(t => /🎲/.test(t)).length <= LOOP.eventsPerTurn,
      `随机事件 ≤ ${LOOP.eventsPerTurn} 条`, list.filter(t => /🎲/.test(t)));
    ok(list.some(t => /【本命支线】|【深夜私聊】/.test(t)), '仍有本命支线可走', list);
  }

  ok(r.endings.length >= 1, '走到结局', r.endings.length);
  const end = r.endings[r.endings.length - 1]!;
  ok(end.kind === 'route' && end.key === 'nanao', '锁定对象的角色线 GOOD END', end);

  /* ---------- 2. 空気 ≥3：分岔之夜落坏结局 ---------- */
  console.log('== 2. 分岔之夜的空気判定 ==');
  const r2 = new FakeRenderer();
  const s2 = newSession();
  s2.ip = LABELS['night'] ?? 0;
  s2.state = { ...s2.state, stats: { ...s2.state.stats, q: 3 } };
  await play(s2, r2);
  ok(r2.beShown.length === 1 && r2.beShown[0] === 'b_airless', '空気 3 → 坏结局 b_airless', r2.beShown);

  /* ---------- 3. 存档往返 ---------- */
  console.log('== 3. 存档往返 ==');
  const { serializeSession, migrateSave } = await import('../src/engine/persist');
  const raw = JSON.parse(serializeSession(s1)) as Record<string, unknown>;
  const back = migrateSave(raw, SCRIPT.length);
  ok(back !== null, '存档可以反序列化');
  ok(back !== null && STAT_KEYS.every(k => (back.state.stats[k] ?? 0) === (s1.state.stats[k] ?? 0)),
    '五项资质完整往返');
  ok(back !== null && (back.state.aff.nanao ?? 0) === (s1.state.aff.nanao ?? 0), '羁绊完整往返');
  ok(migrateSave({ version: 999, state: {} }, SCRIPT.length) === null, '坏存档被拒绝（不白屏）');

  console.log('\n' + (failed === 0 ? '[SMOKE PASSED]' : `[SMOKE FAILED] ${failed} 项`));
  process.exit(failed === 0 ? 0 : 1);
})();