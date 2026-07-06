/* ───────────────────────────────────────────────────────────
 *  foreground.js — Nearest parallax layer
 *  Railway tracks, sleepers, gravel, signal poles, speed signs,
 *  trackside vegetation, tunnel walls, bridge girders, and
 *  station platforms. Creates the strongest sense of motion.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, hexToRgba, blendColors } from '../config.js';
import { GROUND_TINTS } from '../data/palettes.js';
import { getBiome } from '../data/biomes.js';
import { SimplexNoise } from '../engine/noise.js';
import { getTimePhase } from './sky.js';

const PARALLAX = 1.0;
const SLEEPER_SPACING = 22;       // px between ties
const SIGNAL_SPACING  = 800;      // px between signal poles
const SIGN_SPACING    = 400;      // px between speed signs / km stones

export default class ForegroundLayer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this.noise = new SimplexNoise(59);
  }

  resize(w, h) { this.w = w; this.h = h; }
  update() {}

  render(state) {
    const { ctx, w, h } = this;
    const { phase, nextPhase, blend } = getTimePhase(state.time);
    const biome = getBiome(state.biome.current);
    const scrollX = state.scroll * PARALLAX;
    const isNight = ['night', 'midnight'].includes(phase);

    // Time tints
    const tintA = GROUND_TINTS[phase];
    const tintB = GROUND_TINTS[nextPhase];
    const groundColor = blendColors(tintA.base, tintB.base, blend);

    ctx.save();

    /* ── Special biome rendering ─────────────────────────── */
    if (biome.isTunnel) {
      this._drawTunnel(state, scrollX, isNight);
    }
    if (biome.isBridge) {
      this._drawBridge(state, scrollX);
    }
    if (state.biome.current === 'station') {
      this._drawPlatform(state, groundColor);
    }

    /* ── Track bed (gravel strip) ────────────────────────── */
    const trackBaseY = h * 0.88;
    const trackBedTop = trackBaseY - 10;
    const trackBedBot = h;

    // Gravel bed
    const gravelGrad = ctx.createLinearGradient(0, trackBedTop, 0, trackBedBot);
    gravelGrad.addColorStop(0, hexToRgba('#8a8070', 0.6));
    gravelGrad.addColorStop(0.3, hexToRgba('#706858', 0.8));
    gravelGrad.addColorStop(1, hexToRgba('#5a5040', 0.9));
    ctx.fillStyle = gravelGrad;
    ctx.fillRect(0, trackBedTop, w, trackBedBot - trackBedTop);

    /* ── Gravel texture (small dots) ─────────────────────── */
    ctx.fillStyle = 'rgba(120,110,95,0.4)';
    const gravelStep = 7;
    const gravelOffset = scrollX % gravelStep;
    for (let gx = -gravelOffset; gx < w; gx += gravelStep) {
      const gy = trackBedTop + 2 + Math.abs(this.noise.noise2D(gx * 0.3, 77)) * (trackBedBot - trackBedTop - 4);
      const gs = 0.8 + Math.abs(this.noise.noise2D(gx * 0.5, 99)) * 1.2;
      ctx.fillRect(gx, gy, gs, gs);
    }

    /* ── Sleepers / ties ─────────────────────────────────── */
    const railLeft   = w * 0.32;
    const railRight  = w * 0.68;
    const sleeperExt = 20;       // how far sleepers extend past rails

    ctx.fillStyle = hexToRgba('#4a3828', 0.85);
    const sleeperOffset = scrollX % SLEEPER_SPACING;
    for (let sx = -sleeperOffset; sx < w + SLEEPER_SPACING; sx += SLEEPER_SPACING) {
      // Slight perspective: narrow at top
      const topL = railLeft - sleeperExt;
      const topR = railRight + sleeperExt;
      ctx.fillRect(topL, trackBaseY - 2, topR - topL, 4);
    }

    // Re-draw sleepers at proper scroll interval
    ctx.fillStyle = hexToRgba('#5a4838', 0.9);
    for (let sx = -sleeperOffset; sx < w + SLEEPER_SPACING; sx += SLEEPER_SPACING) {
      ctx.fillRect(railLeft - sleeperExt, trackBaseY - 2, railRight - railLeft + sleeperExt * 2, 3.5);
    }

    /* ── Rails ───────────────────────────────────────────── */
    ctx.strokeStyle = hexToRgba('#a0a0a8', 0.9);
    ctx.lineWidth = 2.5;
    // Left rail
    ctx.beginPath();
    ctx.moveTo(0, trackBaseY);
    ctx.lineTo(w, trackBaseY);
    ctx.stroke();
    // Right rail — slight perspective convergence
    ctx.beginPath();
    ctx.moveTo(0, trackBaseY);
    ctx.lineTo(w, trackBaseY);
    ctx.stroke();

    // Actually draw two rails with proper spacing
    const railY = trackBaseY;
    ctx.strokeStyle = '#b0b0b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railLeft, railY);
    ctx.lineTo(railLeft, railY);     // left end to right end
    ctx.stroke();

    // Draw continuous rail lines
    ctx.strokeStyle = '#c0c0c8';
    ctx.lineWidth = 2.5;
    // Left rail
    ctx.beginPath(); ctx.moveTo(0, railY); ctx.lineTo(w, railY - 0.5); ctx.stroke();
    // Right rail with slight convergence toward horizon
    ctx.beginPath(); ctx.moveTo(railLeft, railY); ctx.lineTo(w, railY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railRight, railY); ctx.lineTo(w, railY); ctx.stroke();

    // Proper rail rendering — two clean lines
    ctx.strokeStyle = '#b8b8c0';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, railY - 1); ctx.lineTo(w, railY - 1); ctx.stroke();     // left rail
    ctx.strokeStyle = '#b0b0b8';
    ctx.beginPath(); ctx.moveTo(0, railY + 8); ctx.lineTo(w, railY + 8); ctx.stroke();   // right rail

    /* ── Trackside grass / weeds ─────────────────────────── */
    this._drawTracksideGrass(state, scrollX, trackBedTop, isNight);

    /* ── Signal poles ────────────────────────────────────── */
    this._drawSignalPoles(state, scrollX, trackBaseY, isNight);

    /* ── Speed signs & km stones ─────────────────────────── */
    this._drawSignsAndStones(state, scrollX, trackBaseY);

    ctx.restore();
  }

  /* ═══════════ TRACKSIDE GRASS ═══════════ */

  _drawTracksideGrass(state, scrollX, trackTop, isNight) {
    const { ctx, w, noise } = this;
    const grassColor = isNight ? '#1a2a15' : '#4a8a30';
    ctx.strokeStyle = hexToRgba(grassColor, 0.7);
    ctx.lineWidth = 1.2;

    const grassSpacing = 8;
    const offset = scrollX % grassSpacing;

    for (let gx = -offset; gx < w; gx += grassSpacing) {
      const n = noise.noise2D(gx * 0.1 + scrollX * 0.01, 33);
      const grassH = 4 + Math.abs(n) * 8;
      const lean = n * 3;
      // Left side of track
      ctx.beginPath();
      ctx.moveTo(gx, trackTop);
      ctx.lineTo(gx + lean, trackTop - grassH);
      ctx.stroke();
      // Right side — mirrored
      ctx.beginPath();
      ctx.moveTo(w - gx, trackTop);
      ctx.lineTo(w - gx - lean, trackTop - grassH);
      ctx.stroke();
    }
  }

  /* ═══════════ SIGNAL POLES ═══════════ */

  _drawSignalPoles(state, scrollX, trackBaseY, isNight) {
    const { ctx, w, h, noise } = this;
    const offset = scrollX % SIGNAL_SPACING;
    const startSlot = Math.floor(scrollX / SIGNAL_SPACING);

    for (let sx = -offset; sx < w + SIGNAL_SPACING; sx += SIGNAL_SPACING) {
      if (sx < -60 || sx > w + 60) continue;

      const slot = startSlot + Math.round((sx + offset) / SIGNAL_SPACING);
      const side = (slot % 2 === 0) ? -1 : 1;     // alternate sides
      const poleX = side > 0 ? w * 0.75 : w * 0.25;
      const poleH = 65;

      // Pole
      ctx.strokeStyle = '#606068';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(poleX, trackBaseY - 15);
      ctx.lineTo(poleX, trackBaseY - 15 - poleH);
      ctx.stroke();

      // Signal head (3 lights)
      const headY = trackBaseY - 15 - poleH;
      const headW = 8;
      const headH = 22;
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(poleX - headW / 2, headY, headW, headH);

      // Determine signal color from slot hash
      const sigSeed = noise.noise2D(slot * 7.7, 55);
      const signalState = sigSeed > 0.3 ? 'green' : (sigSeed > -0.2 ? 'yellow' : 'red');
      const colors = { red: '#ff2020', yellow: '#ffcc00', green: '#20ff40' };
      const offColor = '#1a1a1a';

      const lightR = 2.5;
      const lights = ['red', 'yellow', 'green'];
      for (let li = 0; li < 3; li++) {
        const ly = headY + 3 + li * 7;
        const isOn = lights[li] === signalState;
        ctx.fillStyle = isOn ? colors[lights[li]] : offColor;
        ctx.beginPath();
        ctx.arc(poleX, ly, lightR, 0, Math.PI * 2);
        ctx.fill();
        // Glow for active light
        if (isOn && isNight) {
          const glow = ctx.createRadialGradient(poleX, ly, 0, poleX, ly, 15);
          glow.addColorStop(0, hexToRgba(colors[lights[li]], 0.3));
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(poleX - 15, ly - 15, 30, 30);
        }
      }
    }
  }

  /* ═══════════ SPEED SIGNS & KM STONES ═══════════ */

  _drawSignsAndStones(state, scrollX, trackBaseY) {
    const { ctx, w, noise } = this;
    const offset = scrollX % SIGN_SPACING;
    const startSlot = Math.floor(scrollX / SIGN_SPACING);

    for (let sx = -offset; sx < w + SIGN_SPACING; sx += SIGN_SPACING) {
      if (sx < -30 || sx > w + 30) continue;

      const slot = startSlot + Math.round((sx + offset) / SIGN_SPACING);
      const type = (slot % 3 === 0) ? 'sign' : 'stone';
      const sideX = (slot % 2 === 0) ? w * 0.2 : w * 0.8;

      if (type === 'sign') {
        // Speed sign — small white rectangle with number
        const pH = 18;
        ctx.strokeStyle = '#707078';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sideX, trackBaseY - 10);
        ctx.lineTo(sideX, trackBaseY - 10 - pH);
        ctx.stroke();

        ctx.fillStyle = '#f0f0e8';
        ctx.fillRect(sideX - 7, trackBaseY - 10 - pH - 10, 14, 10);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sideX - 7, trackBaseY - 10 - pH - 10, 14, 10);

        // Number
        ctx.fillStyle = '#222';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        const speed = ((Math.abs(slot) * 30 + 60) % 130) + 20;
        ctx.fillText(String(speed), sideX, trackBaseY - 10 - pH - 3);
      } else {
        // Km stone — small trapezoidal marker
        ctx.fillStyle = '#e0d8c0';
        const stoneH = 8;
        ctx.fillRect(sideX - 3, trackBaseY - 10 - stoneH, 6, stoneH);
      }
    }
  }

  /* ═══════════ TUNNEL ═══════════ */

  _drawTunnel(state, scrollX, isNight) {
    const { ctx, w, h, noise } = this;
    const wallW = w * 0.12;

    // Dark walls on both sides
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, wallW, h);
    ctx.fillRect(w - wallW, 0, wallW, h);

    // Ceiling
    ctx.fillRect(0, 0, w, h * 0.06);

    // Tunnel arch — darker gradient at edges
    const leftGrad = ctx.createLinearGradient(wallW, 0, wallW + 40, 0);
    leftGrad.addColorStop(0, 'rgba(20,20,20,0.7)');
    leftGrad.addColorStop(1, 'rgba(20,20,20,0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(wallW, 0, 40, h);

    const rightGrad = ctx.createLinearGradient(w - wallW, 0, w - wallW - 40, 0);
    rightGrad.addColorStop(0, 'rgba(20,20,20,0.7)');
    rightGrad.addColorStop(1, 'rgba(20,20,20,0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(w - wallW - 40, 0, 40, h);

    // Occasional tunnel lights
    const lightSpacing = 250;
    const lightOffset = scrollX % lightSpacing;
    for (let lx = -lightOffset; lx < w; lx += lightSpacing) {
      if (lx < wallW || lx > w - wallW) continue;
      // Orange light
      const ly = h * 0.08;
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 50);
      glow.addColorStop(0, 'rgba(255,180,80,0.5)');
      glow.addColorStop(0.4, 'rgba(255,150,50,0.15)');
      glow.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 50, ly - 50, 100, 100);
      // Bulb
      ctx.fillStyle = '#ffa040';
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ═══════════ BRIDGE GIRDERS ═══════════ */

  _drawBridge(state, scrollX) {
    const { ctx, w, h } = this;
    const girderSpacing = 150;
    const offset = scrollX % girderSpacing;
    const girderColor = '#607080';
    const topY = h * 0.1;
    const botY = h * 0.85;

    ctx.strokeStyle = girderColor;
    ctx.lineWidth = 3;

    // Top horizontal beam
    ctx.beginPath(); ctx.moveTo(0, topY); ctx.lineTo(w, topY); ctx.stroke();
    // Bottom horizontal beam
    ctx.beginPath(); ctx.moveTo(0, botY); ctx.lineTo(w, botY); ctx.stroke();

    // Vertical and diagonal girders
    for (let gx = -offset; gx < w + girderSpacing; gx += girderSpacing) {
      // Vertical
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx, topY);
      ctx.lineTo(gx, botY);
      ctx.stroke();

      // Cross bracing (X pattern)
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = hexToRgba(girderColor, 0.7);
      ctx.beginPath();
      ctx.moveTo(gx, topY);
      ctx.lineTo(gx + girderSpacing, botY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx + girderSpacing, topY);
      ctx.lineTo(gx, botY);
      ctx.stroke();
      ctx.strokeStyle = girderColor;
    }

    // Rivets at intersections
    ctx.fillStyle = '#8090a0';
    for (let gx = -offset; gx < w + girderSpacing; gx += girderSpacing) {
      ctx.beginPath(); ctx.arc(gx, topY, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx, botY, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ═══════════ STATION PLATFORM ═══════════ */

  _drawPlatform(state, groundColor) {
    const { ctx, w, h } = this;
    const platY = h * 0.82;
    const platH = h - platY;

    // Platform surface
    ctx.fillStyle = '#a09888';
    ctx.fillRect(0, platY, w, platH);

    // Yellow safety line
    ctx.fillStyle = '#e8c820';
    ctx.fillRect(0, platY, w, 3);

    // Platform edge shadow
    const edgeGrad = ctx.createLinearGradient(0, platY, 0, platY + 8);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, platY, w, 8);

    // Tile pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    const tileSize = 30;
    for (let tx = 0; tx < w; tx += tileSize) {
      ctx.beginPath(); ctx.moveTo(tx, platY); ctx.lineTo(tx, h); ctx.stroke();
    }
  }
}
