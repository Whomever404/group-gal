import type { DelayPolicy } from '../engine/types';
import { DEFAULT_SETTINGS, type SettingsData, type TextSpeed } from './storage';

/**
 * 设置面板 —— VN 的配置画面观感：分组的横排标签 + 选项行。
 *
 * 与重做前一致的行为：内联二次确认，不用 `confirm()`（该 API 在嵌框环境下不可用）；
 * 设置与**快进**是两回事——文字速度是持久化偏好，快进是临时开关、每局重置。
 */
export interface SettingsHandlers {
  onChange(next: SettingsData): void;
  onClearSaves(): void;
}

/** 速度 → 计时。normal 必须与阶段 1 的现状默认值逐项一致，不改动既有节奏。 */
const SPEED_DELAYS: Record<TextSpeed, Pick<DelayPolicy, 'me' | 'msg' | 'sys' | 'note' | 'card'>> = {
  slow:   { me: 420, msg: 780, sys: 840, note: 1020, card: 1140 },
  normal: { me: 280, msg: 520, sys: 560, note: 680,  card: 760 },
  fast:   { me: 140, msg: 260, sys: 280, note: 340,  card: 380 },
};

export function delaysForSpeed(
  speed: TextSpeed,
): Pick<DelayPolicy, 'me' | 'msg' | 'sys' | 'note' | 'card'> {
  return SPEED_DELAYS[speed];
}

const SPEED_LABEL: Record<TextSpeed, string> = { slow: '慢', normal: '普通', fast: '快' };
const SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'fast'];

/** 分组：横排标签 + 一条延伸的细线，VN 配置画面的分组惯例。 */
function group(title: string): { box: HTMLElement; body: HTMLElement } {
  const box = document.createElement('section');
  box.className = 'set-group';

  const head = document.createElement('div');
  head.className = 'set-group-h';
  head.textContent = title;
  const rule = document.createElement('span');
  head.appendChild(rule);
  box.appendChild(head);

  return { box, body: box };
}

export function renderSettings(
  host: HTMLElement,
  current: SettingsData,
  handlers: SettingsHandlers,
): void {
  let confirmingClear = false;

  function draw(): void {
    host.innerHTML = '';

    /* ---- 音频 ---- */
    const audio = group('音频');
    {
      const row = document.createElement('label');
      row.className = 'set-row';

      const label = document.createElement('span');
      label.className = 'set-lbl';
      label.textContent = '背景音乐';
      row.appendChild(label);

      const bgm = document.createElement('input');
      bgm.type = 'checkbox';
      bgm.checked = current.bgm;
      bgm.dataset['setting'] = 'bgm';
      bgm.addEventListener('change', () => {
        current = { ...current, bgm: bgm.checked };
        handlers.onChange(current);
      });
      row.appendChild(bgm);

      audio.body.appendChild(row);
    }
    host.appendChild(audio.box);

    /* ---- 文字 ---- */
    const text = group('文字');
    {
      const row = document.createElement('div');
      row.className = 'set-row';

      const label = document.createElement('span');
      label.className = 'set-lbl';
      label.textContent = '文字速度';
      row.appendChild(label);

      const speeds = document.createElement('div');
      speeds.className = 'set-speeds';
      for (const s of SPEEDS) {
        const b = document.createElement('button');
        b.className = 'mini';
        b.textContent = SPEED_LABEL[s];
        b.dataset['speed'] = s;
        b.setAttribute('aria-pressed', String(current.speed === s));
        b.addEventListener('click', () => {
          current = { ...current, speed: s };
          handlers.onChange(current);
          draw();
        });
        speeds.appendChild(b);
      }
      row.appendChild(speeds);
      text.body.appendChild(row);

      const hint = document.createElement('p');
      hint.className = 'set-hint';
      hint.textContent = '「快进」是临时开关，每局重新开始时自动关闭，与这里的设置无关。';
      text.body.appendChild(hint);
    }
    host.appendChild(text.box);

    /* ---- 数据 ---- */
    const data = group('数据');
    {
      const row = document.createElement('div');
      row.className = 'set-row';

      if (confirmingClear) {
        const q = document.createElement('span');
        q.className = 'set-lbl';
        q.textContent = '确认清除全部存档？此操作不可撤销。';
        row.appendChild(q);

        const yes = document.createElement('button');
        yes.className = 'mini danger';
        yes.textContent = '确认清除';
        yes.dataset['action'] = 'clear-confirm';
        yes.addEventListener('click', () => {
          confirmingClear = false;
          handlers.onClearSaves();
          draw();
        });
        row.appendChild(yes);

        const no = document.createElement('button');
        no.className = 'mini';
        no.textContent = '取消';
        no.dataset['action'] = 'clear-cancel';
        no.addEventListener('click', () => { confirmingClear = false; draw(); });
        row.appendChild(no);
      } else {
        const label = document.createElement('span');
        label.className = 'set-lbl';
        label.textContent = '存档记录';
        row.appendChild(label);

        const btn = document.createElement('button');
        btn.className = 'mini danger';
        btn.textContent = '清除全部存档';
        btn.dataset['action'] = 'clear';
        btn.addEventListener('click', () => { confirmingClear = true; draw(); });
        row.appendChild(btn);
      }

      data.body.appendChild(row);
    }
    host.appendChild(data.box);
  }

  draw();
}

export { DEFAULT_SETTINGS };
