// 样式按块拆分的引入顺序会影响层叠，保持与源文件中的先后一致
import './styles/tokens.css';
import './styles/title.css';
import './styles/chat.css';
import './styles/chrome.css';

import { mountShell } from './ui/shell';
import { createChatView } from './ui/chat';
import { createComposer } from './ui/composer';
import { createOverlay } from './ui/overlay';
import { createToasts } from './ui/toasts';
import { createRenderer } from './ui/renderer';
import { renderMembers } from './ui/drawer';
import { renderBacklog } from './ui/backlog';
import { renderSaves } from './ui/saves';
import { renderGallery } from './ui/gallery';
import { delaysForSpeed, renderSettings } from './ui/settings';
import { renderRouteMap } from './ui/route-map';
import {
  AUTOSAVE_ID, SAVE_SLOTS, deleteSlot, listSlots, readSettings, readSlot,
  writeSettings, writeSlot, type SaveSlotId, type SettingsData,
} from './ui/storage';
import { CHARS, HERO_KEYS, LABELS, SCRIPT } from './content';
import { BEDATA } from './content/endings';
import { sil } from './ui/silhouettes';
import { STAT_KEYS, applyRepeat, createInitialProgress, createInitialState, unlockEnding } from './engine/effects';
import { buildRouteMap, fromCheckpoint, recordArrival } from './engine/route-map';
import { run } from './engine/runner';
import { BGM } from './audio/bgm';
import type { DelayPolicy, FlatNode, LogEntry, Session } from './engine/types';

const root = document.getElementById('app');
if (!root) throw new Error('缺少挂载点 #app');

const shell = mountShell(root);

/**
 * 桌面端会话列表里的「最后一条消息」预览。
 * 直接取聊天流的最后一条（自己的消息也算，QQ 也是这么显示的）；
 * 一条都没有时给个中性占位，不编造文案。
 */
function syncPreview(): void {
  const items = shell.chat.querySelectorAll('.msg .bub, .sys span');
  const last = items[items.length - 1];
  shell.convPrev.textContent = (last?.textContent ?? '').trim() || '还没有消息';
}

const chat = createChatView(shell.chat, shell.stageSil, CHARS, syncPreview);
const composer = createComposer(shell.composer);
const overlay = createOverlay(shell.overlay, shell.ovCard, CHARS);
const toasts = createToasts(shell.toasts);

let settings: SettingsData = readSettings();

/**
 * 可变对象，直接交给 Renderer 持有：runner 每次等待前都读一次 `fast`，
 * 所以快进能即时生效。**文字速度**来自设置（持久化），
 * **快进**是临时开关、每局重置——两者不可混淆。
 */
const delays: DelayPolicy = { ...delaysForSpeed(settings.speed), fast: false };

const renderer = createRenderer({
  chat, composer, overlay, toasts, delays,
  topbar: {
    setChapter: title => { shell.mChapter.textContent = title; },
  },
});

/** 当前局的代号。读档时自增，用来作废仍在跑的那个 run。 */
let runToken = 0;
let running = false;

/** 路线图只依赖静态剧本，构建一次即可。 */
const routeMap = buildRouteMap(SCRIPT, LABELS);

/** 就地替换 session 的内容——**不能重新赋值**，run() 持有的是同一个对象引用。 */
let session: Session = {
  state: createInitialState(), ip: 0, history: [], progress: createInitialProgress(),
};

function updateTop(): void {
  shell.mCount.textContent = String(session.state.members);
  shell.mWater.textContent = String(session.state.water);
  for (const k of STAT_KEYS) {
    shell.stats[k]!.textContent = String(session.state.stats[k] ?? 0);
  }
}

/** 把历史重放进聊天流（读档后恢复现场）。 */
function replayHistory(history: readonly LogEntry[]): void {
  chat.clear();
  for (const e of history) {
    if (e.kind === 'say') chat.say(e.who, e.text);
    else if (e.kind === 'sys') chat.sys(e.text);
    else chat.note(e.text);
  }
}

/** 当前局停在的那个选择节点的下标；不在选择点时是 null。 */
let pendingChoiceIp: number | null = null;

/**
 * 存档快照。
 *
 * ⚠️ 不能直接用 `session.ip`：runner 在调用 `askChoice` **之前**就已经把 ip 推进过了，
 * 所以玩家停在选择点时 `session.ip` 指向的是**选择之后**的节点，直接存会导致
 * 读档跳过那个选择（Review Focus #2）。这里把指针拨回选择本身。
 */
function snapshotSession(): Session {
  return {
    state: session.state,
    ip: pendingChoiceIp ?? session.ip,
    history: session.history,
    progress: session.progress,
  };
}

