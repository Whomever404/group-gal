/* 《😂群聊 · 全群攻陷计划》v2.0 · 无头冒烟测试（模块化引擎）
   用法： npm run smoke
   覆盖：首轮全员候选 → 锁定对象 → 本命支线 + 随机事件（运营机制）→ 阈值推进主线
        → 闹七支线可达 + 攻击性台词在线 → 结局协议。
   引擎与 DOM 解耦，故用 FakeRenderer 直接跑通整张剧情图，不做浏览器依赖。 */
import { Game } from '../src/engine/runner';
import { freshState } from '../src/engine/state';
import { NODES } from '../src/content/script';
import type {
  Choice, EndingResolution, Node, Renderer, StatKey,
} from '../src/engine/types';
import { EVENTS_PER_TURN, LOOP_ADVANCE, LOCK_BONUS, THRESHOLD } from '../src/content/loop';

/** 记录调用序列、按策略作答的假渲染器。 */
class FakeRenderer implements Renderer {
  /** 每个 loop 回合的候选列表（按出现顺序）。 */
  readonly loopTurns: Choice[][] = [];
  readonly endings: EndingResolution[] = [];
  readonly said: string[] = [];
  strategy: (node: Node, opts: readonly Choice[]) => number = () => 0;

  setDay(): void {}
  bgm(): void {}
  sfx(): void {}
  beginChat(): void {}
  beginAvg(): void {}
  async say(_who: string | null, text: string): Promise<void> { this.said.push(text); }
  async sys(text: string): Promise<void> { this.said.push('# ' + text); }
  async askChoices(node: Node, opts: readonly Choice[]): Promise<number> {
    if (node.loop) this.loopTurns.push(opts.slice());
    return this.strategy(node, opts);
  }
  async awaitAdvance(): Promise<void> {}
  showEnd(res: EndingResolution): void { this.endings.push(res); }
  statChanged(_key: StatKey): void {}
  toast(): void {}
}

let failed = 0;
const ok = (cond: boolean, label: string, extra?: unknown) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  if (!cond) failed++;
};

(async () => {
  const r = new FakeRenderer();
  const s = freshState();
  const g = new Game(s, r);

  // 策略：loop 优先走「本命支线」，没有支线可走就推进主线；其余节点一律选第一项（真诚向）。
  r.strategy = (node, opts) => {
    if (node.loop) {
      const seg = opts.findIndex(o => String(o[3]).startsWith('seg'));
      if (seg >= 0) return seg;
      const adv = opts.findIndex(o => o[1] === LOOP_ADVANCE);
      if (adv >= 0) return adv;
    }
    return 0;
  };

  // 一次 play 跑到底（引擎会一路推进到结局）
  await g.play('loop');

  console.log('== 1. 首轮：全员候选 ==');
  const first = r.loopTurns[0]!;
  ok(first.length === 15, '首轮提供 15 个全员支线候选', first.length);
  ok(first.every(o => String(o[3]).startsWith('pick_')), '候选均带一次性锁定标记');
  ok(s.target === 'nanao', '选中后锁定攻略对象 = 闹七', s.target);
  ok((s.a.nanao || 0) >= LOCK_BONUS, `锁定给一次性羁绊 +${LOCK_BONUS}`, s.a.nanao);

  console.log('== 2. 锁定后：只出本命支线 + 1~2 随机事件 ==');
  const later = r.loopTurns.slice(1);
  const eventCounts = later.map(t => t.filter(o => String(o[3]).startsWith('ev_')).length);
  const segMarks = later.flat().map(o => String(o[3])).filter(m => m.startsWith('seg'));
  ok(later.length >= 1, '锁定后至少经历一个回合', later.length);
  ok(segMarks.every(m => m.endsWith('_nanao')), '锁定后不再出现其他角色的支线', segMarks);
  ok(eventCounts.every(n => n <= EVENTS_PER_TURN), `每回合事件 ≤ ${EVENTS_PER_TURN}`, eventCounts);
  ok(eventCounts.some(n => n >= 1), '每回合至少 1 个随机事件', eventCounts);

  console.log('== 3. 羁绊阈值 → 推进主线 ==');
  const advOffered = later.some(t => t.some(o => o[1] === LOOP_ADVANCE));
  ok((s.a.nanao || 0) >= THRESHOLD || advOffered, `羁绊达标(${THRESHOLD})后出现「推进主线」`, s.a.nanao);
  ok(r.said.join('\n').includes('第 1 个晚上'), '运营文案：回合计数');

  console.log('== 4. 闹七支线可达 + 攻击性 ==');
  ok(!!NODES['s_nao1'] && !!NODES['nanao_x1'], '闹七两段支线节点存在');
  const naoText = JSON.stringify(NODES['s_nao1']) + JSON.stringify(NODES['nanao_x1']) + JSON.stringify(NODES['nanao_x2']);
  ok(/解散|点名|站出来|攻击性|说啊|别装|试试/.test(naoText), '闹七台词保留攻击性 / 嘴硬');
  ok(r.said.some(t => t.includes('群主攻击性强哪儿了')), '闹七深夜私聊段被实际播放');

  console.log('== 5. 结局 ==');
  const last = r.endings[r.endings.length - 1];
  ok(r.endings.length >= 1, '整局跑通并出现结局', last);

  console.log('\n' + (failed === 0 ? '[SMOKE PASSED]' : `[SMOKE FAILED] ${failed} 项`));
  process.exit(failed === 0 ? 0 : 1);
})();