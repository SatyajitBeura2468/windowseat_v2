/* ───────────────────────────────────────────────────────────
 *  config.js — Global constants, shared state shape, defaults
 * ─────────────────────────────────────────────────────────── */

export const LAYER_ORDER = [
  'sky', 'background', 'midground', 'foreground',
  'weather', 'interior', 'overlay',
];

export const PARALLAX_SPEEDS = {
  sky: 0.02,
  background: 0.12,
  midground: 0.45,
  foreground: 1.0,
  weather: 0.0,
  interior: 0.0,
  overlay: 0.0,
};

export const TIME_PHASES = {
  DAWN:     { start: 0.00, end: 0.08, label: 'Dawn' },
  SUNRISE:  { start: 0.08, end: 0.15, label: 'Sunrise' },
  MORNING:  { start: 0.15, end: 0.30, label: 'Morning' },
  NOON:     { start: 0.30, end: 0.50, label: 'Noon' },
  EVENING:  { start: 0.50, end: 0.65, label: 'Evening' },
  DUSK:     { start: 0.65, end: 0.75, label: 'Dusk' },
  NIGHT:    { start: 0.75, end: 0.90, label: 'Night' },
  MIDNIGHT: { start: 0.90, end: 1.00, label: 'Midnight' },
};

export const WEATHER_TYPES = [
  'clear', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy',
];

export const BIOME_TYPES = [
  'plains', 'farmland', 'forest', 'hills', 'mountains',
  'village', 'station', 'river', 'bridge', 'desert',
  'coastal', 'snow', 'tunnel', 'semiurban',
];

export const COACH_TYPES = [
  'sleeper', 'firstclass', 'chaircar', 'vandebharat', 'luggage',
];

export const DEFAULTS = {
  seed: 42,
  speed: 0.15,           // base scroll speed (px per ms)
  timeSpeed: 1 / 600,    // full day in 600s (10 min)
  startTime: 0.20,       // start near dawn
  coach: 'sleeper',
  weather: 'clear',
  motionIntensity: 0.7,
  audioEnabled: false,
  focusMode: false,
};

/** Create a fresh mutable state object for a journey */
export function createState(overrides = {}) {
  return {
    /* Journey progress */
    scroll: 0,
    speed: overrides.speed ?? DEFAULTS.speed,
    dt: 0,
    elapsed: 0,

    /* Time of day  0 → 1 cyclic */
    time: overrides.startTime ?? DEFAULTS.startTime,
    timeSpeed: overrides.timeSpeed ?? DEFAULTS.timeSpeed,

    /* Weather */
    weather: {
      current: overrides.weather ?? DEFAULTS.weather,
      target: overrides.weather ?? DEFAULTS.weather,
      intensity: overrides.weather === 'clear' ? 0 : 0.6,
      windSpeed: 0,
      visibility: 1,
      transition: 0,
      lightning: 0,
    },

    /* Biome */
    biome: {
      current: 'plains',
      next: null,
      blend: 0,
      segmentStart: 0,
      segmentLength: 3000,
    },

    /* Train motion */
    motion: {
      swayX: 0,
      swayY: 0,
      vibX: 0,
      vibY: 0,
      jolt: 0,
      intensity: overrides.motionIntensity ?? DEFAULTS.motionIntensity,
    },

    /* Settings */
    seed: overrides.seed ?? DEFAULTS.seed,
    coach: overrides.coach ?? DEFAULTS.coach,
    audioEnabled: overrides.audioEnabled ?? DEFAULTS.audioEnabled,
    focusMode: overrides.focusMode ?? DEFAULTS.focusMode,

    /* Viewport (set by renderer) */
    width: 0,
    height: 0,
    dpr: 1,

    /* Rare events */
    activeEvents: [],
    nextEventAt: 0,
  };
}

/** Linearly interpolate between two values */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Clamp a value between min and max */
export function clamp(v, min = 0, max = 1) {
  return v < min ? min : v > max ? max : v;
}

/** Smoothstep interpolation */
export function smoothstep(a, b, t) {
  t = clamp((t - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Parse a hex color to [r, g, b] */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** [r, g, b] to hex string */
export function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** Blend two hex colors */
export function blendColors(c1, c2, t) {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    Math.round(lerp(r1, r2, t)),
    Math.round(lerp(g1, g2, t)),
    Math.round(lerp(b1, b2, t)),
  );
}

/** Convert hex color to rgba string */
export function hexToRgba(hex, alpha = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
