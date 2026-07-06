/* ───────────────────────────────────────────────────────────
 *  prng.js — Seeded pseudo-random number generator (Mulberry32)
 *  Deterministic randomness for reproducible journeys.
 * ─────────────────────────────────────────────────────────── */

export class SeededRandom {
  constructor(seed = 0) {
    this._seed = seed | 0;
    this._state = seed | 0;
  }

  /** Get seed */
  get seed() { return this._seed; }

  /** Reset to initial seed */
  reset() { this._state = this._seed; }

  /** Fork a new PRNG from current state */
  fork() { return new SeededRandom(this.nextInt()); }

  /** Next raw 0–1 float (mulberry32 algorithm) */
  random() {
    this._state |= 0;
    this._state = (this._state + 0x6D2B79F5) | 0;
    let t = Math.imul(this._state ^ (this._state >>> 15), 1 | this._state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Random integer (0 to max-1) */
  nextInt(max = 2147483647) {
    return (this.random() * max) | 0;
  }

  /** Random float in [min, max) */
  range(min, max) {
    return min + this.random() * (max - min);
  }

  /** Random integer in [min, max] inclusive */
  rangeInt(min, max) {
    return min + ((this.random() * (max - min + 1)) | 0);
  }

  /** Returns true with given probability (0–1) */
  chance(probability) {
    return this.random() < probability;
  }

  /** Pick a random element from an array */
  pick(arr) {
    return arr[(this.random() * arr.length) | 0];
  }

  /** Pick a random element using weighted probabilities */
  pickWeighted(items, weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Gaussian-distributed random (Box-Muller) */
  gaussian(mean = 0, stddev = 1) {
    const u1 = this.random();
    const u2 = this.random();
    const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
  }

  /** Shuffle an array in place */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (this.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
