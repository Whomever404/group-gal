import type {
  CheckpointState, GameState, LabelIndex, FlatNode, FlatScript, SessionProgress,
} from './types';
import { SCHEMA_VERSION } from './effects';

/**
 * 路线图：从剧本推导出一张「按选项分支」的有向图。**纯逻辑、零 DOM、可测**。
 *
 * 节点 = 剧本里的每个 label（关键节点）。为避免与「节点」一词混淆，
 * 本文件里把图上的点叫 RouteMapNode。
 *
 * 分类靠**顺序扫描**：从 label 出发向后走，跳过 bgm / say / sys / note / card / stage /
 * chapter / aff / stat / set 这些「路过」节点，看碰到的第一个控制流节点是什么：
 *   - choice  → 'choice'（每个选项一条边）
 *   - hub     → 'hub'  （每个选项一条边）
 *   - loop    → 'hub'  （首轮的全员候选即分支）
 *   - branch  → 'hub'  （15 条角色线即分支）
 *   - be      → 'be'   （端子）
 *   - ge      → 'end'  （端子）
 *   - goto    → 'scene'（单后继，指向 goto 的目标）
 * 剧本里有环（支线绕回中枢），但本函数只做一遍线性扫描、
 * 不递归，因此天然不会无限展开。
 */

export type RouteMapKind = 'choice' | 'hub' | 'be' | 'end' | 'scene';

export interface RouteMapChoice {
  readonly label: string;
  readonly goto: string;
}

export interface RouteMapNode {
  readonly label: string;
  readonly kind: RouteMapKind;
  /** choice/hub 取 prompt；其余取该处第一句台词，没有则回落 label 名 */
  readonly title: string;
  /** choice/hub 的分支（带选项文字）；其它为空数组 */
  readonly choices: readonly RouteMapChoice[];
  /** 无分支时的后继 label；端子与分支点为 null */
  readonly next: string | null;
}

export interface RouteMap {
  readonly nodes: Record<string, RouteMapNode>;
  readonly entry: string;
}

/** 会打断顺序执行、需要用一条边表达的控制流节点。 */
function isControl(n: FlatNode): boolean {
  return n.kind === 'choice' || n.kind === 'hub' || n.kind === 'loop' || n.kind === 'branch'
    || n.kind === 'be' || n.kind === 'ge' || n.kind === 'goto' || n.kind === 'label';
}

/** 该节点是否携带一段可直接当标题的文本。 */
function textOf(n: FlatNode): string | null {
  return n.kind === 'say' || n.kind === 'sys' || n.kind === 'note' ? n.text : null;
}

/** 从 label 下标向后推导一个 RouteMapNode。 */
function derive(script: FlatScript, label: string, from: number): RouteMapNode {
  let title = '';
  let j = from + 1;

  for (; j < script.length; j++) {
    const n = script[j]!;
    if (!isControl(n)) {
      if (title === '') title = textOf(n) ?? '';
      continue;
    }

    switch (n.kind) {
      case 'choice':
        return {
          label, kind: 'choice', title: n.prompt,
          choices: n.options.map(o => ({ label: o.label, goto: o.goto })),
          next: null,
        };
      case 'hub':
        return {
          label, kind: 'hub', title: n.prompt,
          choices: n.options.map(o => ({ label: o.label, goto: o.goto })),
          next: null,
        };
      case 'loop':
        // 循环中枢的动态选项无法静态穷举，路线图用「首轮的全员候选」代表它
        return {
          label, kind: 'hub', title: n.config.prompt,
          choices: n.config.candidates.map(c => ({ label: c.label, goto: c.entry })),
          next: null,
        };
      case 'branch':
        return {
          label, kind: 'hub', title: n.config.prompt,
          choices: Object.entries(n.config.routes).map(([key, goto]) => ({ label: key, goto })),
          next: null,
        };
      case 'be':
        return { label, kind: 'be', title: title || label, choices: [], next: null };
      case 'ge':
        return { label, kind: 'end', title: title || label, choices: [], next: null };
      case 'goto':
        return { label, kind: 'scene', title: title || label, choices: [], next: n.label };
      case 'label':
        // 相邻 label：视作顺延到下一个 label
        return { label, kind: 'scene', title: title || label, choices: [], next: n.name };
    }
  }

  // 走到剧本末尾都没碰到控制流节点
  return { label, kind: 'scene', title: title || label, choices: [], next: null };
}

/**
 * 从剧本与已建好的 label 索引构建路线图。
 *
 * @param labels 用于判定入口；入口优先取 `start`，否则取剧本里的第一个 label。
 */
