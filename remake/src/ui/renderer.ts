import type { DelayPolicy, Renderer } from '../engine/types';
import type { ChatView } from './chat';
import type { Composer } from './composer';
import type { Overlay } from './overlay';
import type { Toasts } from './toasts';
import { BGM, sfx } from '../audio/bgm';
import { CHARS } from '../content/characters';

/**
 * 把 UI 各块组装成引擎所需的 Renderer。
 *
 * 这是引擎与 DOM 之间唯一的接缝：engine/ 里没有一行 DOM 代码，
 * 全部副作用经此转发。测试中换成 FakeRenderer 即可无头跑完整张剧情图。
 */
export interface RendererDeps {
  chat: ChatView;
  composer: Composer;
  overlay: Overlay;
  toasts: Toasts;
  /** 直接持有这个可变对象——快进开关改它的 fast 字段即可实时生效 */
  delays: DelayPolicy;
}

export function createRenderer(deps: RendererDeps): Renderer {
  const { chat, composer, overlay, toasts, delays } = deps;

  return {
    delays,

    async say(who, text) { chat.say(who, text); sfx('msg'); },
    async sys(text) { chat.sys(text); },
    async note(text) { chat.note(text); },
    async card(who) { chat.card(who); sfx('card'); },

    bgm(track) { BGM.set(track); },

    affToast(items) { toasts.affToast(items, CHARS); },

    toast(text) { toasts.toast(text); },

    askChoice(prompt, options) { return composer.askChoice(prompt, options); },
    askHub(prompt, options) { return composer.askHub(prompt, options); },

    async showBE(id) { BGM.set('tension'); overlay.showBE(id); },
    async showEnding(resolution, session) { BGM.set('warm'); overlay.showEnding(resolution, session); },
  };
}