async function startRun(): Promise<void> {
  const token = ++runToken;
  running = true;
  try {
    await run(session, {
      script: SCRIPT, labels: LABELS, chars: CHARS, beData: BEDATA,
      onNode: (ip, node: FlatNode) => {
        // 抵达任意 label 记进度；choice / hub / loop / branch 还会在首次抵达时存状态快照
        if (node.kind === 'label') {
          recordArrival(session.progress, routeMap, node.name, session.state, session.history.length);
        }
        if (node.kind === 'choice' || node.kind === 'hub'
          || node.kind === 'loop' || node.kind === 'branch') {
          pendingChoiceIp = ip;
          updateTop();
          writeSlot(AUTOSAVE_ID, snapshotSession());
        } else {
          pendingChoiceIp = null;
        }
      },
      shouldStop: () => token !== runToken,
    }, renderer);
  } finally {
    if (token === runToken) running = false;
    // 结局解锁发生在 run 内部，跑完再落一次盘，否则「回到标题 → 回收室」会丢进度
    updateTop();
    writeSlot(AUTOSAVE_ID, snapshotSession());
  }
}

function syncBgmButton(): void {
  shell.btnBgm.textContent = BGM.isOn() ? '🔊' : '🔇';
  shell.btnBgmTitle.textContent = '🔊 音乐：' + (BGM.isOn() ? '开' : '关');
}

function applySettings(next: SettingsData): void {
  settings = next;
  writeSettings(next);
  Object.assign(delays, delaysForSpeed(next.speed)); // 只覆盖计时，不动 fast
  BGM.setOn(next.bgm);
  syncBgmButton();
}

async function startGame(): Promise<void> {
  setMenu(false);
  shell.title.classList.add('hidden');
  shell.game.classList.remove('hidden');

  runToken++;                                   // 作废上一局
  pendingChoiceIp = null;
  session.state = createInitialState();
  session.ip = 0;
  session.history = [];
  session.progress = createInitialProgress();
  chat.clear();
  composer.idle();
  updateTop();
  renderMembers(shell.drList, CHARS, session.state);

  // 快进回到默认关闭：新开一局不继承上一局的加速状态
  delays.fast = false;
  shell.btnFast.textContent = '快进';

  Object.assign(delays, delaysForSpeed(settings.speed));
  BGM.setOn(settings.bgm);
  BGM.set('chat');
  BGM.start('chat');

  await startRun();
}

function backToTitle(): void {
  overlay.close();
  closePanel();
  setMenu(false);
  shell.game.classList.add('hidden');
  shell.title.classList.remove('hidden');
  shell.stageSil.innerHTML = '';
  runToken++;                                   // 作废仍在跑的 run
  running = false;
}

/** 读档：就地替换内容、重放历史、从存档点续跑。 */
function loadSession(loaded: Session): void {
  runToken++;                                   // 先作废当前 run
  pendingChoiceIp = null;

  session.state = loaded.state;
  session.ip = loaded.ip;
  session.history = loaded.history;
  session.progress = loaded.progress;

  replayHistory(loaded.history);
  updateTop();
  renderMembers(shell.drList, CHARS, session.state);
  closePanel();

  shell.title.classList.add('hidden');
  shell.game.classList.remove('hidden');

  BGM.set('chat');
  void startRun();
}

/**
 * 跳到某个已达的关键节点。语义与读档一致——**就地**替换 session 内容：
 * 恢复该节点首次抵达时的状态快照、指针拨回该 label、把历史截断回那一刻、
 * 重放现场、从该 label 重新起跑。
 *
 * ⚠️ `run()` 持有同一个 session 对象引用，只能改字段、不能整个重新赋值。
 */
function jumpTo(label: string): void {
  const node = routeMap.nodes[label];
  const checkpoint = session.progress.checkpoints[label];
  if (!node || !checkpoint) { toasts.toast('这个节点还没走到，跳不了'); return; }

  runToken++;                                   // 作废当前 run
  pendingChoiceIp = null;
  composer.idle();                              // 清掉可能还挂着的旧选项按钮

  session.state = fromCheckpoint(checkpoint);
  session.ip = LABELS[label] ?? 0;
  session.history = session.history.slice(0, session.progress.historyLens[label] ?? 0);

  replayHistory(session.history);
  updateTop();
  renderMembers(shell.drList, CHARS, session.state);
  closePanel();

  shell.title.classList.add('hidden');
  shell.game.classList.remove('hidden');

  BGM.set('chat');
  void startRun();
  toasts.toast(`已跳转到「${node.title}」`);
}

/* ---------- 面板（回想 / 存档 / 设置 / 路线共用） ---------- */

function openPanel(title: string, draw: (body: HTMLElement) => void, wide = false): void {
  shell.panel.classList.toggle('wide', wide);
  shell.panelTitle.textContent = title;
  shell.panelBody.innerHTML = '';
  shell.panel.classList.add('open');
  draw(shell.panelBody);
}

function closePanel(): void {
  shell.panel.classList.remove('open');
}

/* ---------- 顶栏的 ⋯ 群工具菜单 ---------- */

function setMenu(open: boolean): void {
  shell.tbMenu.classList.toggle('hidden', !open);
  shell.btnMenu.setAttribute('aria-expanded', String(open));
}