export function buildRouteMap(script: FlatScript, labels: LabelIndex): RouteMap {
  const nodes: Record<string, RouteMapNode> = {};
  let first: string | null = null;

  script.forEach((n, i) => {
    if (n.kind !== 'label') return;
    if (first === null) first = n.name;
    nodes[n.name] = derive(script, n.name, i);
  });

  const entry = 'start' in labels ? 'start' : (first ?? '');
  return { nodes, entry };
}

/* ---------- 流程图布局（纯几何，零 DOM） ---------- */

export interface RouteMapLayoutNode {
  readonly label: string;
  readonly kind: RouteMapKind;
  /** 列：主干为 0，支线向右递增 */
  readonly col: number;
  /** 行：同列内自上而下 */
  readonly row: number;
  /**
   * 幽灵节点：已达抉择点上「通向未到达节点」的那条选项支线的落点。
   *
   * 它**不含任何剧本内容**（label 是合成的 `ghost:N`，不是真实 label），
   * 渲染层只画一个「?」空位，表示「这里有条没走过的路」，不透露通向什么，
   * 也不可点击（跳过去会跳过没看过的内容）。这是渐进揭示规则的**唯一例外**。
   */
  readonly ghost?: boolean;
}

export interface RouteMapLayoutEdge {
  readonly from: string;
  readonly to: string;
  /** 回边：指向已经放置过的节点（成环，或支线汇回主干） */
  readonly back: boolean;
}

export interface RouteMapLayout {
  readonly nodes: readonly RouteMapLayoutNode[];
  readonly edges: readonly RouteMapLayoutEdge[];
  readonly cols: number;
  readonly rows: number;
}

/**
 * 把已探索的路线图摊成一张**分列流程图**的坐标。
 *
 * 渐进揭示（不剧透）与「要看见分支」这两条要求天然冲突：只画走过的节点，
 * 走过的路本来就只有一条，永远是一列。这里的折中：
 *
 * - **已达的抉择点**，它的**每个选项都画成一条分支**——选项菜单玩家在游戏里
 *   本来就看过，不算剧透。
 * - 选项通向**已达**节点 → 正常连到那个真实节点。
 * - 选项通向**未达**节点 → 画一条支线 + 一个幽灵「?」空位（见 RouteMapLayoutNode.ghost），
 *   只表示「这里有路没走过」，不含任何内容。
 * - 未到达的**真实**节点一律不放置（`place` 里的 `visited` 守卫）。
 *
 * 其它规则：
 * - 同一节点只放置一次；再次走到它就是一条 `back` 回边（环 / 汇合），且不再占新列。
 * - 一个分支点上，**能走到结局的那一支留在主干列**（靠 reachesEndAvoiding 判定），
 *   其余各支线（含幽灵）各自新开一列并向右排开——所以「主线一列、支线成列」。
 * - 列宽行高交给渲染层；(col,row) 只表达结构，不含像素。
 *
 * 只做一遍 DFS（每个 label 至多放置一次，幽灵是叶子），因此剧本里的环不会无限展开。
 */
