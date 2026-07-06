/* ───────────────────────────────────────────────────────────
 *  overlay.js — Window glass effects layer
 *  Glass tint · Reflections · Rain droplets · Condensation
 *  Dust motes · Sun glare · Vignette
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, smoothstep, hexToRgba } from '../config.js';
import { SimplexNoise } from '../engine/noise.js';
import { WINDOW_REFLECTION, CELESTIAL } from '../data/palettes.js';
import { getCoach } from '../data/coaches.js';

const MAX_DROPLETS = 50;
const MAX_DUST     = 20;

/* ── Time phase resolver ─────────────────────────────── */
function getTimePhase(t) {
  if (t < 0.08) return 'dawn';
  if (t < 0.15) return 'sunrise';
  if (t < 0.30) return 'morning';
  if (t < 0.50) return 'noon';
  if (t < 0.65) return 'evening';
  if (t < 0.75) return 'dusk';
  if (t < 0.90) return 'night';
  return 'midnight';
}

export default class OverlayLayer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this.noise = new SimplexNoise(55);

    /* Rain droplet pool */
    this.droplets = new Array(MAX_DROPLETS);
    for (let i = 0; i < MAX_DROPLETS; i++) {
      this.droplets[i] = {
        active: false,
        x: 0, y: 0, r: 0,
        vx: 0, vy: 0,
        trail: [],        // previous positions for streak
        life: 0,
        opacity: 0,
      };
    }

    /* Dust mote pool */
    this.dust = new Array(MAX_DUST);
    for (let i = 0; i < MAX_DUST; i++) {
      this.dust[i] = {
        active: false,
        x: 0, y: 0, size: 0,
        vx: 0, vy: 0,
        brightness: 0,
        life: 0,
      };
    }
  }

  resize(w, h) { this.w = w; this.h = h; }

  /* ── update ──────────────────────────────────────── */

  update(dt, state) {
    const dtS = dt / 1000;
    const weather = state.weather;
    const wind = weather.windSpeed || 0;
    const isWet = weather.current === 'rainy' || weather.current === 'stormy';
    const isClear = weather.current === 'clear';

    /* ── Rain droplets ─────────────────────────────── */
    if (isWet) {
      const targetDroplets = Math.floor(lerp(8, MAX_DROPLETS, weather.intensity));
      let count = 0;
      for (let i = 0; i < MAX_DROPLETS; i++) {
        if (this.droplets[i].active) count++;
      }
      /* Spawn new droplets */
      if (count < targetDroplets && Math.random() < 0.15) {
        for (let i = 0; i < MAX_DROPLETS; i++) {
          if (!this.droplets[i].active) {
            const d = this.droplets[i];
            d.active = true;
            d.x = Math.random() * this.w;
            d.y = Math.random() * this.h * 0.3;
            d.r = 1.5 + Math.random() * 2.5;
            d.vx = wind * 8 + (Math.random() - 0.5) * 3;
            d.vy = 15 + Math.random() * 35 + d.r * 6;
            d.trail = [];
            d.life = 0;
            d.opacity = 0.3 + Math.random() * 0.4;
            break;
          }
        }
      }
    }

    /* Update droplets */
    for (let i = 0; i < MAX_DROPLETS; i++) {
      const d = this.droplets[i];
      if (!d.active) continue;

      d.life += dtS;

      /* Save trail point */
      if (d.trail.length === 0 || d.life > 0.05) {
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 12) d.trail.shift();
      }

      /* Gravity + wind */
      d.vy += 40 * dtS;     // gravity acceleration
      d.x += d.vx * dtS;
      d.y += d.vy * dtS;

      /* Merge check — absorb nearby droplets */
      for (let j = i + 1; j < MAX_DROPLETS; j++) {
        const o = this.droplets[j];
        if (!o.active) continue;
        const dx = d.x - o.x;
        const dy = d.y - o.y;
        if (dx * dx + dy * dy < 100) {
          d.r = Math.min(d.r + o.r * 0.3, 5);
          d.vy += 5;
          o.active = false;
        }
      }

      /* Off-screen */
      if (d.y > this.h + 10 || d.x < -10 || d.x > this.w + 10) {
        d.active = false;
      }
    }

    /* ── Dust motes ────────────────────────────────── */
    const phase = getTimePhase(state.time);
    const wantDust = (isClear || weather.current === 'cloudy')
      && (phase === 'morning' || phase === 'noon' || phase === 'sunrise');

    if (wantDust) {
      let dCount = 0;
      for (let i = 0; i < MAX_DUST; i++) {
        if (this.dust[i].active) dCount++;
      }
      if (dCount < 12 && Math.random() < 0.04) {
        for (let i = 0; i < MAX_DUST; i++) {
          if (!this.dust[i].active) {
            const m = this.dust[i];
            m.active = true;
            m.x = Math.random() * this.w;
            m.y = Math.random() * this.h;
            m.size = 0.8 + Math.random() * 1.5;
            m.vx = (Math.random() - 0.5) * 8;
            m.vy = (Math.random() - 0.5) * 6;
            m.brightness = 0.4 + Math.random() * 0.6;
            m.life = 0;
            break;
          }
        }
      }
    }

    for (let i = 0; i < MAX_DUST; i++) {
      const m = this.dust[i];
      if (!m.active) continue;
      m.life += dtS;
      m.x += m.vx * dtS;
      m.y += m.vy * dtS;
      /* Gentle noise drift */
      m.vx += this.noise.noise2D(m.x * 0.01, m.life) * 2 * dtS;
      m.vy += this.noise.noise2D(m.life, m.y * 0.01) * 1.5 * dtS;

      if (m.life > 6 || m.x < -5 || m.x > this.w + 5 || m.y < -5 || m.y > this.h + 5) {
        m.active = false;
      }
    }
  }

  /* ── render ──────────────────────────────────────── */

  render(state) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const phase = getTimePhase(state.time);
    const weather = state.weather;

    /* ── 1. Glass tint ───────────────────────────── */
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#2a6a6a';          // blue-green train window glass
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    /* ── 2. Reflections ──────────────────────────── */
    const reflectionAlpha = WINDOW_REFLECTION[phase] || 0.1;
    if (reflectionAlpha > 0.05) {
      this._drawReflections(ctx, w, h, reflectionAlpha, state);
    }

    /* ── 3. Rain droplets on glass ───────────────── */
    this._drawDroplets(ctx);

    /* ── 4. Condensation ─────────────────────────── */
    if (weather.current === 'foggy' || weather.current === 'snowy') {
      this._drawCondensation(ctx, w, h, weather);
    }

    /* ── 5. Dust motes ───────────────────────────── */
    this._drawDustMotes(ctx);

    /* ── 6. Sun glare / lens flare ───────────────── */
    const sunGlow = CELESTIAL[phase]?.sunGlow || 0;
    const sunY = CELESTIAL[phase]?.sunY || 0.5;
    if (sunGlow > 0.3 && sunY > 0.6) {
      this._drawSunGlare(ctx, w, h, sunGlow, sunY, state);
    }

    /* ── 7. Vignette ─────────────────────────────── */
    this._drawVignette(ctx, w, h);
  }

  /* ── Reflections ───────────────────────────────── */

  _drawReflections(ctx, w, h, alpha, state) {
    ctx.save();
    ctx.globalAlpha = alpha;

    /* Ambient cabin light reflection — warm glow at top */
    const coach = getCoach(state.coach);
    const lightCol = coach.cabin.lightColor || '#ffe8c0';

    const reflGrad = ctx.createLinearGradient(0, 0, 0, h);
    reflGrad.addColorStop(0, hexToRgba(lightCol, 0.15));
    reflGrad.addColorStop(0.3, 'rgba(0,0,0,0)');
    reflGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    reflGrad.addColorStop(1, hexToRgba(lightCol, 0.08));
    ctx.fillStyle = reflGrad;
    ctx.fillRect(0, 0, w, h);

    /* Passenger silhouette hint — subtle dark shape at bottom-right */
    if (alpha > 0.2) {
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = 'rgba(20,20,30,0.6)';

      /* Simple seated figure silhouette */
      ctx.beginPath();
      /* Head */
      ctx.arc(w * 0.78, h * 0.62, w * 0.035, 0, Math.PI * 2);
      ctx.fill();
      /* Shoulder/body block */
      ctx.beginPath();
      ctx.ellipse(w * 0.78, h * 0.76, w * 0.055, h * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ── Rain droplets on glass ────────────────────── */

  _drawDroplets(ctx) {
    ctx.save();
    for (let i = 0; i < MAX_DROPLETS; i++) {
      const d = this.droplets[i];
      if (!d.active) continue;

      const fadeIn = clamp(d.life * 3, 0, 1);

      /* Trail streak */
      if (d.trail.length > 2) {
        ctx.globalAlpha = d.opacity * fadeIn * 0.2;
        ctx.strokeStyle = 'rgba(180,200,220,0.4)';
        ctx.lineWidth = d.r * 0.4;
        ctx.beginPath();
        ctx.moveTo(d.trail[0].x, d.trail[0].y);
        for (let t = 1; t < d.trail.length; t++) {
          ctx.lineTo(d.trail[t].x, d.trail[t].y);
        }
        ctx.stroke();
      }

      /* Droplet body — refraction lens effect */
      ctx.globalAlpha = d.opacity * fadeIn;

      /* Outer ring */
      ctx.strokeStyle = 'rgba(200,220,240,0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.stroke();

      /* Inner fill — slight lens distortion tint */
      const dropGrad = ctx.createRadialGradient(
        d.x - d.r * 0.3, d.y - d.r * 0.3, 0,
        d.x, d.y, d.r,
      );
      dropGrad.addColorStop(0, 'rgba(240,245,255,0.25)');
      dropGrad.addColorStop(0.6, 'rgba(200,215,235,0.12)');
      dropGrad.addColorStop(1, 'rgba(180,200,220,0.06)');
      ctx.fillStyle = dropGrad;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();

      /* Specular highlight */
      ctx.globalAlpha = d.opacity * fadeIn * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(d.x - d.r * 0.25, d.y - d.r * 0.25, d.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── Condensation ──────────────────────────────── */

  _drawCondensation(ctx, w, h, weather) {
    ctx.save();
    const intensity = clamp(weather.intensity, 0, 1);
    const alpha = 0.08 + intensity * 0.15;

    /* Radial gradient from edges inward */
    const grad = ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(w, h) * 0.2,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.65,
    );
    grad.addColorStop(0, 'rgba(200,210,225,0)');
    grad.addColorStop(0.6, `rgba(200,210,225,${alpha * 0.3})`);
    grad.addColorStop(0.85, `rgba(200,210,225,${alpha * 0.7})`);
    grad.addColorStop(1, `rgba(200,210,225,${alpha})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    /* Extra bottom-edge condensation pooling */
    const bottomGrad = ctx.createLinearGradient(0, h * 0.85, 0, h);
    bottomGrad.addColorStop(0, 'rgba(200,210,225,0)');
    bottomGrad.addColorStop(1, `rgba(200,210,225,${alpha * 0.5})`);
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, h * 0.85, w, h * 0.15);

    ctx.restore();
  }

  /* ── Dust motes ────────────────────────────────── */

  _drawDustMotes(ctx) {
    ctx.save();
    for (let i = 0; i < MAX_DUST; i++) {
      const m = this.dust[i];
      if (!m.active) continue;

      /* Fade in/out over lifetime */
      const fadeIn = clamp(m.life * 2, 0, 1);
      const fadeOut = clamp((6 - m.life) * 0.5, 0, 1);
      const alpha = m.brightness * fadeIn * fadeOut * 0.6;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff8e0';

      /* Tiny glowing dot */
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();

      /* Soft glow */
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── Sun glare / lens flare ────────────────────── */

  _drawSunGlare(ctx, w, h, glow, sunY, state) {
    ctx.save();

    /* Sun position: low on horizon during sunrise/dusk */
    const sunScreenY = h * clamp(sunY, 0, 1);
    const sunScreenX = w * (state.time < 0.5 ? 0.2 : 0.8);
    const flareR = w * 0.18 * glow;

    /* Main bloom */
    ctx.globalAlpha = glow * 0.25;
    const bloom = ctx.createRadialGradient(
      sunScreenX, sunScreenY, 0,
      sunScreenX, sunScreenY, flareR,
    );
    bloom.addColorStop(0, 'rgba(255,245,220,0.6)');
    bloom.addColorStop(0.3, 'rgba(255,220,160,0.3)');
    bloom.addColorStop(0.7, 'rgba(255,200,120,0.08)');
    bloom.addColorStop(1, 'rgba(255,180,100,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    /* Secondary flare circles (lens artifacts) */
    ctx.globalCompositeOperation = 'screen';
    const centerX = w * 0.5;
    const centerY = h * 0.5;
    const dirX = centerX - sunScreenX;
    const dirY = centerY - sunScreenY;

    const flarePositions = [0.3, 0.5, 0.7, 1.1];
    const flareSizes = [0.04, 0.025, 0.06, 0.03];
    const flareAlphas = [0.12, 0.08, 0.15, 0.06];

    for (let f = 0; f < flarePositions.length; f++) {
      const fx = sunScreenX + dirX * flarePositions[f];
      const fy = sunScreenY + dirY * flarePositions[f];
      const fr = w * flareSizes[f];

      ctx.globalAlpha = glow * flareAlphas[f];
      const flareGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      flareGrad.addColorStop(0, 'rgba(255,240,200,0.5)');
      flareGrad.addColorStop(0.5, 'rgba(255,200,120,0.15)');
      flareGrad.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ── Vignette ──────────────────────────────────── */

  _drawVignette(ctx, w, h) {
    ctx.save();

    const grad = ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(w, h) * 0.35,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.72,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0.18)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }
}
