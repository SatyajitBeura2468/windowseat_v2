/* ───────────────────────────────────────────────────────────
 *  interior.js — Train cabin frame & interior overlay
 *  Renders the window frame, cabin details, seats, curtains,
 *  luggage racks, fans, and ambient cabin glow.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, hexToRgba, hexToRgb, blendColors } from '../config.js';
import { getCoach } from '../data/coaches.js';
import { SimplexNoise } from '../engine/noise.js';

export default class InteriorLayer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this.noise = new SimplexNoise(33);
    this.coach = null;
    this.coachKey = null;
  }

  resize(w, h) { this.w = w; this.h = h; }

  update(dt, state) {
    /* Cache coach config when it changes */
    if (state.coach !== this.coachKey) {
      this.coachKey = state.coach;
      this.coach = getCoach(state.coach);
    }
  }

  render(state) {
    const ctx = this.ctx;
    const c = this.coach || getCoach('sleeper');
    const w = this.w;
    const h = this.h;

    const win = c.window;
    const frame = c.frame;
    const cabin = c.cabin;

    /* Window pixel bounds */
    const wx = w * win.left;
    const wy = h * win.top;
    const ww = w * (win.right - win.left);
    const wh = h * (win.bottom - win.top);
    const cr = win.cornerRadius * (w / 800);
    const thick = frame.thickness * (w / 800);

    ctx.save();

    /* ── Cabin walls (everything outside the window) ─── */
    this._drawCabinWalls(ctx, w, h, wx, wy, ww, wh, cr, cabin);

    /* ── Top area: luggage rack / fan ────────────────── */
    if (wy > thick * 1.5) {
      this._drawTopArea(ctx, w, wx, wy, ww, cabin, state);
    }

    /* ── Bottom area: seat ───────────────────────────── */
    const bottomY = wy + wh;
    if (h - bottomY > thick * 1.5) {
      this._drawSeatArea(ctx, w, h, wx, bottomY, ww, cabin, state);
    }

    /* ── Side areas: curtains ────────────────────────── */
    if (cabin.hasCurtains && cabin.curtainColor) {
      this._drawCurtains(ctx, wx, wy, ww, wh, thick, cabin, state);
    }

    /* ── Main frame border ───────────────────────────── */
    this._drawFrame(ctx, wx, wy, ww, wh, cr, thick, frame, state);

    /* ── Vande Bharat LED strip ──────────────────────── */
    if (cabin.hasLedStrip && cabin.ledColor) {
      this._drawLedStrip(ctx, wx, wy, ww, thick, cabin, state);
    }

    /* ── Ambient cabin glow ──────────────────────────── */
    this._drawAmbientGlow(ctx, w, h, wx, wy, ww, wh, cabin);

    ctx.restore();
  }

  /* ── Cabin wall fill (clipped around window) ──────── */

  _drawCabinWalls(ctx, w, h, wx, wy, ww, wh, cr, cabin) {
    ctx.save();

    /* Fill the entire canvas with wall color, then cut the window */
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    /* Counter-clockwise rounded rect to create hole */
    this._roundedRectPath(ctx, wx, wy, ww, wh, cr, true);
    ctx.fillStyle = cabin.wallColor;
    ctx.fill('evenodd');

    /* Subtle wall texture — very faint noise pattern */
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#000000';
    ctx.fill('evenodd');
    ctx.restore();
  }

  /* ── Frame rendering ──────────────────────────────── */

  _drawFrame(ctx, wx, wy, ww, wh, cr, thick, frame, state) {
    const material = frame.material;

    ctx.save();

    /* Outer frame border */
    ctx.lineWidth = thick;
    ctx.strokeStyle = frame.color;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    this._roundedRectPath(ctx, wx, wy, ww, wh, cr);
    ctx.stroke();

    /* Inner bevel — lighter edge */
    const innerInset = thick * 0.4;
    ctx.lineWidth = 2;
    ctx.strokeStyle = blendColors(frame.color, '#ffffff', 0.25);
    ctx.beginPath();
    this._roundedRectPath(ctx, wx + innerInset, wy + innerInset,
      ww - innerInset * 2, wh - innerInset * 2, Math.max(cr - 2, 1));
    ctx.stroke();

    /* Outer bevel — darker edge */
    ctx.strokeStyle = blendColors(frame.color, '#000000', 0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this._roundedRectPath(ctx, wx - 1, wy - 1, ww + 2, wh + 2, cr + 1);
    ctx.stroke();

    /* Material-specific texture */
    this._drawMaterialTexture(ctx, wx, wy, ww, wh, cr, thick, material, frame);

    /* Corner details */
    this._drawCorners(ctx, wx, wy, ww, wh, cr, thick, material, frame);

    ctx.restore();
  }

  /* ── Material textures ─────────────────────────────── */

  _drawMaterialTexture(ctx, wx, wy, ww, wh, cr, thick, material, frame) {
    ctx.save();
    ctx.globalAlpha = 0.12;

    if (material === 'metal') {
      /* Horizontal brushed-metal lines */
      ctx.strokeStyle = blendColors(frame.color, '#ffffff', 0.35);
      ctx.lineWidth = 0.5;
      const half = thick * 0.5;
      for (let yy = wy - half; yy < wy + wh + half; yy += 3) {
        const noiseShift = this.noise.noise2D(yy * 0.1, 0) * 2;
        ctx.beginPath();
        ctx.moveTo(wx - half + noiseShift, yy);
        ctx.lineTo(wx + ww + half + noiseShift, yy);
        ctx.stroke();
      }
    } else if (material === 'wood') {
      /* Wood grain — wavy horizontal lines */
      ctx.strokeStyle = blendColors(frame.color, '#8b4513', 0.3);
      ctx.lineWidth = 0.8;
      const half = thick * 0.5;
      for (let yy = wy - half; yy < wy + wh + half; yy += 5) {
        ctx.beginPath();
        for (let xx = wx - half; xx < wx + ww + half; xx += 4) {
          const grain = this.noise.noise2D(xx * 0.02, yy * 0.05) * 3;
          if (xx === wx - half) ctx.moveTo(xx, yy + grain);
          else ctx.lineTo(xx, yy + grain);
        }
        ctx.stroke();
      }
    } else if (material === 'plastic') {
      /* Smooth gradient sheen */
      const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.05)');
      ctx.fillStyle = grad;
      ctx.lineWidth = thick;
      ctx.beginPath();
      this._roundedRectPath(ctx, wx, wy, ww, wh, cr);
      ctx.stroke();
    }
    /* composite — clean edges, no extra texture */

    ctx.restore();
  }

  /* ── Corner rivets / details ───────────────────────── */

  _drawCorners(ctx, wx, wy, ww, wh, cr, thick, material, frame) {
    const corners = [
      [wx, wy], [wx + ww, wy],
      [wx, wy + wh], [wx + ww, wy + wh],
    ];

    ctx.save();

    if (material === 'metal') {
      /* Small rivet circles */
      ctx.fillStyle = blendColors(frame.color, '#888888', 0.5);
      for (const [cx, cy] of corners) {
        const r = 3.5 * (this.w / 800);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        /* Highlight dot */
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = blendColors(frame.color, '#888888', 0.5);
      }
    } else if (material === 'plastic' || material === 'composite') {
      /* Rounded bumps */
      ctx.fillStyle = blendColors(frame.color, '#ffffff', 0.1);
      for (const [cx, cy] of corners) {
        const r = 2.5 * (this.w / 800);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /* ── Top area: luggage rack & fan ──────────────────── */

  _drawTopArea(ctx, w, wx, wy, ww, cabin, state) {
    ctx.save();
    const topH = wy;

    if (cabin.hasLuggageRack) {
      /* Luggage rack — horizontal shelf */
      const rackY = topH * 0.55;
      const rackH = 6 * (w / 800);
      ctx.fillStyle = blendColors(cabin.wallColor, '#333333', 0.3);
      ctx.fillRect(wx - 10, rackY, ww + 20, rackH);
      /* Shadow beneath */
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(wx - 10, rackY + rackH, ww + 20, 4);
      /* Bracket hints */
      for (let i = 0; i < 3; i++) {
        const bx = wx + ww * (0.15 + i * 0.35);
        ctx.fillStyle = blendColors(cabin.wallColor, '#555555', 0.4);
        ctx.fillRect(bx, rackY, 4, topH * 0.2);
      }
    }

    if (cabin.hasFan) {
      /* Ceiling fan circle */
      const fanX = wx + ww * 0.5;
      const fanY = topH * 0.32;
      const fanR = 14 * (w / 800);
      const elapsed = state.elapsed || 0;
      const angle = (elapsed * 0.003) % (Math.PI * 2);

      ctx.fillStyle = blendColors(cabin.wallColor, '#dddddd', 0.3);
      ctx.beginPath();
      ctx.arc(fanX, fanY, fanR, 0, Math.PI * 2);
      ctx.fill();

      /* Spinning blades hint */
      ctx.strokeStyle = blendColors(cabin.wallColor, '#aaaaaa', 0.4);
      ctx.lineWidth = 2;
      for (let b = 0; b < 3; b++) {
        const a = angle + (b * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(fanX, fanY);
        ctx.lineTo(fanX + Math.cos(a) * fanR * 2, fanY + Math.sin(a) * fanR * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /* ── Bottom area: seat ─────────────────────────────── */

  _drawSeatArea(ctx, w, h, wx, bottomY, ww, cabin, state) {
    if (!cabin.seatColor) return;

    ctx.save();
    const seatH = (h - bottomY) * 0.7;
    const seatY = bottomY + (h - bottomY) * 0.15;

    /* Seat cushion — rounded rectangle */
    const padX = ww * 0.05;
    ctx.fillStyle = cabin.seatColor;
    ctx.beginPath();
    this._roundedRectPath(ctx, wx + padX, seatY, ww - padX * 2, seatH, 8);
    ctx.fill();

    /* Top cushion highlight */
    const cushionGrad = ctx.createLinearGradient(0, seatY, 0, seatY + seatH);
    cushionGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    cushionGrad.addColorStop(0.4, 'rgba(255,255,255,0)');
    cushionGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = cushionGrad;
    ctx.beginPath();
    this._roundedRectPath(ctx, wx + padX, seatY, ww - padX * 2, seatH, 8);
    ctx.fill();

    /* Fabric pattern hint */
    if (cabin.fabricPattern === 'striped') {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (let sy = seatY + 4; sy < seatY + seatH; sy += 6) {
        ctx.beginPath();
        ctx.moveTo(wx + padX + 5, sy);
        ctx.lineTo(wx + ww - padX - 5, sy);
        ctx.stroke();
      }
      ctx.restore();
    } else if (cabin.fabricPattern === 'patterned') {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#ffffff';
      for (let py = seatY + 6; py < seatY + seatH - 4; py += 10) {
        for (let px = wx + padX + 8; px < wx + ww - padX - 4; px += 10) {
          ctx.fillRect(px, py, 2, 2);
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /* ── Curtains ──────────────────────────────────────── */

  _drawCurtains(ctx, wx, wy, ww, wh, thick, cabin, state) {
    ctx.save();

    const curtainW = thick * 1.8;
    const elapsed = state.elapsed || 0;
    const curtainColor = cabin.curtainColor;

    /* Left curtain drape */
    this._drawCurtainDrape(ctx, wx - thick * 0.3, wy, curtainW, wh, curtainColor, elapsed, -1);
    /* Right curtain drape */
    this._drawCurtainDrape(ctx, wx + ww - curtainW + thick * 0.3, wy, curtainW, wh, curtainColor, elapsed, 1);

    ctx.restore();
  }

  _drawCurtainDrape(ctx, x, y, cw, ch, color, elapsed, dir) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;

    ctx.beginPath();
    ctx.moveTo(x, y);

    /* Wavy edge facing the window */
    const innerX = dir < 0 ? x + cw : x;
    const steps = 20;
    const stepH = ch / steps;

    for (let i = 0; i <= steps; i++) {
      const yy = y + i * stepH;
      const wave = Math.sin(yy * 0.04 + elapsed * 0.0008) * 5
                 + Math.sin(yy * 0.02 + elapsed * 0.0005) * 3;
      ctx.lineTo(innerX + wave * dir, yy);
    }

    ctx.lineTo(dir < 0 ? x : x + cw, y + ch);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();

    /* Fold shadows */
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    for (let f = 0; f < 3; f++) {
      const fx = x + cw * (0.2 + f * 0.25);
      ctx.beginPath();
      ctx.moveTo(fx, y);
      ctx.lineTo(fx, y + ch);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ── LED strip (Vande Bharat) ──────────────────────── */

  _drawLedStrip(ctx, wx, wy, ww, thick, cabin, state) {
    ctx.save();
    const stripY = wy - thick * 0.6;
    const stripH = 3;

    /* Glow */
    ctx.shadowColor = cabin.ledColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = cabin.ledColor;
    ctx.globalAlpha = 0.7 + Math.sin((state.elapsed || 0) * 0.002) * 0.15;
    ctx.fillRect(wx + 5, stripY, ww - 10, stripH);

    /* Bright core */
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 5, stripY + 0.5, ww - 10, 1);

    ctx.restore();
  }

  /* ── Ambient cabin glow ────────────────────────────── */

  _drawAmbientGlow(ctx, w, h, wx, wy, ww, wh, cabin) {
    ctx.save();
    ctx.globalAlpha = cabin.lightIntensity * 0.15;

    /* Warm glow from edges inward */
    const glowGrad = ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(ww, wh) * 0.3,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.6,
    );
    glowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    glowGrad.addColorStop(1, hexToRgba(cabin.lightColor, 0.4));

    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  /* ── Rounded rect path utility ─────────────────────── */

  _roundedRectPath(ctx, x, y, w, h, r, ccw = false) {
    r = Math.min(r, w / 2, h / 2);
    if (ccw) {
      /* Counter-clockwise for cut-outs (evenodd fill) */
      ctx.moveTo(x + r, y);
      ctx.arcTo(x, y, x, y + r, r);
      ctx.arcTo(x, y + h, x + r, y + h, r);
      ctx.arcTo(x + w, y + h, x + w, y + h - r, r);
      ctx.arcTo(x + w, y, x + w - r, y, r);
      ctx.closePath();
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }
}
