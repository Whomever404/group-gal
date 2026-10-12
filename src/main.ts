import type { GameState, StatKey } from './engine/types';
import { NODES } from './content/script';
import { freshState, loadSave, save } from './engine/state';
import { Game } from './engine/runner';
import { DomRenderer } from './ui/renderer';
import { AU } from './ui/audio';
import { $, showScreen, screenOn, toast } from './ui/dom';
import { openGallery, openDrawer, closeDrawer, drawerOpen } from './ui/panels';
import { SPEEDS } from './ui/stage';
import './style.css';

const STATS: readonly StatKey[] = ['z', 'r', 'm', 'q', 'w'];

const renderer = new DomRenderer({ rollback, gallery, title: toTitle });
const game = new Game(loadSave() ?? freshState(), renderer);

/* ---------------- 画面切换 ---------------- */

function toGame(): void {
  showScreen('s-game');
  STATS.forEach(k => {
    const el = document.getElementById('st-' + k);
    if (el) el.textContent = String(game.state.s[k] || 0);
  });
  renderer.refreshPrefBtns();
}

function toTitle(): void {
  showScreen('s-title');
  AU.setTrack('title');
  const s = loadSave();
  $<HTMLButtonElement>('btn-continue').disabled = !(s && s.id);
}

function gallery(): void {
  openGallery(game.state);
}

/** 回滚到分岔之夜：恢复快照，回收记录 / 设置 / 水群值不回滚。 */
function loadCP(): GameState {
  const cur = game.state;
  if (!cur.cp) return cur;
  const got = (cur.unlocked || []).slice();
  const seSet = cur.se, bgmSet = cur.bgm, wNow = (cur.s && cur.s.w) || 0;
  const restored = JSON.parse(cur.cp) as GameState;
  restored.cp = null;
  restored.unlocked = Array.from(new Set(got.concat(restored.unlocked || [])));
  restored.se = seSet; restored.bgm = bgmSet;
  restored.s.w = Math.max(restored.s.w || 0, wNow);
  save(restored);
  return restored;
}

function rollback(): void {
  game.swap(loadCP());
  toGame();
  void game.play('e4');
}

/* ---------------- 开局 / 读档 ---------------- */

function startGame(): void {
  const keep = { se: game.state.se, bgm: game.state.bgm };
  const ns = freshState();
  ns.se = keep.se; ns.bgm = keep.bgm;
  save(ns);
  game.swap(ns);
  toGame();
  AU.on = ns.bgm; AU.se = ns.se;
  AU.setTrack('daily');
  if (ns.bgm) AU.start();
  void game.play('start');
}

function continueGame(): void {
  toGame();
  AU.setTrack(NODES[game.state.id]?.bgm || 'daily');
  AU.start();
  void game.play(game.state.id);
}

/* ---------------- 按钮绑定 ---------------- */

$('btn-start').onclick = () => { AU.on = game.state.bgm !== false; AU.start(); startGame(); };

$('btn-continue').onclick = () => {
  const s = loadSave();
  if (!s) return;
  game.swap(s);
  AU.start();
  continueGame();
};

$('btn-gallery1').onclick = () => { gallery(); };
$('btn-galback').onclick = () => { toTitle(); };
$('btn-about').onclick = () => { $('modal-about').classList.add('on'); };
$('about-close').onclick = () => { $('modal-about').classList.remove('on'); };
$('btn-home').onclick = () => { if (confirm('返回标题？当前进度已自动保存。')) toTitle(); };

$('btn-members').onclick = () => { openDrawer(game.state); };
$('btn-drawer-close').onclick = () => { closeDrawer(); };

$('btn-auto').onclick = () => { renderer.toggleAuto(); };
$('btn-speed').onclick = () => {
  renderer.cycleSpeed();
  toast('文字速度：' + SPEEDS[renderer.pref.spd]!.n);
};

