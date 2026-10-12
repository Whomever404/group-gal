/* jsdom 端到端冒烟：真正加载构建产物 dist/index.html，开始游戏、作答、看回收室、进回合循环。
   用法： node tools/boot-check.mjs [目标 HTML]
   覆盖：外壳挂载 / 点击推进 / 选项作答 / 结局回收室 / 夜晚回合循环 / 群工具面板 / 无控制台错误。

   ⚠️ jsdom 不执行 <script type="module">，而构建产物里的 bundle 是内联 module，
   因此这里把它的源码取出来手动 eval —— 唯一一处为了「让 jsdom 能跑」的迁就。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || path.join(here, '..', 'dist', 'index.html');

if (!fs.existsSync(target)) {
  console.error(`找不到构建产物：${target}（先跑 npm run build）`);
  process.exit(1);
}

const html = fs.readFileSync(target, 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('[jsdomError] ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('[console.error] ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/index.html',
  virtualConsole: vc,
  beforeParse(window) {
    const g = () => ({
      value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {}, cancelScheduledValues() {},
    });
    class FakeCtx extends window.EventTarget {
      constructor() { super(); this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; this.state = 'running'; }
      createGain() { return { gain: g(), connect() {} }; }
      createOscillator() { return { type: 'sine', frequency: g(), connect() {}, start() {}, stop() {} }; }
      createBuffer() { return { getChannelData: () => new Float32Array(64) }; }
      createBufferSource() { return { connect() {}, start() {}, buffer: null }; }
      resume() {}
    }
    window.AudioContext = FakeCtx;
    window.confirm = () => true;
  },
});

const w = dom.window;
const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const ok = (cond, label, extra) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  if (!cond) failed++;
};

const $ = sel => w.document.querySelector(sel);
const cands = () => [...w.document.querySelectorAll('#composer .c-cands button')];

/** 点到出现选项为止（快进已开启，通常十几次就够）。 */
async function advanceUntilChoice(limit = 240) {
  for (let i = 0; i < limit; i++) {
    if (cands().length > 0) return true;
    $('.chat')?.click();
    w.document.body.click();
    await wait(45);
  }
  return false;
}

