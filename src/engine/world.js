/* ───────────────────────────────────────────────────────────
 *  world.js — Procedural world generator
 *  Manages biome transitions, terrain height, and deterministic
 *  placement of trees / structures along the scroll axis.
 * ─────────────────────────────────────────────────────────── */

import { lerp, clamp, smoothstep } from '../config.js';
import { SimplexNoise } from './noise.js';
import { SeededRandom } from './prng.js';
import { BIOMES, getBiome, getTransitions } from '../data/biomes.js';

const TRANSITION_WIDTH = 300;        // scroll-px over which biomes blend
const OBJECT_CELL_SIZE = 80;         // deterministic placement grid

export class WorldGenerator {
  constructor(state) {
    this.rng = new SeededRandom(state.seed);
    this.noise = new SimplexNoise(state.seed);
    this.objectNoise = new SimplexNoise(state.seed + 777);

    // Pick initial segment length
    const biome = getBiome(state.biome.current);
    state.biome.segmentStart = 0;
    state.biome.segmentLength = this.rng.rangeInt(biome.minLength, biome.maxLength);
    state.biome.next = null;
    state.biome.blend = 0;

    // Object cache — avoids regenerating every frame
    this._objCache = new Map();
    this._cacheStart = 0;
    this._cacheEnd = 0;
  }

  /* ─── per-frame update ─── */
  update(dt, state) {
    const scroll = state.scroll;
    const bm = state.biome;
    const segEnd = bm.segmentStart + bm.segmentLength;

    // Have we entered the transition zone at the tail of the segment?
    if (scroll >= segEnd - TRANSITION_WIDTH && !bm.next) {
      bm.next = this._pickNextBiome(bm.current);
    }

    // Blend factor within transition zone
    if (bm.next) {
      const transStart = segEnd - TRANSITION_WIDTH;
      bm.blend = clamp((scroll - transStart) / TRANSITION_WIDTH);

      // Fully transitioned → commit
      if (bm.blend >= 1) {
        bm.current = bm.next;
        bm.next = null;
        bm.blend = 0;
        bm.segmentStart = segEnd;
        const newBiome = getBiome(bm.current);
        bm.segmentLength = this.rng.rangeInt(newBiome.minLength, newBiome.maxLength);
      }
    }
  }

  /* ─── terrain height at world-x ─── */
  getTerrainHeight(x, state) {
    const bm = state.biome;
    const hA = this._biomeTerrainAt(x, bm.current);

    if (bm.next && bm.blend > 0) {
      const hB = this._biomeTerrainAt(x, bm.next);
      const t = smoothstep(0, 1, bm.blend);
      return lerp(hA, hB, t);
    }
    return hA;
  }

  /* ─── objects in a scroll range ─── */
  getObjectsInRange(startX, endX, state) {
    const results = [];
    const cellStart = Math.floor(startX / OBJECT_CELL_SIZE);
    const cellEnd = Math.ceil(endX / OBJECT_CELL_SIZE);

    for (let c = cellStart; c <= cellEnd; c++) {
      const key = c;
      if (this._objCache.has(key)) {
        const obj = this._objCache.get(key);
        if (obj) results.push(obj);
        continue;
      }

      const obj = this._generateObject(c, state);
      this._objCache.set(key, obj);
      if (obj) results.push(obj);
    }

    // Prune old cache entries far behind scroll
    if (this._objCache.size > 600) {
      const minCell = cellStart - 50;
      for (const k of this._objCache.keys()) {
        if (k < minCell) this._objCache.delete(k);
      }
    }

    return results;
  }

  /* ─── reset ─── */
  reset(state) {
    this.rng = new SeededRandom(state.seed);
    this.noise = new SimplexNoise(state.seed);
    this.objectNoise = new SimplexNoise(state.seed + 777);
    this._objCache.clear();

    state.biome.current = 'plains';
    state.biome.next = null;
    state.biome.blend = 0;
    state.biome.segmentStart = 0;
    const biome = getBiome('plains');
    state.biome.segmentLength = this.rng.rangeInt(biome.minLength, biome.maxLength);
  }

  /* ─── internals ─── */

  /** Terrain height for a single biome at world-x */
  _biomeTerrainAt(x, biomeName) {
    const b = getBiome(biomeName);
    const n = this.noise.fbm(x * b.noiseScale, 0.5, 4, 2.0, 0.5);
    // n is in [-1, 1] — map to terrain variation
    return b.terrainHeight + n * b.terrainVariation;
  }

  /** Weighted random next biome from transitions list */
  _pickNextBiome(currentName) {
    const transitions = getTransitions(currentName);
    if (transitions.length === 0) return 'plains';
    return this.rng.pick(transitions);
  }

  /** Deterministically decide whether a cell has an object, and what kind */
  _generateObject(cell, state) {
    const worldX = cell * OBJECT_CELL_SIZE;
    // Use noise for determinism rather than sequential rng calls
    const n1 = this.objectNoise.noise2D(cell * 0.1, 0.0);       // 0-1 ish
    const n2 = this.objectNoise.noise2D(cell * 0.1, 100.0);

    // Determine which biome this cell is in
    const biomeName = this._biomeAtScroll(worldX, state);
    const biome = getBiome(biomeName);

    // Check structure chance
    const roll = (n1 + 1) * 0.5;   // [0, 1]
    if (biome.structures.chance > 0 && roll < biome.structures.chance) {
      const typeIdx = Math.abs(Math.floor(n2 * 1000)) % biome.structures.types.length;
      return {
        type: 'structure',
        subType: biome.structures.types[typeIdx],
        x: worldX + ((n2 + 1) * 0.5) * OBJECT_CELL_SIZE * 0.6,
        biome: biomeName,
        scale: 0.8 + (n1 + 1) * 0.2,
        seed: cell,
      };
    }

    // Check tree chance
    if (biome.vegetation.treeChance > 0 && roll < biome.vegetation.treeChance) {
      const treeTypes = biome.vegetation.treeTypes;
      if (treeTypes.length === 0) return null;
      const typeIdx = Math.abs(Math.floor(n2 * 1000)) % treeTypes.length;
      return {
        type: 'tree',
        subType: treeTypes[typeIdx],
        x: worldX + ((n2 + 1) * 0.5) * OBJECT_CELL_SIZE * 0.8,
        biome: biomeName,
        scale: 0.7 + (n1 + 1) * 0.3,
        seed: cell,
      };
    }

    return null;
  }

  /** Figure out which biome applies at a given scroll position */
  _biomeAtScroll(scrollX, state) {
    const bm = state.biome;
    const segEnd = bm.segmentStart + bm.segmentLength;

    if (bm.next && scrollX >= segEnd - TRANSITION_WIDTH) {
      const t = (scrollX - (segEnd - TRANSITION_WIDTH)) / TRANSITION_WIDTH;
      // Past 50% blend → call it the next biome for object placement
      return t > 0.5 ? bm.next : bm.current;
    }
    return bm.current;
  }
}
