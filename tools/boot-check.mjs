/* jsdom 端到端冒烟：真正加载构建产物 dist/index.html，开始游戏、作答、复读、看回收室。
   用法： node tools/boot-check.mjs [目标 HTML]
   覆盖：外壳挂载 / 序章推进 / 选项作答 / 复读彩蛋触发 Bad End / 结局回收室 / 无控制台错误。

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
  ok(w.document.title.includes('全群攻陷计划'), '标题正确', w.document.title);
  ok(w.document.querySelectorAll('#title .t-btns button').length === 4, '标题菜单 4 个按钮');
  ok($('#tCast').children.length === 15, '标题页 15 个角色剪影', $('#tCast').children.length);
  ok(html.includes('群主攻击性强哪儿了'), '重写版闹七台词进了产物');
  ok(html.includes('第 81 人 END'), '23 个 Bad End 文案进了产物');
  ok(html.includes('长期开服'), '角色线结局标题进了产物');

  console.log('== 2. 开始游戏 ==');
  $('#btnStart').click();
  await wait(400);
  ok($('#game').className.includes('hidden') === false, '切到游戏画面');

  // 点击 / 空格推进：每次点击立刻结束当前这一句的等待
  const before = $('.chat').children.length;
  for (let i = 0; i < 6; i++) { $('.chat').click(); await wait(40); }
  const after = $('.chat').children.length;
  ok(after - before >= 4, '点击推进：6 次点击至少推进 4 条', { before, after });

  ok(await advanceUntilChoice(), '序章推进到第一个选择');
  const chat = $('.chat');
  ok(chat.querySelectorAll('.msg, .sys, .note').length > 0, '聊天流出消息', chat.children.length);
  ok(/序章|第一章/.test($('#mChapter').textContent), '顶栏章节名已切换', $('#mChapter').textContent);
  ok(w.document.querySelectorAll('.tb-stats .st').length === 5, '顶栏 5 项资质');
  const labels = cands().map(b => b.textContent);
  ok(labels.length >= 2, '选项数 ≥2', labels.length);
  ok(labels.some(t => /各位好|音游我是真不会|先不说话|群主/.test(t)), '选项来自重写版剧本', labels);

  console.log('== 3. 作答 ==');
  cands()[0].click();
  await wait(300);
  ok(chat.querySelectorAll('.msg.me').length >= 1, '选项以「我」的消息发出');
  ok(await advanceUntilChoice(), '可继续推进到下一个选择');

  console.log('== 4. 复读彩蛋 → 刷屏 Bad End ==');
  const toasts = [];
  for (let i = 0; i < 3; i++) {
    $('#btnRepeat').click();
    await wait(120);
    toasts.push($('#toasts').textContent.trim());
    if (!$('#overlay').classList.contains('hidden')) break;
  }
  ok(!$('#overlay').classList.contains('hidden'), '三次复读触发 Bad End 弹窗', toasts);
  ok(/刷屏/.test($('#ovCard').textContent), '弹窗是刷屏 END', $('#ovCard h2')?.textContent);
  ok(/群规/.test($('#ovCard').textContent), 'Bad End 标注责任人', $('#ovCard .tag')?.textContent);

  console.log('== 5. 结局回收室 ==');
  $('#ovCard #ovTitle')?.click();
  await wait(150);
  $('#btnGalleryTitle').click();
  await wait(200);
  const gal = $('#panelBody').textContent;
  ok(/坏结局/.test(gal) && /好结局/.test(gal), '回收室显示两类进度');
  ok(/坏结局 1 \/ 23/.test(gal.replace(/\s+/g, ' ')), '刚解锁的刷屏 END 计入进度',
    gal.replace(/\s+/g, ' ').match(/坏结局 \d+ \/ \d+/)?.[0]);
  ok(/0 \/ 15/.test(gal.replace(/\s+/g, ' ')), '好结局进度为 0');
  ok((gal.match(/？？？/g) || []).length === 22, '未解锁的结局仍被遮住', (gal.match(/？？？/g) || []).length);
  $('#btnPanelClose').click();

  console.log('== 6. 第二章回合循环（运营机制）==');
  $('#btnStart').click();
  await wait(300);

  // 序章与第一章：每次都选第 2 项（这条路径不落 Bad End），一路推进到回合中枢
  let reachedLoop = false;
  for (let i = 0; i < 60 && !reachedLoop; i++) {
    if (!(await advanceUntilChoice())) break;
    const list = cands();
    if (list.some(b => /群主又在群里开团训人/.test(b.textContent))) { reachedLoop = true; break; }
    list[Math.min(1, list.length - 1)].click();   // 序章与第一章：选第 2 项（不落 BE）
    await wait(60);
  }
  ok(reachedLoop, '推进到第二章的回合循环中枢');
  ok(/第 1 个晚上/.test($('#composer .c-prompt')?.textContent ?? ''),
    '首轮提示今晚该挑人', $('#composer .c-prompt')?.textContent);
  const firstTurn = cands().map(b => b.textContent);
  ok(firstTurn.length === 15, '首轮给出全部 15 条支线候选', firstTurn.length);
  ok(firstTurn.every(t => /^[^\s]+\s/.test(t)), '候选带角色标识', firstTurn.slice(0, 3));

  cands()[0].click();                       // 锁定第一位：闹七
  await wait(200);
  ok(await advanceUntilChoice(), '进入闹七的本命支线');
  ok(/点名|站出来/.test($('.chat').textContent), '支线内容已上屏',
    $('.chat').textContent.trim().slice(-40));

  // 走完这段支线回到中枢，检查「只出当前对象」的规则
  let secondTurn = null;
  for (let i = 0; i < 80; i++) {
    if (!(await advanceUntilChoice())) break;
    const prompt = $('#composer .c-prompt')?.textContent ?? '';
    if (/第 [2-9]\d* 个晚上/.test(prompt)) { secondTurn = prompt; break; }
    cands()[0].click();                      // 支线里一律选第一项（真诚向，不落 BE）
    await wait(60);
  }
  ok(!!secondTurn, '从支线回到回合中枢', secondTurn);
  if (secondTurn) {
    ok(/闹七/.test(secondTurn), '运营提示锁定对象', secondTurn);
    ok(/羁绊 \d+\/\d+/.test(secondTurn), '运营提示羁绊进度', secondTurn);
    ok(/本命支线 \d+\/\d+/.test(secondTurn), '运营提示支线进度', secondTurn);
    const opts = cands().map(b => b.textContent);
    ok(opts.length <= 6, '第二回合选项变少（支线 + 随机事件）', opts);
    ok(opts.filter(t => /🎲/.test(t)).length <= 2, '随机事件 1~2 条', opts.filter(t => /🎲/.test(t)));
    ok(opts.some(t => /本命支线|深夜私聊/.test(t)), '仍有本命支线可走', opts);
    ok(!opts.some(t => /一条鱼|黄油猫|石蒜|凛/.test(t)), '不再出现其他角色的支线', opts);
  }

  console.log('== 7. 群工具面板 ==');
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