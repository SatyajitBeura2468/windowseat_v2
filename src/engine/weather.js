/* ───────────────────────────────────────────────────────────
 *  weather.js — Weather state machine (engine)
 *  Manages weather type transitions, intensity fading,
 *  wind speed, visibility, and lightning flashes.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, WEATHER_TYPES } from '../config.js';
import { SeededRandom } from './prng.js';

/* Base probability weights (must match WEATHER_TYPES order) */
const BASE_WEIGHTS = {
  clear:  0.25,
  cloudy: 0.25,
  rainy:  0.20,
  stormy: 0.08,
  foggy:  0.12,
  snowy:  0.10,
};

/* Wind speed ranges per weather */
const WIND = {
  clear:  [0.0, 0.2],
  cloudy: [0.1, 0.4],
  rainy:  [0.3, 0.6],
  stormy: [0.6, 1.0],
  foggy:  [0.0, 0.15],
  snowy:  [0.1, 0.35],
};

/* Visibility ranges per weather */
const VIS = {
  clear:  [0.9, 1.0],
  cloudy: [0.7, 0.85],
  rainy:  [0.4, 0.6],
  stormy: [0.25, 0.4],
  foggy:  [0.15, 0.3],
  snowy:  [0.4, 0.55],
};

/* Transition duration range (seconds) */
const TRANS_MIN = 30;
const TRANS_MAX = 60;

/* Auto-change interval range (seconds) */
const AUTO_MIN = 90;
const AUTO_MAX = 180;

/* Lightning config (stormy only) */
const LIGHTNING_MIN_GAP = 5;
const LIGHTNING_MAX_GAP = 15;
const LIGHTNING_DECAY = 0.2;   // seconds to fade from 1 → 0

export class WeatherSystem {
  constructor(state) {
    this.rng = new SeededRandom(state.seed + 99);
    this._transitionDuration = 0;
    this._transitionElapsed = 0;
    this._autoTimer = this.rng.range(AUTO_MIN, AUTO_MAX);
    this._lightningTimer = this.rng.range(LIGHTNING_MIN_GAP, LIGHTNING_MAX_GAP);

    // Source values for interpolation during transitions
    this._srcWind = state.weather.windSpeed;
    this._srcVis = state.weather.visibility;
    this._srcIntensity = state.weather.intensity;

    this._tgtWind = this._srcWind;
    this._tgtVis = this._srcVis;
    this._tgtIntensity = this._srcIntensity;
  }

  /* ─── per-frame update ─── */
  update(dt, state) {
    const w = state.weather;

    // — Auto-change timer —
    this._autoTimer -= dt;
    if (this._autoTimer <= 0) {
      this._pickNewWeather(state);
      this._autoTimer = this.rng.range(AUTO_MIN, AUTO_MAX);
    }

    // — Transition interpolation —
    if (w.current !== w.target) {
      this._transitionElapsed += dt;
      const t = clamp(this._transitionElapsed / this._transitionDuration);
      w.transition = t;
      w.windSpeed = lerp(this._srcWind, this._tgtWind, t);
      w.visibility = lerp(this._srcVis, this._tgtVis, t);
      w.intensity = lerp(this._srcIntensity, this._tgtIntensity, t);

      if (t >= 1) {
        w.current = w.target;
        w.transition = 0;
      }
    }

    // — Lightning (stormy only) —
    if (w.current === 'stormy' || w.target === 'stormy') {
      this._lightningTimer -= dt;
      if (this._lightningTimer <= 0) {
        w.lightning = 1;
        this._lightningTimer = this.rng.range(LIGHTNING_MIN_GAP, LIGHTNING_MAX_GAP);
      }
    }

    // Decay lightning flash
    if (w.lightning > 0) {
      w.lightning = Math.max(0, w.lightning - dt / LIGHTNING_DECAY);
    }
  }

  /* ─── manual override ─── */
  setWeather(type, state) {
    if (!WEATHER_TYPES.includes(type)) return;
    this._beginTransition(type, state);
  }

  /* ─── reset ─── */
  reset(state) {
    this.rng = new SeededRandom(state.seed + 99);
    state.weather.current = 'clear';
    state.weather.target = 'clear';
    state.weather.intensity = 0;
    state.weather.windSpeed = 0;
    state.weather.visibility = 1;
    state.weather.transition = 0;
    state.weather.lightning = 0;
    this._autoTimer = this.rng.range(AUTO_MIN, AUTO_MAX);
    this._lightningTimer = this.rng.range(LIGHTNING_MIN_GAP, LIGHTNING_MAX_GAP);
  }

  /* ─── internals ─── */

  _pickNewWeather(state) {
    const weights = this._adjustedWeights(state);
    const types = WEATHER_TYPES.slice();
    const type = this.rng.pickWeighted(types, types.map(t => weights[t]));
    if (type !== state.weather.target) {
      this._beginTransition(type, state);
    }
  }

  _beginTransition(type, state) {
    const w = state.weather;
    w.target = type;
    this._transitionDuration = this.rng.range(TRANS_MIN, TRANS_MAX);
    this._transitionElapsed = 0;
    w.transition = 0;

    // Snapshot current values as source
    this._srcWind = w.windSpeed;
    this._srcVis = w.visibility;
    this._srcIntensity = w.intensity;

    // Target values
    this._tgtWind = this.rng.range(...WIND[type]);
    this._tgtVis = this.rng.range(...VIS[type]);
    this._tgtIntensity = type === 'clear' ? 0 : this.rng.range(0.5, 1);
  }

  /** Adjust weights based on biome */
  _adjustedWeights(state) {
    const w = { ...BASE_WEIGHTS };
    const biome = state.biome.current;

    if (biome === 'snow') {
      w.snowy *= 3;
      w.clear *= 0.5;
    }
    if (biome === 'desert') {
      w.rainy *= 0.1;
      w.snowy *= 0;
      w.stormy *= 0.3;
      w.clear *= 2;
    }
    if (biome === 'coastal') {
      w.foggy *= 1.5;
      w.rainy *= 1.3;
    }
    if (biome === 'mountains') {
      w.foggy *= 1.4;
      w.snowy *= 1.5;
    }

    // Slightly suppress re-picking the current weather
    const cur = state.weather.current;
    if (w[cur]) w[cur] *= 0.4;

    return w;
  }
}
