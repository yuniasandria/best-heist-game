// Procedural Web Audio only: no audio files, no network. Every sound is
// synthesised from oscillators and filtered noise, started after the first
// user gesture (browsers block audio before one). All calls are safe before
// init — they simply do nothing until the context exists.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.alarmNodes = null;
    this.ambientOn = false;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    } catch { this.ctx = null; }
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.now() + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  noiseBurst(dur, vol, filterFreq, delay = 0, type = 'lowpass') {
    if (!this.ctx) return;
    const t0 = this.now() + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }

  footstep(loud) { this.noiseBurst(0.07, loud ? 0.16 : 0.07, loud ? 500 : 300); }
  pickup() { this.tone(880, 0.12, 'sine', 0.22); this.tone(1318, 0.18, 'sine', 0.18, null, 0.07); }
  coinToss() { this.tone(2400, 0.08, 'triangle', 0.12, 1800); }
  coinLand() { this.noiseBurst(0.09, 0.2, 3200, 0, 'highpass'); this.tone(1900, 0.1, 'triangle', 0.14, 1500, 0.02); }
  smoke() { this.noiseBurst(0.5, 0.25, 900); }
  emp() { this.tone(1200, 0.4, 'sawtooth', 0.1, 120); this.noiseBurst(0.3, 0.12, 2400, 0, 'highpass'); }
  lockpick() { this.tone(1500, 0.05, 'square', 0.06); }
  unlock() { this.tone(523, 0.1, 'sine', 0.2); this.tone(784, 0.16, 'sine', 0.2, null, 0.09); }
  spotted() { this.tone(660, 0.25, 'square', 0.12, 880); }
  caught() {
    this.tone(220, 0.5, 'sawtooth', 0.2, 110);
    this.tone(110, 0.7, 'sawtooth', 0.18, 55, 0.15);
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'sine', 0.2, null, i * 0.13));
  }

  // A slow two-note alarm that fades in while the meter is high, out when low.
  setAlarmLevel(level) {
    if (!this.ctx) return;
    if (level > 0.25 && !this.alarmNodes) {
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = 740;
      const g = this.ctx.createGain(); g.gain.value = 0;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 1.6;
      const lg = this.ctx.createGain(); lg.gain.value = 160;
      lfo.connect(lg); lg.connect(o.frequency);
      o.connect(g); g.connect(this.master);
      o.start(); lfo.start();
      this.alarmNodes = { o, g, lfo };
    }
    if (this.alarmNodes) {
      const target = level > 0.25 ? 0.05 + 0.06 * level : 0;
      this.alarmNodes.g.gain.setTargetAtTime(target, this.now(), 0.4);
      if (level <= 0.1) {
        const n = this.alarmNodes; this.alarmNodes = null;
        setTimeout(() => { try { n.o.stop(); n.lfo.stop(); } catch {} }, 600);
      }
    }
  }

  // Barely-there night drone: two detuned sines an octave apart, very quiet.
  startAmbient() {
    if (!this.ctx || this.ambientOn) return;
    this.ambientOn = true;
    const g = this.ctx.createGain(); g.gain.value = 0.035;
    g.connect(this.master);
    for (const f of [55, 55.6, 110.3]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      o.connect(g); o.start();
    }
  }
}
