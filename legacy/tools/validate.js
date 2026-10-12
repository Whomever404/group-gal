/* 剧本校验：跳转/引用完整性 + 主线与支线自动发现 + 全路线可达性（集束搜索）
   用法：node legacy/tools/validate.js [目标HTML，默认 ../versions/group-chat-galgame-v2.html]
   兼容 v2（hub 支线结构）与 v1（线性选择结构）*/
const fs = require("fs");
const path = require("path");
const target = process.argv[2] || path.join(__dirname, "..", "versions", "group-chat-galgame-v2.html");
const src = fs.readFileSync(target, "utf8");
function grab(startMark, endMark, ret) {
  const a = src.indexOf(startMark);
  if (a < 0) throw new Error("marker not found: " + startMark);
  const b = src.indexOf(endMark, a);
  if (b < 0) throw new Error("end marker not found: " + endMark);
  return new Function(src.slice(a, b) + endMark + "; return (" + ret + ");")();
}
const CH = grab("const CH = {", "\n};", "CH");
const NODES = grab("const NODES = {", "\n};", "NODES");
const ENDINGS = grab("const ENDINGS = {", "\n};", "ENDINGS");
const GE_SLOTS = grab("const GE_SLOTS = [", "];", "GE_SLOTS");
const PRIORITY = grab("const PRIORITY=[", "];", "PRIORITY");
const ROUTE_START = grab("const ROUTE_START={", "};", "ROUTE_START");
console.log("CH:", Object.keys(CH).length, " NODES:", Object.keys(NODES).length,
  " ENDINGS:", Object.keys(ENDINGS).length, " GE_SLOTS:", GE_SLOTS.length);

const errors = [];
function checkTarget(from, to) {
  if (to == null) return;
  if (to.startsWith("__end_")) { if (!ENDINGS[to.slice(6)]) errors.push(`${from} -> ${to}: ENDINGS 缺少 ${to.slice(6)}`); return; }
  if (to.startsWith("__ge_")) { if (!NODES["ge_" + to.slice(5)]) errors.push(`${from} -> ${to}: 缺少节点`); return; }
  if (!NODES[to]) errors.push(`${from} -> ${to}: 节点不存在`);
}
for (const [id, n] of Object.entries(NODES)) {
  checkTarget(id, n.next);
  (n.o || []).forEach((o, i) => {
    checkTarget(id + ".o" + i, o[1]);
    const fx = o[2];
    if (fx) {
      for (const k in (fx.a || {})) if (!CH[k]) errors.push(`${id}.o${i}: fx.a 未知角色 ${k}`);
      for (const k in (fx.s || {})) if (!"zrmqw".includes(k)) errors.push(`${id}.o${i}: 未知资质 ${k}`);
    }
  });
  if (n.fx) for (const k in (n.fx.a || {})) if (!CH[k]) errors.push(`${id}: fx.a 未知角色 ${k}`);
  if (n.c && n.c !== null && !CH[n.c]) errors.push(`${id}: 立绘角色 ${n.c} 不存在`);
  (n.b || n.l || []).forEach(([k], i) => { if (k && k !== "#" && !CH[k]) errors.push(`${id} 行${i}: 说话人 ${k} 不存在`); });
}
GE_SLOTS.forEach(k => {
  if (!NODES["ge_" + k]) errors.push(`GE_SLOTS: 缺少 ge_${k}`);
  if (!ROUTE_START[k]) errors.push(`GE_SLOTS: ROUTE_START 缺少 ${k}`);
});
PRIORITY.forEach(k => { if (!CH[k]) errors.push(`PRIORITY: CH 缺少 ${k}`); });
Object.entries(ROUTE_START).forEach(([k, id]) => { if (!NODES[id]) errors.push(`ROUTE_START ${k} -> ${id} 不存在`); });

