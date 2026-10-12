import type {
  BadEndData, BeId, CharTable, FlagKey, Label, LabelIndex, Node, Script,
} from './types';

export interface ValidationIssue {
  readonly level: 'error' | 'warn';
  readonly code: string;
  readonly message: string;
  readonly index?: number;
}

/** 由引擎（ending.ts）读取的 flag，不算「设置了但没用」。 */
const ENGINE_READ_FLAGS: readonly FlagKey[] = ['actGood', 'actSkip'];

export function buildLabelIndex(script: Script): LabelIndex {
  const idx: Record<Label, number> = {};
  script.forEach((n, i) => { if (n.kind === 'label') idx[n.name] = i; });
  return idx;
}

/** 收集一个节点里所有的跳转目标。 */
function gotoTargets(n: Node): Label[] {
  switch (n.kind) {
    case 'goto': return [n.label];
    case 'choice': return n.options.map(o => o.goto);
    case 'hub': return n.options.map(o => o.goto);
    default: return [];
  }
}

/**
 * 校验整份剧本。errors 会让构建失败，warnings 仅供提示。
 *
 * 这是消灭「goto 拼错 → 静默通关」那类 bug 的地方：
 * 校验在构建前置步骤跑，剧本写坏则构建失败，而不是等玩家踩到。
 */
export function validateScript(
  script: Script,
  chars: CharTable,
  beData: Readonly<Record<BeId, BadEndData>>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const labels = buildLabelIndex(script);

  // 1. 起始节点必须是 start 标签（runner 从 ip=0 起步）
  if (!('start' in labels)) {
    issues.push({ level: 'error', code: 'start-missing', message: '剧本缺少 start 标签' });
  } else if (labels['start'] !== 0) {
    issues.push({
      level: 'error', code: 'start-not-first',
      message: `start 标签不在第 0 个节点（实际在 #${labels['start']}）`, index: labels['start'],
    });
  }

  // 2. label 唯一
  const seen = new Set<Label>();
  script.forEach((n, i) => {
    if (n.kind !== 'label') return;
    if (seen.has(n.name)) {
      issues.push({ level: 'error', code: 'label-duplicate', message: `label 重复：${n.name}`, index: i });
    }
    seen.add(n.name);
  });

  // 3. 逐节点检查跳转目标 / 角色键 / BE / hub id
  script.forEach((n, i) => {
    for (const target of gotoTargets(n)) {
      if (!(target in labels)) {
        issues.push({ level: 'error', code: 'goto-unknown', message: `goto 目标不存在：${target}`, index: i });
      }
    }

    const whoKeys: string[] = [];
    if (n.kind === 'say') whoKeys.push(n.who);
    if (n.kind === 'card') whoKeys.push(n.who);
    for (const k of whoKeys) {
      if (k !== 'me' && !(k in chars)) {
        issues.push({ level: 'error', code: 'char-unknown', message: `角色键不存在：${k}`, index: i });
      }
    }

    if (n.kind === 'be' && !(n.id in beData)) {
      issues.push({ level: 'error', code: 'be-unknown', message: `Bad End 缺少文本：${n.id}`, index: i });
    }

    if (n.kind === 'hub') {
      const local = new Set<string>();
      for (const o of n.options) {
        if (local.has(o.id)) {
          issues.push({ level: 'error', code: 'hub-id-duplicate', message: `hub 选项 id 重复：${o.id}`, index: i });
        }
        local.add(o.id);
      }
    }
  });

  // 4. 可达性
  const reachable = computeReachable(script, labels);
  script.forEach((n, i) => {
    if (!reachable.has(i)) {
      issues.push({ level: 'warn', code: 'unreachable', message: `节点不可达：${n.kind}`, index: i });
    }
  });

  // 5. flag 使用情况
  const setFlags = new Set<string>();
  for (const n of script) {
    if (n.kind === 'set') setFlags.add(n.flag);
    if (n.kind === 'choice') for (const o of n.options) if (o.set) setFlags.add(o.set);
    if (n.kind === 'hub') for (const o of n.options) if (o.set) setFlags.add(o.set);
  }
  for (const f of setFlags) {
    if (!ENGINE_READ_FLAGS.includes(f as FlagKey)) {
      issues.push({ level: 'warn', code: 'flag-unused', message: `flag 设置了但从未读取：${f}` });
    }
  }

  return issues;
}

/**
 * 顺序扫描 + 跳转闭包，判断每个节点是否可达。
 * 从 start 出发，顺序推进；遇到 goto 则改从目标继续；
 * 遇到 choice/hub 则把所有分支目标入队；遇到 be/ending 则终止。
 */
function computeReachable(script: Script, labels: LabelIndex): Set<number> {
  const reachable = new Set<number>();
  const queue: number[] = [labels['start'] ?? 0];

  while (queue.length > 0) {
    const from = queue.pop()!;
    let i = from;
    while (i < script.length && !reachable.has(i)) {
      reachable.add(i);
      const n = script[i]!;
      if (n.kind === 'goto') {
        const target = labels[n.label];
        if (target !== undefined) queue.push(target);
        break;
      }
      if (n.kind === 'choice' || n.kind === 'hub') {
        for (const t of gotoTargets(n)) {
          const target = labels[t];
          if (target !== undefined) queue.push(target);
        }
        break;
      }
      if (n.kind === 'be' || n.kind === 'ending') break;
      i++;
    }
  }
  return reachable;
}

export function formatIssues(issues: readonly ValidationIssue[]): string {
  return issues
    .map(i => {
      const mark = i.level === 'error' ? '✗' : '⚠';
      const at = i.index !== undefined ? `（节点 #${i.index}）` : '';
      return `${mark} [${i.code}] ${i.message}${at}`;
    })
    .join('\n');
}
