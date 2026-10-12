import type { CharKey, Choice, GameState, Node, Renderer, StatKey } from './types';
import { NODES } from '../content/script';
import { applyFx } from './effects';
import { pickRoute, pickRouteLabel, routeStartOf } from './route';
import { ROUTE_START } from '../content/route';
import { save } from './state';
import {
  ARC_SEG_N, ARC_STEPS, CANDIDATES, EVENTS_PER_TURN, LOCK_BONUS, LOOP_ADVANCE, THRESHOLD,
} from '../content/loop';
import { EVENTS } from '../content/events';
import { CH } from '../content/characters';

/** 引擎与内容的边界：节点解释器。引擎不含 DOM，所有副作用经 Renderer 发生。 */
export class Game {
  private gen = 0;

  constructor(public state: GameState, private readonly r: Renderer) {}

  /** 换入新状态（读档 / 回滚 / 重开），并作废仍在跑的那次 play()。 */
  swap(state: GameState): void {
    this.gen++;
    this.state = state;
  }

  /**
   * 从某节点开始推进，直到抵达结局或终点。
   * 每次 play() 会作废上一次：旧循环在下一个检查点自行退出，避免两个循环抢同一个 state。
   */
  async play(startId: string): Promise<void> {
    const myGen = ++this.gen;
    const alive = () => myGen === this.gen;
    let id: string | null = startId;

    while (id && alive()) {
      if (id.startsWith('__end_')) {
        const key = id.slice(6);
        this.unlock(key);
        this.r.showEnd({ kind: 'be', key }, this.state);
        return;
      }
      if (id.startsWith('__ge_')) {
        const key = id.slice(5);
        this.unlock('ge_' + key);
        this.r.showEnd({ kind: 'ge', key }, this.state);
        return;
      }

      const node: Node | undefined = NODES[id];
      if (!node) { console.error('[gal] 缺少节点', id); return; }

      this.state.id = id;
      save(this.state);

      // 节点自带 fx 只结算一次（防止读档重进同一节点时重复加羁绊）
      if (node.fx && !this.state.fxDone[id]) {
        this.flash(applyFx(this.state, node.fx));
        this.state.fxDone[id] = 1;
        save(this.state);
      }
      if (node.d) this.r.setDay(node.d);
      if (node.bgm) this.r.bgm(node.bgm);

      const chat = node.m === 'chat';
      if (chat) this.r.beginChat(); else this.r.beginAvg(node);
      await this.speak(node, chat, alive);
      if (!alive()) return;

      // 回合循环（第二章 · 群日常）：首轮挑对象 → 锁定 → 对象支线 + 随机事件 → 阈值推进
      if (node.loop) {
        const target = await this.runLoop(node, alive);
        if (!alive()) return;
        if (target == null) return;
        id = target;
        continue;
      }

      // 分岔之夜：若已锁定攻略对象则直接走 TA 的线；否则羁绊最高者 / 空気≥3 落「第 81 人」
      if (node.j === 'branch') {
        const locked = this.state.target && ROUTE_START[this.state.target] ? this.state.target : null;
        if (!locked && (this.state.s.q || 0) >= 3) {
          this.unlock('b81');
          this.r.showEnd({ kind: 'be', key: 'b81' }, this.state);
          return;
        }
        const who: CharKey = (locked ?? pickRoute(this.state)) as CharKey;
        const opts: Choice[] = [[pickRouteLabel(who), routeStartOf(who)]];
        const pick = await this.r.askChoices(node, opts);
        if (!alive()) return;
        id = (opts[pick] ?? opts[0])![1];
        continue;
      }

      // 选项组：第 4 位为主线的「一次性标记」，做过一次的支线不再出现
      if (node.o && node.o.length) {
        const visible: Choice[] = node.o.filter(o => !(o[3] && this.state.hubDone[o[3]]));
        const pick = await this.r.askChoices(node, visible);
        if (!alive()) return;
        const opt: Choice | undefined = visible[pick] ?? visible[0];
        if (!opt) return;
        this.flash(applyFx(this.state, opt[2]));
        if (opt[3]) this.state.hubDone[opt[3]] = 1;
        save(this.state);
        id = opt[1];
        continue;
      }

      // 线性推进
      if (node.next) {
        await this.r.awaitAdvance();
        if (!alive()) return;
        id = node.next;
        continue;
      }

      return; // 终点
    }
  }

