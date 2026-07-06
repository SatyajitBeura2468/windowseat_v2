/* ───────────────────────────────────────────────────────────
 *  sky.js — Atmospheric sky layer
 *  Multi-gradient sky dome with sun, moon, stars, clouds,
 *  and god rays. Sets the emotional tone for the entire scene.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, smoothstep, hexToRgb, rgbToHex, blendColors, hexToRgba } from '../config.js';
import { TIME_PHASES } from '../config.js';
import { SKY_GRADIENTS, CELESTIAL, CLOUD_COLORS, WEATHER_MODIFIERS } from '../data/palettes.js';
import { SimplexNoise } from '../engine/noise.js';

const PHASE_KEYS = Object.keys(TIME_PHASES);    // ordered dawn → midnight
const STAR_COUNT = 200;
const CLOUD_LAYERS = 3;

/* ── helper: determine current phase, next phase, and blend ── */
export function getTimePhase(time) {
  const t = ((time % 1) + 1) % 1;               // normalise to [0,1)
  for (let i = 0; i < PHASE_KEYS.length; i++) {
    const key = PHASE_KEYS[i];
    const { start, end } = TIME_PHASES[key];
    if (t >= start && t < end) {
      const nextIdx = (i + 1) % PHASE_KEYS.length;
      const blend = (t - start) / (end - start);
      return {
        phase: key.toLowerCase(),
        nextPhase: PHASE_KEYS[nextIdx].toLowerCase(),
        blend,
      };
    }
  }
  return { phase: 'midnight', nextPhase: 'dawn', blend: 0 };
}

/* ── pre-generate star positions (seeded pseudo-random) ── */
function generateStars(seed) {
  const stars = [];
  let s = seed | 0;
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: rand(),
      y: rand() * 0.6,           // upper 60 % of sky
      size: 0.5 + rand() * 1.5,
      brightness: 0.4 + rand() * 0.6,
      twinkleSpeed: 1.5 + rand() * 3,
      twinkleOffset: rand() * Math.PI * 2,
    });
  }
  return stars;
}

