import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = fs.readFileSync('/workspace/dist/index.html', 'utf8');
const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('ERR', e.message.slice(0, 200)));
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc,
  beforeParse(w) {
    const g = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
    class F extends w.EventTarget {
      constructor() { super(); this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; this.state = 'running'; }
      createGain() { return { gain: g(), connect() {} }; }
      createOscillator() { return { type: 'sine', frequency: g(), connect() {}, start() {}, stop() {} }; }
      createBuffer() { return { getChannelData: () => new Float32Array(64) }; }
      createBufferSource() { return { connect() {}, start() {}, buffer: null }; }
      resume() {}
    }
    w.AudioContext = F;
    w.confirm = () => true;
  },
});
const w = dom.window;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const mod = [...html.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  w.eval(mod);
  await wait(200);
  w.document.getElementById('btnStart').click();
  await wait(1500);

  // 推进到出现选项
  for (let i = 0; i < 200 && !w.document.querySelector("#composer .c-cands button"); i++) {
    w.document.body.click();
    await wait(100);
  }
  console.log('选项:', w.document.querySelector('#composer .c-cands button')?.textContent);
  w.document.querySelector('#composer .c-cands button').click();
  await wait(800);

  console.log('toasts 区:', w.document.getElementById('toasts').textContent.trim().slice(0, 100));
  w.document.getElementById('btnRepeat').click();
  await wait(120);
  console.log('1 次后 toasts:', w.document.getElementById('toasts').textContent.trim().slice(0, 120));
  w.document.getElementById('btnRepeat').click();
  await wait(120);
  console.log('2 次后 toasts:', w.document.getElementById('toasts').textContent.trim().slice(0, 160));
  w.document.getElementById('btnRepeat').click();
  await wait(200);
  console.log('3 次后 overlay hidden:', w.document.getElementById('overlay').className,
    '| card:', w.document.getElementById('ovCard').textContent.trim().slice(0, 80));
})();