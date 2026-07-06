/* ───────────────────────────────────────────────────────────
 *  biomes.js — Biome type definitions for procedural terrain
 *  Each biome configures terrain shape, colors, vegetation,
 *  structures, and transition rules.
 * ─────────────────────────────────────────────────────────── */

/**
 * Biome definitions.
 * terrainHeight: base height of terrain line (0 = top, 1 = bottom of window)
 * terrainVariation: how much noise affects height
 * noiseScale: frequency of terrain noise
 * colors: ground/vegetation/accent palette
 * vegetation: type and density of plant life
 * structures: probability and types of built structures
 * transitions: which biomes can follow this one
 * minLength / maxLength: segment length in scroll pixels
 * eventBoost: modifier for rare events
 */
export const BIOMES = {
  plains: {
    terrainHeight: 0.65,
    terrainVariation: 0.04,
    noiseScale: 0.002,
    colors: {
      ground: ['#7caa48', '#8bc34a', '#6d9b3a'],
      vegetation: '#5d8a30',
      accent: '#c8a96e',
      sky: null,
    },
    vegetation: {
      type: 'grass',
      density: 0.15,
      treeChance: 0.03,
      treeTypes: ['deciduous'],
    },
    structures: {
      chance: 0.01,
      types: ['fence', 'pole'],
    },
    transitions: ['farmland', 'forest', 'village', 'hills', 'river', 'semiurban'],
    minLength: 2500,
    maxLength: 5000,
    eventBoost: {},
  },

  farmland: {
    terrainHeight: 0.67,
    terrainVariation: 0.02,
    noiseScale: 0.001,
    colors: {
      ground: ['#a8b84c', '#c4cc56', '#8fa040'],
      vegetation: '#6b8a25',
      accent: '#d4a030',
      sky: null,
    },
    vegetation: {
      type: 'crops',
      density: 0.7,
      treeChance: 0.01,
      treeTypes: ['deciduous'],
    },
    structures: {
      chance: 0.03,
      types: ['barn', 'windmill', 'fence', 'pole'],
    },
    transitions: ['plains', 'village', 'river', 'semiurban'],
    minLength: 2000,
    maxLength: 4000,
    eventBoost: { bird: 1.5 },
  },

  forest: {
    terrainHeight: 0.6,
    terrainVariation: 0.06,
    noiseScale: 0.003,
    colors: {
      ground: ['#3a5a25', '#4a6a30', '#2e4e1f'],
      vegetation: '#2d5016',
      accent: '#8b6914',
      sky: null,
    },
    vegetation: {
      type: 'dense',
      density: 0.85,
      treeChance: 0.5,
      treeTypes: ['deciduous', 'conifer', 'deciduous'],
    },
    structures: {
      chance: 0.005,
      types: ['pole'],
    },
    transitions: ['plains', 'hills', 'river', 'mountains', 'village'],
    minLength: 3000,
    maxLength: 6000,
    eventBoost: { deer: 2, bird: 1.5 },
  },

  hills: {
    terrainHeight: 0.5,
    terrainVariation: 0.12,
    noiseScale: 0.0025,
    colors: {
      ground: ['#6b8c42', '#7a9a4c', '#5a7a38'],
      vegetation: '#4a6a28',
      accent: '#8c7a50',
      sky: null,
    },
    vegetation: {
      type: 'scattered',
      density: 0.3,
      treeChance: 0.15,
      treeTypes: ['deciduous', 'conifer'],
    },
    structures: {
      chance: 0.008,
      types: ['pole', 'tower'],
    },
    transitions: ['mountains', 'forest', 'plains', 'tunnel', 'village'],
    minLength: 3000,
    maxLength: 5500,
    eventBoost: {},
  },

  mountains: {
    terrainHeight: 0.35,
    terrainVariation: 0.2,
    noiseScale: 0.002,
    colors: {
      ground: ['#6a7a5a', '#7a8a68', '#5a6a4a'],
      vegetation: '#4a5a3a',
      accent: '#9a8a78',
      sky: null,
    },
    vegetation: {
      type: 'alpine',
      density: 0.1,
      treeChance: 0.08,
      treeTypes: ['conifer'],
    },
    structures: {
      chance: 0.003,
      types: ['tower'],
    },
    transitions: ['hills', 'tunnel', 'snow', 'forest'],
    minLength: 4000,
    maxLength: 7000,
    eventBoost: { eagle: 1.5 },
  },

  village: {
    terrainHeight: 0.64,
    terrainVariation: 0.03,
    noiseScale: 0.002,
    colors: {
      ground: ['#a09070', '#b0a080', '#908060'],
      vegetation: '#5d8a30',
      accent: '#cc8844',
      sky: null,
    },
    vegetation: {
      type: 'garden',
      density: 0.2,
      treeChance: 0.12,
      treeTypes: ['deciduous', 'palm'],
    },
    structures: {
      chance: 0.15,
      types: ['house', 'temple', 'shop', 'pole', 'fence'],
    },
    transitions: ['plains', 'farmland', 'station', 'semiurban', 'river'],
    minLength: 1500,
    maxLength: 3500,
    eventBoost: { crowd: 2, smoke: 1.5 },
  },

  station: {
    terrainHeight: 0.68,
    terrainVariation: 0.01,
    noiseScale: 0.001,
    colors: {
      ground: ['#808080', '#909090', '#707070'],
      vegetation: '#4a6a30',
      accent: '#cc6630',
      sky: null,
    },
    vegetation: {
      type: 'platform',
      density: 0.05,
      treeChance: 0.05,
      treeTypes: ['deciduous'],
    },
    structures: {
      chance: 0.4,
      types: ['platform', 'shelter', 'sign', 'bench', 'pole', 'lamp'],
    },
    transitions: ['village', 'semiurban', 'plains', 'farmland'],
    minLength: 800,
    maxLength: 1800,
    eventBoost: { crowd: 3, station: 5 },
  },

  river: {
    terrainHeight: 0.62,
    terrainVariation: 0.03,
    noiseScale: 0.002,
    colors: {
      ground: ['#6b8c42', '#7a9a4c', '#5a7a38'],
      vegetation: '#4a7a28',
      accent: '#4a7090',
      sky: null,
    },
    vegetation: {
      type: 'riverside',
      density: 0.25,
      treeChance: 0.1,
      treeTypes: ['deciduous'],
    },
    structures: {
      chance: 0.01,
      types: ['pole'],
    },
    hasWater: true,
    waterLevel: 0.72,
    transitions: ['bridge', 'plains', 'forest', 'farmland', 'village'],
    minLength: 1500,
    maxLength: 3000,
    eventBoost: { bird: 2 },
  },

  bridge: {
    terrainHeight: 0.75,
    terrainVariation: 0.0,
    noiseScale: 0.001,
    colors: {
      ground: ['#708090', '#607080', '#506070'],
      vegetation: null,
      accent: '#8a8a8a',
      sky: null,
    },
    vegetation: {
      type: 'none',
      density: 0,
      treeChance: 0,
      treeTypes: [],
    },
    structures: {
      chance: 0.05,
      types: ['girder', 'railing'],
    },
    hasWater: true,
    waterLevel: 0.78,
    isBridge: true,
    transitions: ['river', 'plains', 'farmland', 'village', 'forest'],
    minLength: 600,
    maxLength: 1500,
    eventBoost: { bridge: 5 },
  },

  desert: {
    terrainHeight: 0.7,
    terrainVariation: 0.05,
    noiseScale: 0.0015,
    colors: {
      ground: ['#d4a860', '#c8a050', '#deb870'],
      vegetation: '#8a7a30',
      accent: '#b8903c',
      sky: '#ffe8c4',
    },
    vegetation: {
      type: 'arid',
      density: 0.02,
      treeChance: 0.01,
      treeTypes: ['palm'],
    },
    structures: {
      chance: 0.005,
      types: ['pole'],
    },
    transitions: ['plains', 'hills', 'village', 'coastal'],
    minLength: 3500,
    maxLength: 7000,
    eventBoost: {},
  },

  coastal: {
    terrainHeight: 0.58,
    terrainVariation: 0.06,
    noiseScale: 0.002,
    colors: {
      ground: ['#c4b896', '#b0a880', '#d8c8a0'],
      vegetation: '#5a8a30',
      accent: '#3a8ab0',
      sky: null,
    },
    vegetation: {
      type: 'coastal',
      density: 0.1,
      treeChance: 0.08,
      treeTypes: ['palm', 'deciduous'],
    },
    structures: {
      chance: 0.02,
      types: ['lighthouse', 'pole', 'fence'],
    },
    hasWater: true,
    waterLevel: 0.78,
    transitions: ['plains', 'village', 'desert', 'semiurban'],
    minLength: 2500,
    maxLength: 5000,
    eventBoost: { bird: 2 },
  },

  snow: {
    terrainHeight: 0.45,
    terrainVariation: 0.12,
    noiseScale: 0.002,
    colors: {
      ground: ['#e8e8f0', '#d8d8e8', '#f0f0f8'],
      vegetation: '#2a4a3a',
      accent: '#c0c0d0',
      sky: '#e0e8f0',
    },
    vegetation: {
      type: 'alpine',
      density: 0.08,
      treeChance: 0.06,
      treeTypes: ['conifer'],
    },
    structures: {
      chance: 0.005,
      types: ['pole'],
    },
    transitions: ['mountains', 'hills', 'forest', 'tunnel'],
    minLength: 3000,
    maxLength: 6000,
    eventBoost: {},
  },

  tunnel: {
    terrainHeight: 0.0,
    terrainVariation: 0.0,
    noiseScale: 0.001,
    colors: {
      ground: ['#2a2a2a', '#333333', '#222222'],
      vegetation: null,
      accent: '#444444',
      sky: '#111111',
    },
    vegetation: {
      type: 'none',
      density: 0,
      treeChance: 0,
      treeTypes: [],
    },
    structures: {
      chance: 0.1,
      types: ['tunnelLight'],
    },
    isTunnel: true,
    transitions: ['hills', 'mountains', 'forest', 'snow'],
    minLength: 400,
    maxLength: 1200,
    eventBoost: { tunnel: 5 },
  },

  semiurban: {
    terrainHeight: 0.66,
    terrainVariation: 0.02,
    noiseScale: 0.002,
    colors: {
      ground: ['#909090', '#a0a098', '#808080'],
      vegetation: '#4a7a30',
      accent: '#b0885c',
      sky: null,
    },
    vegetation: {
      type: 'urban',
      density: 0.08,
      treeChance: 0.06,
      treeTypes: ['deciduous'],
    },
    structures: {
      chance: 0.2,
      types: ['building', 'house', 'pole', 'sign', 'lamp', 'fence'],
    },
    transitions: ['village', 'station', 'plains', 'farmland'],
    minLength: 2000,
    maxLength: 4500,
    eventBoost: { crowd: 1.5 },
  },
};

/** Get a biome definition by name */
export function getBiome(name) {
  return BIOMES[name] || BIOMES.plains;
}

/** Get valid next biomes from current */
export function getTransitions(biomeName) {
  const biome = BIOMES[biomeName];
  return biome ? biome.transitions : ['plains'];
}
