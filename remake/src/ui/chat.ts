import type { CharKey, CharTable, Speaker } from '../engine/types';
import { sil } from './silhouettes';

/**
 * 聊天流渲染 —— 模仿手机 QQ 群聊客户端的观感。
 *
 * 与视觉重做前保持一致的**行为**：
 * - 他人消息：头像 + 角色名 + 群头衔 + 气泡；玩家消息：右侧气泡，无头像
 * - 系统消息：居中小字；旁白：居中灰字
 * - 卡片：左立绘 + 右侧群名片，并同步更新右下角舞台立绘
 *
 * 新增的呈现（不改任何数据）：
 * - 同一个人连续发言时，后续消息不重复头像与昵称（QQ 行为）
 * - 正文里的 `@提及` 蓝色高亮
 * - 会话开头一条居中的「今天」时间分割
 *
 * 转义策略：所有来自剧本/角色的文本一律先经 esc()，正文再用 linkify()
 * 把 @提及 包成 span；linkify 只在**已转义**的文本上做替换，因此不引入注入面。
 */
export interface ChatView {
  say(who: Speaker, text: string): void;
  sys(text: string): void;
  note(text: string): void;
  card(who: CharKey): void;
  /** 常驻舞台立绘（avg 场景用）；传 null 收起。不产生任何消息。 */
  stage(who: CharKey | null): void;
  clear(): void;
}

export function createChatView(
  chat: HTMLElement,
  stageSil: HTMLElement,
  chars: CharTable,
  /** 每次聊天流变化后回调——桌面端的会话列表预览靠它同步。 */
  onChange?: () => void,
): ChatView {
  const scroll = (): void => { chat.scrollTop = chat.scrollHeight; };

  const setStage = (key: CharKey | null): void => {
    stageSil.innerHTML = key ? sil(key, 520, chars) : '';
  };

  /** 上一条的发言者；用于合并同一个人连续发言的头像与昵称。 */
  let last: Speaker | null = null;
  /** 是否需要补一条时间分割（清空后、或首次发言前）。 */
  let needDay = true;

  const dayDivider = (): void => {
    const d = document.createElement('div');
    d.className = 'msg-day';
    d.textContent = '今天';
    chat.appendChild(d);
  };

  /** 一次发言前按需补时间分割。 */
  const before = (who: Speaker | null): void => {
    if (needDay) { dayDivider(); needDay = false; }
    if (who === null) last = null;
  };

  return {
    say(who, text) {
      const me = who === 'me';
      const c = me ? null : chars[who as CharKey];
      const cont = last === who;

      before(who);

      const wrap = document.createElement('div');
      wrap.className = 'msg' + (me ? ' me' : '') + (cont ? ' cont' : '');

      if (me || !c || cont) {
        wrap.innerHTML = '<div class="body"><div class="bub"></div></div>';
      } else {
        wrap.innerHTML =
          `<div class="av" style="background:${hex2rgba(c.color, 0.14)};border-color:${hex2rgba(c.color, 0.4)}">${esc(c.emoji)}</div>
           <div class="body"><div class="nm">${esc(c.name)}<span class="role">${esc(c.role)}</span></div><div class="bub"></div></div>`;
      }

      wrap.querySelector('.bub')!.innerHTML = linkify(text);
      chat.appendChild(wrap);
      last = who;
      scroll();
      onChange?.();
    },

    sys(text) {
      before(null);
      const d = document.createElement('div');
      d.className = 'sys';
      d.innerHTML = `<span>${esc(text)}</span>`;
      chat.appendChild(d);
      scroll();
      onChange?.();
    },

    note(text) {
      before(null);
      const d = document.createElement('div');
      d.className = 'note';
      d.textContent = text;
      chat.appendChild(d);
      scroll();
      onChange?.();
    },

    card(who) {
      before(null);
      const c = chars[who];
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = `<div class="sil">${sil(who, 76, chars)}</div>
        <div class="cinfo"><h4>${esc(c.name)}<span>${esc(c.sub)}</span></h4>
        <div class="r">${esc(c.role)}</div><p>${esc(c.desc)}</p></div>`;
      chat.appendChild(d);
      scroll();
      setStage(who);
      onChange?.();
    },

    stage(who) {
      setStage(who);
      // avg 场景用 .stage-on 让立绘更醒目（CSS 只改透明度与位移，不动布局）
      stageSil.classList.toggle('stage-on', who !== null);
    },

    clear() {
      chat.innerHTML = '';
      setStage(null);
      last = null;
      needDay = true;
      onChange?.();
    },
  };
}

/** 转义 HTML 文本与双引号属性上下文。 */
export function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string
  ));
}

/**
 * 正文里的 @提及 蓝色高亮。**必须先 esc() 再调用**——
 * 替换出来的 `<span>` 是本模块自己的标记，与用户/剧本文本无关。
 */
export function linkify(text: string): string {
  return esc(text).replace(/@[^\s@，。！？、,.!?；：&]+/g, m => `<span class="mn">${m}</span>`);
}

/** #rrggbb 或 #rgb → rgba(r,g,b,a)。 */
export function hex2rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
