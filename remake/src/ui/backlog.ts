import type { CharTable, LogEntry } from '../engine/types';
import { esc, linkify } from './chat';

/**
 * 回想（backlog）。VN 的回忆画面观感——逐条列说话人与台词，说话人用角色主题色。
 *
 * 历史是引擎侧维护的 `Session.history`——阶段 1 把它从「只存在于 DOM」
 * 变成了可序列化的数据，这里正是它的第一个消费者。
 */
export function renderBacklog(
  host: HTMLElement,
  history: readonly LogEntry[],
  chars: CharTable,
): void {
  if (history.length === 0) {
    host.innerHTML = '<div class="c-idle">还没有可回想的内容</div>';
    return;
  }

  const body = history.map(e => {
    if (e.kind === 'sys') {
      return `<div class="sys" data-log="sys"><span>${esc(e.text)}</span></div>`;
    }
    if (e.kind === 'note') {
      return `<div class="note" data-log="note">${esc(e.text)}</div>`;
    }
    if (e.who === 'me') {
      return `<div class="msg me" data-log="me"><div class="body">
        <div class="nm">我</div><div class="bub">${linkify(e.text)}</div></div></div>`;
    }
    const c = chars[e.who];
    return `<div class="msg" data-log="say" style="--speaker:${c.color}"><div class="body">
      <div class="nm" style="color:${c.color}">${esc(c.name)}</div>
      <div class="bub">${linkify(e.text)}</div></div></div>`;
  }).join('');

  host.innerHTML = `<div class="bl-list">${body}</div>`;

  // 默认定位到最后一条
  host.scrollTop = host.scrollHeight;
}