$('btn-sound').onclick = () => {
  const s = game.state;
  s.se = !s.se; save(s); AU.se = s.se;
  $('btn-sound').textContent = s.se ? '🔊' : '🔇';
  toast('音效：' + (s.se ? '开' : '关'));
  if (s.se) AU.sfx('click');
};

$('btn-music').onclick = () => { $('modal-music').classList.add('on'); };

$('m-bgm').onclick = () => {
  const s = game.state;
  s.bgm = !s.bgm; save(s);
  $('m-bgm').textContent = s.bgm ? '开' : '关';
  AU.on = s.bgm;
  if (s.bgm) { AU.stopFile(); AU.start(); } else { AU.stop(); AU.pause(); }
};

$('m-se').onclick = () => {
  const s = game.state;
  s.se = !s.se; save(s);
  $('m-se').textContent = s.se ? '开' : '关';
  AU.se = s.se; AU.sfx('click');
};

document.querySelectorAll<HTMLElement>('[data-trk]').forEach(b => {
  b.onclick = () => {
    AU.stopFile();
    const s = game.state;
    s.trk = b.dataset.trk || 'title'; save(s);
    AU.on = s.bgm; AU.setTrack(s.trk);
    toast('BGM：' + b.textContent);
  };
});

$('m-file').onclick = () => { $<HTMLInputElement>('file-input').click(); };
$<HTMLInputElement>('file-input').onchange = e => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  AU.playFile(f);
  toast('正在播放本地音乐：' + f.name);
};

document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('on'); });
});

/* ---------------- 复读 & 水群值（同一句刷三次触发刷屏 BE） ---------------- */

let repLine = '', repN = 0;
$('btn-repeat').onclick = () => {
  if (document.getElementById('endcard')) return;
  const node = NODES[game.state.id];
  if (!node || node.m !== 'chat' || !renderer.lastChatLine) { toast('现在没有可以复读的群消息'); return; }
  AU.sfx('click');
  renderer.pushSelfBubble(renderer.lastChatLine);
  if (renderer.lastChatLine === repLine) repN++;
  else { repLine = renderer.lastChatLine; repN = 1; }
  const s = game.state;
  s.s.w = (s.s.w || 0) + 1;
  renderer.statChanged('w', s.s.w);
  save(s);
  if (repN >= 3) { void game.play('__end_b24'); return; }
  toast(repN === 2 ? '再复读一次，就要被禁言了' : '复读成功 · 水群值 +1');
};

/* ---------------- 输入推进：手动点击 / 空格 ---------------- */

document.addEventListener('click', e => {
  AU.init();
  const t = e.target as HTMLElement;
  if (t.closest('button')) return;
  if (drawerOpen()) {
    if (!t.closest('.drawer')) closeDrawer();
    return;
  }
  if (screenOn('s-game') && !t.closest('.endcard')) renderer.advance();
});

document.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    closeDrawer();
    document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));
  }
  if (!screenOn('s-game')) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); renderer.advance(); }
  else if (e.code === 'KeyA') { renderer.toggleAuto(); toast(renderer.pref.auto ? '自动播放：开' : '自动播放：关'); }
  else if (e.code === 'KeyS') { renderer.cycleSpeed(); toast('文字速度：' + SPEEDS[renderer.pref.spd]!.n); }
});

/* ---------------- 启动 ---------------- */

(function init(): void {
  const s = game.state;
  AU.on = s.bgm !== false; AU.se = s.se !== false; AU.trk = s.trk || 'title';
  const saved = loadSave();
  $<HTMLButtonElement>('btn-continue').disabled = !(saved && saved.id);
  $('m-bgm').textContent = s.bgm === false ? '关' : '开';
  $('m-se').textContent = s.se === false ? '关' : '开';
  $('btn-sound').textContent = s.se === false ? '🔇' : '🔊';
  renderer.refreshPrefBtns();
  document.addEventListener('pointerdown', () => AU.init(), { once: true });
})();