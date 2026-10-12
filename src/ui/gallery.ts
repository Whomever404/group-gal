import type { CharKey, GameState } from '../engine/types';
import { BEDATA, GE_SLOTS } from '../content/endings';
import { ROUTE_ENDINGS } from '../content';
import { CHARS } from '../content/characters';
import { esc } from './chat';

/**
 * 结局回收室 —— 展示全部结局的收集进度，未解锁的只显示占位。
 *
 * 进度存于 `state.unlocked`（BE 为 `<id>`，好结局为 `ge_<key>`），
 * 与存档同生共死，因此读档后回收室也能正确回填。
 */
export function renderGallery(host: HTMLElement, state: GameState): void {
  const beIds = Object.keys(BEDATA);
  const beGot = beIds.filter(id => state.unlocked.includes(id)).length;
  const geGot = GE_SLOTS.filter(k => state.unlocked.includes('ge_' + k)).length;

  const beRows = beIds.map(id => {
    const got = state.unlocked.includes(id);
    const b = BEDATA[id as keyof typeof BEDATA];
    return `<div class="bl-row${got ? '' : ' locked'}">
      <span class="bl-t">${got ? esc(b.title) : '？？？'}</span>
      <span class="bl-d">${got ? esc(firstLine(b.text)) : '还没走到这个结局'}</span></div>`;
  }).join('');

  const geRows = GE_SLOTS.map((k: CharKey) => {
    const got = state.unlocked.includes('ge_' + k);
    const c = CHARS[k];
    const e = ROUTE_ENDINGS[k];
    return `<div class="bl-row${got ? '' : ' locked'}">
      <span class="bl-t">${c.emoji} ${got ? esc(e.title) : esc(c.name + ' 线')}</span>
      <span class="bl-d">${got ? esc(firstLine(e.text)) : '还没走到这个结局'}</span></div>`;
  }).join('');

  host.innerHTML = `
    <div class="gal-head">
      坏结局 <b>${beGot} / ${beIds.length}</b>　·　好结局 <b>${geGot} / ${GE_SLOTS.length}</b>
    </div>
    <div class="gal-sec">坏结局</div>${beRows}
    <div class="gal-sec">角色线（好结局）</div>${geRows}`;
}

/** 取一段文本的首行，作为回收室的摘要。 */
function firstLine(text: string): string {
  const line = text.split('\n').find(l => l.trim().length > 0) ?? '';
  return line.length > 42 ? line.slice(0, 42) + '…' : line;
}