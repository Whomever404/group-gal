import type { TrackName } from '../engine/types';

/**
 * 内置 Web Audio 合成 BGM 与音效。逐字搬运自
 * 原版单文件（BGM 与 sfx）。
 *
 * 离线可玩、免版权——不依赖任何音频资源文件。
 * 在无 AudioContext 的环境（如 jsdom、老旧浏览器）下安全降级为静默。
 */

interface Track {
  readonly bpm: number;
  readonly prog: readonly (readonly number[])[];
  readonly lead: OscillatorType;
  readonly bass: OscillatorType;
  readonly arp: readonly number[];
  readonly vol: number;
}

const TR: Readonly<Record<TrackName, Track>> = {
  chat: { bpm: 126, prog: [[48, 55, 60, 64], [45, 52, 57, 60], [43, 50, 55, 59], [41, 48, 53, 57]],
    lead: 'square', bass: 'triangle', arp: [0, 1, 2, 3, 2, 1, 2, 3], vol: 0.15 },
  night: { bpm: 72, prog: [[45, 52, 57, 60], [43, 50, 55, 58], [41, 48, 53, 57], [40, 47, 52, 55]],
    lead: 'sine', bass: 'sine', arp: [0, 2, 1, 3, 3, 1, 2, 0], vol: 0.16 },
  tension: { bpm: 152, prog: [[40, 43, 47, 50], [41, 44, 47, 50]],
    lead: 'sawtooth', bass: 'sawtooth', arp: [0, 1, 2, 1, 3, 1, 2, 1], vol: 0.13 },
  warm: { bpm: 96, prog: [[48, 55, 59, 64], [46, 53, 57, 62], [43, 50, 55, 59], [41, 48, 53, 57]],
    lead: 'triangle', bass: 'sine', arp: [0, 1, 3, 2, 3, 1, 2, 0], vol: 0.15 },
};

/**
 * 取 AudioContext 构造器，兼容 webkit 前缀。
 * 在没有 `window` 的环境（Node / SSR / 测试）返回 undefined，
 * 使整个模块降级为静默而不是抛错。
 */
function audioCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

export interface Bgm {
  start(track?: TrackName): void;
  set(track: TrackName): void;
  /** 翻转开关，返回翻转后的状态 */
  toggle(): boolean;
  /** 当前是否开启 */
  isOn(): boolean;
  /** 显式设置开关（设置面板按布尔值设定，不能只靠 toggle 翻转） */
  setOn(on: boolean): void;
}

export const BGM: Bgm = (() => {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let step = 0;
  let nextT = 0;
  let cur: TrackName = 'chat';
  let on = true;

  const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

  function ensure(): void {
    if (ctx) return;
    const AC = audioCtor();
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }

  function note(t: number, f: number, dur: number, type: OscillatorType, g: number): void {
    const o = ctx!.createOscillator();
    const gn = ctx!.createGain();
    o.type = type;
    o.frequency.value = f;
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(g, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(master!);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function kick(t: number): void {
    const o = ctx!.createOscillator();
    const gn = ctx!.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.13);
    gn.gain.setValueAtTime(0.9, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    o.connect(gn); gn.connect(master!);
    o.start(t); o.stop(t + 0.2);
  }

  function hat(t: number, g: number): void {
    const b = ctx!.createBuffer(1, 900, ctx!.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < 900; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / 900, 7);
    const s = ctx!.createBufferSource();
    s.buffer = b;
    const gn = ctx!.createGain();
    gn.gain.value = g;
    s.connect(gn); gn.connect(master!);
    s.start(t);
  }

  function sched(t: number): void {
    const T = TR[cur];
    const ci = Math.floor(step / 8) % T.prog.length;
    const ch = T.prog[ci]!;
    if (step % 8 === 0 || step % 8 === 4) note(t, mtof(ch[0]! - 24), 0.5, T.bass, 0.22);
    note(t, mtof(ch[T.arp[step % T.arp.length]!]!), 0.16, T.lead, 0.06);
    if (step % 8 === 0 || step % 8 === 4) kick(t);
    if (step % 2 === 1) hat(t, 0.045);
  }

  function tick(): void {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.14) {
      sched(nextT);
      nextT += 60 / TR[cur].bpm / 4;
      step = (step + 1) % 32;
    }
  }

  function level(): number {
    return on ? TR[cur].vol : 0;
  }

  function rampTo(v: number, seconds: number): void {
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(v, ctx.currentTime + seconds);
  }

  return {
    start(track) {
      ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      if (track) { cur = track; step = 0; nextT = ctx.currentTime + 0.06; }
      if (!timer) timer = setInterval(tick, 25);
      rampTo(level(), 0.5);
    },
    set(track) {
      if (!ctx) { cur = track; return; }
      if (track !== cur) { cur = track; step = 0; nextT = ctx.currentTime + 0.06; }
      if (on) rampTo(level(), 0.4);
    },
    toggle() {
      on = !on;
      if (ctx) rampTo(level(), 0.25);
      return on;
    },
    isOn: () => on,
    setOn(next) {
      if (on === next) return;
      on = next;
      if (ctx) rampTo(level(), 0.25);
    },
  };
})();

/** UI 音效。逐字搬运自 :849-860。 */
let earCtx: AudioContext | null = null;

export function sfx(kind: 'card' | 'msg'): void {
  try {
    const AC = audioCtor();
    if (!AC) return;
    if (!earCtx) earCtx = new AC();
    const ctx = earCtx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);

    if (kind === 'card') {
      o.type = 'triangle';
      o.frequency.setValueAtTime(660, t);
      o.frequency.exponentialRampToValueAtTime(990, t + 0.12);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    } else {
      o.type = 'sine';
      o.frequency.setValueAtTime(1180, t);
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.start(t); o.stop(t + 0.08);
    }
  } catch {
    // 音效失败不应影响游戏（与现状的 try/catch 空处理一致）
  }
}
