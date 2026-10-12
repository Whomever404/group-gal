import type { RouteMap, RouteMapKind, RouteMapLayoutNode } from '../engine/route-map';
import { layoutRouteMap } from '../engine/route-map';
import type { SessionProgress } from '../engine/types';
import { BEDATA } from '../content/endings';

/**
 * 路线图面板 —— Yuzusoft 系 VN 那种**流程图**，不是缩进列表。
 *
 * 坐标（分列 / 分行）由 engine/route-map.ts 的 layoutRouteMap 纯逻辑算出，
 * 这里只负责换成像素、绝对定位铺上去，再用一层 `<svg>` 覆盖画正交肘形连线。
 *
 * 结构：`.rm-canvas`（铺满面板，外层的 flex）→ `.rm-grid`（这张图的**实际内容尺寸**，
 * 靠 `margin:auto` 居中）→ 绝对定位的节点 + 一层 SVG 连线。所以图比面板窄时整组
 * 居中，比面板宽时退化为贴左上、由面板横向滚动。
 *
 * 为什么不嵌套 DOM：嵌套时子节点的包含块是父节点的内容盒，宽度会沿父子链递减；
 * 剧本是一条最深 11 层的长链，嵌套会让叶子节点被压成 0px。
 * 绝对定位 + 覆盖层画线则完全不受影响。
 *
 * 幽灵「?」是已达抉择点上「通向未到达节点」的选项支线落点，只画占位、不可点击。
 *
 * 所有来自剧本 / 结局数据的文本一律走 textContent，绝不拼 innerHTML。
 */
export interface RouteMapHandlers {
  /** 点击一个已达的关键节点，请求跳转过去 */
  onJump(label: string): void;
}

const KIND_LABEL: Record<RouteMapKind, string> = {
  choice: '抉择',
  hub: '枢纽',
  be: '坏结局',
  end: '结局',
  scene: '场景',
};

/** 布局常量（像素）。列 / 行由 engine 给，这里只做放大。 */
const NODE_W = 164;
const NODE_H = 48;
/** 幽灵「?」空位的尺寸——比真实节点小，一眼看出「这里只是个占位」。 */
const GHOST_W = 40;
const GHOST_H = 40;
const COL_STEP = 200;
const ROW_STEP = 86;
const PAD = 12;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** 坏结局节点的标题用 BEDATA 里的正式名称，比 label（BE01）可读。 */
function titleOf(node: RouteMap['nodes'][string]): string {
  if (node.kind === 'be') {
    const be = BEDATA[node.label as keyof typeof BEDATA];
    if (be) return be.title;
  }
  return node.title;
}

