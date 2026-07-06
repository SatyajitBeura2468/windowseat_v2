/* ───────────────────────────────────────────────────────────
 *  audio.js — Procedural Web Audio sound manager
 *  All sounds are synthesised with oscillators and noise buffers.
 *  No external audio files required.
 * ─────────────────────────────────────────────────────────── */

import { clamp, lerp } from '../config.js';

const NOISE_BUFFER_SIZE = 2 * 44100;   // 2 seconds at 44.1 kHz

export class AudioSystem {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._enabled = false;
    this._initialised = false;

    // Node references (created on init)
    this._nodes = {};
    this._thunderTimeout = null;
  }

  /* ─── init (must be called from user gesture) ─── */
  async init() {
    if (this._initialised) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AC();
      if (this._ctx.state === 'suspended') {
        await this._ctx.resume();
      }
    } catch {
      return;   // Web Audio not available
    }

    const ctx = this._ctx;

    // Master gain
    this._master = ctx.createGain();
    this._master.gain.value = 0;
    this._master.connect(ctx.destination);

    // ─── Cabin Hum (brown noise low-passed) ───
    const brownBuf = this._createBrownNoise(ctx);
    const humSrc = ctx.createBufferSource();
    humSrc.buffer = brownBuf;
    humSrc.loop = true;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 200;
    humFilter.Q.value = 0.7;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.15;
    humSrc.connect(humFilter).connect(humGain).connect(this._master);
    humSrc.start();
    this._nodes.humGain = humGain;

    // ─── Wheel Rhythm (low-freq periodic click) ───
    const wheelGain = ctx.createGain();
    wheelGain.gain.value = 0;
    wheelGain.connect(this._master);
    this._nodes.wheelGain = wheelGain;
    this._wheelPhase = 0;
    this._lastClick = 0;

    // ─── Wind Noise (white noise band-passed) ───
    const whiteBuf = this._createWhiteNoise(ctx);
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = whiteBuf;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 800;
    windFilter.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter).connect(windGain).connect(this._master);
    windSrc.start();
    this._nodes.windGain = windGain;
    this._nodes.windFilter = windFilter;

    // ─── Rain Noise ───
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = whiteBuf;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 3000;
    rainFilter.Q.value = 0.3;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFilter).connect(rainGain).connect(this._master);
    rainSrc.start();
    this._nodes.rainGain = rainGain;

    this._initialised = true;
    this._enabled = true;
    // Fade master in
    this._master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.5);
  }

  /* ─── per-frame update ─── */
  update(dt, state) {
    if (!this._initialised || !this._enabled) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const w = state.weather;

    // ── wind gain reacts to speed + weather ──
    const baseWind = 0.04 + state.speed * 0.3;
    const weatherWind = w.current === 'stormy' ? 0.25 :
                        w.current === 'rainy'  ? 0.12 :
                        w.current === 'snowy'  ? 0.06 : 0;
    const windTarget = clamp(baseWind + weatherWind * w.intensity, 0, 0.4);
    this._nodes.windGain.gain.setTargetAtTime(windTarget, now, 0.3);

    // Wind pitch shifts with speed
    const windFreq = 600 + state.speed * 1200 + w.windSpeed * 400;
    this._nodes.windFilter.frequency.setTargetAtTime(windFreq, now, 0.5);

    // ── rain ──
    const isRain = w.current === 'rainy' || w.current === 'stormy' ||
                   w.target === 'rainy' || w.target === 'stormy';
    const rainTarget = isRain ? 0.12 * w.intensity : 0;
    this._nodes.rainGain.gain.setTargetAtTime(rainTarget, now, 0.8);

    // ── wheel rhythm — periodic clicks ──
    this._wheelPhase += dt * 1.5;   // ~1.5 Hz
    if (this._wheelPhase >= 1) {
      this._wheelPhase -= 1;
      this._triggerWheelClick(now);
    }

    // ── thunder (triggered by lightning flash) ──
    if (w.lightning > 0.9) {
      this._triggerThunder(now);
    }
  }

  /* ─── enable / disable ─── */
  setEnabled(bool) {
    this._enabled = bool;
    if (!this._initialised) return;
    const now = this._ctx.currentTime;
    this._master.gain.setTargetAtTime(bool ? 0.6 : 0, now, 0.3);
  }

  /* ─── teardown ─── */
  destroy() {
    if (this._ctx) {
      this._ctx.close().catch(() => {});
      this._ctx = null;
    }
    this._initialised = false;
    this._enabled = false;
  }

  /* ─── internals ─── */

  _triggerWheelClick(time) {
    if (!this._ctx) return;
    const ctx = this._ctx;
    // Short burst of low-frequency oscillation
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 42;

    const env = ctx.createGain();
    env.gain.value = 0;
    env.gain.setValueAtTime(0.08, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(env).connect(this._master);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  _triggerThunder(time) {
    if (!this._ctx) return;
    // Prevent rapid re-triggers
    if (this._thunderTimeout) return;
    this._thunderTimeout = setTimeout(() => { this._thunderTimeout = null; }, 2000);

    const ctx = this._ctx;

    // Low rumble: brown noise burst
    const buf = this._createBrownNoise(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);

    src.connect(filter).connect(gain).connect(this._master);
    src.start(time);
    src.stop(time + 2);
  }

  /** Generate a white noise AudioBuffer */
  _createWhiteNoise(ctx) {
    const buf = ctx.createBuffer(1, NOISE_BUFFER_SIZE, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /** Generate a brown noise AudioBuffer (integrated white noise) */
  _createBrownNoise(ctx) {
    const buf = ctx.createBuffer(1, NOISE_BUFFER_SIZE, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;   // amplify
    }
    return buf;
  }
}