export default class SkyLayer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this.noise = new SimplexNoise(7);
    this.stars = generateStars(42);

    // Cloud pool — 3 altitude layers, each with several blobs
    this.clouds = [];
    for (let layer = 0; layer < CLOUD_LAYERS; layer++) {
      const count = 5 + layer * 2;
      for (let i = 0; i < count; i++) {
        this.clouds.push({
          layer,
          x: (i / count) + Math.random() * 0.15,
          y: 0.08 + layer * 0.12 + Math.random() * 0.08,
          scaleX: 80 + Math.random() * 120,
          scaleY: 25 + Math.random() * 30,
          speed: 0.003 + layer * 0.002 + Math.random() * 0.003,
          seed: Math.random() * 1000,
        });
      }
    }
  }

  resize(w, h) { this.w = w; this.h = h; }

  update(/* dt, state */) { /* rendering is stateless per frame */ }

  render(state) {
    const { ctx, w, h } = this;
    const { phase, nextPhase, blend } = getTimePhase(state.time);
    const weather = state.weather || {};
    const wMod = WEATHER_MODIFIERS[weather.current] || WEATHER_MODIFIERS.clear;
    const wIntensity = weather.intensity ?? 0;

    /* ── 1. Sky gradient ──────────────────────────────────── */
    this._drawSkyGradient(phase, nextPhase, blend, wMod, wIntensity);

    /* ── 2. Stars ─────────────────────────────────────────── */
    const cel  = CELESTIAL[phase];
    const celN = CELESTIAL[nextPhase];
    const starAlpha = lerp(cel.stars, celN.stars, blend);
    if (starAlpha > 0.01) this._drawStars(state, starAlpha);

    /* ── 3. Moon ──────────────────────────────────────────── */
    const moonAlpha = lerp(cel.moonAlpha, celN.moonAlpha, blend);
    if (moonAlpha > 0.01) this._drawMoon(state, moonAlpha);

    /* ── 4. Sun disc + glow ───────────────────────────────── */
    const sunY = lerp(cel.sunY, celN.sunY, blend);
    const sunGlow = lerp(cel.sunGlow, celN.sunGlow, blend);
    if (sunY < 1.05 && sunGlow > 0.01) this._drawSun(sunY, sunGlow);

    /* ── 5. God rays (sunrise / dusk) ─────────────────────── */
    if (sunGlow > 0.3 && sunY > 0.55) this._drawGodRays(state, sunY, sunGlow);

    /* ── 6. Clouds ────────────────────────────────────────── */
    this._drawClouds(state, phase, nextPhase, blend, wMod, wIntensity);
  }

  /* ═══════════ private renderers ═══════════ */

  _drawSkyGradient(phase, nextPhase, blend, wMod, wIntensity) {
    const { ctx, w, h } = this;
    const stopsA = SKY_GRADIENTS[phase];
    const stopsB = SKY_GRADIENTS[nextPhase];
    const grad = ctx.createLinearGradient(0, 0, 0, h);

    // Merge both stop lists — use matching positions
    const maxLen = Math.max(stopsA.length, stopsB.length);
    for (let i = 0; i < maxLen; i++) {
      const a = stopsA[Math.min(i, stopsA.length - 1)];
      const b = stopsB[Math.min(i, stopsB.length - 1)];
      const pos = lerp(a.stop, b.stop, blend);
      let color = blendColors(a.color, b.color, blend);
      // Weather shift
      if (wMod.skyBlend > 0) {
        const sb = wMod.skyBlend * wIntensity;
        color = blendColors(color, wMod.skyShift, sb);
      }
      grad.addColorStop(clamp(pos), color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawStars(state, alpha) {
    const { ctx, w, h } = this;
    const t = state.elapsed;
    ctx.save();
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinkleOffset);
      const a = alpha * star.brightness * twinkle;
      if (a < 0.02) continue;
      ctx.fillStyle = `rgba(255,255,245,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size * (state.dpr || 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawMoon(state, alpha) {
    const { ctx, w, h } = this;
    const mx = w * 0.78;
    const my = h * 0.15;
    const r = Math.min(w, h) * 0.04;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow
    const glow = ctx.createRadialGradient(mx, my, r * 0.3, mx, my, r * 3);
    glow.addColorStop(0, 'rgba(200,210,255,0.25)');
    glow.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6);

    // Disc
    const disc = ctx.createRadialGradient(mx - r * 0.2, my - r * 0.2, 0, mx, my, r);
    disc.addColorStop(0, '#f0f0ff');
    disc.addColorStop(0.6, '#d8dce8');
    disc.addColorStop(1, '#b0b8cc');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();

    // Crater texture — a few subtle dark circles
    ctx.globalAlpha = alpha * 0.15;
    ctx.fillStyle = '#8890a8';
    const craters = [
      { cx: 0.25, cy: -0.2, cr: 0.18 },
      { cx: -0.15, cy: 0.3, cr: 0.14 },
      { cx: 0.35, cy: 0.2, cr: 0.1 },
      { cx: -0.3, cy: -0.15, cr: 0.12 },
      { cx: 0.05, cy: 0.1, cr: 0.2 },
    ];
    for (const c of craters) {
      ctx.beginPath();
      ctx.arc(mx + c.cx * r, my + c.cy * r, c.cr * r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawSun(sunY, sunGlow) {
    const { ctx, w, h } = this;
    const sx = w * 0.3;
    const sy = h * sunY;
    const r = Math.min(w, h) * 0.035;

    ctx.save();

    // Outer glow halo
    const haloR = r * (4 + sunGlow * 4);
    const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, haloR);
    halo.addColorStop(0, hexToRgba('#fffbe0', 0.35 * sunGlow));
    halo.addColorStop(0.3, hexToRgba('#ffc040', 0.15 * sunGlow));
    halo.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sx - haloR, sy - haloR, haloR * 2, haloR * 2);

    // Sun disc
    const disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    disc.addColorStop(0, '#fffff0');
    disc.addColorStop(0.5, '#ffe060');
    disc.addColorStop(1, '#ffa030');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawGodRays(state, sunY, sunGlow) {
    const { ctx, w, h } = this;
    const sx = w * 0.3;
    const sy = h * sunY;
    const rayCount = 7;
    const intensity = clamp((sunGlow - 0.3) / 0.5) * 0.12;

    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.fillStyle = hexToRgba('#ffe8a0', 0.6);

    for (let i = 0; i < rayCount; i++) {
      const angle = -Math.PI * 0.5 + (i / (rayCount - 1) - 0.5) * Math.PI * 0.8;
      const wobble = this.noise.noise2D(i * 3.3, state.elapsed * 0.15) * 0.08;
      const a = angle + wobble;
      const len = h * (0.5 + 0.3 * Math.sin(state.elapsed * 0.3 + i));
      const spread = 0.025 + 0.015 * Math.sin(state.elapsed * 0.5 + i * 2);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - spread) * len, sy + Math.sin(a - spread) * len);
      ctx.lineTo(sx + Math.cos(a + spread) * len, sy + Math.sin(a + spread) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawClouds(state, phase, nextPhase, blend, wMod, wIntensity) {
    const { ctx, w, h, noise } = this;
    const colA = CLOUD_COLORS[phase];
    const colB = CLOUD_COLORS[nextPhase];
    const baseColor = blendColors(colA.base, colB.base, blend);
    const shadowColor = blendColors(colA.shadow, colB.shadow, blend);
    const highlightColor = blendColors(colA.highlight, colB.highlight, blend);

    // Weather: more clouds when cloudy/rainy/stormy
    const weatherDensity = (wMod.skyBlend > 0) ? 0.5 + wIntensity * 0.5 : 0.5;

    ctx.save();
    for (const cloud of this.clouds) {
      // Scroll position (wrapping)
      const scrollSpeed = cloud.speed * (1 + (state.speed || 0) * 0.2);
      let cx = ((cloud.x + state.elapsed * scrollSpeed) % 1.3) - 0.15;
      const cy = cloud.y;

      // Noise-based shape modulation
      const t = state.elapsed * 0.08;
      const morph = noise.noise3D(cloud.seed, cx * 2, t);

      const sw = cloud.scaleX * (1 + morph * 0.3);
      const sh = cloud.scaleY * (1 + morph * 0.15);
      const px = cx * w;
      const py = cy * h;

      const alpha = weatherDensity * (0.4 + cloud.layer * 0.15);
      if (alpha < 0.03) continue;

      // Draw cloud as several overlapping ellipses
      ctx.globalAlpha = alpha;
      const blobCount = 4 + cloud.layer;
      for (let b = 0; b < blobCount; b++) {
        const bx = px + (b / blobCount - 0.5) * sw;
        const by = py + noise.noise2D(cloud.seed + b * 7, t) * sh * 0.3;
        const br = (sh * 0.6) + noise.noise2D(cloud.seed + b * 13, t * 0.5) * sh * 0.25;

        // Bottom half shadow, top half highlight
        const isUpper = (b % 2 === 0);
        ctx.fillStyle = isUpper ? highlightColor : baseColor;
        ctx.beginPath();
        ctx.ellipse(bx, by, br * 1.3, br, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shadow underside
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = shadowColor;
      ctx.beginPath();
      ctx.ellipse(px, py + sh * 0.35, sw * 0.45, sh * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
