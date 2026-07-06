/* ───────────────────────────────────────────────────────────
 *  midground.js — Primary scenery layer
 *  Terrain, trees, structures, fields, water — the densest
 *  visual content layer, scrolling at mid-parallax speed.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, blendColors, hexToRgba } from '../config.js';
import { GROUND_TINTS } from '../data/palettes.js';
import { getBiome } from '../data/biomes.js';
import { SimplexNoise } from '../engine/noise.js';
import { getTimePhase } from './sky.js';

const PARALLAX = 0.45;
const SPAWN_INTERVAL = 120;    // px between spawn checks

export default class MidgroundLayer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this.noise = new SimplexNoise(31);
    this.spawnNoise = new SimplexNoise(47);
  }

  resize(w, h) { this.w = w; this.h = h; }
  update() {}

  render(state) {
    const { ctx, w, h, noise } = this;
    const { phase, nextPhase, blend } = getTimePhase(state.time);
    const biomeA = getBiome(state.biome.current);
    const biomeB = state.biome.next ? getBiome(state.biome.next) : biomeA;
    const bBlend = state.biome.blend || 0;
    const isTunnel = biomeA.isTunnel;
    if (isTunnel) return;        // tunnel handled by foreground

    const terrainH = lerp(biomeA.terrainHeight, biomeB.terrainHeight, bBlend);
    const terrainV = lerp(biomeA.terrainVariation, biomeB.terrainVariation, bBlend);
    const nScale  = lerp(biomeA.noiseScale, biomeB.noiseScale, bBlend);
    const scrollX = state.scroll * PARALLAX;

    // Time-of-day tints
    const tintA = GROUND_TINTS[phase];
    const tintB = GROUND_TINTS[nextPhase];
    const groundColor = blendColors(tintA.base, tintB.base, blend);
    const vegColor    = blendColors(tintA.vegetation, tintB.vegetation, blend);
    const waterColor  = blendColors(tintA.water, tintB.water, blend);
    const nightFactor = clamp(1 - lerp(
      ['night', 'midnight'].includes(phase) ? 0.35 : 1,
      ['night', 'midnight'].includes(nextPhase) ? 0.35 : 1,
      blend
    ), 0, 1);

    // Biome ground colors (blended A/B)
    const biomeGround = blendColors(
      biomeA.colors.ground[0],
      biomeB.colors.ground[0],
      bBlend
    );
    const fillColor = blendColors(biomeGround, groundColor, 0.45);

    ctx.save();

    /* ── Terrain profile ─────────────────────────────────── */
    const terrainY = (px) => {
      const wx = (px + scrollX) * nScale;
      const n = noise.fbm(wx, 0, 5);
      return h * clamp(terrainH + n * terrainV, 0.1, 0.95);
    };

    // Draw ground fill
    ctx.beginPath();
    const step = 3;
    for (let px = -step; px <= w + step; px += step) {
      const sy = terrainY(px);
      if (px <= 0) ctx.moveTo(px, sy);
      else ctx.lineTo(px, sy);
    }
    ctx.lineTo(w + step, h);
    ctx.lineTo(-step, h);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    /* ── Crop fields (farmland) ───────────────────────────── */
    if (biomeA.vegetation.type === 'crops') {
      this._drawCropFields(state, scrollX, terrainY, biomeA);
    }

    /* ── Water ────────────────────────────────────────────── */
    const hasWater = biomeA.hasWater || biomeB.hasWater;
    const waterLevel = biomeA.waterLevel || biomeB.waterLevel || 0.75;
    if (hasWater) {
      this._drawWater(state, waterLevel, waterColor);
    }

    /* ── Spawn objects along scroll ──────────────────────── */
    const visibleStart = Math.floor(scrollX / SPAWN_INTERVAL) - 2;
    const visibleEnd   = visibleStart + Math.ceil(w / SPAWN_INTERVAL) + 4;

    for (let slot = visibleStart; slot <= visibleEnd; slot++) {
      const worldX = slot * SPAWN_INTERVAL;
      const screenX = worldX - scrollX;
      if (screenX < -150 || screenX > w + 150) continue;

      const groundY = terrainY(screenX);
      const seed = this.spawnNoise.noise2D(slot * 0.73, 17);
      const seed2 = this.spawnNoise.noise2D(slot * 1.31, 41);

      // Vegetation
      const treeChance = lerp(biomeA.vegetation.treeChance, biomeB.vegetation.treeChance, bBlend);
      if (seed > 1 - treeChance * 2) {
        const types = biomeA.vegetation.treeTypes;
        if (types.length > 0) {
          const tIdx = Math.abs(Math.floor(seed2 * 100)) % types.length;
          this._drawTree(types[tIdx], screenX, groundY, seed2, vegColor, nightFactor);
        }
      }

      // Structures
      const structChance = lerp(biomeA.structures.chance, biomeB.structures.chance, bBlend);
      if (seed2 > 1 - structChance * 2 && seed < 0.5) {
        const types = biomeA.structures.types;
        if (types.length > 0) {
          const sIdx = Math.abs(Math.floor(seed * 100)) % types.length;
          this._drawStructure(types[sIdx], screenX, groundY, seed, state, nightFactor);
        }
      }
    }

    ctx.restore();
  }

  /* ═══════════ TREES ═══════════ */

  _drawTree(type, x, groundY, seed, vegColor, nightFactor) {
    const { ctx, h } = this;
    const s = 0.7 + Math.abs(seed) * 0.6;          // size variation
    const dark = 0.6 + nightFactor * 0.4;           // night darkening

    if (type === 'deciduous') {
      const trunkH = 28 * s;
      const trunkW = 4 * s;
      const canopyR = 16 * s;

      // Trunk
      ctx.fillStyle = hexToRgba('#5a4030', dark);
      ctx.fillRect(x - trunkW / 2, groundY - trunkH, trunkW, trunkH);

      // Canopy — 2-3 overlapping circles
      const canopyColor = blendColors(vegColor, '#2d6b1e', Math.abs(seed));
      ctx.fillStyle = hexToRgba(canopyColor, dark);
      ctx.beginPath();
      ctx.arc(x, groundY - trunkH - canopyR * 0.4, canopyR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - canopyR * 0.4, groundY - trunkH - canopyR * 0.1, canopyR * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + canopyR * 0.5, groundY - trunkH - canopyR * 0.2, canopyR * 0.7, 0, Math.PI * 2);
      ctx.fill();

    } else if (type === 'conifer') {
      const trunkH = 35 * s;
      const trunkW = 3 * s;
      const baseW = 18 * s;

      ctx.fillStyle = hexToRgba('#4a3520', dark);
      ctx.fillRect(x - trunkW / 2, groundY - trunkH * 0.3, trunkW, trunkH * 0.3);

      // Three stacked triangles
      const coniferColor = blendColors(vegColor, '#1a4a22', Math.abs(seed) * 0.5);
      ctx.fillStyle = hexToRgba(coniferColor, dark);
      for (let tier = 0; tier < 3; tier++) {
        const ty = groundY - trunkH * (0.3 + tier * 0.25);
        const tw = baseW * (1 - tier * 0.25);
        ctx.beginPath();
        ctx.moveTo(x, ty - trunkH * 0.28);
        ctx.lineTo(x - tw / 2, ty);
        ctx.lineTo(x + tw / 2, ty);
        ctx.closePath();
        ctx.fill();
      }

    } else if (type === 'palm') {
      const trunkH = 40 * s;
      const trunkW = 3 * s;

      // Curved trunk
      ctx.strokeStyle = hexToRgba('#7a6040', dark);
      ctx.lineWidth = trunkW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      const lean = seed * 15;
      ctx.quadraticCurveTo(x + lean * 0.6, groundY - trunkH * 0.5, x + lean, groundY - trunkH);
      ctx.stroke();

      // Fronds
      const topX = x + lean;
      const topY = groundY - trunkH;
      const frondColor = blendColors(vegColor, '#3a8a30', 0.5);
      ctx.strokeStyle = hexToRgba(frondColor, dark);
      ctx.lineWidth = 2;
      for (let f = 0; f < 6; f++) {
        const angle = (f / 6) * Math.PI * 2;
        const fx = topX + Math.cos(angle) * 18 * s;
        const fy = topY + Math.sin(angle) * 10 * s + 5 * s;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
          topX + Math.cos(angle) * 10 * s,
          topY - 6 * s,
          fx, fy
        );
        ctx.stroke();
      }
    }
  }

  /* ═══════════ STRUCTURES ═══════════ */

  _drawStructure(type, x, groundY, seed, state, nightFactor) {
    const { ctx, h } = this;
    const s = 0.8 + Math.abs(seed) * 0.4;
    const dark = 0.5 + nightFactor * 0.5;
    const isNight = nightFactor < 0.6;

    switch (type) {
      case 'house': {
        const bw = 30 * s, bh = 22 * s;
        const roofH = 14 * s;
        // Body
        ctx.fillStyle = hexToRgba(seed > 0 ? '#c8a882' : '#b8907a', dark);
        ctx.fillRect(x - bw / 2, groundY - bh, bw, bh);
        // Roof
        ctx.fillStyle = hexToRgba('#8b4513', dark);
        ctx.beginPath();
        ctx.moveTo(x - bw / 2 - 4, groundY - bh);
        ctx.lineTo(x, groundY - bh - roofH);
        ctx.lineTo(x + bw / 2 + 4, groundY - bh);
        ctx.closePath();
        ctx.fill();
        // Window
        ctx.fillStyle = isNight ? 'rgba(255,220,100,0.8)' : 'rgba(140,180,220,0.6)';
        ctx.fillRect(x - 4 * s, groundY - bh + 5 * s, 8 * s, 6 * s);
        break;
      }
      case 'temple': {
        const bw = 36 * s, bh = 28 * s;
        ctx.fillStyle = hexToRgba('#d4c4a0', dark);
        ctx.fillRect(x - bw / 2, groundY - bh, bw, bh);
        // Dome / shikhara
        ctx.fillStyle = hexToRgba('#cc8844', dark);
        ctx.beginPath();
        ctx.arc(x, groundY - bh, bw * 0.35, Math.PI, 0);
        ctx.fill();
        // Spire
        ctx.fillStyle = hexToRgba('#b87333', dark);
        ctx.fillRect(x - 2, groundY - bh - bw * 0.35 - 10 * s, 4, 10 * s);
        break;
      }
      case 'building': {
        const bw = 24 * s, bh = 45 * s;
        ctx.fillStyle = hexToRgba('#909098', dark);
        ctx.fillRect(x - bw / 2, groundY - bh, bw, bh);
        // Window rows
        const wColor = isNight ? 'rgba(255,230,120,0.7)' : 'rgba(160,200,240,0.5)';
        ctx.fillStyle = wColor;
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 2; col++) {
            const wx = x - bw * 0.3 + col * bw * 0.4;
            const wy = groundY - bh + 6 * s + row * 10 * s;
            ctx.fillRect(wx, wy, 5 * s, 5 * s);
          }
        }
        break;
      }
      case 'barn': {
        const bw = 40 * s, bh = 20 * s;
        ctx.fillStyle = hexToRgba('#8b4513', dark);
        ctx.fillRect(x - bw / 2, groundY - bh, bw, bh);
        // Sloped roof
        ctx.fillStyle = hexToRgba('#654321', dark);
        ctx.beginPath();
        ctx.moveTo(x - bw / 2 - 3, groundY - bh);
        ctx.lineTo(x, groundY - bh - 10 * s);
        ctx.lineTo(x + bw / 2 + 3, groundY - bh);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'pole': {
        ctx.strokeStyle = hexToRgba('#505050', dark);
        ctx.lineWidth = 2;
        const pH = 50 * s;
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x, groundY - pH);
        ctx.stroke();
        // Crossbar
        ctx.beginPath();
        ctx.moveTo(x - 10 * s, groundY - pH + 4);
        ctx.lineTo(x + 10 * s, groundY - pH + 4);
        ctx.stroke();
        break;
      }
      case 'fence': {
        ctx.strokeStyle = hexToRgba('#705030', dark);
        ctx.lineWidth = 1.5;
        for (let p = -2; p <= 2; p++) {
          const fx = x + p * 10 * s;
          ctx.beginPath();
          ctx.moveTo(fx, groundY);
          ctx.lineTo(fx, groundY - 12 * s);
          ctx.stroke();
        }
        // Horizontal rails
        ctx.beginPath();
        ctx.moveTo(x - 20 * s, groundY - 10 * s);
        ctx.lineTo(x + 20 * s, groundY - 10 * s);
        ctx.moveTo(x - 20 * s, groundY - 5 * s);
        ctx.lineTo(x + 20 * s, groundY - 5 * s);
        ctx.stroke();
        break;
      }
      case 'lamp': {
        const pH = 40 * s;
        ctx.strokeStyle = hexToRgba('#606060', dark);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x, groundY - pH);
        ctx.stroke();
        // Lamp glow
        const glowAlpha = isNight ? 0.9 : 0.15;
        const glowR = isNight ? 10 : 4;
        const glow = ctx.createRadialGradient(x, groundY - pH, 0, x, groundY - pH, glowR * s);
        glow.addColorStop(0, `rgba(255,240,180,${glowAlpha})`);
        glow.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - glowR * s, groundY - pH - glowR * s, glowR * 2 * s, glowR * 2 * s);
        // Bulb
        ctx.fillStyle = isNight ? '#fff0b0' : '#e0d8c0';
        ctx.beginPath();
        ctx.arc(x, groundY - pH, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'sign': {
        const pH = 20 * s;
        ctx.strokeStyle = hexToRgba('#505050', dark);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x, groundY - pH);
        ctx.stroke();
        ctx.fillStyle = hexToRgba('#e8e8d8', dark);
        ctx.fillRect(x - 8 * s, groundY - pH - 8 * s, 16 * s, 8 * s);
        break;
      }
    }
  }

  /* ═══════════ CROP FIELDS ═══════════ */

  _drawCropFields(state, scrollX, terrainY, biome) {
    const { ctx, w, h, noise } = this;
    const cropColors = ['#8aa830', '#a0b840', '#7a9820', '#b8c848'];

    ctx.save();
    ctx.globalAlpha = 0.5;
    const rowH = 6;
    const baseY = h * biome.terrainHeight;

    for (let row = 0; row < 10; row++) {
      const ry = baseY + row * rowH + 4;
      if (ry > h) break;
      const colorIdx = (row + Math.floor(scrollX * 0.001)) % cropColors.length;
      ctx.fillStyle = cropColors[colorIdx];
      ctx.fillRect(0, ry, w, rowH - 1);
    }
    ctx.restore();
  }

  /* ═══════════ WATER ═══════════ */

  _drawWater(state, waterLevel, waterColor) {
    const { ctx, w, h, noise } = this;
    const wy = h * waterLevel;

    // Water body
    ctx.save();
    ctx.globalAlpha = 0.7;
    const grad = ctx.createLinearGradient(0, wy, 0, h);
    grad.addColorStop(0, hexToRgba(waterColor, 0.6));
    grad.addColorStop(1, hexToRgba(waterColor, 0.9));
    ctx.fillStyle = grad;
    ctx.fillRect(0, wy, w, h - wy);

    // Wave lines
    ctx.strokeStyle = hexToRgba('#ffffff', 0.15);
    ctx.lineWidth = 1;
    for (let wave = 0; wave < 5; wave++) {
      const waveY = wy + 8 + wave * 12;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 6) {
        const n = noise.noise2D(px * 0.01 + state.elapsed * 0.5, wave * 5 + state.elapsed * 0.2);
        const sy = waveY + n * 3;
        if (px === 0) ctx.moveTo(px, sy);
        else ctx.lineTo(px, sy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