  /**
   * 一个回合：先读运营状态，再按「首轮全员 / 锁定后本命支线 + 随机事件」生成选项。
   * 返回下一节点 id；返回 null 表示流程终止。
   */
  private async runLoop(node: Node, alive: () => boolean): Promise<string | null> {
    const s = this.state;
    s.turn = (s.turn || 0) + 1;
    const opts: Choice[] = [];

    if (!s.target || !ARC_STEPS[s.target]) {
      await this.r.sys(`第 ${s.turn} 个晚上 · 群里 15 个人都值得深挖，先挑一个？`);
      for (const c of CANDIDATES) {
        opts.push([c.label, ARC_STEPS[c.key]![0], null, 'pick_' + c.key]);
      }
    } else {
      const key = s.target;
      const steps = ARC_STEPS[key]!;
      const ch = CH[key] || { e: '❔', n: key, c: '#888' };
      const bond = s.a[key] || 0;
      const done = steps.filter((_, i) => s.hubDone['seg' + i + '_' + key]).length;
      await this.r.sys(`第 ${s.turn} 个晚上 · 攻略中：${ch.e} ${ch.n} ｜ 羁绊 ${Math.min(bond, THRESHOLD)}/${THRESHOLD} ｜ 本命支线 ${done}/${ARC_SEG_N}`);

      steps.forEach((entry, i) => {
        if (s.hubDone['seg' + i + '_' + key]) return;
        const tag = i === 0 ? '【本命支线】' : '【深夜私聊】';
        opts.push([`${tag}${ch.n}：${i === 0 ? '再走近一点' : '把没说完的话说完'}`, entry, null, 'seg' + i + '_' + key]);
      });

      // 随机事件：日常为主、少量风险；每条只触发一次
      EVENTS.filter(e => !s.hubDone['ev_' + e.id]).slice(0, EVENTS_PER_TURN).forEach(e => {
        opts.push([(e.kind === 'risk' ? '🎲 [风险] ' : '🎲 ') + e.label, e.entry, null, 'ev_' + e.id]);
      });

      const canAdvance = bond >= THRESHOLD || done >= ARC_SEG_N;
      if (canAdvance) opts.push(['▶ 差不多了，推进主线（躲猫猫之夜）', LOOP_ADVANCE, null, 'adv']);
      if (opts.length === 0) opts.push(['▶ 推进主线（躲猫猫之夜）', LOOP_ADVANCE, null, 'adv']);
    }

    const pick = await this.r.askChoices(node, opts);
    if (!alive()) return null;
    const opt = opts[pick] ?? opts[0];
    if (!opt) return null;

    const mark = opt[3];
    if (mark && mark.startsWith('pick_')) {
      const key = mark.slice(5);
      s.target = key;
      s.a[key] = (s.a[key] || 0) + LOCK_BONUS;
      save(s);
      const ch = CH[key] || { e: '❔', n: key };
      this.r.toast(`已锁定攻略对象：${ch.e} ${ch.n}（羁绊 +${LOCK_BONUS}）`);
    } else if (mark) {
      s.hubDone[mark] = 1;
      save(s);
    }
    return opt[1];
  }

  private async speak(node: Node, chat: boolean, alive: () => boolean): Promise<void> {
    const lines: readonly (readonly [string | null, string])[] = chat ? (node.b || []) : (node.l || []);
    for (const [who, text] of lines) {
      if (!alive()) return;
      if (who === '#') await this.r.sys(text);
      else await this.r.say(who, text);
      if (!alive()) return;
    }
  }

  private unlock(key: string): void {
    if (!this.state.unlocked.includes(key)) { this.state.unlocked.push(key); save(this.state); }
  }

  private flash(keys: StatKey[]): void {
    keys.forEach(k => this.r.statChanged(k, this.state.s[k]));
  }
}