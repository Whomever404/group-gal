import type {
  Choice, EndingResolution, GameState, Node, Renderer, StatKey,
} from '../engine/types';
import { CH, silhouette } from '../content/characters';
import { ENDINGS } from '../content/endings';
import { NODES } from '../content/script';
import { $, toast } from './dom';
import { AU } from './audio';
import { SPEEDS, loadPref, savePref } from './stage';
import { lastNarration } from './narration';

export interface EndNav {
  rollback(): void;
  gallery(): void;
  title(): void;
}

type Phase = 'idle' | 'type' | 'wait' | 'choices';

/**
 * DOM 渲染器：实现引擎的 Renderer 契约。
 * 打字机、手动/自动停顿、选项按钮等「等玩家」的逻辑都在这一层，
 * 引擎只负责 await —— 从而引擎可以在无 DOM 环境下用假渲染器跑通。
 */
export class DomRenderer implements Renderer {
  readonly pref = loadPref();
  mode: 'chat' | 'avg' = 'chat';
  /** 供「复读」使用：聊天流里最后一条真实的群消息。 */
  lastChatLine = '';

  private phase: Phase = 'idle';
  private pending: (() => void) | null = null;
  private waitTimer: number | null = null;
  private waitLen: number | null = null;
  private typer: { skip(): void } | null = null;
  private avgNeutral = true;

  constructor(private readonly nav: EndNav) {}

  /* ---------------- Renderer 契约 ---------------- */

  setDay(d: string | undefined): void {
    if (d) $('daychip').textContent = d;
  }

  bgm(track: string): void { AU.setTrack(track); }
  sfx(type: string): void { AU.sfx(type); }
  toast(text: string): void { toast(text); }

  beginChat(): void {
    this.cancelPending();
    this.mode = 'chat';
    $('s-game').classList.add('mode-chat');
    $('avg').classList.remove('on');
    $('phone').style.display = 'flex';
    $('chat').innerHTML = '';
    $('choices').style.display = 'none';
    $('avgchoices').style.display = 'none';
    $('nthint').style.display = 'none';
  }

  beginAvg(node: Node): void {
    this.cancelPending();
    this.mode = 'avg';
    this.avgNeutral = node.c === undefined;
    $('s-game').classList.remove('mode-chat');
    $('phone').style.display = 'none';
    $('avg').classList.add('on');
    const bg = $('avgbg');
    bg.className = 'bg bg-' + (node.bg || 'room');
    const charKey = node.c !== undefined ? node.c : ((node.l || []).find(x => x[0]) || [])[0] || null;
    const slot = $('avgchar');
    if (charKey && CH[charKey]) { slot.innerHTML = silhouette(charKey); slot.style.opacity = '1'; }
    else { slot.innerHTML = ''; slot.style.opacity = '0'; }
    $('choices').style.display = 'none';
    $('avgchoices').style.display = 'none';
    $('avgtext').innerHTML = '';
    $('avgname').style.display = 'none';
    $('nthint').style.display = 'none';
  }

  async say(who: string | null, text: string): Promise<void> {
    if (this.mode === 'chat' && who != null) {
      const box = $('chat');
      const ch = CH[who] || { n: who, e: '❔', c: '#888' };
      const d = document.createElement('div');
      d.className = 'bub' + (who === 'you' ? ' me' : '');
      d.innerHTML = '<div class="av" style="background:' + ch.c + '22;border-color:' + ch.c + ';color:' + ch.c + '">' + ch.e + '</div>' +
        '<div class="b"><div class="nm" style="color:' + ch.c + '">' + ch.n + '</div><div class="tx"></div></div>';
      box.appendChild(d);
      this.lastChatLine = text;
      AU.sfx('pop');
      await this.typeInto(d.querySelector('.tx') as HTMLElement, text);
      box.scrollTop = box.scrollHeight;
      await this.waitFor(text.length);
      return;
    }
    // AVG（含旁白）：文本框 + 名牌
    const key = who;
    const np = $('avgname'), tx = $('avgtext'), slot = $('avgchar');
    if (key != null && key !== '#') {
      const ch = CH[key] || { n: key, e: '❔', c: '#888' };
      np.style.display = 'inline-flex';
      np.innerHTML = '<span class="e">' + ch.e + '</span><span style="color:' + ch.c + '">' + ch.n + '</span>';
      if (CH[key] && slot.innerHTML.indexOf(CH[key]!.c) === -1 && this.avgNeutral) {
        slot.innerHTML = silhouette(key); slot.style.opacity = '1';
      }
      tx.classList.remove('nar');
    } else {
      np.style.display = 'none';
      tx.classList.add('nar');
    }
    AU.sfx('pop');
    await this.typeInto(tx, text);
    await this.waitFor(text.length);
  }

