/* ───────────────────────────────────────────────────────────
 *  controls.js — Minimal glassmorphism UI controls
 *  Auto-hides, returns on hover/tap. Elegant & unobtrusive.
 * ─────────────────────────────────────────────────────────── */

import { COACH_TYPES, WEATHER_TYPES, DEFAULTS } from '../config.js';
import { getCoachList } from '../data/coaches.js';

const HIDE_DELAY = 4000; // ms before auto-hide

export class Controls {
  constructor(container, state, callbacks = {}) {
    this.state = state;
    this.callbacks = callbacks;
    this.visible = true;
    this.hideTimer = null;
    this.el = null;
    this._build(container);
    this._startHideTimer();
  }

  _build(container) {
    // Main panel
    this.el = document.createElement('div');
    this.el.className = 'ws-controls';
    this.el.innerHTML = `
      <div class="ws-controls-inner">
        <div class="ws-controls-header">
          <span class="ws-logo">WindowSeat</span>
          <button class="ws-btn ws-btn-icon ws-focus-btn" title="Focus Mode" data-action="focus">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
        </div>

        <div class="ws-control-group">
          <label class="ws-label">Coach</label>
          <div class="ws-coach-row" data-control="coach"></div>
        </div>

        <div class="ws-control-group">
          <label class="ws-label">Weather</label>
          <div class="ws-weather-row" data-control="weather"></div>
        </div>

        <div class="ws-control-group">
          <label class="ws-label">Time of Day</label>
          <input type="range" class="ws-slider" data-control="time" min="0" max="100" value="20" />
        </div>

        <div class="ws-control-group">
          <label class="ws-label">Motion</label>
          <input type="range" class="ws-slider" data-control="motion" min="0" max="100" value="70" />
        </div>

        <div class="ws-control-row">
          <div class="ws-control-group ws-control-group--inline">
            <label class="ws-label">Seed</label>
            <div class="ws-seed-row">
              <input type="text" class="ws-seed-input" data-control="seed" value="42" maxlength="8" />
              <button class="ws-btn ws-btn-icon" title="Random Seed" data-action="randomize">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                </svg>
              </button>
            </div>
          </div>

          <button class="ws-btn ws-btn-sound" data-action="sound" title="Toggle Sound">
            <svg class="ws-sound-on" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <svg class="ws-sound-off" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    container.appendChild(this.el);
    this._populateCoaches();
    this._populateWeather();
    this._bindEvents();
  }

  _populateCoaches() {
    const row = this.el.querySelector('[data-control="coach"]');
    const coaches = getCoachList();
    coaches.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'ws-btn ws-coach-btn' + (c.key === this.state.coach ? ' active' : '');
      btn.dataset.value = c.key;
      btn.title = c.label;
      btn.innerHTML = `<span class="ws-coach-icon">${c.icon}</span>`;
      row.appendChild(btn);
    });
  }

  _populateWeather() {
    const row = this.el.querySelector('[data-control="weather"]');
    const icons = {
      clear: '☀️', cloudy: '⛅', rainy: '🌧️',
      stormy: '⛈️', foggy: '🌫️', snowy: '❄️',
    };
    WEATHER_TYPES.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'ws-btn ws-weather-btn' + (w === this.state.weather.current ? ' active' : '');
      btn.dataset.value = w;
      btn.title = w.charAt(0).toUpperCase() + w.slice(1);
      btn.textContent = icons[w] || '🌤️';
      row.appendChild(btn);
    });
  }

  _bindEvents() {
    const el = this.el;

    // Coach selection
    el.querySelector('[data-control="coach"]').addEventListener('click', e => {
      const btn = e.target.closest('[data-value]');
      if (!btn) return;
      el.querySelectorAll('.ws-coach-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.callbacks.onCoachChange?.(btn.dataset.value);
    });

    // Weather selection
    el.querySelector('[data-control="weather"]').addEventListener('click', e => {
      const btn = e.target.closest('[data-value]');
      if (!btn) return;
      el.querySelectorAll('.ws-weather-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.callbacks.onWeatherChange?.(btn.dataset.value);
    });

    // Time slider
    el.querySelector('[data-control="time"]').addEventListener('input', e => {
      this.callbacks.onTimeChange?.(parseInt(e.target.value) / 100);
    });

    // Motion slider
    el.querySelector('[data-control="motion"]').addEventListener('input', e => {
      this.callbacks.onMotionChange?.(parseInt(e.target.value) / 100);
    });

    // Seed input
    const seedInput = el.querySelector('[data-control="seed"]');
    seedInput.addEventListener('change', () => {
      const seed = parseInt(seedInput.value) || 0;
      this.callbacks.onSeedChange?.(seed);
    });

    // Action buttons
    el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'randomize') {
          const seed = Math.floor(Math.random() * 99999);
          seedInput.value = seed;
          this.callbacks.onSeedChange?.(seed);
        } else if (action === 'sound') {
          this.callbacks.onSoundToggle?.();
        } else if (action === 'focus') {
          this.callbacks.onFocusToggle?.();
        }
      });
    });

    // Show on mouse move / touch
    document.addEventListener('mousemove', () => this._show());
    document.addEventListener('touchstart', () => this._show(), { passive: true });

    // Keep visible while hovering panel
    el.addEventListener('mouseenter', () => {
      clearTimeout(this.hideTimer);
      this.visible = true;
    });
    el.addEventListener('mouseleave', () => this._startHideTimer());
  }

  _show() {
    if (!this.state.focusMode) {
      this.el.classList.remove('ws-controls--hidden');
      this.visible = true;
      this._startHideTimer();
    }
  }

  _startHideTimer() {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.el.classList.add('ws-controls--hidden');
      this.visible = false;
    }, HIDE_DELAY);
  }

  /** Update visual state (e.g. sound icon) */
  updateState(state) {
    const soundOn = this.el.querySelector('.ws-sound-on');
    const soundOff = this.el.querySelector('.ws-sound-off');
    if (soundOn && soundOff) {
      soundOn.style.display = state.audioEnabled ? '' : 'none';
      soundOff.style.display = state.audioEnabled ? 'none' : '';
    }

    if (state.focusMode) {
      this.el.classList.add('ws-controls--hidden');
    }
  }

  /** Set weather button active state */
  setActiveWeather(type) {
    this.el.querySelectorAll('.ws-weather-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.value === type);
    });
  }

  destroy() {
    clearTimeout(this.hideTimer);
    this.el.remove();
  }
}
