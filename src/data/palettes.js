/* ───────────────────────────────────────────────────────────
 *  palettes.js — Color palettes for time-of-day × weather
 *  Each palette defines sky gradients, ambient light,
 *  ground tints, and atmospheric colors.
 * ─────────────────────────────────────────────────────────── */

/**
 * Sky gradient definitions per time-of-day phase.
 * Each entry is an array of { stop, color } objects (top → bottom).
 */
export const SKY_GRADIENTS = {
  dawn: [
    { stop: 0.0, color: '#0a0e27' },
    { stop: 0.3, color: '#1a1a4e' },
    { stop: 0.6, color: '#4a2a5c' },
    { stop: 0.8, color: '#c7655b' },
    { stop: 1.0, color: '#e8a87c' },
  ],
  sunrise: [
    { stop: 0.0, color: '#1a1a4e' },
    { stop: 0.2, color: '#3d2b6b' },
    { stop: 0.45, color: '#e07050' },
    { stop: 0.7, color: '#f4a460' },
    { stop: 0.85, color: '#fcd184' },
    { stop: 1.0, color: '#ffe4b5' },
  ],
  morning: [
    { stop: 0.0, color: '#4a90d9' },
    { stop: 0.4, color: '#6db3f2' },
    { stop: 0.7, color: '#87ceeb' },
    { stop: 1.0, color: '#b0e0e6' },
  ],
  noon: [
    { stop: 0.0, color: '#2874a6' },
    { stop: 0.3, color: '#3498db' },
    { stop: 0.65, color: '#85c1e9' },
    { stop: 1.0, color: '#aed6f1' },
  ],
  evening: [
    { stop: 0.0, color: '#3a5f8a' },
    { stop: 0.3, color: '#c0713d' },
    { stop: 0.55, color: '#e8915a' },
    { stop: 0.75, color: '#f0c27f' },
    { stop: 1.0, color: '#e8d5b7' },
  ],
  dusk: [
    { stop: 0.0, color: '#141852' },
    { stop: 0.25, color: '#3b1f6e' },
    { stop: 0.5, color: '#8b3a62' },
    { stop: 0.7, color: '#d4634a' },
    { stop: 0.85, color: '#e89060' },
    { stop: 1.0, color: '#deb887' },
  ],
  night: [
    { stop: 0.0, color: '#050510' },
    { stop: 0.3, color: '#0a0a20' },
    { stop: 0.6, color: '#0f1030' },
    { stop: 0.85, color: '#151540' },
    { stop: 1.0, color: '#1a1a50' },
  ],
  midnight: [
    { stop: 0.0, color: '#020208' },
    { stop: 0.4, color: '#050510' },
    { stop: 0.7, color: '#080818' },
    { stop: 1.0, color: '#0c0c28' },
  ],
};

/**
 * Ambient lighting per time phase.
 */
export const AMBIENT_LIGHT = {
  dawn:     { color: '#ffa07a', intensity: 0.35, shadowDir: -0.8 },
  sunrise:  { color: '#ffcc80', intensity: 0.55, shadowDir: -0.6 },
  morning:  { color: '#ffffee', intensity: 0.85, shadowDir: -0.3 },
  noon:     { color: '#ffffff', intensity: 1.0,  shadowDir: 0.0  },
  evening:  { color: '#ffe0b2', intensity: 0.7,  shadowDir: 0.3  },
  dusk:     { color: '#e88060', intensity: 0.45, shadowDir: 0.6  },
  night:    { color: '#4466aa', intensity: 0.2,  shadowDir: 0.0  },
  midnight: { color: '#223366', intensity: 0.1,  shadowDir: 0.0  },
};

/**
 * Ground/terrain tint per time phase.
 */
export const GROUND_TINTS = {
  dawn:     { base: '#3a4a35', vegetation: '#4a5a40', water: '#2a3a50' },
  sunrise:  { base: '#5a6a45', vegetation: '#6a7a50', water: '#4a5a60' },
  morning:  { base: '#6b8c42', vegetation: '#7aa84d', water: '#4682b4' },
  noon:     { base: '#7caa48', vegetation: '#88bb55', water: '#5090c0' },
  evening:  { base: '#6a7a40', vegetation: '#7a8a48', water: '#4a6a80' },
  dusk:     { base: '#4a5035', vegetation: '#5a6040', water: '#3a4a60' },
  night:    { base: '#1a2518', vegetation: '#202a1e', water: '#152030' },
  midnight: { base: '#101810', vegetation: '#151e14', water: '#0c1520' },
};

/**
 * Weather modifiers applied on top of time-based palettes.
 */
