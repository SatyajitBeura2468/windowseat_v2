/* ───────────────────────────────────────────────────────────
 *  timeOfDay.js — Day / night cycle system
 *  Advances cyclic time, determines current time-of-day phase,
 *  and provides interpolated palette colors for rendering layers.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, TIME_PHASES } from '../config.js';
import {
  SKY_GRADIENTS,
  AMBIENT_LIGHT,
  GROUND_TINTS,
  CLOUD_COLORS,
  CELESTIAL,
  ATMOSPHERE,
  WINDOW_REFLECTION,
} from '../data/palettes.js';
import { blendColors } from '../config.js';

/* Ordered phase keys for iteration */
const PHASE_KEYS = Object.keys(TIME_PHASES);

export class TimeSystem {
  constructor(state) {
    // nothing special — state.time is already set
  }

  /* ─── per-frame update ─── */
  update(dt, state) {
    state.time += state.timeSpeed * dt;
    // Wrap around 1.0
    if (state.time >= 1) state.time -= 1;
    if (state.time < 0) state.time += 1;
  }

  /* ─── manual time set ─── */
  setTime(time, state) {
    state.time = ((time % 1) + 1) % 1;   // normalise to [0, 1)
  }

  /* ─── phase determination ─── */

  /**
   * Returns { phase, nextPhase, blend }
   *  phase     — current TIME_PHASES key (lowercase, e.g. 'dawn')
   *  nextPhase — the following phase key
   *  blend     — 0-1 how far through the current phase we are
   */
  getCurrentPhase(time) {
    const t = ((time % 1) + 1) % 1;

    for (let i = 0; i < PHASE_KEYS.length; i++) {
      const key = PHASE_KEYS[i];
      const phase = TIME_PHASES[key];

      if (t >= phase.start && t < phase.end) {
        const nextIdx = (i + 1) % PHASE_KEYS.length;
        const nextKey = PHASE_KEYS[nextIdx];
        const blend = (t - phase.start) / (phase.end - phase.start);
        return {
          phase: key.toLowerCase(),
          nextPhase: nextKey.toLowerCase(),
          blend: clamp(blend),
        };
      }
    }

    // Fallback (should not happen)
    return { phase: 'midnight', nextPhase: 'dawn', blend: 0 };
  }

  /**
   * Returns fully interpolated color set for the given time.
   * Blends between the two adjacent phases.
   */
  getPhaseColors(time) {
    const { phase, nextPhase, blend } = this.getCurrentPhase(time);

    return {
      skyGradient: this._blendGradient(
        SKY_GRADIENTS[phase], SKY_GRADIENTS[nextPhase], blend,
      ),
      ambient: {
        color: blendColors(
          AMBIENT_LIGHT[phase].color,
          AMBIENT_LIGHT[nextPhase].color,
          blend,
        ),
        intensity: lerp(
          AMBIENT_LIGHT[phase].intensity,
          AMBIENT_LIGHT[nextPhase].intensity,
          blend,
        ),
        shadowDir: lerp(
          AMBIENT_LIGHT[phase].shadowDir,
          AMBIENT_LIGHT[nextPhase].shadowDir,
          blend,
        ),
      },
      ground: {
        base: blendColors(
          GROUND_TINTS[phase].base,
          GROUND_TINTS[nextPhase].base,
          blend,
        ),
        vegetation: blendColors(
          GROUND_TINTS[phase].vegetation,
          GROUND_TINTS[nextPhase].vegetation,
          blend,
        ),
        water: blendColors(
          GROUND_TINTS[phase].water,
          GROUND_TINTS[nextPhase].water,
          blend,
        ),
      },
      clouds: {
        base: blendColors(CLOUD_COLORS[phase].base, CLOUD_COLORS[nextPhase].base, blend),
        shadow: blendColors(CLOUD_COLORS[phase].shadow, CLOUD_COLORS[nextPhase].shadow, blend),
        highlight: blendColors(CLOUD_COLORS[phase].highlight, CLOUD_COLORS[nextPhase].highlight, blend),
      },
      celestial: {
        stars: lerp(CELESTIAL[phase].stars, CELESTIAL[nextPhase].stars, blend),
        moonAlpha: lerp(CELESTIAL[phase].moonAlpha, CELESTIAL[nextPhase].moonAlpha, blend),
        sunY: lerp(CELESTIAL[phase].sunY, CELESTIAL[nextPhase].sunY, blend),
        sunGlow: lerp(CELESTIAL[phase].sunGlow, CELESTIAL[nextPhase].sunGlow, blend),
      },
      atmosphere: {
        fogNear: blendColors(ATMOSPHERE[phase].fogNear, ATMOSPHERE[nextPhase].fogNear, blend),
        fogFar: blendColors(ATMOSPHERE[phase].fogFar, ATMOSPHERE[nextPhase].fogFar, blend),
        haze: lerp(ATMOSPHERE[phase].haze, ATMOSPHERE[nextPhase].haze, blend),
      },
      windowReflection: lerp(
        WINDOW_REFLECTION[phase],
        WINDOW_REFLECTION[nextPhase],
        blend,
      ),
      phase,
      nextPhase,
      blend,
    };
  }

  /* ─── reset ─── */
  reset(state) {
    state.time = 0.20;   // back to near-dawn default
  }

  /* ─── internals ─── */

  /** Blend two sky gradient arrays (they may have different stop counts). */
  _blendGradient(a, b, t) {
    // Merge on the union of stop positions, interpolating colors at each
    const stops = new Set();
    a.forEach(s => stops.add(s.stop));
    b.forEach(s => stops.add(s.stop));
    const sorted = [...stops].sort((x, y) => x - y);

    return sorted.map(pos => ({
      stop: pos,
      color: blendColors(
        this._sampleGradient(a, pos),
        this._sampleGradient(b, pos),
        t,
      ),
    }));
  }

  /** Sample a gradient array at an arbitrary stop position */
  _sampleGradient(grad, pos) {
    if (pos <= grad[0].stop) return grad[0].color;
    if (pos >= grad[grad.length - 1].stop) return grad[grad.length - 1].color;

    for (let i = 0; i < grad.length - 1; i++) {
      if (pos >= grad[i].stop && pos <= grad[i + 1].stop) {
        const local = (pos - grad[i].stop) / (grad[i + 1].stop - grad[i].stop);
        return blendColors(grad[i].color, grad[i + 1].color, local);
      }
    }
    return grad[grad.length - 1].color;
  }
}
