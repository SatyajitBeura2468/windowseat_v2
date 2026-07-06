/* ───────────────────────────────────────────────────────────
 *  main.js — WindowSeat application bootstrap & game loop
 *  Initialises all systems, layers, UI, and drives the
 *  per-frame update → render cycle via requestAnimationFrame.
 * ─────────────────────────────────────────────────────────── */

import { createState, LAYER_ORDER } from './config.js';
import { Renderer } from './engine/renderer.js';
import { WorldGenerator } from './engine/world.js';
import { WeatherSystem } from './engine/weather.js';
import { TimeSystem } from './engine/timeOfDay.js';
import { MotionSystem } from './engine/motion.js';
import { AudioSystem } from './engine/audio.js';
import { EventSystem } from './engine/events.js';

import SkyLayer from './layers/sky.js';
import BackgroundLayer from './layers/background.js';
import MidgroundLayer from './layers/midground.js';
import ForegroundLayer from './layers/foreground.js';
import WeatherLayer from './layers/weather.js';
import InteriorLayer from './layers/interior.js';
import OverlayLayer from './layers/overlay.js';

import { Controls } from './ui/controls.js';
import { getTimePhase } from './layers/sky.js';

/* ─── Globals ─── */
let state, renderer, controls;
let world, weatherSys, timeSys, motionSys, audioSys, eventSys;
let skyLayer, bgLayer, midLayer, fgLayer, wxLayer, intLayer, ovLayer;
let lastTime = 0;
let started = false;

/* ═══════════════════════════════════════════════════════════
 *  Boot
 * ═══════════════════════════════════════════════════════════ */
function boot() {
  // Create state with defaults
  state = createState();

  // Renderer — creates all 7 canvases
  const container = document.getElementById('ws-canvas-container');
  renderer = new Renderer(container);
  renderer.syncState(state);

  // Engine systems
  world      = new WorldGenerator(state);
  weatherSys = new WeatherSystem(state);
  timeSys    = new TimeSystem(state);
  motionSys  = new MotionSystem(state);
  audioSys   = new AudioSystem();
  eventSys   = new EventSystem(state);

  // Rendering layers
  const w = state.width, h = state.height;
  skyLayer = new SkyLayer(renderer.getCtx('sky'), w, h);
  bgLayer  = new BackgroundLayer(renderer.getCtx('background'), w, h);
  midLayer = new MidgroundLayer(renderer.getCtx('midground'), w, h);
  fgLayer  = new ForegroundLayer(renderer.getCtx('foreground'), w, h);
  wxLayer  = new WeatherLayer(renderer.getCtx('weather'), w, h);
  intLayer = new InteriorLayer(renderer.getCtx('interior'), w, h);
  ovLayer  = new OverlayLayer(renderer.getCtx('overlay'), w, h);

  // Handle resize
  const origResize = renderer.resize.bind(renderer);
  renderer.resize = () => {
    origResize();
    renderer.syncState(state);
    const nw = state.width, nh = state.height;
    skyLayer.resize(nw, nh);
    bgLayer.resize(nw, nh);
    midLayer.resize(nw, nh);
    fgLayer.resize(nw, nh);
    wxLayer.resize(nw, nh);
    intLayer.resize(nw, nh);
    ovLayer.resize(nw, nh);
  };

  // UI controls
  controls = new Controls(
    document.getElementById('ws-controls-mount'),
    state,
    {
      onCoachChange:   (v) => { state.coach = v; },
      onWeatherChange: (v) => { weatherSys.setWeather(v, state); controls.setActiveWeather(v); },
      onTimeChange:    (v) => { timeSys.setTime(v, state); },
      onMotionChange:  (v) => { state.motion.intensity = v; },
      onSeedChange:    (v) => { resetJourney(v); },
      onSoundToggle:   ()  => { toggleAudio(); },
      onFocusToggle:   ()  => { toggleFocus(); },
    }
  );

  // Loading screen
  const loadingEl = document.getElementById('ws-loading');
  const loadingBar = document.getElementById('ws-loading-bar');
  if (loadingBar) loadingBar.style.width = '100%';
  setTimeout(() => {
    if (loadingEl) loadingEl.classList.add('ws-loading--hidden');
  }, 600);

  // Audio start overlay
  const audioOverlay = document.getElementById('ws-audio-start');
  if (audioOverlay) {
    audioOverlay.addEventListener('click', () => {
      audioOverlay.classList.add('ws-audio-start--hidden');
      initAudio();
      if (!started) startLoop();
    }, { once: true });
  }

  // Also start on any click/key if overlay is missed
  const startOnInteraction = () => {
    if (!started) startLoop();
    if (audioOverlay) audioOverlay.classList.add('ws-audio-start--hidden');
  };
  document.addEventListener('click', startOnInteraction, { once: true });
  document.addEventListener('keydown', startOnInteraction, { once: true });
}

/* ═══════════════════════════════════════════════════════════
 *  Game loop
 * ═══════════════════════════════════════════════════════════ */
function startLoop() {
  started = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

function tick(timestamp) {
  const rawDt = timestamp - lastTime;
  lastTime = timestamp;
  // Cap dt to avoid spiral after tab switch
  const dt = Math.min(rawDt, 50);

  // ── Update state ──
  state.dt = dt;
  state.elapsed = timestamp * 0.001;    // seconds
  state.scroll += state.speed * dt;

  // Update engine systems
  world.update(dt, state);
  timeSys.update(dt, state);
  weatherSys.update(dt, state);
  motionSys.update(dt, state);
  eventSys.update(dt, state);
  audioSys.update(dt, state);

  // ── Clear & Render layers ──
  renderer.clearAll();

  skyLayer.render(state);
  bgLayer.render(state);
  midLayer.render(state);
  fgLayer.render(state);
  wxLayer.render(state);
  intLayer.render(state);
  ovLayer.render(state);

  // Apply motion transform
  renderer.applyMotion(state);

  // Update info HUD
  updateInfoHud(state);

  // Update control states
  controls.updateState(state);

  requestAnimationFrame(tick);
}

/* ═══════════════════════════════════════════════════════════
 *  Helpers
 * ═══════════════════════════════════════════════════════════ */
function updateInfoHud(state) {
  const biomeEl = document.getElementById('ws-info-biome');
  const detailEl = document.getElementById('ws-info-detail');
  if (!biomeEl || !detailEl) return;

  // Biome name
  const biomeName = state.biome.current
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase());
  biomeEl.textContent = biomeName;

  // Detail line
  const { phase } = getTimePhase(state.time);
  const phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);
  const weatherName = state.weather.current.charAt(0).toUpperCase() + state.weather.current.slice(1);
  detailEl.textContent = `Seed: ${state.seed} · ${weatherName} · ${phaseName}`;

  // Hide in focus mode
  const infoEl = document.getElementById('ws-info');
  if (infoEl) {
    infoEl.classList.toggle('ws-info--hidden', state.focusMode);
  }
}

function resetJourney(seed) {
  state.seed = seed;
  state.scroll = 0;
  world.reset(state);
  weatherSys.reset(state);
  timeSys.reset(state);
  motionSys.reset(state);
  eventSys.reset(state);
}

function initAudio() {
  audioSys.init();
  state.audioEnabled = true;
  audioSys.setEnabled(true);
}

function toggleAudio() {
  if (!audioSys._ctx) {
    initAudio();
  } else {
    state.audioEnabled = !state.audioEnabled;
    audioSys.setEnabled(state.audioEnabled);
  }
}

function toggleFocus() {
  state.focusMode = !state.focusMode;
}

/* ─── Start ─── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