export const WEATHER_MODIFIERS = {
  clear: {
    skyShift: '#000000', skyBlend: 0,
    visibilityMul: 1.0,
    saturationMul: 1.0,
    brightnessMul: 1.0,
    fogColor: null,
    particleColor: null,
  },
  cloudy: {
    skyShift: '#888899', skyBlend: 0.3,
    visibilityMul: 0.85,
    saturationMul: 0.75,
    brightnessMul: 0.85,
    fogColor: '#ccccdd',
    particleColor: null,
  },
  rainy: {
    skyShift: '#555566', skyBlend: 0.45,
    visibilityMul: 0.6,
    saturationMul: 0.5,
    brightnessMul: 0.65,
    fogColor: '#99aabc',
    particleColor: '#aabbcc',
  },
  stormy: {
    skyShift: '#333340', skyBlend: 0.6,
    visibilityMul: 0.4,
    saturationMul: 0.35,
    brightnessMul: 0.45,
    fogColor: '#667788',
    particleColor: '#8899aa',
  },
  foggy: {
    skyShift: '#aabbcc', skyBlend: 0.5,
    visibilityMul: 0.3,
    saturationMul: 0.4,
    brightnessMul: 0.75,
    fogColor: '#ccddee',
    particleColor: null,
  },
  snowy: {
    skyShift: '#dde5ee', skyBlend: 0.35,
    visibilityMul: 0.55,
    saturationMul: 0.3,
    brightnessMul: 0.95,
    fogColor: '#e8eef5',
    particleColor: '#ffffff',
  },
};

/**
 * Cloud color per time-of-day phase.
 */
export const CLOUD_COLORS = {
  dawn:     { base: '#e8a87c', shadow: '#8b5e6b', highlight: '#ffd4a8' },
  sunrise:  { base: '#f4c08a', shadow: '#c07850', highlight: '#ffe8c4' },
  morning:  { base: '#e8e8f0', shadow: '#b0b0c8', highlight: '#ffffff' },
  noon:     { base: '#ffffff', shadow: '#c8c8d8', highlight: '#ffffff' },
  evening:  { base: '#e8c0a0', shadow: '#a87050', highlight: '#ffdcb0' },
  dusk:     { base: '#d4634a', shadow: '#6b2040', highlight: '#ff9070' },
  night:    { base: '#1a2040', shadow: '#0a1020', highlight: '#2a3060' },
  midnight: { base: '#101830', shadow: '#080c18', highlight: '#1a2040' },
};

/**
 * Star/celestial settings per time-of-day.
 */
export const CELESTIAL = {
  dawn:     { stars: 0.1, moonAlpha: 0, sunY: 0.85, sunGlow: 0.4 },
  sunrise:  { stars: 0,   moonAlpha: 0, sunY: 0.75, sunGlow: 0.8 },
  morning:  { stars: 0,   moonAlpha: 0, sunY: 0.5,  sunGlow: 0.3 },
  noon:     { stars: 0,   moonAlpha: 0, sunY: 0.15, sunGlow: 0.2 },
  evening:  { stars: 0,   moonAlpha: 0, sunY: 0.55, sunGlow: 0.4 },
  dusk:     { stars: 0.2, moonAlpha: 0.2, sunY: 0.8, sunGlow: 0.7 },
  night:    { stars: 0.8, moonAlpha: 0.7, sunY: 1.2, sunGlow: 0 },
  midnight: { stars: 1.0, moonAlpha: 0.9, sunY: 1.5, sunGlow: 0 },
};

/**
 * Distance fog / atmospheric perspective colors per time-of-day.
 */
export const ATMOSPHERE = {
  dawn:     { fogNear: '#c7655b', fogFar: '#4a2a5c', haze: 0.25 },
  sunrise:  { fogNear: '#fcd184', fogFar: '#e07050', haze: 0.15 },
  morning:  { fogNear: '#b0e0e6', fogFar: '#87ceeb', haze: 0.08 },
  noon:     { fogNear: '#aed6f1', fogFar: '#85c1e9', haze: 0.05 },
  evening:  { fogNear: '#f0c27f', fogFar: '#c0713d', haze: 0.15 },
  dusk:     { fogNear: '#e89060', fogFar: '#8b3a62', haze: 0.2  },
  night:    { fogNear: '#151540', fogFar: '#0a0a20', haze: 0.1  },
  midnight: { fogNear: '#0c0c28', fogFar: '#050510', haze: 0.08 },
};

/**
 * Reflection intensity on train window glass per time phase.
 */
export const WINDOW_REFLECTION = {
  dawn:     0.15,
  sunrise:  0.12,
  morning:  0.08,
  noon:     0.05,
  evening:  0.1,
  dusk:     0.15,
  night:    0.35,
  midnight: 0.45,
};