export function layoutRouteMap(map: RouteMap, progress: SessionProgress): RouteMapLayout {
  const visited = (l: string): boolean => progress.visited[l] === true;

  /** 后继（去重、保序、丢弃悬空 label）：choice/hub 取全部选项去向，其余取单后继。 */
  const succCache = new Map<string, string[]>();
  const successors = (label: string): string[] => {
    const cached = succCache.get(label);
    if (cached) return cached;
    const n = map.nodes[label];
    const raw = !n ? []
      : n.choices.length > 0 ? n.choices.map(c => c.goto)
        : n.next ? [n.next] : [];
    const seen = new Set<string>();
    const out = raw.filter(l => (seen.has(l) ? false : (seen.add(l), true)))
      .filter(l => map.nodes[l] !== undefined);
    succCache.set(label, out);
    return out;
  };

  /**
   * 该节点的（已探索）子树里，**不经过 blocked** 能否抵达某个 end。
   *
   * hub 的每个支线最后都绕回 hub，若沿「能否抵达结局」逐层回溯，每条支线
   * 都会因为 hub 能到结局而变成 true，主干就选不出来了。把父节点本身挡掉，
   * 才能真正区分「继续往下走的主线」与「绕一圈回来的支线」。
   */
  const reachesEndAvoiding = (start: string, blocked: string): boolean => {
    const seen = new Set<string>();
    const dfs = (label: string): boolean => {
      if (seen.has(label)) return false;
      seen.add(label);
      const n = map.nodes[label];
      if (!n) return false;
      if (n.kind === 'end') return true;
      for (const s of successors(label)) {
        if (s === blocked || !visited(s)) continue;
        if (dfs(s)) return true;
      }
      return false;
    };
    return dfs(start);
  };

  const placed = new Map<string, { col: number; row: number }>();
  const out: RouteMapLayoutNode[] = [];
  const edges: RouteMapLayoutEdge[] = [];
  const cursor: number[] = [];               // 每列的下一个空行
  let maxCol = 0;
  let ghostSeq = 0;

  const takeRow = (col: number, minRow: number): number => {
    const r = Math.max(cursor[col] ?? 0, minRow);
    cursor[col] = r + 1;
    return r;
  };

  /** 开一列新的，返回它的列号。 */
  const newCol = (): number => { maxCol += 1; return maxCol; };

  const place = (label: string, col: number, minRow: number): void => {
    if (placed.has(label) || !visited(label)) return;
    const node = map.nodes[label];
    if (!node) return;

    const row = takeRow(col, minRow);
    placed.set(label, { col, row });
    if (col > maxCol) maxCol = col;
    out.push({ label, kind: node.kind, col, row });

    const kids = successors(label);
    if (kids.length === 0) return;

    /** 主干优先：先排能走到结局的一支，再排其余已达支线，幽灵垫底。 */
    const rank = (k: string): number =>
      visited(k) ? (reachesEndAvoiding(k, label) ? 2 : 1) : 0;
    const ordered = [...kids].sort((a, b) => rank(b) - rank(a));

    const branchy = node.choices.length > 0;   // choice / hub：选项即分支

    for (let i = 0; i < ordered.length; i++) {
      const kid = ordered[i]!;

      if (visited(kid)) {
        const back = placed.has(kid);
        edges.push({ from: label, to: kid, back });
        // 回边不再占新列（否则会留下一条空列，把画面撑宽）
        if (!back) place(kid, i === 0 ? col : newCol(), row + 1);
      } else if (branchy) {
        // 未到达的去向：只画一个「?」幽灵空位，不透露内容、不可点击
        const gcol = newCol();
        const grow = takeRow(gcol, row + 1);
        const glabel = `ghost:${ghostSeq++}`;
        out.push({ label: glabel, kind: node.kind, col: gcol, row: grow, ghost: true });
        edges.push({ from: label, to: glabel, back: false });
      }
    }
  };

  place(map.entry, 0, 0);

  const nodes = [...out].sort((a, b) => (a.row - b.row) || (a.col - b.col));

  // cursor 是稀疏数组（列号可能跳空），逐个取而不是 Math.max(...sparse)（那是 NaN）
  let rows = 0;
  for (let c = 0; c <= maxCol; c++) rows = Math.max(rows, cursor[c] ?? 0);

  return { nodes, edges, cols: maxCol + 1, rows };
}

/** 剥掉 schemaVersion，得到可入库的状态快照。 */
export function toCheckpoint(state: GameState): CheckpointState {
  return {
    aff: state.aff,
    stats: state.stats,
    flags: state.flags,
    water: state.water,
    members: state.members,
    hub: state.hub,
    lastRepeat: state.lastRepeat,
    repeatN: state.repeatN,
    target: state.target,
    turn: state.turn,
    unlocked: state.unlocked,
  };
}

/** 把快照补回当前 schemaVersion，得到可交还给引擎的状态。 */
export function fromCheckpoint(cp: CheckpointState): GameState {
  return { ...cp, schemaVersion: SCHEMA_VERSION };
}

/**
 * 记录一次「抵达某个 label」。**就地修改** progress（与 Session 的可变约定一致）。
 *
 * - 任何 label 都记入 visited；
 * - choice / hub 类的关键节点，**首次**抵达时存一份状态快照与历史长度。
 *   快照刻意取「抵达 label 那一刻」而不是「抵达后面的 choice 节点时」——
 *   因为跳转是把 ip 拨回 label 再重跑，label 与 choice 之间若夹着 say / sys，
 *   按后者存会把那些消息重复播一遍（见 SessionProgress.historyLens）。
 */
export function recordArrival(
  progress: SessionProgress,
  routeMap: RouteMap,
  label: string,
  state: GameState,
  historyLen: number,
): void {
  progress.visited[label] = true;

  const node = routeMap.nodes[label];
  if (!node || (node.kind !== 'choice' && node.kind !== 'hub')) return;
  if (label in progress.checkpoints) return;   // 首次抵达，不覆盖

  progress.checkpoints[label] = toCheckpoint(state);
  progress.historyLens[label] = historyLen;
}
