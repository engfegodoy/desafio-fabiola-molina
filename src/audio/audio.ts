/**
 * Áudio 100% procedural com Web Audio API (sem arquivos externos).
 * O contexto só é criado/retomado após um gesto do usuário, respeitando
 * as políticas de reprodução automática dos navegadores.
 */

type MusicTrack = 'menu' | 'race' | 'shark' | 'final' | null;
type Ambience = 'crowd' | 'sea' | 'night' | null;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Song {
  bpm: number;
  chords: number[][];
  bassRoots: number[];
  melody: (number | null)[][];
  lead: OscillatorType;
  leadVol: number;
  swing?: number;
  drums: boolean;
}

const SONGS: Record<Exclude<MusicTrack, null>, Song> = {
  menu: {
    bpm: 108,
    chords: [
      [60, 64, 67],
      [59, 62, 67],
      [57, 60, 64],
      [57, 60, 65],
    ],
    bassRoots: [36, 43, 45, 41],
    melody: [
      [72, null, 76, null, 79, null, 76, 74],
      [74, null, 71, null, 74, null, 79, null],
      [76, null, 72, null, 76, 77, 79, null],
      [77, null, 76, null, 74, null, 72, null],
    ],
    lead: 'triangle',
    leadVol: 0.16,
    drums: true,
  },
  race: {
    bpm: 138,
    chords: [
      [60, 64, 67],
      [59, 62, 67],
      [57, 60, 64],
      [57, 60, 65],
    ],
    bassRoots: [36, 43, 45, 41],
    melody: [
      [79, 79, 76, 79, null, 84, null, 79],
      [79, null, 74, null, 71, 74, 79, null],
      [81, null, 79, 76, null, 72, 76, null],
      [77, 76, 74, 72, 74, null, 76, null],
    ],
    lead: 'square',
    leadVol: 0.07,
    drums: true,
  },
  shark: {
    bpm: 152,
    chords: [
      [57, 60, 64],
      [57, 60, 65],
      [60, 64, 67],
      [59, 62, 67],
    ],
    bassRoots: [33, 41, 36, 43],
    melody: [
      [69, null, 72, null, 76, null, 72, null],
      [77, null, 76, null, 72, null, 69, null],
      [72, 74, 76, null, 79, null, 76, null],
      [74, null, 71, null, 67, null, 68, 69],
    ],
    lead: 'square',
    leadVol: 0.065,
    drums: true,
  },
  final: {
    bpm: 120,
    chords: [
      [60, 64, 67],
      [57, 60, 65],
      [55, 59, 62],
      [60, 64, 67],
    ],
    bassRoots: [36, 41, 43, 36],
    melody: [
      [72, 76, 79, 84, null, 79, 84, null],
      [81, null, 77, null, 81, 84, null, 81],
      [79, null, 74, 77, 79, null, 83, null],
      [84, null, 79, null, 76, null, 72, null],
    ],
    lead: 'triangle',
    leadVol: 0.15,
    drums: true,
  },
};

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private brownBuf!: AudioBuffer;
  muted = false;

  private track: MusicTrack = null;
  private wantedTrack: MusicTrack = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  private ambience: Ambience = null;
  private wantedAmbience: Ambience = null;
  private ambNodes: AudioNode[] = [];
  private ambGain: GainNode | null = null;

  unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.32;
      this.musicBus.connect(this.master);
      this.ambBus = ctx.createGain();
      this.ambBus.gain.value = 0.6;
      this.ambBus.connect(this.master);

      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.brownBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const b = this.brownBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        b[i] = last * 3.5;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wantedTrack !== this.track) this.playMusic(this.wantedTrack);
    if (this.wantedAmbience !== this.ambience) this.setAmbience(this.wantedAmbience);
  }

  private get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  // ---------- primitivas ----------
  private tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      vol?: number;
      when?: number;
      slide?: number;
      attack?: number;
      bus?: GainNode;
      vibrato?: number;
      vibratoRate?: number;
      filter?: number;
    } = {},
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = opts.when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.2;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = osc;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(opts.bus ?? this.sfxBus);
    if (opts.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = opts.vibratoRate ?? 30;
      lg.gain.value = opts.vibrato;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(
    dur: number,
    opts: {
      vol?: number;
      when?: number;
      type?: BiquadFilterType;
      freq?: number;
      sweep?: number;
      q?: number;
      attack?: number;
      bus?: GainNode;
      brown?: boolean;
    } = {},
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = opts.when ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = opts.brown ? this.brownBuf : this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.setValueAtTime(opts.freq ?? 2000, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    f.Q.value = opts.q ?? 0.8;
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(opts.bus ?? this.sfxBus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  // ---------- efeitos ----------
  click() {
    if (!this.ready) return;
    this.tone(880, 0.08, { type: 'triangle', vol: 0.18, slide: 1320 });
  }

  countdown(n: number) {
    if (!this.ready) return;
    if (n > 0) this.tone(660, 0.22, { type: 'square', vol: 0.12, filter: 2200 });
    else this.whistle();
  }

  whistle() {
    if (!this.ready) return;
    this.tone(2600, 0.6, { type: 'sine', vol: 0.22, vibrato: 140, vibratoRate: 32, attack: 0.02 });
    this.tone(2620, 0.6, { type: 'triangle', vol: 0.08, vibrato: 120, vibratoRate: 30 });
    this.noise(0.5, { type: 'bandpass', freq: 3000, vol: 0.05 });
  }

  stroke(power: number) {
    if (!this.ready) return;
    const p = Math.min(1.3, Math.max(0.2, power));
    this.noise(0.18 + p * 0.22, { type: 'lowpass', freq: 3500, sweep: 400, vol: 0.12 + p * 0.14, attack: 0.008 });
    this.noise(0.12, { type: 'bandpass', freq: 900 + Math.random() * 400, vol: 0.06 * p, q: 2 });
  }

  splash() {
    if (!this.ready) return;
    this.noise(0.9, { type: 'lowpass', freq: 5000, sweep: 300, vol: 0.4 });
    this.tone(180, 0.3, { type: 'sine', vol: 0.2, slide: 60 });
  }

  quality(q: string, combo: number) {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    if (q === 'perfect') {
      [0, 4, 7, 12].forEach((s, i) =>
        this.tone(mtof(79 + s), 0.18, { type: 'triangle', vol: 0.13, when: t + i * 0.045 }),
      );
      this.tone(mtof(103), 0.3, { type: 'sine', vol: 0.05, when: t + 0.18 });
    } else if (q === 'great') {
      [0, 7].forEach((s, i) => this.tone(mtof(76 + s), 0.15, { type: 'triangle', vol: 0.11, when: t + i * 0.05 }));
    } else if (q === 'good') {
      this.tone(mtof(72), 0.12, { type: 'triangle', vol: 0.08 });
    } else if (q === 'early' || q === 'passed') {
      this.tone(mtof(55), 0.22, { type: 'sawtooth', vol: 0.07, slide: mtof(50), filter: 900 });
    }
    if (combo >= 2 && (q === 'perfect' || q === 'great')) {
      const base = 72 + combo * 2;
      this.tone(mtof(base), 0.1, { type: 'square', vol: 0.05, when: t + 0.2, filter: 3000 });
      this.tone(mtof(base + 5), 0.16, { type: 'square', vol: 0.05, when: t + 0.27, filter: 3000 });
    }
  }

  comboMax() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    [72, 76, 79, 84, 88].forEach((m, i) => this.tone(mtof(m), 0.14, { type: 'square', vol: 0.06, when: t + i * 0.06, filter: 4000 }));
  }

  comboLost() {
    if (!this.ready) return;
    this.tone(440, 0.25, { type: 'triangle', vol: 0.09, slide: 220 });
  }

  wave(kind: 'front' | 'back') {
    if (!this.ready) return;
    this.noise(1.4, { type: 'bandpass', freq: kind === 'front' ? 500 : 900, sweep: kind === 'front' ? 1400 : 300, vol: 0.18, attack: 0.5, brown: true, q: 0.6 });
  }

  cheer(strength = 1) {
    if (!this.ready) return;
    this.noise(2.4, { type: 'bandpass', freq: 1100, sweep: 1600, vol: 0.22 * strength, attack: 0.25, q: 0.5 });
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 6; i++) {
      const f = 500 + Math.random() * 500;
      this.tone(f, 0.5, { type: 'sawtooth', vol: 0.012 * strength, when: t + Math.random() * 0.8, slide: f * 1.4, filter: 1500 });
    }
  }

  sharkAppear() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    // "Dun-dun" cômico + apito de escorregar
    this.tone(mtof(40), 0.35, { type: 'sawtooth', vol: 0.22, when: t, filter: 500 });
    this.tone(mtof(41), 0.35, { type: 'sawtooth', vol: 0.22, when: t + 0.4, filter: 500 });
    this.tone(mtof(40), 0.25, { type: 'sawtooth', vol: 0.2, when: t + 0.9, filter: 600 });
    this.tone(mtof(41), 0.25, { type: 'sawtooth', vol: 0.2, when: t + 1.15, filter: 600 });
    this.tone(500, 0.5, { type: 'sine', vol: 0.12, when: t + 1.5, slide: 1600, vibrato: 20, vibratoRate: 8 });
  }

  sharkBite() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    this.tone(300, 0.12, { type: 'square', vol: 0.12, when: t, slide: 120, filter: 1500 });
    this.tone(260, 0.12, { type: 'square', vol: 0.12, when: t + 0.14, slide: 100, filter: 1500 });
    this.tone(1200, 0.6, { type: 'sine', vol: 0.1, when: t + 0.3, slide: 300 });
    this.splash();
  }

  chomp() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    this.tone(220, 0.08, { type: 'square', vol: 0.08, when: t, slide: 110, filter: 1200 });
    this.tone(200, 0.08, { type: 'square', vol: 0.08, when: t + 0.12, slide: 100, filter: 1200 });
  }

  jump() {
    if (!this.ready) return;
    this.tone(300, 0.45, { type: 'sine', vol: 0.14, slide: 1400, vibrato: 12, vibratoRate: 9 });
  }

  slip() {
    if (!this.ready) return;
    this.tone(1800, 0.5, { type: 'sine', vol: 0.14, slide: 300 });
  }

  victory() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    const seq = [72, 76, 79, 84, 79, 84];
    const dur = [0.12, 0.12, 0.12, 0.3, 0.12, 0.6];
    let acc = 0;
    seq.forEach((m, i) => {
      this.tone(mtof(m), dur[i] + 0.05, { type: 'square', vol: 0.08, when: t + acc, filter: 3500 });
      this.tone(mtof(m - 12), dur[i] + 0.05, { type: 'triangle', vol: 0.1, when: t + acc });
      acc += dur[i];
    });
    this.cheer(1.2);
  }

  defeat() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    // "Wah wah wah waaah" de trombone
    [67, 66, 65].forEach((m, i) =>
      this.tone(mtof(m - 12), 0.35, { type: 'sawtooth', vol: 0.13, when: t + i * 0.42, filter: 900, slide: mtof(m - 12.6) }),
    );
    this.tone(mtof(52), 1.1, { type: 'sawtooth', vol: 0.13, when: t + 1.3, filter: 800, vibrato: 6, vibratoRate: 6 });
  }

  award() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 10; i++) {
      this.tone(mtof(84 + [0, 4, 7, 12, 16][i % 5]), 0.25, { type: 'sine', vol: 0.07, when: t + i * 0.07 });
    }
    this.victory();
  }

  tutorialStep() {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    [72, 79].forEach((m, i) => this.tone(mtof(m), 0.2, { type: 'triangle', vol: 0.12, when: t + i * 0.09 }));
  }

  /** Respiração válida: inspiração (ruído subindo) + brilho. */
  breath(early = false) {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    this.noise(0.45, { type: 'bandpass', freq: 600, sweep: 2200, vol: 0.16, attack: 0.15, q: 0.7 });
    if (!early) {
      [76, 83].forEach((m, i) => this.tone(mtof(m), 0.2, { type: 'sine', vol: 0.09, when: t + 0.3 + i * 0.08 }));
    } else {
      this.tone(mtof(64), 0.18, { type: 'triangle', vol: 0.07, when: t + 0.3 });
    }
  }

  /** Respiração recusada (duas seguidas). */
  breathDenied() {
    if (!this.ready) return;
    this.tone(180, 0.18, { type: 'square', vol: 0.06, filter: 700 });
  }

  /** Alerta de energia baixa. */
  energyAlert(level: 'warn' | 'low' | 'critical') {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    const n = level === 'critical' ? 3 : level === 'low' ? 2 : 1;
    for (let i = 0; i < n; i++) this.tone(level === 'critical' ? 520 : 760, 0.09, { type: 'square', vol: 0.06, when: t + i * 0.13, filter: 2200 });
  }

  copy() {
    if (!this.ready) return;
    this.tone(1046, 0.1, { type: 'triangle', vol: 0.12 });
    this.tone(1568, 0.18, { type: 'triangle', vol: 0.12, when: this.ctx!.currentTime + 0.08 });
  }

  // ---------- ambiente ----------
  setAmbience(a: Ambience) {
    this.wantedAmbience = a;
    if (!this.ctx) return;
    if (a === this.ambience) return;
    const ctx = this.ctx;
    if (this.ambGain) {
      const g = this.ambGain;
      const nodes = this.ambNodes;
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      setTimeout(() => nodes.forEach((n) => {
        try {
          (n as AudioScheduledSourceNode).stop?.();
        } catch {
          /* já parado */
        }
        n.disconnect();
      }), 1500);
    }
    this.ambience = a;
    this.ambNodes = [];
    this.ambGain = null;
    if (!a) return;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.ambBus);
    const src = ctx.createBufferSource();
    src.buffer = a === 'crowd' ? this.noiseBuf : this.brownBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const am = ctx.createGain();
    if (a === 'crowd') {
      f.type = 'bandpass';
      f.frequency.value = 1000;
      f.Q.value = 0.5;
      lfo.frequency.value = 0.35;
      lfoGain.gain.value = 0.25;
      am.gain.value = 0.6;
      out.gain.setTargetAtTime(0.09, ctx.currentTime, 0.6);
    } else {
      f.type = 'lowpass';
      f.frequency.value = a === 'night' ? 420 : 650;
      lfo.frequency.value = a === 'night' ? 0.1 : 0.13;
      lfoGain.gain.value = 0.45;
      am.gain.value = 0.55;
      out.gain.setTargetAtTime(a === 'night' ? 0.32 : 0.26, ctx.currentTime, 0.6);
    }
    lfo.connect(lfoGain).connect(am.gain);
    src.connect(f).connect(am).connect(out);
    src.start();
    lfo.start();
    this.ambNodes = [src, lfo, f, am, lfoGain, out];
    this.ambGain = out;
  }

  // ---------- música ----------
  playMusic(track: MusicTrack) {
    this.wantedTrack = track;
    if (!this.ctx) return;
    if (track === this.track && this.timer !== null) return;
    this.track = track;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!track) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private schedule() {
    if (!this.ctx || !this.track) return;
    if (this.ctx.state !== 'running') return;
    const song = SONGS[this.track];
    const stepDur = 60 / song.bpm / 2; // colcheias
    // Se a aba ficou parada, não acumula notas atrasadas.
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(song, this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % 64;
      this.nextTime += stepDur;
    }
  }

  private playStep(song: Song, step: number, t: number, sd: number) {
    const bar = Math.floor(step / 8) % 4;
    const s = step % 8;
    const bus = this.musicBus;
    // Baixo
    if (s % 2 === 0) {
      const root = song.bassRoots[bar] + (s === 2 || s === 6 ? 12 : 0);
      this.tone(mtof(root), sd * 1.6, { type: 'triangle', vol: 0.32, when: t, bus });
    }
    // Acordes (stabs nos contratempos)
    if (s === 2 || s === 6) {
      for (const n of song.chords[bar]) this.tone(mtof(n), sd * 0.9, { type: 'sine', vol: 0.06, when: t, bus });
    }
    // Melodia (a segunda volta é uma oitava acima no refrão)
    const phrase = Math.floor(step / 32);
    const m = song.melody[bar][s];
    if (m !== null) {
      this.tone(mtof(m + (phrase === 1 ? -12 : 0)), sd * 1.5, {
        type: song.lead,
        vol: song.leadVol,
        when: t,
        bus,
        filter: song.lead === 'square' ? 2600 : undefined,
      });
    }
    // Bateria
    if (song.drums) {
      if (s === 0 || s === 4) this.tone(150, 0.16, { type: 'sine', vol: 0.4, when: t, slide: 45, bus });
      if (s === 2 || s === 6) this.noise(0.12, { type: 'highpass', freq: 1800, vol: 0.12, when: t, bus });
      this.noise(0.04, { type: 'highpass', freq: 7000, vol: s % 2 ? 0.035 : 0.05, when: t, bus });
    }
  }
}

export const audio = new AudioEngine();