  async sys(text: string): Promise<void> {
    const box = $('chat');
    const d = document.createElement('div');
    d.className = 'sysmsg';
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    await sleep(340); // 系统提示不占阅读停顿
  }

  async askChoices(node: Node, opts: readonly Choice[]): Promise<number> {
    AU.sfx('chime');
    this.phase = 'choices';
    this.hideHint();
    const isChat = node.m === 'chat';
    const box = $(isChat ? 'choices' : 'avgchoices');
    box.innerHTML = '';
    box.style.display = 'flex';
    return new Promise<number>(resolve => {
      opts.forEach((o, i) => {
        const b = document.createElement('button');
        b.textContent = o[0];
        b.onclick = () => {
          AU.sfx('click');
          box.innerHTML = '';
          box.style.display = 'none';
          this.phase = 'idle';
          resolve(i);
        };
        box.appendChild(b);
      });
    });
  }

  async awaitAdvance(): Promise<void> {
    await this.waitFor(6);
  }

  showEnd(res: EndingResolution, state: GameState): void {
    AU.sfx(res.kind === 'ge' ? 'chime' : 'withdraw');
    AU.setTrack('end');
    this.cancelPending();
    const stage = $('s-game');
    document.getElementById('endcard')?.remove();
    const card = document.createElement('div');
    card.className = 'endcard ' + (res.kind === 'ge' ? 'ge' : 'bad');
    card.id = 'endcard';
    let inner = '';
    if (res.kind === 'ge') {
      const ch = CH[res.key] || { e: '❔', n: res.key, c: '#888' };
      const ge = NODES['ge_' + res.key];
      inner = '<div class="lockbig">💎</div><div class="tag">GOOD END · ' + ch.e + ' ' + ch.n + '</div>' +
        '<h2>' + (ge?.d ?? (ch.n + ' 线 · GOOD END')) + '</h2>' +
        '<p>' + lastNarration(ge) + '</p>' +
        '<p style="font-size:12px;color:#8e849c">水群值 ' + ((state.s && state.s.w) || 0) + ' ｜ 群成员 81</p>';
    } else {
      const e = ENDINGS[res.key];
      inner = '<div class="wd">这条消息，最终没能发出去</div><div class="tag">BAD END · ' + (e ? e.who : '?') + '</div>' +
        '<h2>' + (e ? e.name : res.key) + '</h2><p>' + (e ? e.desc : '') + '</p>';
    }
    inner += '<div class="row">' +
      (state.cp ? '<button id="ec-cp">↪ 回到分岔之夜</button>' : '') +
      '<button id="ec-gal">🕳️ 结局回收室</button>' +
      '<button id="ec-title">⌂ 标题画面</button></div>';
    card.innerHTML = inner;
    stage.appendChild(card);
    if (state.cp) (document.getElementById('ec-cp') as HTMLElement).onclick = () => { card.remove(); this.nav.rollback(); };
    (document.getElementById('ec-gal') as HTMLElement).onclick = () => { card.remove(); this.nav.gallery(); };
    (document.getElementById('ec-title') as HTMLElement).onclick = () => { card.remove(); this.nav.title(); };
  }

  statChanged(key: StatKey, value: number): void {
    const el = document.getElementById('st-' + key);
    if (!el) return;
    el.textContent = String(value);
    const stat = el.parentElement;
    if (!stat) return;
    stat.classList.remove('flash');
    void stat.offsetWidth;
    stat.classList.add('flash');
  }

  /* ---------------- 阅读偏好 ---------------- */

