/* ───────────────────────────────────────────────────────────
 *  renderer.js — Multi-canvas layer manager
 *  Creates stacked <canvas> elements for each rendering layer,
 *  handles DPR scaling, resize, and train-motion CSS transforms.
 * ─────────────────────────────────────────────────────────── */

import { LAYER_ORDER } from '../config.js';

export class Renderer {
  /**
   * @param {HTMLElement} container — DOM element to mount canvases into
   */
  constructor(container) {
    this.container = container;
    this.canvases = {};
    this.contexts = {};
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Ensure container is positioned for absolute children
    const cs = getComputedStyle(container);
    if (cs.position === 'static') container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Create a wrapper div that receives motion transforms
    this._motionWrapper = document.createElement('div');
    this._motionWrapper.style.cssText =
      'position:absolute;inset:0;will-change:transform;pointer-events:none;';
    container.appendChild(this._motionWrapper);

    // Create one canvas per layer
    LAYER_ORDER.forEach((name, i) => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText =
        `position:absolute;top:0;left:0;width:100%;height:100%;` +
        `z-index:${(i + 1) * 10};pointer-events:none;`;
      canvas.dataset.layer = name;

      this._motionWrapper.appendChild(canvas);
      this.canvases[name] = canvas;
      this.contexts[name] = canvas.getContext('2d');
    });

    // Initial size
    this.resize();

    // Listen for window resize (debounced)
    this._resizeTimer = 0;
    this._onResize = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.resize(), 100);
    };
    window.addEventListener('resize', this._onResize);
  }

  /** Recalculate sizes for all canvases */
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    for (const name of LAYER_ORDER) {
      const canvas = this.canvases[name];
      canvas.width = this.width * this.dpr;
      canvas.height = this.height * this.dpr;
      // CSS size stays at 100% via style, but set explicitly for clarity
      canvas.style.width = this.width + 'px';
      canvas.style.height = this.height + 'px';

      // Scale context so drawing ops work in CSS-pixel space
      const ctx = this.contexts[name];
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  /** Get the raw <canvas> element for a layer */
  getCanvas(name) {
    return this.canvases[name] || null;
  }

  /** Get the 2D rendering context for a layer */
  getCtx(name) {
    return this.contexts[name] || null;
  }

  /** Alias — older code may call getContext */
  getContext(name) {
    return this.getCtx(name);
  }

  /**
   * Apply train motion transform to the wrapper div.
   * Called once per frame after motion system has updated state.
   */
  applyMotion(state) {
    const m = state.motion;
    const tx = m.swayX + m.vibX;
    const ty = m.swayY + m.vibY;
    // Slight rotation from sway — gives organic rocking feel
    const rot = m.swayX * 0.06;  // degrees per px of sway
    this._motionWrapper.style.transform =
      `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
  }

  /** Write viewport info into state */
  syncState(state) {
    state.width = this.width;
    state.height = this.height;
    state.dpr = this.dpr;
  }

  /** Clear a single layer */
  clearLayer(name) {
    const ctx = this.contexts[name];
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvases[name].width, this.canvases[name].height);
    ctx.restore();
  }

  /** Clear every layer */
  clearAll() {
    for (const name of LAYER_ORDER) {
      this.clearLayer(name);
    }
  }

  /** Teardown — remove listeners and DOM nodes */
  destroy() {
    window.removeEventListener('resize', this._onResize);
    clearTimeout(this._resizeTimer);
    if (this._motionWrapper.parentNode) {
      this._motionWrapper.parentNode.removeChild(this._motionWrapper);
    }
  }
}