const menuOpen = (): boolean => !shell.tbMenu.classList.contains('hidden');

function openSavesPanel(): void {
  openPanel('存档', body => renderSaves(body, listSlots(), {
    onSave: id => { writeSlot(id, snapshotSession()); openSavesPanel(); },
    onLoad: id => {
      const loaded = readSlot(id);
      if (loaded) loadSession(loaded);
      else toasts.toast('这个存档读不出来');
    },
    onDelete: id => { deleteSlot(id); openSavesPanel(); },
  }));
}

function openSettingsPanel(): void {
  openPanel('设置', body => renderSettings(body, settings, {
    onChange: next => { applySettings(next); openSettingsPanel(); },
    onClearSaves: () => {
      const all: readonly SaveSlotId[] = [AUTOSAVE_ID, ...SAVE_SLOTS];
      for (const id of all) deleteSlot(id);
      toasts.toast('已清除全部存档');
      openSettingsPanel();
    },
  }));
}

function openRoutePanel(): void {
  openPanel('路线', body =>
    renderRouteMap(body, routeMap, session.progress, { onJump: jumpTo }), true);
}

function openGalleryPanel(): void {
  openPanel('结局回收室', body => renderGallery(body, session.state), true);
}

/* ---------- 接线 ---------- */

overlay.onRestart = () => { void startGame(); };
overlay.onBackToTitle = backToTitle;

shell.btnStart.onclick = () => { BGM.start('chat'); void startGame(); };
shell.btnAbout.onclick = () => overlay.showAbout(() => { void startGame(); });

shell.btnBgmTitle.onclick = () => { applySettings({ ...settings, bgm: BGM.toggle() }); };
shell.btnBgm.onclick = () => { applySettings({ ...settings, bgm: BGM.toggle() }); };

/* ---- ⋯ 菜单：展开 / 收起 ---- */
shell.btnMenu.onclick = () => setMenu(!menuOpen());
shell.tbMenu.addEventListener('click', () => setMenu(false));     // 点了任一项就收起
document.addEventListener('click', e => {
  const t = e.target as HTMLElement | null;
  if (t && (t.closest('#tbMenu') || t.closest('#btnMenu'))) return;
  setMenu(false);                                                  // 点别处收起
});

/* ---- 返回箭头：回到标题页 ---- */
shell.btnBack.onclick = backToTitle;

shell.btnMembers.onclick = () => {
  renderMembers(shell.drList, CHARS, session.state);
  shell.drawer.classList.add('open');
};
shell.btnCloseDr.onclick = () => shell.drawer.classList.remove('open');

shell.btnBacklog.onclick = () => {
  openPanel('回想', body => renderBacklog(body, session.history, CHARS));
};
shell.btnSaves.onclick = openSavesPanel;
shell.btnSettings.onclick = openSettingsPanel;
shell.btnRoute.onclick = openRoutePanel;
shell.btnGallery.onclick = openGalleryPanel;
shell.btnPanelClose.onclick = closePanel;

// 标题页的回收室：直接读自动存档里的收集进度（没有存档就看空进度），
// 面板本身独立于 #game，因此停在标题页也能打开。
shell.btnGalleryTitle.onclick = () => {
  const saved = readSlot(AUTOSAVE_ID);
  openPanel('结局回收室', body => renderGallery(body, saved?.state ?? session.state), true);
};

shell.btnFast.onclick = () => {
  delays.fast = !delays.fast;
  shell.btnFast.textContent = delays.fast ? '快进:开' : '快进';
  toasts.toast(delays.fast ? '已开启快进' : '已关闭快进');
};

/**
 * 复读。逻辑全在 applyRepeat（就地推进 session，可测试），
 * 这里只负责展示与 BE24 分支。
 *
 * ⚠️ 不要写成 `session = result.session`——run() 持有的是同一个对象引用。
 */
shell.btnRepeat.onclick = () => {
  if (!running) { toasts.toast('还没有可以复读的消息'); return; }

  const result = applyRepeat(session);
  if (result.outcome === 'empty' || result.spoken === undefined) {
    toasts.toast('还没有可以复读的消息');
    return;
  }

  chat.say('me', result.spoken);
  updateTop();

  if (result.outcome === 'banned') {
    BGM.set('tension');
    session.state = unlockEnding(session.state, 'b24');
    writeSlot(AUTOSAVE_ID, snapshotSession());
    overlay.showBE('b24');
    return;
  }
  if (result.outcome === 'warn') toasts.toast('再复读一次 要被禁言了');
  else toasts.toast('复读成功  +1 水群值');
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    shell.drawer.classList.remove('open');
    closePanel();
    overlay.close();
    setMenu(false);
  }
});

/* 标题页底部的角色剪影合影（纯装饰，点不到）。 */
shell.tCast.innerHTML = HERO_KEYS
  .map(k => `<span>${sil(k, 340, CHARS)}</span>`)
  .join('');

syncBgmButton();
renderMembers(shell.drList, CHARS, session.state);
