import type { GameState } from '../engine/types';
import { CH } from '../content/characters';
import { ENDINGS, GE_SLOTS } from '../content/endings';
import { NODES } from '../content/script';
import { $, showScreen } from './dom';
import { lastNarration } from './narration';

/** 羁绊阶段：无视 → 眼熟 → 嘴替 → 宝宝 → 沦陷。 */
export function stageOf(a: number): string {
  return a <= 0 ? '无视' : a <= 2 ? '眼熟' : a <= 4 ? '嘴替' : a <= 6 ? '宝宝' : '沦陷';
}

export function openGallery(state: GameState): void {
  const bad = $('gal-bad'), good = $('gal-good');
  bad.innerHTML = ''; good.innerHTML = '';
  const got = state.unlocked;
  for (const k in ENDINGS) {
    const e = ENDINGS[k]!;
    const has = got.indexOf(k) >= 0;
    bad.innerHTML += '<div class="gal-item ' + (has ? 'got' : 'lock') + '"><div class="gi">' + (has ? '💢' : '🔒') +
      '</div><div class="gn">' + (has ? e.name : '？？？') + '</div><div class="gd">' +
      (has ? e.who + ' · ' + e.desc : '还没回收到的坏结局') + '</div></div>';
  }
  let geCnt = 0;
  GE_SLOTS.forEach(k => {
    const ch = CH[k]!;
    const has = got.indexOf('ge_' + k) >= 0;
    if (has) geCnt++;
    const desc = has ? (lastNarration(NODES['ge_' + k]) || ch.n + ' · 好结局') : '还没回收到的好结局';
    good.innerHTML += '<div class="gal-item ' + (has ? 'got' : 'lock') + '"><div class="gi">' + (has ? '💎' : '🔒') +
      '</div><div class="gn">' + (has ? ch.n + ' · GOOD END' : '？？？') + '</div><div class="gd">' + desc + '</div></div>';
  });
  const beCnt = Object.keys(ENDINGS).filter(k => got.indexOf(k) >= 0).length;
  $('gal-progress').textContent = '坏结局 ' + beCnt + ' / ' + Object.keys(ENDINGS).length +
    '　·　好结局 ' + geCnt + ' / ' + GE_SLOTS.length;
  showScreen('s-gallery');
}

export function renderMembers(state: GameState): void {
  const box = $('dr-list');
  let html = '';
  Object.keys(CH).forEach(k => {
    if (k === 'you') return;
    const c = CH[k]!;
    const a = state.a[k] || 0;
    const pct = Math.min(100, a / 8 * 100);
    html += '<div class="dr-row"><div class="av" style="color:' + c.c + ';background:' + c.c + '22;border-color:' + c.c + '88">' + c.e + '</div>' +
      '<div class="dr-mid"><div class="t">' + c.n + '</div><div class="s">' + c.sub + '</div><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="dr-stage">' + stageOf(a) + '</div></div>';
  });
  box.innerHTML = html;
}

export function openDrawer(state: GameState): void {
  renderMembers(state);
  $('drawer').classList.add('open');
}

export function closeDrawer(): void { $('drawer').classList.remove('open'); }

export function drawerOpen(): boolean { return $('drawer').classList.contains('open'); }