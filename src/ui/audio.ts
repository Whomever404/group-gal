/* Web Audio 实时合成 BGM + 音效；支持播放本地音频文件。零音频资源、可离线。 */

type Wave = OscillatorType;

interface Track {
  bpm: number;
  wave: Wave;
  arp: Wave;
  vol: number;
  prog: number[][];
  type: 'pad' | 'pluck' | 'bell' | 'pulse';
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private seGain: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextT = 0;
  private fileAudio: HTMLAudioElement | null = null;
  private usingFile = false;

  trk = 'title';
  on = true;
  se = true;

  private readonly tracks: Record<string, Track> = {
    title: { bpm: 72, wave: 'sine', arp: 'triangle', vol: .5,
      prog: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [53, 57, 60]], type: 'pad' },
    daily: { bpm: 112, wave: 'square', arp: 'triangle', vol: .32,
      prog: [[60, 64, 67], [59, 62, 67], [57, 60, 64], [55, 59, 62]], type: 'pluck' },
    night: { bpm: 66, wave: 'sine', arp: 'sine', vol: .38,
      prog: [[57, 60, 64, 69], [52, 55, 59, 64]], type: 'bell' },
    tense: { bpm: 126, wave: 'sawtooth', arp: 'square', vol: .26,
      prog: [[57, 60, 64], [56, 59, 62], [53, 57, 60], [55, 59, 62]], type: 'pulse' },
    end: { bpm: 56, wave: 'sine', arp: 'sine', vol: .4,
      prog: [[50, 53, 57], [48, 52, 55]], type: 'pad' },
  };

  init(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = .9; this.master.connect(ctx.destination);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = .8; this.musicGain.connect(this.master);
    this.seGain = ctx.createGain(); this.seGain.gain.value = .9; this.seGain.connect(this.master);
  }

  private note(midi: number, t: number, dur: number, gain: number, type: Wave = 'sine', tgt?: GainNode): void {
    const ctx = this.ctx; if (!ctx) return;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(tgt || this.musicGain || ctx.destination);
    o.start(t); o.stop(t + dur + .05);
  }

  start(): void {
    this.init();
    if (!this.ctx) return;
    if (this.usingFile) return;
    if (this.timer) return;
    this.step = 0; this.nextT = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  setTrack(name: string): void {
    if (!this.tracks[name]) return;
    this.trk = name; this.step = 0;
    if (this.on && !this.usingFile) { this.stop(); this.start(); }
  }

  private tick(): void {
    if (!this.on || this.usingFile) return;
    const ctx = this.ctx; if (!ctx) return;
    const T = this.tracks[this.trk]!;
    const spb = 60 / T.bpm, s16 = spb / 4;
    while (this.nextT < ctx.currentTime + 0.12) {
      const st = this.step % 64;
      const bar = Math.floor(this.step / 16) % T.prog.length;
      const chord = T.prog[bar]!;
      const t = this.nextT;
      if (st === 0) {
        chord.forEach(m => this.note(m - 12, t, spb * 3.6, .05 * T.vol, 'sine'));
        if (T.type !== 'bell') this.note(chord[0]! - 24, t, spb * 3.4, .07 * T.vol, 'triangle');
      }
      if (T.type === 'pluck') {
        [0, 4, 8, 12].forEach((p, i) => { if (st === p) this.note(chord[i % chord.length]! + 12, t, .22, .09 * T.vol, 'square'); });
      } else if (T.type === 'bell') {
        [0, 5, 10, 14].forEach((p, i) => { if (st === p) this.note(chord[(i * 2) % chord.length]! + 12 + (i === 2 ? 12 : 0), t, 1.1, .07 * T.vol, 'sine'); });
      } else if (T.type === 'pulse') {
        [0, 6, 8, 14].forEach((p, i) => { if (st === p) this.note(chord[0]! + (i % 2 ? 7 : 0), t, .12, .06 * T.vol, 'sawtooth'); });
        if (st % 8 === 0) this.note(chord[0]! - 24, t, .18, .08 * T.vol, 'square');
      } else {
        [0, 8, 10, 12].forEach((p, i) => { if (st === p) this.note(chord[i % chord.length]! + 12, t, .5, .045 * T.vol, T.arp); });
      }
      this.nextT += s16; this.step++;
    }
  }

  playFile(file: File): void {
    this.stop();
    this.fileAudio?.pause();
    this.fileAudio = new Audio(URL.createObjectURL(file));
    this.fileAudio.loop = true;
    this.usingFile = true;
    if (this.on) void this.fileAudio.play().catch(() => { /* 浏览器可能要求用户手势 */ });
  }

  stopFile(): void {
    this.fileAudio?.pause();
    this.usingFile = false;
  }

  /** 暂停本地音频但不退出「本地文件」模式（对应 v2 关 BGM 时的 fileAudio.pause()）。 */
  pause(): void { this.fileAudio?.pause(); }

  sfx(type: string): void {
    if (!this.se) return;
    this.init();
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    if (type === 'click') this.note(660, t, .07, .12, 'square');
    else if (type === 'pop') { this.note(520, t, .08, .1, 'sine'); this.note(780, t + .05, .1, .08, 'sine'); }
    else if (type === 'chime') { [720, 900, 1080].forEach((f, i) => this.note(f, t + i * .07, .25, .08, 'triangle')); }
    else if (type === 'bad') { for (let i = 0; i < 5; i++) this.note(400 - i * 50, t + i * .06, .12, .09, 'sawtooth'); }
    else if (type === 'withdraw') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(440, t); o.frequency.exponentialRampToValueAtTime(110, t + .5);
      g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .55);
      o.connect(g); g.connect(this.seGain || ctx.destination); o.start(t); o.stop(t + .6);
    }
  }
}

export const AU = new AudioEngine();