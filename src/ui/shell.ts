/**
 * UI 外壳：一次性建出全部静态 DOM。
 *
 * 两套视觉语汇在结构上就此分开：
 * - `#game` 内的顶栏 / 消息流 / 输入区 —— 手机 QQ 群聊客户端的语汇
 * - `#title` / `#overlay` / `#panel` —— galgame 的语汇
 *
 * 这里的 innerHTML 是静态字面量，不含任何外部数据；
 * 来自剧本或角色的文本一律经 chat.ts 的 esc() 转义后再拼入。
 * 菜单项图标走 `data-ic` + CSS `::before`，以免污染按钮的 textContent
 * （`btnBgm` / `btnFast` 的文字由 JS 动态改写）。
 */
export interface Shell {
  readonly title: HTMLElement;
  readonly game: HTMLElement;
  readonly chat: HTMLElement;
  readonly composer: HTMLElement;
  readonly drawer: HTMLElement;
  readonly drList: HTMLElement;
  readonly overlay: HTMLElement;
  readonly ovCard: HTMLElement;
  readonly toasts: HTMLElement;
  readonly stageSil: HTMLElement;
  readonly panel: HTMLElement;
  readonly panelTitle: HTMLElement;
  readonly panelBody: HTMLElement;
  readonly tbMenu: HTMLElement;
  readonly tCast: HTMLElement;
  readonly convPrev: HTMLElement;
  readonly mCount: HTMLElement;
  readonly mWater: HTMLElement;
  readonly mChapter: HTMLElement;
  readonly stats: Record<string, HTMLElement>;
  readonly btnStart: HTMLButtonElement;
  readonly btnGalleryTitle: HTMLButtonElement;
  readonly btnGallery: HTMLButtonElement;
  readonly btnAbout: HTMLButtonElement;
  readonly btnBgmTitle: HTMLButtonElement;
  readonly btnBack: HTMLButtonElement;
  readonly btnMenu: HTMLButtonElement;
  readonly btnMembers: HTMLButtonElement;
  readonly btnCloseDr: HTMLButtonElement;
  readonly btnBacklog: HTMLButtonElement;
  readonly btnSaves: HTMLButtonElement;
  readonly btnSettings: HTMLButtonElement;
  readonly btnRoute: HTMLButtonElement;
  readonly btnPanelClose: HTMLButtonElement;
  readonly btnRepeat: HTMLButtonElement;
  readonly btnFast: HTMLButtonElement;
  readonly btnBgm: HTMLButtonElement;
}

