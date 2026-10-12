/* 无头冒烟测试 —— 用 FakeRenderer 直接跑通整张剧情图，不依赖浏览器。
 *
 * 用法： npm run smoke
 *
 * 覆盖：首轮全员候选 → 锁定攻略对象 → 本命支线 + 1~2 随机事件（运营机制）
 *      → 羁绊阈值推进主线 → 分岔之夜 → 角色线 → GOOD END
 *      → 空気≥3 落「第 81 人」→ 角色线失败落 Bad End
 *      → 存档往返（序列化 / 反序列化 / 老存档迁移）
 */
import { createInitialProgress, createInitialState, STAT_KEYS } from '../src/engine/effects';
import { run } from '../src/engine/runner';
import { CHARS, LABELS, SCRIPT } from '../src/content';
import { BEDATA } from '../src/content/endings';
import { LOOP } from '../src/content/adapt';
import type {
  AffToastItem, BeId, CharKey, ChoiceOption, EndingResolution, HubOption,
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
  readonly affToasts: AffToastItem[] = [];
  readonly statToasts: StatToastItem[] = [];
  /** 每个选择题的作答策略；默认选第一项 */
  strategy: (kind: 'choice' | 'hub', options: readonly unknown[]) => number = () => 0;
  /** 只允许这一回合数，超过就抛出（防死循环） */
  maxAsks = 200;

  readonly delays = { me: 0, msg: 0, sys: 0, note: 0, card: 0, fast: true };

  setChapter(title: string): void { this.chapters.push(title); }
  async say(_who: Speaker, text: string): Promise<void> { this.said.push(text); }
  async sys(text: string): Promise<void> { this.said.push(text); }
  async note(text: string): Promise<void> { this.said.push(text); }
  async card(): Promise<void> {}
  stage(): void {}
  bgm(): void {}
  affToast(items: readonly AffToastItem[]): void { this.affToasts.push(...items); }
  statToast(items: readonly StatToastItem[]): void { this.statToasts.push(...items); }
  toast(): void {}

  async askChoice(_p: string, options: readonly ChoiceOption[]): Promise<number> {
    this.choiceAsks.push({ prompt: _p, options });
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
const ok = (cond: boolean, label: string, extra?: unknown): void => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  if (!cond) failed++;
};

/** 选第一个不落 Bad End 的选项；全都落 BE 时退回第一项。 */
function safeChoice(options: readonly { goto: string }[]): number {
  const i = options.findIndex(o => !o.goto.startsWith('@be:'));
  return i >= 0 ? i : 0;
}

/** 在回合循环里：首轮锁定指定对象，之后只走 TA 的本命支线，没有支线就推进主线。 */
function lockAndRunArc(hero: CharKey, opts: readonly HubOption[]): number {
  const seg = opts.findIndex(o => o.id.startsWith('seg') && o.id.endsWith('_' + hero));
  if (seg >= 0) return seg;
  const adv = opts.findIndex(o => o.id === 'adv');
  if (adv >= 0) return adv;
  const pick = opts.findIndex(o => o.id === 'pick_' + hero);
  return pick >= 0 ? pick : 0;
}

(async () => {
  /* ---------- 1. 回合循环：运营机制 ---------- */
  console.log('== 1. 回合循环中枢 ==');
  const r1 = new FakeRenderer();
  const s1 = newSession();
  r1.strategy = (kind, options) => {
    if (kind === 'hub') {
      const opts = options as readonly HubOption[];
      const pick = opts.findIndex(o => o.id === 'pick_nanao');
      if (pick >= 0) return pick;                       // 首轮：锁定闹七
      return lockAndRunArc('nanao', opts);               // 之后：只走本命支线
    }
    return safeChoice(options as readonly { goto: string }[]);
  };
  await play(s1, r1);

  const first = r1.hubAsks[0]!;
  ok(first.options.length === LOOP.candidates.length,
    `首轮给全部 ${LOOP.candidates.length} 条全员支线`, first.options.length);
  ok(first.options.every(o => o.id.startsWith('pick_')), '首轮选项都是锁定候选');
  ok(s1.state.target === 'nanao', '选中后锁定攻略对象 = 闹七', s1.state.target);
  ok((s1.state.aff.nanao ?? 0) >= LOOP.lockBonus, `锁定给一次性羁绊 +${LOOP.lockBonus}`, s1.state.aff.nanao);

  const later = r1.hubAsks.slice(1);
  const foreign = later.flatMap(a => a.options.map(o => o.id))
    .filter(id => id.startsWith('pick_') || (id.startsWith('seg') && !id.endsWith('_nanao')));
  ok(foreign.length === 0, '锁定后不再出现其他角色的支线', foreign);
  const evCounts = later.map(a => a.options.filter(o => o.id.startsWith('ev_')).length);
  ok(evCounts.every(n => n <= LOOP.eventsPerTurn), `每回合随机事件 ≤ ${LOOP.eventsPerTurn}`, evCounts);
  ok(evCounts.some(n => n >= 1), '每回合至少 1 个随机事件', evCounts);
  ok(later.some(a => a.prompt.includes('羁绊')), '顶栏提示带羁绊进度', later[0]?.prompt);
  ok(s1.state.turn >= 2, '回合计数在推进', s1.state.turn);

  /* ---------- 2. 闹七支线与好结局 ---------- */
  console.log('== 2. 角色线（闹七）==');
  const said = r1.said.join('\n');
  ok(said.includes('群主攻击性强哪儿了'), '闹七深夜私聊段的攻击性台词在线上', true);
  ok(s1.state.aff.nanao >= LOOP.threshold, `羁绊已攒到阈值以上（${LOOP.threshold}）`, s1.state.aff.nanao);
  const end1 = r1.endings[r1.endings.length - 1];
  ok(end1?.kind === 'route' && end1.key === 'nanao', '走完本命支线 → 闹七 GOOD END', end1);
  ok(s1.state.unlocked.includes('ge_nanao'), '好结局写入回收记录', s1.state.unlocked);
  ok(r1.statToasts.length > 0, '资质变化有浮层提示', r1.statToasts.slice(0, 3));

  /* ---------- 3. 空気≥3 → 第 81 人 ---------- */
  console.log('== 3. 分岔之夜：空気≥3 → 第 81 人 ==');
  const r2 = new FakeRenderer();
  const s2 = newSession();
  s2.state = { ...s2.state, stats: { z: 0, r: 0, m: 0, q: 3, w: 0 } };
  r2.strategy = (kind, options) => (kind === 'hub'
    ? lockAndRunArc('nanao', options as readonly HubOption[])
    : safeChoice(options as readonly { goto: string }[]));
  await play(s2, r2);
  ok(r2.beShown.includes('b81'), '落「第 81 人」Bad End', r2.beShown);
  ok(s2.state.unlocked.includes('b81'), 'Bad End 写入回收记录');

  /* ---------- 4. 角色线失败 → Bad End ---------- */
  console.log('== 4. 角色线失败 ==');
  const r3 = new FakeRenderer();
  const s3 = newSession();
  r3.strategy = (kind, options) => {
    if (kind === 'hub') return lockAndRunArc('yu', options as readonly HubOption[]);
    const opts = options as readonly { goto: string }[];
    const be = opts.findIndex(o => o.goto === '@be:by');   // 一条鱼的失败分支
    return be >= 0 ? be : safeChoice(opts);
  };
  await play(s3, r3);
  const end3 = r3.endings[r3.endings.length - 1];
  ok(end3?.kind === 'be' && r3.beShown.includes(end3.id), '角色线选错 → Bad End', end3);
  ok(s3.state.unlocked.includes('by'), 'Bad End 写入回收记录', s3.state.unlocked);

  /* ---------- 5. 存档往返 ---------- */
  console.log('== 5. 存档往返 ==');
  const { serializeSession, migrateSave } = await import('../src/engine/persist');
  const raw = JSON.parse(serializeSession(s1)) as Record<string, unknown>;
  const back = migrateSave(raw, SCRIPT.length);
  ok(back !== null, '序列化 → 反序列化成功');
  ok(back?.state.target === s1.state.target, '攻略对象存活', back?.state.target);
  ok(back?.state.unlocked.includes('ge_nanao') === true, '回收记录存活');
  ok(JSON.stringify(back?.state.stats) === JSON.stringify(s1.state.stats), '资质存活');
  const legacy = { ip: 0, state: { aff: s1.state.aff, flags: {}, water: 1, members: 81, hub: {}, lastRepeat: '', repeatN: 0 }, history: [] };
  const migrated = migrateSave(legacy, SCRIPT.length);
  ok(migrated !== null, 'v1 老存档可以迁移读出');
  ok(migrated !== null && STAT_KEYS.every(k => migrated.state.stats[k] === 0), '迁移后资质补零');

  /* ---------- 6. 全 15 条角色线可达 ---------- */
  console.log('== 6. 15 条角色线 ==');
  const broken: string[] = [];
  for (const hero of LOOP.candidates.map(c => c.key)) {
    const key = hero as CharKey;
    const r = new FakeRenderer();
    const s = newSession();
    r.strategy = (kind, options) => (kind === 'hub'
      ? lockAndRunArc(key, options as readonly HubOption[])
      : safeChoice(options as readonly { goto: string }[]));
    await play(s, r);
    const end = r.endings[r.endings.length - 1];
    if (!end || end.kind !== 'route' || end.key !== key) broken.push(key + '→' + JSON.stringify(end));
  }
  ok(broken.length === 0, '15/15 角色线都能走到各自的 GOOD END', broken.length ? broken : '全部通过');

  console.log('\n' + (failed === 0 ? '[SMOKE PASSED]' : `[SMOKE FAILED] ${failed} 项`));
  process.exit(failed === 0 ? 0 : 1);
})();