export function renderRouteMap(
  host: HTMLElement,
  map: RouteMap,
  progress: SessionProgress,
  handlers: RouteMapHandlers,
): void {
  host.innerHTML = '';

  const layout = layoutRouteMap(map, progress);
  if (layout.nodes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rm-empty';
    empty.textContent = '还没有走过的路线';
    host.appendChild(empty);
    return;
  }

  const sizeOf = (n: RouteMapLayoutNode): { w: number; h: number } =>
    n.ghost ? { w: GHOST_W, h: GHOST_H } : { w: NODE_W, h: NODE_H };

  /** 仅按 (col,row) 换算的原始位置；幽灵盒子比真实节点小，先居中放进它那一格。 */
  const rawAt = (n: RouteMapLayoutNode): { x: number; y: number } => {
    const s = sizeOf(n);
    return {
      x: n.col * COL_STEP + (NODE_W - s.w) / 2,
      y: n.row * ROW_STEP + (NODE_H - s.h) / 2,
    };
  };

  /**
   * 用**所有节点（含幽灵）的实际包围盒**定 grid 的尺寸，不按列数估。
   *
   * 按列数估会把右侧多出来的整列空白算进去（最后一格若是个小幽灵，右边就空出
   * 一大截），节点组的重心因此偏左。用真实包围盒 + 四周各留 PAD，节点组就在
   * grid 里左右对称——grid 再被面板居中，整组节点自然落在面板正中。
   */
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const n of layout.nodes) {
    const s = sizeOf(n); const p = rawAt(n);
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + s.w > maxX) maxX = p.x + s.w;
    if (p.y + s.h > maxY) maxY = p.y + s.h;
  }
  const offX = PAD - minX;
  const offY = PAD - minY;

  /** 节点左上角：原始位置再整体平移到 grid 左上角（四周各留 PAD）。 */
  const at = (n: RouteMapLayoutNode): { x: number; y: number } => {
    const p = rawAt(n);
    return { x: p.x + offX, y: p.y + offY };
  };

  // 内容的实际尺寸；比面板窄时靠 grid 居中，比面板宽时由面板横向滚动。
  const w = maxX - minX + PAD * 2;
  const h = maxY - minY + PAD * 2;

  const canvas = document.createElement('div');
  canvas.className = 'rm-canvas';

  const grid = document.createElement('div');
  grid.className = 'rm-grid';
  grid.style.width = `${w}px`;
  grid.style.height = `${h}px`;

  const byLabel = new Map(layout.nodes.map(n => [n.label, n]));

  /* ---------- 连线层（先画，垫在节点下面） ---------- */
  // 尺寸与 grid 一致——回边会画到节点右侧之外，靠 overflow:visible 溢出去，
  // 而不是把 SVG 盒子撑大（那会在面板里多出一条无谓的滚动条）。
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'rm-edges');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));

  const bottomMid = (n: RouteMapLayoutNode): { x: number; y: number } => {
    const s = sizeOf(n); const p = at(n);
    return { x: p.x + s.w / 2, y: p.y + s.h };
  };
  const topMid = (n: RouteMapLayoutNode): { x: number; y: number } => {
    const s = sizeOf(n); const p = at(n);
    return { x: p.x + s.w / 2, y: p.y };
  };
  const rightMid = (n: RouteMapLayoutNode): { x: number; y: number } => {
    const s = sizeOf(n); const p = at(n);
    return { x: p.x + s.w, y: p.y + s.h / 2 };
  };

  /** 正向：父底 → 子顶，正交肘形。 */
  const elbow = (a: RouteMapLayoutNode, b: RouteMapLayoutNode): string => {
    const A = bottomMid(a); const B = topMid(b);
    if (Math.abs(A.x - B.x) < 1) return `M${A.x} ${A.y} V${B.y}`;
    const my = A.y + Math.max(14, (B.y - A.y) / 2);
    return `M${A.x} ${A.y} V${my} H${B.x} V${B.y}`;
  };

  /** 回边：从右侧绕出去，再折回目标右侧——避免压在主干上。 */
  const back = (a: RouteMapLayoutNode, b: RouteMapLayoutNode): string => {
    const A = rightMid(a); const B = rightMid(b);
    const rx = Math.max(A.x, B.x) + 18;
    return `M${A.x} ${A.y} H${rx} V${B.y} H${B.x}`;
  };

  for (const e of layout.edges) {
    const a = byLabel.get(e.from);
    const b = byLabel.get(e.to);
    if (!a || !b) continue;

    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', e.back ? back(a, b) : elbow(a, b));
    // ghost 边 = 通向未探索处的支线，用不同的线型/颜色区分（见 chrome.css）
    const cls = ['rm-edge'];
    if (e.back) cls.push('back');
    if (b.ghost) cls.push('ghost');
    p.setAttribute('class', cls.join(' '));
    p.setAttribute('data-from', e.from);
    p.setAttribute('data-to', e.to);
    svg.appendChild(p);
  }
  grid.appendChild(svg);

  /* ---------- 节点层 ---------- */
  for (const n of layout.nodes) {
    const p = at(n);

    // 幽灵「?」空位：不含任何剧本内容，只是一个不可点击的占位。
    if (n.ghost) {
      const el = document.createElement('div');
      el.className = 'rm-node rm-ghost';
      el.setAttribute('data-label', n.label);
      el.setAttribute('data-ghost', 'true');
      el.setAttribute('data-visited', 'false');
      el.setAttribute('aria-label', '没走过的路');
      el.title = '没走过的路';
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.textContent = '?';
      grid.appendChild(el);
      continue;
    }

    const node = map.nodes[n.label]!;
    // 能走到这里说明已到达，因此关键节点都可点击跳转
    const clickable = node.kind === 'choice' || node.kind === 'hub';

    const el = document.createElement(clickable ? 'button' : 'div');
    el.className = 'rm-node';
    el.setAttribute('data-label', n.label);
    el.setAttribute('data-kind', n.kind);
    el.setAttribute('data-visited', 'true');
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;

    if (clickable) {
      (el as HTMLButtonElement).type = 'button';
      el.setAttribute('data-jump', n.label);
      el.addEventListener('click', () => handlers.onJump(n.label));
    }

    const kind = document.createElement('span');
    kind.className = 'rm-kind';
    kind.textContent = KIND_LABEL[node.kind];
    el.appendChild(kind);

    const title = document.createElement('span');
    title.className = 'rm-title';
    title.textContent = titleOf(node);
    el.appendChild(title);

    grid.appendChild(el);
  }

  canvas.appendChild(grid);
  host.appendChild(canvas);
}
