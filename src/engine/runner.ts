import type { Choice, GameState, Node, Renderer, StatKey } from './types';
import { NODES } from '../content/script';
import { applyFx } from './effects';
import { pickRoute, pickRouteLabel, routeStartOf } from './route';
import { save } from './state';

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

      // 分岔之夜：空気 ≥ 3 → 谁也没记住你；否则走向羁绊最高者
      if (node.j === 'branch') {
        if ((this.state.s.q || 0) >= 3) {
          this.unlock('b81');
          this.r.showEnd({ kind: 'be', key: 'b81' }, this.state);
          return;
        }
        const who = pickRoute(this.state);
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