  refreshPrefBtns(): void {
    const a = $('btn-auto'), s = $('btn-speed');
    a.classList.toggle('on', !!this.pref.auto);
    if (a.firstChild) a.firstChild.textContent = this.pref.auto ? '⏸' : '▶';
    $('cap-auto').textContent = this.pref.auto ? '自动' : '手动';
    if (s.firstChild) s.firstChild.textContent = ['🐢', '🚶', '🐇'][this.pref.spd] || '🐢';
    $('cap-speed').textContent = SPEEDS[this.pref.spd]!.n;
  }

  setAuto(v: boolean): void {
    this.pref.auto = v;
    savePref(this.pref);
    this.refreshPrefBtns();
    if (this.phase === 'wait') this.armWait();
  }

  toggleAuto(): void { this.setAuto(!this.pref.auto); }

  cycleSpeed(): void {
    this.pref.spd = (this.pref.spd + 1) % 3;
    savePref(this.pref);
    this.refreshPrefBtns();
  }

  /* ---------------- 推进 / 复读 ---------------- */

  /** 手动点击 / 空格：打字中补完当前句；等待中推进；选项出现时不动。 */
  advance(): void {
    if (document.querySelector('.modal.on')) return;
    if ($('drawer').classList.contains('open')) return;
    if (document.getElementById('endcard')) return;
    if (this.phase === 'choices') return;
    if (this.phase === 'type') { this.typer?.skip(); return; }
    if (this.phase === 'wait') this.resolvePending();
  }

  pushSelfBubble(text: string): void {
    const box = $('chat'), ch = CH.you!;
    const d = document.createElement('div');
    d.className = 'bub me';
    d.innerHTML = '<div class="av" style="background:' + ch.c + '22;border-color:' + ch.c + ';color:' + ch.c + '">' + ch.e + '</div>' +
      '<div class="b"><div class="nm" style="color:' + ch.c + '">' + ch.n + '</div><div class="tx"></div></div>';
    (d.querySelector('.tx') as HTMLElement).textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  /* ---------------- 内部：等待与打字机 ---------------- */

  private waitFor(len: number): Promise<void> {
    this.phase = 'wait';
    this.waitLen = len;
    return new Promise<void>(resolve => {
      this.pending = resolve;
      this.armWait();
    });
  }

  private armWait(): void {
    if (this.waitTimer) { clearTimeout(this.waitTimer); this.waitTimer = null; }
    if (this.pref.auto && this.waitLen != null) {
      this.showHint(true);
      const len = this.waitLen;
      this.waitTimer = window.setTimeout(() => this.resolvePending(), SPEEDS[this.pref.spd]!.autoWait(len));
    } else {
      this.showHint(false);
    }
  }

  private resolvePending(): void {
    const p = this.pending;
    this.pending = null;
    if (this.waitTimer) { clearTimeout(this.waitTimer); this.waitTimer = null; }
    this.waitLen = null;
    this.phase = 'idle';
    this.hideHint();
    p?.();
  }

  private cancelPending(): void {
    this.typer?.skip();
    this.typer = null;
    this.resolvePending();
  }

  private showHint(auto: boolean): void {
    const h = $('nthint');
    h.style.display = 'block';
    if (auto) { h.textContent = 'AUTO 自动播放中…'; h.classList.add('auto'); }
    else { h.textContent = '点击继续 ▼'; h.classList.remove('auto'); }
  }

  private hideHint(): void {
    const h = $('nthint');
    h.style.display = 'none';
    h.classList.remove('auto');
  }

  private typeInto(el: HTMLElement, text: string): Promise<void> {
    this.phase = 'type';
    return new Promise<void>(resolve => {
      const sp = SPEEDS[this.pref.spd]!;
      let i = 0;
      let timer = 0;
      let finished = false;
      const done = () => { if (finished) return; finished = true; this.typer = null; resolve(); };
      const step = () => {
        i++;
        el.textContent = text.slice(0, i);
        if (i < text.length) timer = window.setTimeout(step, /[，。！？、…—：]/.test(text[i - 1]!) ? sp.punc : sp.type);
        else done();
      };
      el.textContent = '';
      this.typer = { skip: () => { clearTimeout(timer); el.textContent = text; done(); } };
      timer = window.setTimeout(step, sp.type);
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => { window.setTimeout(resolve, ms); });
}