import type { BeId, CharKey, CharTable, EndingResolution, Session } from '../engine/types';
import { BEDATA } from '../content/endings';
import { ROUTE_ENDINGS } from '../content';
import { HERO_KEYS } from '../content/characters';
import { STAT_NAME, STAT_KEYS, stageOf } from '../engine/effects';
import { esc } from './chat';

/**
 * 结局与关于弹窗 —— galgame 的「全屏暗化 + 居中文本框」。
 *
 * 与重做前一致的行为：结局由引擎判定后传入（`EndingResolution`），这里只负责展示；
 * 判定为 be 时复用 Bad End 弹窗。
 * 呈现上的改动：正文**逐段**呈现（空行分段，段内换行保留），并给每段一个错开的淡入。
 */
export interface Overlay {
  showBE(id: BeId): void;
  showEnding(resolution: EndingResolution, session: Session): void;
  showAbout(onStart: () => void): void;
  close(): void;
  isOpen(): boolean;
  /** 弹窗按钮回调，由 main.ts 注入 */
  onRestart: () => void;
  onBackToTitle: () => void;
}

/**
 * 正文 → 段落 HTML。空行分段；段内换行转 <br>。
 * 先 esc() 再插标签，剧本文本不会成为标记。
 */
function paras(text: string): string {
  return text.split(/\n{2,}/)
    .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function createOverlay(
  overlay: HTMLElement,
  ovCard: HTMLElement,
  chars: CharTable,
): Overlay {
  const restartBtns = (): string => `<div class="btns">
    <button class="btn primary" id="ovRestart">从头再来</button>
    <button class="btn" id="ovTitle">返回标题</button></div>`;

  function beHtml(id: BeId): string {
    const b = BEDATA[id];
    return `<div class="tag">${esc(b.tag)} · ${esc(b.who)}</div><h2>${esc(b.title)}</h2>
      <div class="ov-body">${paras(b.text)}</div>${restartBtns()}`;
  }

  /**
   * 数值字段转文本。这两项来自 Session——存档会从 localStorage 反序列化，
   * 那里是可以被手改的，所以即便类型上写着 number 也做一次强制与转义。
   */
  function num(v: number): string {
    return esc(String(Number(v) || 0));
  }

  /** 结局已由引擎判定，这里只渲染。 */
  function routeHtml(key: CharKey, session: Session): string {
    const e = ROUTE_ENDINGS[key];
    const ch = chars[key];
    const sum = HERO_KEYS
      .map(k => `${esc(chars[k].name)}：<b>${stageOf(session.state.aff[k] ?? 0)}</b>`)
      .join('　');
    const stats = STAT_KEYS
      .map(k => `${STAT_NAME[k]} <b>${num(session.state.stats[k] ?? 0)}</b>`)
      .join('　');

    return `<div class="tag">GOOD END · ${esc(ch.emoji)} ${esc(ch.name)}</div><h2>${esc(e.title)}</h2>
      <div class="ov-body">${paras(e.text)}</div>
      <div class="stat-sum">当前沦陷度<br>${sum}<br><br>
      <span style="color:var(--vn-dim)">资质：${stats}<br>
      水群值：<b>${num(session.state.water)}</b> ｜ 群成员：<b>${num(session.state.members)}</b> ｜ 回合：<b>${num(session.state.turn)}</b></span></div>
      ${restartBtns()}`;
  }

  function aboutHtml(): string {
    return `<div class="tag">ABOUT</div><h2>关于 &amp; 素材</h2>
      <div class="ov-body">
      <p>《😂群聊 · 全群攻陷计划》：单文件可玩、无需服务器、无需联网。</p>
      <p><b style="color:var(--vn-accent)">剧本</b>：15 条角色线 + 23 个坏结局，全部按群聊记录重写；
      夜间运营里先锁定一名攻略对象，之后每晚只走 TA 的本命支线与随机事件。</p>
      <p><b style="color:var(--vn-accent)">立绘</b>：CSS / SVG 现场绘制的半透明纯色剪影，不含外部图片。</p>
      <p><b style="color:var(--vn-accent)">BGM</b>：内置 Web Audio 实时合成，免版权、离线可播。若替换为真实开源曲目，可参考下列来源并保留署名：</p>
      <p>· <a href="https://dova-s.jp/en/" target="_blank">DOVA-SYNDROME</a> 免费 BGM，可商用、无需署名<br>
        · <a href="https://opengameart.org/content/yoiyami-core-theme-%E2%80%93-deep-blue-ambient-piano" target="_blank">OpenGameArt · Yoiyami Core Theme（CC0）</a><br>
        · <a href="https://potat0master.itch.io/free-background-music-for-visual-novels-bgm-pack-1" target="_blank">Potat0Master · Free VN BGM Pack</a></p>
      <p style="color:var(--vn-dim);font-size:12.5px">玩法提示：顶部「复读」可涨水群值，但同一句话连续刷屏 3 次会被禁言；
      空気攒到 3 以上，散场之夜就没人记得你。</p>
      </div>
      <div class="btns"><button class="btn primary" id="ovClose">开始游戏</button>
      <button class="btn" id="ovClose2">返回</button></div>`;
  }

  const api: Overlay = {
    onRestart: () => {},
    onBackToTitle: () => {},

    isOpen: () => !overlay.classList.contains('hidden'),
    close: () => { overlay.classList.add('hidden'); },

    showBE(id) { open(beHtml(id), 'be-ov'); },

    /** 判定为 be 时复用 Bad End 弹窗（与现状一致：走 showBE 的样式与文案）。 */
    showEnding(resolution, session) {
      if (resolution.kind === 'be') { api.showBE(resolution.id); return; }
      open(routeHtml(resolution.key, session), 'end-ov');
    },

    showAbout(onStart) {
      open(aboutHtml(), '');
      const a = document.getElementById('ovClose');
      const b = document.getElementById('ovClose2');
      if (a) a.onclick = () => { api.close(); onStart(); };
      if (b) b.onclick = () => api.close();
    },
  };

  function open(html: string, cls: string): void {
    ovCard.className = 'ov' + (cls ? ' ' + cls : '');
    ovCard.innerHTML = html;
    overlay.classList.remove('hidden');

    const r = document.getElementById('ovRestart');
    const t = document.getElementById('ovTitle');
    if (r) r.onclick = () => { api.close(); api.onRestart(); };
    if (t) t.onclick = () => { api.close(); api.onBackToTitle(); };
  }

  return api;
}
