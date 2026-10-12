/* 《😂群聊 · 全群攻陷计划》v2.0 · jsdom 端到端冒烟测试
   用法：
     npm i -D jsdom
     node legacy/tools/smoke-test.js [目标HTML，默认 ../versions/group-chat-galgame-v2.html]
   覆盖：加载 → 序章/开场聊天 → 第二章 hub 支线（一次性）→ 分岔 → 整条线通关
         → 复读禁言 BE → 羁绊抽屉 → 回收室 / 第 81 人 / 蘑菇汤际遇 → 结局协议
*/
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const target = process.argv[2] || path.join(__dirname, "..", "versions", "group-chat-galgame-v2.html");
const html = fs.readFileSync(target, "utf8");
const logs = [];
const vc = new VirtualConsole();
vc.on("error", (...a) => logs.push("[console.error] " + a.join(" ")));
vc.on("jsdomError", (e) => logs.push("[jsdomError] " + (e.stack || e.message)));
vc.on("warn", () => {});
vc.on("log", () => {});

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/group-chat-galgame-v2.html",
  virtualConsole: vc,
  beforeParse(window) {
    const g = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
    class FakeCtx extends window.EventTarget {
      constructor() { super(); this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; this.state = "running"; }
      createGain() { return { gain: g(), connect() {} }; }
      createOscillator() { return { type: "sine", frequency: g(), connect() {}, start() {}, stop() {} }; }
      createBuffer() { return { getChannelData: () => new Float32Array(64) }; }
      createBufferSource() { return { connect() {}, start() {}, buffer: null }; }
      resume() {}
    }
    window.AudioContext = FakeCtx;
    window.confirm = () => true;
  }
});