(async () => {
  const modSrc = [...html.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).join('\n');
  ok(modSrc.length > 1000, '从产物里取到内联 bundle', modSrc.length);
  try { w.eval(modSrc); } catch (e) { errors.push('[module] ' + (e.stack || e.message)); }
  await wait(150);
  if (errors.length) { console.log(errors.join('\n')); process.exit(1); }

  console.log('== 1. 外壳与内容 ==');
  ok(!!$('#title'), '标题页已挂载');
  ok(w.document.title.includes('骨架'), '标题是骨架版', w.document.title);
  ok(w.document.querySelectorAll('#title .t-btns button').length === 4, '标题菜单 4 个按钮');
  ok($('#tCast').children.length === 15, '标题页 15 个角色剪影', $('#tCast').children.length);
  ok(html.includes('【占位】'), '占位剧本已进产物');

  console.log('== 2. 开始游戏与推进 ==');
  $('#btnStart').click();
  await wait(400);
  ok($('#game').className.includes('hidden') === false, '切到游戏画面');

  // 点击 / 空格推进：每次点击立刻结束当前这一句的等待
  const before = $('.chat').children.length;
  for (let i = 0; i < 6; i++) { $('.chat').click(); await wait(40); }
  const after = $('.chat').children.length;
  ok(after - before >= 4, '点击推进：6 次点击至少推进 4 条', { before, after });

  ok(await advanceUntilChoice(), '序章推进到第一个选择');
  ok(w.document.querySelectorAll('.tb-stats .st').length === 5, '顶栏 5 项资质');
  const labels = cands().map(b => b.textContent);
  ok(labels.length >= 2, '选项数 ≥2', labels.length);
  ok(labels.every(t => /【占位】/.test(t)), '选项来自骨架剧本', labels);

  console.log('== 3. 作答 ==');
  cands()[0].click();
  await wait(300);
  ok($('.chat').querySelectorAll('.msg.me').length >= 1, '选项以「我」的消息发出');

  console.log('== 4. 结局回收室 ==');
  ok(await advanceUntilChoice(), '可继续推进到下一个选择');
  $('#btnGallery').click();
  await wait(250);
  const gal = $('#panelBody').textContent.replace(/\s+/g, ' ');
  ok(/坏结局/.test(gal) && /好结局/.test(gal), '回收室显示两类进度');
  ok(/0 \/ 4/.test(gal), '坏结局进度为 0 / 4', gal.match(/坏结局 \d+ \/ \d+/)?.[0]);
  ok(/0 \/ 15/.test(gal), '好结局进度为 0 / 15');
  ok((gal.match(/？？？/g) || []).length === 4, '未解锁的坏结局标题被遮住', (gal.match(/？？？/g) || []).length);
  ok((gal.match(/还没走到这个结局/g) || []).length === 19, '全部 19 个结局位都还没解锁',
    (gal.match(/还没走到这个结局/g) || []).length);
  $('#btnPanelClose').click();
  await wait(120);

  console.log('== 5. 夜晚回合循环（运营机制）==');
  let reachedLoop = false;
  for (let i = 0; i < 60 && !reachedLoop; i++) {
    if (!(await advanceUntilChoice())) break;
    const list = cands();
    if (list.some(b => /闹七/.test(b.textContent))) { reachedLoop = true; break; }
    list[0].click();                                  // 第一章一路选第一项（不落坏结局）
    await wait(60);
  }
  ok(reachedLoop, '推进到第二章的回合循环中枢');
  const firstTurn = cands().map(b => b.textContent);
  ok(firstTurn.length === 15, '首轮给出全部 15 条支线候选', firstTurn.length);
  ok(/闹七|一条鱼|黄油猫/.test(firstTurn.join(' ')), '候选带角色标识', firstTurn.slice(0, 3));

  cands()[0].click();                                 // 锁定第一位
  await wait(200);
  ok(await advanceUntilChoice(), '进入 TA 的本命支线');
  ok(/【占位】/.test($('.chat').textContent), '支线内容已上屏',
    $('.chat').textContent.trim().slice(-30));

  let secondTurn = null;
  for (let i = 0; i < 80; i++) {
    if (!(await advanceUntilChoice())) break;
    const prompt = $('#composer .c-prompt')?.textContent ?? '';
    if (/第 [2-9]\d* 个晚上/.test(prompt)) { secondTurn = prompt; break; }
    cands()[0].click();
    await wait(60);
  }
  ok(!!secondTurn, '从支线回到回合中枢', secondTurn);
  if (secondTurn) {
    ok(/羁绊 \d+\/\d+/.test(secondTurn), '运营提示羁绊进度', secondTurn);
    ok(/本命支线 \d+\/\d+/.test(secondTurn), '运营提示支线进度', secondTurn);
    const opts = cands().map(b => b.textContent);
    ok(opts.length <= 6, '第二回合选项变少（支线 + 随机事件）', opts);
    ok(opts.filter(t => /🎲/.test(t)).length <= 2, '随机事件 1~2 条', opts.filter(t => /🎲/.test(t)));
  }

  console.log('== 6. 群工具面板 ==');
  for (const [id, expect] of [
    ['btnMembers', null], ['btnBacklog', '回想'], ['btnSaves', '存档'],
    ['btnSettings', '设置'], ['btnRoute', '路线'],
  ]) {
    w.document.getElementById(id).click();
    await wait(220);
    if (id === 'btnMembers') {
      ok(w.document.querySelectorAll('#drList .dr-row').length >= 15, '群成员抽屉 15+ 行',
        w.document.querySelectorAll('#drList .dr-row').length);
      w.document.getElementById('btnCloseDr').click();
    } else {
      const body = $('#panelBody');
      ok($('#panel').classList.contains('open') && body.children.length > 0,
        `面板「${expect}」打开且有内容`, body.textContent.trim().slice(0, 30));
      $('#btnPanelClose').click();
      await wait(80);
    }
  }

  console.log('\n== 错误日志 ==');
  console.log(errors.length ? errors.join('\n') : '无 ✓');
  console.log(failed === 0 && errors.length === 0 ? '\n[BOOT CHECK PASSED]' : `\n[BOOT CHECK FAILED] ${failed} 项, ${errors.length} 条错误`);
  process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
})();