/* ---------- 自动发现：主线选择点 + hub 支线组 ---------- */
const keys = Object.keys(CH).filter(k => k !== "you");
const groups = [];        // 每组：{name, options:[{text,target,fx}]}
let branchId = null;
function deltaOf(fx) { const d = {}; if (fx && fx.a) for (const k in fx.a) d[k] = (d[k] || 0) + fx.a[k]; return d; }
function qOf(fx) { return (fx && fx.s && fx.s.q) || 0; }
function walk(id, seen) {
  let guard = 0;
  while (id && NODES[id] && guard++ < 400) {
    if (seen.has(id)) return null;
    seen.add(id);
    const n = NODES[id];
    if (n.j === "branch") { branchId = id; return null; }
    if (n.hub) {
      const mainOpts = (n.o || []).filter(o => !o[3]);
      (n.o || []).filter(o => o[3]).forEach(o => {
        const sub = [];
        walkSub(o[1], sub);
        groups.push({ name: "hub:" + o[3], options: [{ text: "（跳过）", target: null, fx: null }].concat(sub) });
      });
      const next = mainOpts[0];
      if (!next) return null;
      groups.push({ name: "hub:推进", options: [next] });
      id = next[1]; continue;
    }
    if (n.o) {
      const opts = n.o.filter(o => !String(o[1]).startsWith("__end_"));
      groups.push({ name: id, options: opts });
      id = opts[0] && opts[0][1];
      continue;
    }
    id = n.next;
  }
  return null;
}
function walkSub(id, collect) {
  let guard = 0; const seen = new Set();
  while (id && NODES[id] && guard++ < 400) {
    if (id === "hub" || seen.has(id)) return;
    seen.add(id);
    const n = NODES[id];
    if (n.o) {
      const opts = n.o.filter(o => !String(o[1]).startsWith("__end_"));
      if (opts.length) collect.push(...opts);
      id = opts[0] && opts[0][1]; continue;
    }
    if (n.j === "branch") { branchId = branchId || id; return; }
    id = n.next;
  }
}
walk("start", new Set());
console.log("分支节点:", branchId, " 选择组:", groups.length);
groups.forEach(g => console.log("  ·", g.name, "→", g.options.length, "个选项"));

/* ---------- 集束搜索：验证每个角色都能成为羁绊最高者 ---------- */
const K = 20000;
const canWin = new Set();
const winners = {};
function maxOtherOf(st, X) {
  let m = -999;
  PRIORITY.forEach(k => { if (k !== X) m = Math.max(m, st.d[k] || 0); });
  return m;
}
function winnerOf(st) {
  let bestK = null, bv = -1e9;
  PRIORITY.forEach(k => { const v = st.d[k] || 0; if (v > bv) { bv = v; bestK = k; } });
  return { bestK, bv };
}
function sumRivals(st, X) {
  let s = 0;
  PRIORITY.forEach(k => { if (k !== X) s += Math.max(0, st.d[k] || 0); });
  return s;
}
function runBeam(X, metric) {
  let beam = [{ d: {}, q: 0 }];
  for (const g of groups) {
    const next = [];
    for (const st of beam) {
      for (const o of g.options) {
        const d = Object.assign({}, st.d);
        const add = deltaOf(o[2]);
        for (const k in add) d[k] = (d[k] || 0) + add[k];
        const q = st.q + qOf(o[2]);
        if (q >= 3) continue;                    // 空気≥3 → 第 81 人 END，排除
        next.push({ d, q });
      }
    }
    next.sort((a, b) => metric(b, X) - metric(a, X));
    beam = next.slice(0, K);
  }
  return beam;
}
for (const X of GE_SLOTS) {
  let ok = false, note = null, best = { x: -99, rival: 99 };
  const beams = [
    /* 优先拉高 X，其次压低对手 */
    runBeam(X, (st, x) => (st.d[x] || 0) * 1000 - maxOtherOf(st, x) * 10 - sumRivals(st, x) * 0.01),
    /* 优先压低对手，其次拉高 X */
    runBeam(X, (st, x) => (st.d[x] || 0) * 100 - maxOtherOf(st, x) * 100 - sumRivals(st, x) * 0.01)
  ];
  for (const beam of beams) {
    for (const st of beam) {
      const xv = st.d[X] || 0, mo = maxOtherOf(st, X);
      if (xv - mo > best.x - best.rival) best = { x: xv, rival: mo };
      const w = winnerOf(st);
      if (w.bestK === X) {
        ok = true;
        if (!note || xv - mo > note.diff) note = { diff: xv - mo, txt: `${xv}(对手 ${w.bv})` };
      }
    }
  }
  if (ok) { canWin.add(X); winners[X] = note.txt; }
  else { errors.push(`路线不可达: ${X}（最佳 X=${best.x} 对手=${best.rival}）`); }
}
console.log("\n可达成最高羁绊:", [...canWin].sort().join(", "));
console.log("羁绊峰值参考:", GE_SLOTS.map(k => k + "=" + (winners[k] === undefined ? "✗" : winners[k])).join(" "));
const missing = GE_SLOTS.filter(k => !canWin.has(k));
console.log("不可达角色:", missing.length ? missing.join(", ") : "无 ✓");
console.log(errors.length ? "\n[FAIL]\n" + errors.join("\n") : "\n[ALL CHECKS PASSED]");
process.exit(errors.length ? 1 : 0);