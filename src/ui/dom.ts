/** 顶层 DOM 工具：统一 id 取元素与整屏切换，避免各处重复 querySelector。 */
export const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export function showScreen(id: string): void {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  $(id).classList.add('on');
}

export function screenOn(id: string): boolean {
  return $(id).classList.contains('on');
}

export function toast(text: string): void {
  const x = $('toast');
  x.textContent = text;
  x.classList.add('on');
  const prev = (x as HTMLElement & { _t?: number })._t;
  if (prev) clearTimeout(prev);
  (x as HTMLElement & { _t?: number })._t = window.setTimeout(() => x.classList.remove('on'), 1800);
}