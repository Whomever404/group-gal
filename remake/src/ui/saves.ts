import { SCRIPT } from '../content/chapters';
import type { SaveSlotId, SlotInfo } from './storage';

/**
 * 存档槽界面。复用抽屉样式。
 *
 * 删除采用**内联二次确认**而不是 `confirm()`——该 API 在嵌框/沙箱环境下
 * 会被直接拒绝（返回 false），用它会让删除永远不生效。
 */
export interface SavesHandlers {
  onSave(id: SaveSlotId): void;
  onLoad(id: SaveSlotId): void;
  onDelete(id: SaveSlotId): void;
}

const SLOT_LABEL: Record<SaveSlotId, string> = {
  auto: '自动存档',
  s1: '存档 1',
  s2: '存档 2',
  s3: '存档 3',
};

/** 时间戳 → `YYYY-MM-DD HH:MM`。没有时间戳时回落一个破折号。 */
function stamp(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '——';
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function button(text: string, action: string, cls: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = text;
  b.dataset['action'] = action;
  return b;
}

export function renderSaves(
  host: HTMLElement,
  slots: readonly SlotInfo[],
  handlers: SavesHandlers,
): void {
  /** 当前处于「确认删除」态的槽位。渲染不会重置它。 */
  let confirming: SaveSlotId | null = null;

  function draw(): void {
    host.innerHTML = '';

    for (const slot of slots) {
      const row = document.createElement('div');
      row.className = 'save-row';
      row.dataset['slot'] = slot.id;

      const info = document.createElement('div');
      info.className = 'save-info';

      const title = document.createElement('div');
      title.className = 't';
      title.textContent = SLOT_LABEL[slot.id];
      info.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 's';
      meta.textContent = slot.empty
        ? '空'
        : `${slot.ip} / ${SCRIPT.length}　水群值 ${slot.water}　·　${stamp(slot.savedAt)}`;
      info.appendChild(meta);

      row.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'save-actions';

      // 自动存档由进入选项时写入，不接受手动保存，也不可删除
      const isAuto = slot.id === 'auto';

      if (confirming === slot.id) {
        const hint = document.createElement('span');
        hint.className = 's';
        hint.textContent = '确认删除？';
        actions.appendChild(hint);

        const yes = button('删除', 'delete-confirm', 'mini danger');
        yes.addEventListener('click', () => {
          confirming = null;
          handlers.onDelete(slot.id);
          draw();
        });
        actions.appendChild(yes);

        const no = button('取消', 'delete-cancel', 'mini');
        no.addEventListener('click', () => { confirming = null; draw(); });
        actions.appendChild(no);
      } else {
        if (!isAuto) {
          const save = button(slot.empty ? '保存' : '覆盖', 'save', 'mini');
          save.addEventListener('click', () => handlers.onSave(slot.id));
          actions.appendChild(save);
        }
        if (!slot.empty) {
          const load = button('读档', 'load', 'mini');
          load.addEventListener('click', () => handlers.onLoad(slot.id));
          actions.appendChild(load);

          if (!isAuto) {
            const del = button('删除', 'delete', 'mini danger');
            del.addEventListener('click', () => { confirming = slot.id; draw(); });
            actions.appendChild(del);
          }
        }
      }

      row.appendChild(actions);
      host.appendChild(row);
    }
  }

  draw();
}