const SHELL_HTML = `
  <div id="title" class="screen">
    <div class="t-logo">
      <div class="t-kicker">GALGAME DEMO · 恋爱模拟 ADV</div>
      <h1><span class="t-emoji">😂</span>群聊</h1>
      <div class="t-sub">全 群 攻 陷 计 划</div>
      <p class="t-tag">—— 第 81 位群友的攻略日志 ——</p>
    </div>
    <nav class="t-btns">
      <button id="btnStart" class="btn primary">开始游戏</button>
      <button id="btnGalleryTitle" class="btn">🕳 结局回收室</button>
      <button id="btnBgmTitle" class="btn">🔊 音乐：开</button>
      <button id="btnAbout" class="btn">关于 / 素材</button>
    </nav>
    <div class="t-cast" id="tCast" aria-hidden="true"></div>
    <div class="t-foot">单文件可玩 · 无需联网 · 内置合成 BGM</div>
  </div>

  <div id="game" class="screen hidden">
    <div class="qq-shell">
      <nav class="qq-rail" aria-hidden="true">
        <span class="qq-me">🙂</span>
        <span class="qq-nav">💬</span>
        <span class="qq-nav">👥</span>
        <span class="qq-nav is-on">👪</span>
        <span class="qq-nav">⭐</span>
      </nav>
      <aside class="qq-convs" aria-label="会话列表">
        <div class="conv is-on">
          <span class="conv-av">😂</span>
          <span class="conv-mid">
            <span class="conv-name">😂群聊</span>
            <span class="conv-prev" id="convPrev">正在加载群聊……</span>
          </span>
          <span class="conv-time">今天</span>
        </div>
      </aside>
      <section class="qq-main">
        <header class="topbar">
          <button id="btnBack" class="tb-back" aria-label="返回">‹</button>
          <div class="tb-title">
            <div class="tb-name" id="mChapter">😂群聊</div>
            <div class="tb-meta">成员 <b id="mCount">81</b> · 水群值 <b id="mWater">0</b></div>
          </div>
          <div class="tb-stats" aria-label="资质">
            <span class="st"><i>真诚</i><b id="st-z">0</b></span>
            <span class="st"><i>嘴臭</i><b id="st-r">0</b></span>
            <span class="st"><i>卖弱</i><b id="st-m">0</b></span>
            <span class="st"><i>空気</i><b id="st-q">0</b></span>
            <span class="st"><i>水群</i><b id="st-w">0</b></span>
          </div>
          <button id="btnMenu" class="tb-more" aria-label="群工具" aria-haspopup="menu" aria-expanded="false" aria-controls="tbMenu">⋯</button>
        </header>
        <nav id="tbMenu" class="tb-menu hidden" role="menu" aria-label="群工具">
          <button id="btnMembers" class="mini mi" role="menuitem" data-ic="👥">群成员</button>
          <button id="btnBacklog" class="mini mi" role="menuitem" data-ic="📜">回想</button>
          <button id="btnSaves" class="mini mi" role="menuitem" data-ic="💾">存档</button>
          <button id="btnSettings" class="mini mi" role="menuitem" data-ic="⚙">设置</button>
          <button id="btnRoute" class="mini mi" role="menuitem" data-ic="🗺">路线</button>
          <button id="btnGallery" class="mini mi" role="menuitem" data-ic="🕳">结局回收室</button>
          <button id="btnRepeat" class="mini mi" role="menuitem" data-ic="🔁">复读</button>
          <button id="btnFast" class="mini mi" role="menuitem" data-ic="⏩">快进</button>
          <button id="btnBgm" class="mini mi" role="menuitem">🔊</button>
        </nav>
        <div id="chat" class="chat" role="log" aria-live="polite" aria-label="群聊消息"></div>
        <div id="composer" class="composer"><div class="c-idle">正在加载群聊……</div></div>
      </section>
    </div>
  </div>

  <div id="stageSil"></div>
  <div id="toasts"></div>

  <div id="drawer" class="drawer">
    <div class="dr-h"><b>群成员</b><button class="mini" id="btnCloseDr">关闭</button></div>
    <div class="dr-list" id="drList"></div>
  </div>

  <div id="panel" class="drawer vn-panel">
    <div class="vn-win" role="dialog" aria-modal="true" aria-labelledby="panelTitle">
      <div class="dr-h vn-h"><b id="panelTitle">面板</b><button class="mini" id="btnPanelClose">关闭</button></div>
      <div class="dr-list" id="panelBody"></div>
    </div>
  </div>

  <div id="overlay" class="overlay hidden"><div class="ov" id="ovCard"></div></div>
`;

export function mountShell(root: HTMLElement): Shell {
  root.innerHTML = SHELL_HTML;

  const need = <T extends HTMLElement>(id: string): T => {
    const el = root.querySelector<T>(`#${id}`);
    if (!el) throw new Error(`外壳缺少元素 #${id}`);
    return el;
  };

  return {
    title: need('title'), game: need('game'), chat: need('chat'), composer: need('composer'),
    drawer: need('drawer'), drList: need('drList'), overlay: need('overlay'),
    ovCard: need('ovCard'), toasts: need('toasts'), stageSil: need('stageSil'),
    panel: need('panel'), panelTitle: need('panelTitle'), panelBody: need('panelBody'),
    tbMenu: need('tbMenu'), tCast: need('tCast'), convPrev: need('convPrev'),
    mCount: need('mCount'), mWater: need('mWater'), mChapter: need('mChapter'),
    stats: {
      z: need('st-z'), r: need('st-r'), m: need('st-m'), q: need('st-q'), w: need('st-w'),
    },
    btnStart: need<HTMLButtonElement>('btnStart'),
    btnGalleryTitle: need<HTMLButtonElement>('btnGalleryTitle'),
    btnGallery: need<HTMLButtonElement>('btnGallery'),
    btnAbout: need<HTMLButtonElement>('btnAbout'),
    btnBgmTitle: need<HTMLButtonElement>('btnBgmTitle'),
    btnBack: need<HTMLButtonElement>('btnBack'),
    btnMenu: need<HTMLButtonElement>('btnMenu'),
    btnMembers: need<HTMLButtonElement>('btnMembers'),
    btnCloseDr: need<HTMLButtonElement>('btnCloseDr'),
    btnBacklog: need<HTMLButtonElement>('btnBacklog'),
    btnSaves: need<HTMLButtonElement>('btnSaves'),
    btnSettings: need<HTMLButtonElement>('btnSettings'),
    btnRoute: need<HTMLButtonElement>('btnRoute'),
    btnPanelClose: need<HTMLButtonElement>('btnPanelClose'),
    btnRepeat: need<HTMLButtonElement>('btnRepeat'),
    btnFast: need<HTMLButtonElement>('btnFast'),
    btnBgm: need<HTMLButtonElement>('btnBgm'),
  };
}
