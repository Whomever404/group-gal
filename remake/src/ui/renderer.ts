import type { DelayPolicy, Renderer, StatKey } from '../engine/types';
import type { ChatView } from './chat';
import type { Composer } from './composer';
import type { Overlay } from './overlay';
import type { Toasts } from './toasts';
import { STAT_NAME } from '../engine/effects';
import { BGM, sfx } from '../audio/bgm';
import { CHARS } from '../content/characters';

/**
 * 把 UI 各块组装成引擎所需的 Renderer。
 *
 * 这是引擎与 DOM 之间唯一的接缝：engine/ 里没有一行 DOM 代码，
 * 全部副作用经此转发。测试中换成 FakeRenderer 即可无头跑完整张剧情图。
 *
 * 顶栏数值（成员 / 水群值 / 资质）不在这里维护——它们由 main.ts 在每个节点前
 * 从 session.state 整体同步一次，避免「UI 自己算一份」与引擎数值漂移。
 */
export interface RendererDeps {
  chat: ChatView;
  composer: Composer;
  overlay: Overlay;
  toasts: Toasts;
  /** 直接持有这个可变对象——快进开关改它的 fast 字段即可实时生效 */
  delays: DelayPolicy;
  /** 顶栏章节名的落点；无头测试不传。 */
  topbar?: { setChapter(title: string): void };
}

/** 资质浮层文案：`真诚 +1`. */
function statText(key: StatKey, delta: number): string {
  return `${STAT_NAME[key]} ${delta > 0 ? '+' : ''}${delta}`;
}

export function createRenderer(deps: RendererDeps): Renderer {
  const { chat, composer, overlay, toasts, delays, topbar } = deps;

  return {
    delays,

    setChapter(title) { topbar?.setChapter(title); },

    async say(who, text) { chat.say(who, text); sfx('msg'); },
    async sys(text) { chat.sys(text); },
    async note(text) { chat.note(text); },
    async card(who) { chat.card(who); sfx('card'); },

    stage(who) { chat.stage(who); },

    bgm(track) { BGM.set(track); },

    affToast(items) { toasts.affToast(items, CHARS); },

    statToast(items) {
      // 数值已由引擎结算（顶栏随后整体同步），这里只报变化量
      if (items.length > 0) toasts.toast(items.map(i => statText(i.key, i.delta)).join('　'));
    },

    toast(text) { toasts.toast(text); },

    askChoice(prompt, options) { return composer.askChoice(prompt, options); },
    askHub(prompt, options) { return composer.askHub(prompt, options); },

    async showBE(id) { BGM.set('tension'); overlay.showBE(id); },
    async showEnding(resolution, session) { BGM.set('warm'); overlay.showEnding(resolution, session); },
  };
}