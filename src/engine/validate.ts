/* 剧本静态校验：跳转/引用完整性 + 全节点可达性。
   与 tools/validate.js 同源，但直接读取类型化内容模块，无需正则抽取。 */
import type { CharKey, StatKey } from './types';
import { NODES } from '../content/script';
import { CH } from '../content/characters';
import { ENDINGS } from '../content/endings';
import { GE_SLOTS } from '../content/endings';
import { PRIORITY, ROUTE_START } from '../content/route';

export interface ValidationReport {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly stats: {
    readonly chars: number;
    readonly nodes: number;
    readonly endings: number;
    readonly geSlots: number;
    readonly reachable: number;
    readonly routes: number;
  };
}

const STAT_KEYS = 'zrmqw';

export function validateScript(): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isTerminal = (to: string) => to.startsWith('__end_') || to.startsWith('__ge_');

  function checkTarget(from: string, to: string | undefined): void {
    if (to == null) return;
    if (to.startsWith('__end_')) {
      if (!ENDINGS[to.slice(6)]) errors.push(`${from} -> ${to}：ENDINGS 缺少「${to.slice(6)}」`);
      return;
    }
    if (to.startsWith('__ge_')) {
      if (!NODES['ge_' + to.slice(5)]) errors.push(`${from} -> ${to}：缺少节点 ge_${to.slice(5)}`);
      return;
    }
    if (!NODES[to]) errors.push(`${from} -> ${to}：节点不存在`);
  }

  function checkFx(from: string, fx: { a?: Record<string, number>; s?: Record<string, number> } | null | undefined): void {
    if (!fx) return;
    for (const k in fx.a || {}) if (!CH[k]) errors.push(`${from}：fx.a 未知角色「${k}」`);
    for (const k in fx.s || {}) if (!STAT_KEYS.includes(k)) errors.push(`${from}：fx.s 未知资质「${k}」`);
  }

  for (const [id, n] of Object.entries(NODES)) {
    checkTarget(id, n.next);
    (n.o || []).forEach((o, i) => {
      checkTarget(`${id}.o${i}`, o[1]);
      checkFx(`${id}.o${i}`, o[2]);
    });
    checkFx(id, n.fx);
    if (n.c && n.c !== null && !CH[n.c]) errors.push(`${id}：立绘角色「${n.c}」不存在`);
    const lines: readonly (readonly [string | null, string])[] = n.b || n.l || [];
    lines.forEach(([k], i) => {
      if (k && k !== '#' && !CH[k]) errors.push(`${id} 行${i}：说话人「${k}」不存在`);
    });
  }

  GE_SLOTS.forEach(k => {
    if (!NODES['ge_' + k]) errors.push(`GE_SLOTS：缺少节点 ge_${k}`);
    if (!ROUTE_START[k]) errors.push(`GE_SLOTS：ROUTE_START 缺少「${k}」`);
  });
  PRIORITY.forEach(k => { if (!CH[k]) errors.push(`PRIORITY：CH 缺少「${k}」`); });
  Object.entries(ROUTE_START).forEach(([k, id]) => { if (!NODES[id]) errors.push(`ROUTE_START「${k}」-> ${id} 不存在`); });

  /* ---------- 可达性：自 start 出发的图遍历 ---------- */
  const reach = new Set<string>();
  const queue: string[] = ['start'];
  while (queue.length) {
    const id = queue.shift()!;
    if (reach.has(id)) continue;
    const n = NODES[id];
    if (!n) continue;
    reach.add(id);
    const push = (to: string | undefined) => { if (to && !isTerminal(to) && !reach.has(to)) queue.push(to); };
    push(n.next);
    (n.o || []).forEach(o => push(o[1]));
    // 分岔之夜在运行时落到某条角色线入口
    if (n.j === 'branch') PRIORITY.forEach(k => push(ROUTE_START[k]));
  }

  const unreachable = Object.keys(NODES).filter(id => !reach.has(id));
  if (unreachable.length) warnings.push(`不可达节点（${unreachable.length}）：${unreachable.join(', ')}`);

  const routes = PRIORITY.filter(k => reach.has(ROUTE_START[k]) && reach.has('ge_' + k)).length;
  if (routes !== PRIORITY.length) {
    const miss = PRIORITY.filter(k => !(reach.has(ROUTE_START[k]) && reach.has('ge_' + k)));
    errors.push(`角色线可达性不足：${routes}/${PRIORITY.length}，缺失 ${miss.join(', ')}`);
  }

  return {
    errors,
    warnings,
    stats: {
      chars: Object.keys(CH).length,
      nodes: Object.keys(NODES).length,
      endings: Object.keys(ENDINGS).length,
      geSlots: GE_SLOTS.length,
      reachable: reach.size,
      routes,
    },
  };
}

/** 供 UI 复用的类型守卫（避免 as 断言散落）。 */
export function isStatKey(k: string): k is StatKey { return STAT_KEYS.includes(k); }
export function isCharKey(k: string): k is CharKey { return !!CH[k]; }