const w = dom.window;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (code) => w.eval(code);
let failed = 0;
const ok = (cond, label, extra) => {
  console.log((cond ? "  ✓ " : "  ✗ ") + label + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
  if (!cond) failed++;
};

(async () => {
  await wait(300);
  console.log("== 1. 基础加载 ==");
  ok(ev("document.querySelectorAll('#s-title .menu button').length") === 4, "标题菜单 4 个按钮");
  ok(ev("document.title").includes("全群攻陷计划"), "标题正确", ev("document.title"));

  ev("PREF.auto=true; PREF.spd=2; SPEEDS[2].type=1; SPEEDS[2].punc=2; SPEEDS[2].autoWait=()=>25;");

  console.log("== 2. 序章 → 开场聊天 ==");
  ev("document.getElementById('btn-start').click()");
  await wait(2500);
  ok(ev("S.id").length > 0, "已写入存档节点", ev("S.id"));
  ok(ev("document.querySelectorAll('#chat .bub, #chat .sysmsg').length") >= 5, "开场群聊出现 ≥5 条");

  console.log("== 3. 第二章 hub（一次性支线机制） ==");
  ev("S=freshState(); toGame(); go('hub');");
  await wait(900);
  const opts0 = ev("document.querySelectorAll('#choices button').length");
  ok(opts0 === 16, "hub 初始 16 个选项（15 支线 + 推进主线）", opts0);
  ev("document.querySelectorAll('#choices button')[0].click()");   // 进入支线 1
  await wait(1800);
  ok(ev("S.id").startsWith("s_mc"), "进入支线", ev("S.id"));
  const hubDone = ev("JSON.stringify(S.hubDone)");
  ok(hubDone.includes("mc"), "支线标记写入 hubDone", hubDone);
  ev("go('hub');");
  await wait(900);
  const opts1 = ev("document.querySelectorAll('#choices button').length");
  ok(opts1 === 15, "回到 hub 后该支线不再出现（15 项）", opts1);

  console.log("== 4. 分岔（无原版崩溃问题） ==");
  ev("S=freshState(); S.a={yu:6}; toGame(); go('e4');");
  await wait(2500);
  const branchLabel = ev("(document.querySelector('#avgchoices button')||{}).textContent || null");
  ok(!!branchLabel && branchLabel.includes("点开"), "分岔选项渲染", branchLabel);
  ok(!!branchLabel && branchLabel.includes("一条鱼"), "羁绊最高为「一条鱼」", branchLabel);
  ev("document.querySelector('#avgchoices button').click()");
  await wait(600);
  ok(String(ev("S.id")).startsWith("r_yu"), "进入一条鱼线", ev("S.id"));

  console.log("== 5. 自动跑完整条角色线 → 结局卡 ==");
  let end = null;
  for (let i = 0; i < 120 && !end; i++) {
    ev("(()=>{const b=document.querySelector('#avgchoices button, #choices button'); if(b) b.click();})()");
    end = ev("(()=>{const e=document.getElementById('endcard'); return e? {h:e.querySelector('h2').textContent, cls:e.className}:null;})()");
    if (!end) await wait(300);
  }
  ok(!!end, "整线通关出现结局卡", end);
  if (end) ok(end.cls.includes("ge"), "是好结局卡", end.cls);

  console.log("== 6. 复读 ×3 → 刷屏 BE ==");
  ev("document.getElementById('endcard') && document.getElementById('endcard').remove(); S=freshState(); toGame(); go('a1');");
  await wait(2500);
  const before = ev("S.s.w");
  ev("document.getElementById('btn-repeat').click();document.getElementById('btn-repeat').click();document.getElementById('btn-repeat').click();");
  await wait(200);
  const fz = ev("(()=>{const e=document.getElementById('endcard'); return e?e.querySelector('h2').textContent:null;})()");
  ok(fz && fz.includes("刷屏"), "触发刷屏 END", fz);
  ok(ev("S.s.w") === before + 3, "水群值 +3", ev("S.s.w"));

  console.log("== 7. 群成员羁绊抽屉 ==");
  ev("document.getElementById('endcard').remove(); S=freshState(); S.a={nanao:5,yu:2}; toGame(); go('a5');");
  await wait(600);
  ev("document.getElementById('btn-members').click()");
  const rows = ev("document.querySelectorAll('#dr-list .dr-row').length");
  ok(rows === 16, "抽屉 16 行（17 角色去掉玩家）", rows);
  ok(ev("document.querySelector('#dr-list .dr-stage').textContent") === "宝宝", "闹七(羁绊5)→宝宝", ev("document.querySelector('#dr-list .dr-stage').textContent"));
  ev("document.getElementById('btn-drawer-close').click()");

  console.log("== 8. 15 条路线标签 & 入口 ==");
  const keys = ["nanao","yu","cat","g","shisuan","tttt","shei","shiban","taffy","c30586","mianbao","mibu","linxi","gen","aka"];
  let bad = [];
  for (const k of keys) {
    const r = ev(`(()=>{S=freshState(); S.a={${k}:9}; const best=pickRoute(); return best+"|"+pickRouteLabel(best)+"|"+(!!NODES[ROUTE_START[best]]);})()`);
    if (!r.startsWith(k + "|") || !r.endsWith("|true")) bad.push(k + "=>" + r);
  }
  ok(bad.length === 0, "15/15 角色均可被分岔选中且入口存在", bad.length ? bad : "全部通过");

  console.log("== 9. 回收室 / 第 81 人 / 蘑菇汤际遇 ==");
  ev("S.unlocked=['b24','b81','b19','b20','b05','ge_nanao','ge_shisuan']; openGallery('title');");
  const prog = ev("document.getElementById('gal-progress').textContent");
  ok(prog.includes("5 / 23"), "回收室坏结局 5/23", prog);
  ok(prog.includes("2 / 15"), "回收室好结局 2/15");
  ev("S=freshState(); S.s={z:0,r:0,m:0,q:3,w:0}; toGame(); go('e4');");
  await wait(2500);
  const pass = ev("(()=>{const e=document.getElementById('endcard'); return e?e.querySelector('h2').textContent:null;})()");
  ok(pass && pass.includes("81"), "空気≥3 → 第 81 人 END", pass);
  ev("document.getElementById('endcard').remove(); S=freshState(); S.hubDone={}; toGame(); go('s_moku1');");
  await wait(2000);
  const moku = ev("Array.from(document.querySelectorAll('#choices button')).map(b=>b.textContent).join('|')");
  ok(moku.includes("护着") && moku.includes("阴阳怪气"), "蘑菇汤际遇 3 选项", moku);
  ev("document.querySelectorAll('#choices button')[0].click()");
  await wait(300);
  const bg = ev("(()=>{const e=document.getElementById('endcard'); return e?e.querySelector('h2').textContent:null;})()");
  ok(bg && bg.includes("被挂"), "选项①→被挂 END", bg);

  console.log("== 10. 结局协议 + 读档 ==");
  ev("document.getElementById('endcard').remove(); S=freshState(); toGame(); go('__end_b10');");
  await wait(100);
  ok(String(ev("(document.getElementById('endcard').querySelector('h2')||{}).textContent")).includes("我很伤心"), "BE 协议");
  ok(ev("S.unlocked").includes("b10"), "BE 收录");
  ev("document.getElementById('endcard').remove(); S=freshState(); toGame(); go('__ge_nanao');");
  await wait(100);
  ok(ev("S.unlocked").includes("ge_nanao"), "GE 协议 + 解锁");
  ev("S=freshState(); toGame(); go('s_chart1');"); await wait(300);
  ev("S=loadSave(); toGame(); continueGame();"); await wait(600);
  ok(ev("S.id") === "s_chart1" && ev("cur") != null, "读档恢复并渲染", ev("S.id"));

  console.log("\n== 错误日志 ==");
  console.log(logs.length ? logs.join("\n") : "无 ✓");
  console.log(failed === 0 && logs.length === 0 ? "\n[SMOKE TEST PASSED]" : `\n[SMOKE TEST FAILED] ${failed} 项失败, ${logs.length} 条错误`);
  process.exit(failed === 0 && logs.length === 0 ? 0 : 1);
})();