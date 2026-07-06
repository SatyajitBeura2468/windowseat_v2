/* ───────────────────────────────────────────────────────────
 *  motion.js — Train motion simulation
 *  Generates layered oscillation (sway + vibration + jolts)
 *  scaled by coach config and biome context.
 * ─────────────────────────────────────────────────────────── */

import { clamp } from '../config.js';
import { SeededRandom } from './prng.js';
import { getCoach } from '../data/coaches.js';
import { getBiome } from '../data/biomes.js';

/* Base sway oscillation */
const SWAY_FREQ = 0.3;           // Hz
const SWAY_AMP_X = 3.0;          // px
const SWAY_AMP_Y = 1.5;          // px

/* High-frequency vibration (random per frame via noise) */
const VIB_FREQ_MIN = 8;          // Hz
const VIB_FREQ_MAX = 12;         // Hz
const VIB_AMP = 0.5;             // px

/* Jolt decay */
const JOLT_DECAY = 500;          // ms total decay time
const JOLT_STRENGTH = 6;         // peak px displacement

/* Biomes that increase vibration */
const HIGH_VIB_BIOMES = new Set(['bridge', 'tunnel']);
const HIGH_VIB_MULT = 1.8;

export class MotionSystem {
  constructor(state) {
    this.rng = new SeededRandom(state.seed + 42);
    this._elapsed = 0;

    // Jolt state
    this._joltAge = Infinity;     // ms since last jolt start
    this._joltDirX = 0;
    this._joltDirY = 0;

    // Vibration phase offsets (randomised once)
    this._vibPhaseX = this.rng.random() * Math.PI * 2;
    this._vibPhaseY = this.rng.random() * Math.PI * 2;
    this._vibFreq = this.rng.range(VIB_FREQ_MIN, VIB_FREQ_MAX);
  }

  /* ─── per-frame update ─── */
  update(dt, state) {
    // dt in seconds
    const dtMs = dt * 1000;
    this._elapsed += dt;

    const coach = getCoach(state.coach);
    const motionCfg = coach.motion;
    const intensity = state.motion.intensity;

    // ── base sway: slow sin/cos rocking ──
    const swayPhase = this._elapsed * Math.PI * 2 * SWAY_FREQ;
    const rawSwayX = Math.sin(swayPhase) * SWAY_AMP_X;
    // Vertical sway at different phase so it doesn't track exactly
    const rawSwayY = Math.sin(swayPhase * 1.37 + 0.8) * SWAY_AMP_Y;

    // ── vibration: higher-frequency shimmer ──
    const vibPhase = this._elapsed * Math.PI * 2 * this._vibFreq;
    const rawVibX = Math.sin(vibPhase + this._vibPhaseX) * VIB_AMP;
    const rawVibY = Math.cos(vibPhase + this._vibPhaseY) * VIB_AMP;

    // ── biome vibration boost ──
    let vibMult = 1;
    if (HIGH_VIB_BIOMES.has(state.biome.current)) {
      vibMult = HIGH_VIB_MULT;
    }
    // Blend during biome transition
    if (state.biome.next && HIGH_VIB_BIOMES.has(state.biome.next)) {
      vibMult = Math.max(vibMult, 1 + (HIGH_VIB_MULT - 1) * state.biome.blend);
    }

    // ── jolts (Poisson-timed) ──
    this._joltAge += dtMs;

    // Try to trigger new jolt
    // Probability per frame ≈ joltChance * dt_in_seconds * 60 (normalised to ~60fps)
    const joltP = motionCfg.joltChance * dt * 60;
    if (this.rng.random() < joltP) {
      this._joltAge = 0;
      this._joltDirX = this.rng.range(-1, 1);
      this._joltDirY = this.rng.range(-0.5, 0.5);
      // Normalise direction
      const len = Math.sqrt(this._joltDirX ** 2 + this._joltDirY ** 2) || 1;
      this._joltDirX /= len;
      this._joltDirY /= len;
    }

    // Jolt envelope: quick attack, exponential decay
    let joltEnv = 0;
    if (this._joltAge < JOLT_DECAY) {
      const t = this._joltAge / JOLT_DECAY;
      joltEnv = Math.exp(-t * 5) * (1 - t);
      joltEnv = Math.max(0, joltEnv);
    }

    const joltX = this._joltDirX * joltEnv * JOLT_STRENGTH;
    const joltY = this._joltDirY * joltEnv * JOLT_STRENGTH;

    // ── compose and scale ──
    const scale = intensity * motionCfg.swayAmount;
    const vibScale = intensity * motionCfg.vibrationAmount * vibMult;

    state.motion.swayX = rawSwayX * scale;
    state.motion.swayY = rawSwayY * scale;
    state.motion.vibX = rawVibX * vibScale;
    state.motion.vibY = rawVibY * vibScale;
    state.motion.jolt = joltEnv * intensity;

    // Add jolt displacement into sway (they visually compound)
    state.motion.swayX += joltX * intensity;
    state.motion.swayY += joltY * intensity;
  }

  /* ─── reset ─── */
  reset(state) {
    this.rng = new SeededRandom(state.seed + 42);
    this._elapsed = 0;
    this._joltAge = Infinity;
    state.motion.swayX = 0;
    state.motion.swayY = 0;
    state.motion.vibX = 0;
    state.motion.vibY = 0;
    state.motion.jolt = 0;
  }
}
