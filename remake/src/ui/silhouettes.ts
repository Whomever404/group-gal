import type { CharKey, CharTable } from '../engine/types';

/**
 * 半透明纯色剪影立绘。逐字搬运自原版单文件。
 *
 * 唯一改动：对全局 `CHARS` 的读取改为由参数传入 `chars`，
 * 使本模块不依赖具体角色表，可独立测试。
 *
 * 返回 SVG 字符串。装饰性图形，带 aria-hidden。
 */
export function sil(key: CharKey, size: number, chars: CharTable): string {
  const c = chars[key]?.color ?? '#888';
  const sh = chars[key]?.shape ?? 'dot';
  let acc = '';

  if (sh === 'crown') {
    acc = `<path d="M32 17 L40 27 L50 12 L60 27 L68 17 L64 37 L36 37 Z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'cat') {
    acc = `<path d="M31 22 L35 4 L48 17 Z" fill="${c}" opacity="0.9"/><path d="M69 22 L65 4 L52 17 Z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'fish') {
    acc = `<path d="M71 66 q15 -7 17 3 q-7 9 -17 4 z" fill="${c}" opacity="0.9"/><circle cx="80" cy="69" r="2.2" fill="#0b0910"/>`;
  } else if (sh === 'star') {
    acc = `<path d="M50 6 l4.5 11 12 1 -9 8 3 12 -10.5 -6.5 -10.5 6.5 3 -12 -9 -8 12 -1 z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'garlic') {
    acc = `<path d="M50 8 q11 9 8.5 20 q-8.5 -5 -17 0 q-2.5 -11 8.5 -20 z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'mask') {
    acc = `<ellipse cx="50" cy="41" rx="13" ry="8.5" fill="#0b0910" opacity="0.55"/><ellipse cx="44" cy="40" rx="3" ry="3.5" fill="${c}" opacity="0.9"/><ellipse cx="56" cy="40" rx="3" ry="3.5" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'egg') {
    acc = `<ellipse cx="50" cy="28" rx="15" ry="11" fill="${c}" opacity="0.55"/>`;
  } else if (sh === 'fin') {
    acc = `<path d="M50 8 q13 8 0 20 q-13 -12 0 -20 z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'bucket') {
    acc = `<path d="M40 6 h20 v12 h-20 z" fill="${c}" opacity="0.9"/><path d="M45 6 q5 -8 10 0" stroke="${c}" fill="none" stroke-width="3" opacity="0.9"/>`;
  } else if (sh === 'moon') {
    acc = `<path d="M58 6 a11 11 0 1 0 6 20 a9 9 0 1 1 -6 -20 z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'bread') {
    acc = `<path d="M30 12 q20 -10 40 0 v10 h-40 z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'wrench') {
    acc = `<rect x="43" y="5" width="5" height="17" rx="2.5" fill="${c}" opacity="0.85"/><rect x="52" y="5" width="5" height="17" rx="2.5" fill="${c}" opacity="0.85"/>`;
  } else if (sh === 'mushroom') {
    acc = `<path d="M26 26 q24 -24 48 0 q-24 9 -48 0 z" fill="${c}" opacity="0.9"/>`;
  } else if (sh === 'wave') {
    acc = `<path d="M30 34 q6 -9 12 0 t12 0 t12 0" stroke="${c}" fill="none" stroke-width="3" opacity="0.85"/>`;
  } else {
    acc = `<circle cx="50" cy="20" r="5" fill="${c}" opacity="0.85"/>`;
  }

  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <g fill="${c}" opacity="0.5">
      <circle cx="50" cy="38" r="19"/>
      <path d="M16 100 C16 76 32 62 50 62 C68 62 84 76 84 100 Z"/>
    </g>${acc}</svg>`;
}
