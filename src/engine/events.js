/* ───────────────────────────────────────────────────────────
 *  events.js — Rare event scheduler
 *  Schedules infrequent visual / audio events along the
 *  scroll timeline using a seeded Poisson process.
 * ─────────────────────────────────────────────────────────── */

import { clamp } from '../config.js';
import { SeededRandom } from './prng.js';

/* ─── event definitions ─── */
const EVENT_DEFS = [
  { type: 'passingTrain',  weight: 0.12, duration: [400, 800],  conditions: null },
  { type: 'birdFlock',     weight: 0.15, duration: [500, 1200], conditions: null },
  { type: 'signal',        weight: 0.18, duration: [100, 250],  conditions: null },
  { type: 'smoke',         weight: 0.10, duration: [600, 1400], conditions: null },
  { type: 'villageLights', weight: 0.10, duration: [500, 1000], conditions: { nightOnly: true } },
  { type: 'rainbow',       weight: 0.05, duration: [800, 1600], conditions: { afterRain: true } },
  { type: 'deer',          weight: 0.05, duration: [300, 700],  conditions: { biomes: ['forest'] } },
  { type: 'crowd',         weight: 0.08, duration: [200, 600],  conditions: { biomes: ['station'] } },
  { type: 'distantRoad',   weight: 0.12, duration: [800, 2000], conditions: null },
  { type: 'milestone',     weight: 0.05, duration: [80, 150],   conditions: null },
];

/* Average Poisson interval range (seconds) */
const INTERVAL_MIN = 15;
const INTERVAL_MAX = 30;

export class EventSystem {
  constructor(state) {
    this.rng = new SeededRandom(state.seed + 314);
    this._scheduleNext(state);
  }

  /* ─── per-frame update ─── */
  update(dt, state) {
    const scroll = state.scroll;

    // ── spawn new event when scroll reaches threshold ──
    if (scroll >= state.nextEventAt) {
      const event = this._createEvent(state);
      if (event) {
        state.activeEvents.push(event);
      }
      this._scheduleNext(state);
    }

    // ── prune expired events ──
    state.activeEvents = state.activeEvents.filter(
      ev => scroll < ev.startScroll + ev.duration,
    );
  }

  /* ─── reset ─── */
  reset(state) {
    this.rng = new SeededRandom(state.seed + 314);
    state.activeEvents = [];
    this._scheduleNext(state);
  }

  /* ─── internals ─── */

  /** Set next event spawn scroll position */
  _scheduleNext(state) {
    const intervalSec = this.rng.range(INTERVAL_MIN, INTERVAL_MAX);
    // Convert seconds to scroll pixels via current speed
    const speed = Math.max(state.speed, 0.05);
    const scrollGap = intervalSec * speed * 1000;  // speed is px/ms → * 1000 for sec
    state.nextEventAt = state.scroll + scrollGap;
  }

  /** Pick an event type and create event data */
  _createEvent(state) {
    // Build eligible list
    const eligible = [];
    const weights = [];

    for (const def of EVENT_DEFS) {
      if (!this._meetsConditions(def, state)) continue;

      let w = def.weight;

      // Apply biome eventBoost
      const boost = this._getBiomeBoost(def.type, state);
      w *= boost;

      eligible.push(def);
      weights.push(w);
    }

    if (eligible.length === 0) {
      // Fallback — always allow signal
      const fallback = EVENT_DEFS.find(d => d.type === 'signal');
      return this._buildEvent(fallback, state);
    }

    const chosen = this.rng.pickWeighted(eligible, weights);
    return this._buildEvent(chosen, state);
  }

  /** Check if conditions are met for this event type */
  _meetsConditions(def, state) {
    const c = def.conditions;
    if (!c) return true;

    // Night-only check
    if (c.nightOnly) {
      if (state.time < 0.70 || state.time > 0.98) {
        // time 0.70–0.98 is roughly dusk → midnight
        // actually: allow if time >= 0.65 (dusk onward)
      }
      if (state.time < 0.65) return false;
    }

    // After-rain check (rainbow needs rain clearing)
    if (c.afterRain) {
      const w = state.weather;
      // Current was rainy/stormy and now transitioning to clear/cloudy
      const wasRainy = w.current === 'rainy' || w.current === 'stormy';
      const clearing = w.target === 'clear' || w.target === 'cloudy';
      if (!(wasRainy && clearing && w.transition > 0.3)) return false;
    }

    // Biome restriction
    if (c.biomes) {
      if (!c.biomes.includes(state.biome.current)) return false;
    }

    return true;
  }

  /** Look up biome eventBoost multiplier */
  _getBiomeBoost(eventType, state) {
    const biome = state.biome.current;
    // Import would create circular dep risk, so we read from the
    // lightweight biome config via a lazy approach
    try {
      // biome data is static — we can import at module level safely
      const { getBiome } = require('../data/biomes.js');
      const b = getBiome(biome);
      return b.eventBoost[eventType] || 1;
    } catch {
      // Fallback — skip boost
      return 1;
    }
  }

  /** Construct the event object */
  _buildEvent(def, state) {
    const duration = this.rng.rangeInt(def.duration[0], def.duration[1]);

    // Type-specific data
    const data = {};
    switch (def.type) {
      case 'passingTrain':
        data.direction = this.rng.chance(0.5) ? 'left' : 'right';
        data.speed = this.rng.range(1.5, 3.0);
        data.coachCount = this.rng.rangeInt(8, 18);
        break;
      case 'birdFlock':
        data.count = this.rng.rangeInt(5, 20);
        data.altitude = this.rng.range(0.05, 0.35);
        data.direction = this.rng.range(-0.3, 0.3);
        break;
      case 'signal':
        data.color = this.rng.pick(['red', 'green', 'yellow']);
        break;
      case 'smoke':
        data.columns = this.rng.rangeInt(1, 3);
        data.height = this.rng.range(0.15, 0.4);
        break;
      case 'villageLights':
        data.count = this.rng.rangeInt(3, 12);
        data.warmth = this.rng.range(0.6, 1.0);
        break;
      case 'rainbow':
        data.intensity = this.rng.range(0.3, 0.8);
        data.arcHeight = this.rng.range(0.2, 0.4);
        break;
      case 'deer':
        data.count = this.rng.rangeInt(1, 3);
        data.distance = this.rng.range(0.3, 0.7);
        break;
      case 'crowd':
        data.count = this.rng.rangeInt(5, 25);
        data.density = this.rng.range(0.4, 1.0);
        break;
      case 'distantRoad':
        data.vehicleCount = this.rng.rangeInt(2, 8);
        data.distance = this.rng.range(0.4, 0.8);
        break;
      case 'milestone':
        data.km = Math.floor(state.scroll / 500);
        break;
    }

    return {
      type: def.type,
      startScroll: state.scroll,
      duration,
      data,
    };
  }
}
