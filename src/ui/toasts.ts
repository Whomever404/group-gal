import type { AffToastItem, CharTable } from '../engine/types';

/**
 * 浮层提示。逐字搬运自原版单文件（toast）
 * 另含好感度浮层的文案拼装。
 *
 * 出现 1750ms 后自动移除。
 */
export interface Toasts {
  toast(msg: string): void;
  /** 好感度变化的浮层。空数组不产生任何提示。 */
  affToast(items: readonly AffToastItem[], chars: CharTable): void;
}

const TOAST_MS = 1750;

export function createToasts(host: HTMLElement): Toasts {
  function push(msg: string): void {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    host.appendChild(d);
    setTimeout(() => d.remove(), TOAST_MS);
  }

  return {
    toast: push,

    affToast(items, chars) {
      if (items.length === 0) return;
      const parts = items.map(({ who, delta }) => {
        const c = chars[who];
        return delta > 0 ? `❤ ${c.name} +${delta}` : `💔 ${c.name} ${delta}`;
      });
      push(parts.join('　'));
    },
  };
}
