/* ───────────────────────────────────────────────────────────
 *  weather.js — Weather particle overlay layer
 *  Rain · Snow · Fog · Storm + Lightning
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, smoothstep, hexToRgba } from '../config.js';
import { SimplexNoise } from '../engine/noise.js';

const MAX_PARTICLES = 500;

/* ── Particle types ──────────────────────────────────────── */
const TYPE_RAIN  = 0;
const TYPE_SNOW  = 1;
const TYPE_STORM = 2;

/* ── Desired counts per weather at full intensity ────────── */
const BUDGET = {
  clear:  0,
  cloudy: 0,
  rainy:  220,
  snowy:  180,
  foggy:  0,
  stormy: 400,
};

export default class WeatherLayer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this.noise = new SimplexNoise(77);

    /* Pre-allocate particle pool */
    this.pool = new Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool[i] = {
        active: false, type: 0,
        x: 0, y: 0, vx: 0, vy: 0,
        len: 0, size: 0, opacity: 0,
        phase: 0,        // snow wobble phase
        life: 0,         // for fade-in
      };
    }
    this.activeCount = 0;
    this.fogOffset = 0;
  }

  resize(w, h) { this.w = w; this.h = h; }

  /* ── helpers ──────────────────────────────────────────── */

  _acquire() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  _spawnRain(p, wind) {
    p.active = true;
    p.type   = TYPE_RAIN;
    p.x      = Math.random() * this.w * 1.3 - this.w * 0.15;
    p.y      = -Math.random() * this.h * 0.3;
    p.len    = 10 + Math.random() * 20;
    p.vy     = 600 + Math.random() * 300;
    p.vx     = wind * 120 + (Math.random() - 0.5) * 40;
    p.opacity = 0.15 + Math.random() * 0.25;
    p.life   = 0;
  }

  _spawnSnow(p, wind) {
    p.active = true;
    p.type   = TYPE_SNOW;
    p.x      = Math.random() * this.w * 1.2 - this.w * 0.1;
    p.y      = -Math.random() * this.h * 0.1;
    p.size   = 1.5 + Math.random() * 3;
    p.vy     = 30 + Math.random() * 50;
    p.vx     = wind * 30 + (Math.random() - 0.5) * 15;
    p.opacity = 0.3 + Math.random() * 0.5;
    p.phase  = Math.random() * Math.PI * 2;
    p.life   = 0;
  }

  _spawnStorm(p, wind) {
    p.active = true;
    p.type   = TYPE_STORM;
    p.x      = Math.random() * this.w * 1.5 - this.w * 0.25;
    p.y      = -Math.random() * this.h * 0.4;
    p.len    = 18 + Math.random() * 25;
    p.vy     = 900 + Math.random() * 500;
    p.vx     = wind * 200 + (Math.random() - 0.5) * 80;
    p.opacity = 0.2 + Math.random() * 0.35;
    p.life   = 0;
  }

  /* ── update ──────────────────────────────────────────── */

  update(dt, state) {
    const { weather } = state;
    const wind = weather.windSpeed || 0;
    const intensity = clamp(weather.intensity, 0, 1);
    const wType = weather.current;

    /* Target particle count scaled by intensity */
    const target = Math.round((BUDGET[wType] || 0) * intensity);

    /* Count active particles */
    let count = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pool[i].active) count++;
    }

    /* Gradual spawn / despawn for smooth transition */
    const spawnRate = Math.ceil((target - count) * 0.08);

    if (count < target) {
      for (let s = 0; s < Math.min(spawnRate, 12); s++) {
        const p = this._acquire();
        if (!p) break;
        if (wType === 'snowy')       this._spawnSnow(p, wind);
        else if (wType === 'stormy') this._spawnStorm(p, wind);
        else                         this._spawnRain(p, wind);
      }
    } else if (count > target) {
      /* Fade out excess particles by marking oldest */
      let toKill = Math.min(count - target, 8);
      for (let i = 0; i < MAX_PARTICLES && toKill > 0; i++) {
        if (this.pool[i].active) {
          this.pool[i].active = false;
          toKill--;
        }
      }
    }

    /* Move particles */
    const dtS = dt / 1000;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += dtS;

      if (p.type === TYPE_SNOW) {
        /* Gentle horizontal wobble */
        p.phase += dtS * 2.2;
        p.x += (p.vx + Math.sin(p.phase) * 25) * dtS;
        p.y += p.vy * dtS;
      } else {
        /* Rain / Storm — wind-angled streaks */
        p.x += p.vx * dtS;
        p.y += p.vy * dtS;
      }

      /* Off-screen reset */
      if (p.y > this.h + 40 || p.x < -60 || p.x > this.w + 60) {
        p.active = false;
      }
    }

    /* Fog drift offset */
    this.fogOffset += dtS * 12;
  }

  /* ── render ──────────────────────────────────────────── */

  render(state) {
    const ctx = this.ctx;
    const { weather, elapsed } = state;
    const w = this.w;
    const h = this.h;
    const wType = weather.current;
    const intensity = clamp(weather.intensity, 0, 1);

    /* ── Lightning flash ─────────────────────────────── */
    if (weather.lightning > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(weather.lightning, 0, 0.9);
      ctx.fillStyle = '#f0f0ff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      /* Jagged lightning bolt */
      if (weather.lightning > 0.3) {
        this._drawBolt(ctx, w, h, weather.lightning);
      }
    }

    /* ── Particles ───────────────────────────────────── */
    ctx.save();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const fadeIn = clamp(p.life * 4, 0, 1);

      if (p.type === TYPE_SNOW) {
        /* Snowflake — soft circle */
        ctx.globalAlpha = p.opacity * fadeIn;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        /* Subtle glow */
        ctx.globalAlpha = p.opacity * fadeIn * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        /* Rain / Storm streak */
        const angle = Math.atan2(p.vy, p.vx);
        const len = p.len * (p.type === TYPE_STORM ? 1.3 : 1);
        const ex = p.x + Math.cos(angle) * len;
        const ey = p.y + Math.sin(angle) * len;

        ctx.globalAlpha = p.opacity * fadeIn;
        ctx.strokeStyle = p.type === TYPE_STORM
          ? 'rgba(180,195,220,0.7)'
          : 'rgba(200,215,240,0.5)';
        ctx.lineWidth = p.type === TYPE_STORM ? 1.6 : 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
    ctx.restore();

    /* ── Fog overlay ─────────────────────────────────── */
    if (wType === 'foggy' || wType === 'snowy' || wType === 'stormy') {
      this._drawFog(ctx, w, h, weather, elapsed);
    }
  }

  /* ── Fog rendering ─────────────────────────────────── */

  _drawFog(ctx, w, h, weather, elapsed) {
    const intensity = clamp(weather.intensity, 0, 1);
    const isFoggy = weather.current === 'foggy';
    const alpha = isFoggy
      ? 0.25 + intensity * 0.35
      : 0.08 + intensity * 0.12;

    ctx.save();

    /* Drifting noise-based fog banks */
    const nx = this.fogOffset * 0.004;
    const ny = elapsed * 0.0001;

    /* Edge fog — thicker at edges, thinner in center */
    const grad = ctx.createRadialGradient(
      w * 0.5, h * 0.5, w * 0.15,
      w * 0.5, h * 0.5, w * 0.7,
    );
    const fogColor = isFoggy ? '200,210,225' : '170,185,210';
    grad.addColorStop(0, `rgba(${fogColor},0)`);
    grad.addColorStop(0.5, `rgba(${fogColor},${alpha * 0.3})`);
    grad.addColorStop(0.8, `rgba(${fogColor},${alpha * 0.7})`);
    grad.addColorStop(1.0, `rgba(${fogColor},${alpha})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    /* Second pass: drifting wisps using noise */
    ctx.globalCompositeOperation = 'screen';
    for (let band = 0; band < 3; band++) {
      const by = h * (0.3 + band * 0.2);
      const noiseVal = this.noise.noise2D(nx + band * 3.7, ny + band * 1.3);
      const drift = noiseVal * w * 0.12;
      const bandAlpha = alpha * (0.15 + band * 0.05);

      const wispGrad = ctx.createLinearGradient(drift, by - h * 0.15, drift + w, by + h * 0.15);
      wispGrad.addColorStop(0, `rgba(${fogColor},0)`);
      wispGrad.addColorStop(0.3, `rgba(${fogColor},${bandAlpha})`);
      wispGrad.addColorStop(0.7, `rgba(${fogColor},${bandAlpha * 0.6})`);
      wispGrad.addColorStop(1, `rgba(${fogColor},0)`);

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = wispGrad;
      ctx.fillRect(0, by - h * 0.15, w, h * 0.3);
    }

    ctx.restore();
  }

  /* ── Lightning bolt ────────────────────────────────── */

  _drawBolt(ctx, w, h, intensity) {
    ctx.save();
    ctx.globalAlpha = clamp(intensity * 1.2, 0, 1);
    ctx.strokeStyle = '#e8eeff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#aaccff';
    ctx.shadowBlur = 18;

    const startX = w * (0.3 + Math.random() * 0.4);
    let x = startX;
    let y = 0;
    const segments = 8 + Math.floor(Math.random() * 6);
    const segH = (h * 0.65) / segments;

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let s = 0; s < segments; s++) {
      x += (Math.random() - 0.5) * 60;
      y += segH + Math.random() * segH * 0.4;
      ctx.lineTo(x, y);

      /* Branch */
      if (Math.random() < 0.35) {
        const bx = x + (Math.random() - 0.5) * 80;
        const by = y + segH * (0.5 + Math.random() * 0.8);
        ctx.moveTo(x, y);
        ctx.lineTo(bx, by);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();

    /* Bright core */
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    x = startX;
    y = 0;
    ctx.moveTo(x, y);
    for (let s = 0; s < segments; s++) {
      x += (Math.random() - 0.5) * 55;
      y += segH + Math.random() * segH * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }
}
