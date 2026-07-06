/* ───────────────────────────────────────────────────────────
 *  background.js — Distant terrain silhouettes
 *  2-3 mountain/hill layers with parallax scrolling,
 *  atmospheric perspective, biome blending, and snow caps.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, blendColors, hexToRgba } from '../config.js';
import { ATMOSPHERE, GROUND_TINTS } from '../data/palettes.js';
import { getBiome } from '../data/biomes.js';
import { SimplexNoise } from '../engine/noise.js';
import { getTimePhase } from './sky.js';

const PARALLAX = [0.08, 0.12, 0.18];       // 3 distance layers
const LAYER_HEIGHTS = [0.28, 0.35, 0.42];  // base Y (fraction of height)
const LAYER_ALPHA = [0.55, 0.70, 0.88];    // nearer = more opaque

export default class BackgroundLayer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this.noise = new SimplexNoise(13);
  }

  resize(w, h) { this.w = w; this.h = h; }

  update(/* dt, state */) {}

  render(state) {
    const { ctx, w, h, noise } = this;
    const { phase, nextPhase, blend } = getTimePhase(state.time);

    // Biome terrain params
    const biomeA = getBiome(state.biome.current);
    const biomeB = state.biome.next ? getBiome(state.biome.next) : biomeA;
    const bBlend = state.biome.blend || 0;

    const terrainH = lerp(biomeA.terrainHeight, biomeB.terrainHeight, bBlend);
    const terrainV = lerp(biomeA.terrainVariation, biomeB.terrainVariation, bBlend);
    const nScale  = lerp(biomeA.noiseScale, biomeB.noiseScale, bBlend);
    const isSnowy = state.biome.current === 'snow' || state.biome.current === 'mountains';

    // Atmosphere colors for phase
    const atmosA = ATMOSPHERE[phase];
    const atmosB = ATMOSPHERE[nextPhase];
    const fogNear = blendColors(atmosA.fogNear, atmosB.fogNear, blend);
    const fogFar  = blendColors(atmosA.fogFar,  atmosB.fogFar,  blend);
    const haze    = lerp(atmosA.haze, atmosB.haze, blend);

    // Ground tints
    const tintA = GROUND_TINTS[phase];
    const tintB = GROUND_TINTS[nextPhase];
    const baseGround = blendColors(tintA.base, tintB.base, blend);

    ctx.save();

    for (let l = 0; l < 3; l++) {
      const parallax = PARALLAX[l];
      const baseY = LAYER_HEIGHTS[l];
      const alpha = LAYER_ALPHA[l];

      // Noise frequency & amplitude scale per layer (farther = smoother, lower)
      const freq = (nScale * 0.6) * (1 + l * 0.5);
      const amp  = terrainV * (0.5 + l * 0.3);
      const layerTerrainH = terrainH * (0.4 + l * 0.25);

      // Distance-based atmospheric tint
      const distanceFactor = 1 - (l / 3);                       // 0 = nearest layer
      const layerColor = blendColors(baseGround, fogFar, distanceFactor * 0.6 + haze);
      const layerColorWithAtmos = blendColors(layerColor, fogNear, distanceFactor * 0.35);

      // Scroll offset for parallax
      const scrollX = state.scroll * parallax;

      // Build terrain path
      ctx.beginPath();
      const step = 4;                               // px per sample (performance)
      for (let px = -step; px <= w + step; px += step) {
        const worldX = (px + scrollX) * freq;
        const n = noise.fbm(worldX, l * 100, 4 + l);
        const yNorm = baseY + n * amp;
        const sy = h * clamp(yNorm, 0, 1);
        if (px <= 0) ctx.moveTo(px, sy);
        else ctx.lineTo(px, sy);
      }

      // Close path to bottom
      ctx.lineTo(w + step, h);
      ctx.lineTo(-step, h);
      ctx.closePath();

      // Fill with atmospheric color
      ctx.globalAlpha = alpha;
      ctx.fillStyle = layerColorWithAtmos;
      ctx.fill();

      // Snow caps on the nearest background layer for snowy biomes
      if (isSnowy && l === 2) {
        this._drawSnowCaps(state, scrollX, freq, amp, baseY, layerTerrainH, step);
      }
    }

    ctx.restore();
  }

  /* ── Snow caps: white overlay on mountain peaks ── */
  _drawSnowCaps(state, scrollX, freq, amp, baseY, layerTerrainH, step) {
    const { ctx, w, h, noise } = this;
    const snowLine = baseY - amp * 0.15;            // snow starts near peaks

    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#e8ecf4';

    ctx.beginPath();
    let started = false;
    for (let px = -step; px <= w + step; px += step) {
      const worldX = (px + scrollX) * freq;
      const n = noise.fbm(worldX, 200, 4);
      const yNorm = baseY + n * amp;
      const sy = h * clamp(yNorm, 0, 1);
      const snowSy = h * clamp(snowLine + n * amp * 0.2, 0, 1);

      if (yNorm < snowLine + amp * 0.2) {
        // This section is high enough for snow
        if (!started) { ctx.moveTo(px, sy); started = true; }
        else ctx.lineTo(px, sy);
      } else {
        // Below snow line — close to terrain
        if (started) { ctx.lineTo(px, sy); }
        else { ctx.moveTo(px, sy); started = true; }
      }
    }

    // Close path to create snow cap fill
    // Walk backwards along the snow line
    for (let px = w + step; px >= -step; px -= step) {
      const worldX = (px + scrollX) * freq;
      const n = noise.fbm(worldX, 200, 4);
      const yNorm = baseY + n * amp;
      const snowCapY = Math.min(yNorm, snowLine + Math.abs(n) * amp * 0.08);
      const sy = h * clamp(snowCapY, 0, 1);
      ctx.lineTo(px, sy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
