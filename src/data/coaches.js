/* ───────────────────────────────────────────────────────────
 *  coaches.js — Indian railway coach type definitions
 *  Each coach configures interior visual style, motion feel,
 *  window shape, and cabin ambient details.
 * ─────────────────────────────────────────────────────────── */

export const COACHES = {
  sleeper: {
    label: 'Sleeper',
    icon: '🛏️',
    description: 'Classic Indian sleeper coach',
    window: {
      top: 0.12,
      bottom: 0.88,
      left: 0.08,
      right: 0.92,
      cornerRadius: 8,
    },
    frame: {
      color: '#4a5568',
      accent: '#2d3748',
      material: 'metal',
      thickness: 28,
    },
    cabin: {
      wallColor: '#5a6a7a',
      seatColor: '#3a5a8a',
      fabricPattern: 'striped',
      curtainColor: '#6a7a4a',
      hasCurtains: true,
      hasLuggageRack: true,
      hasFan: true,
      lightColor: '#ffe8c0',
      lightIntensity: 0.6,
    },
    motion: {
      swayAmount: 1.0,
      vibrationAmount: 1.0,
      joltChance: 0.012,
    },
    ambience: {
      fanHum: true,
      metallic: true,
      voiceChatter: 0.2,
    },
  },

  firstclass: {
    label: '1st Class AC',
    icon: '💺',
    description: 'Air-conditioned first class',
    window: {
      top: 0.10,
      bottom: 0.88,
      left: 0.07,
      right: 0.93,
      cornerRadius: 10,
    },
    frame: {
      color: '#5a4a3a',
      accent: '#8b6914',
      material: 'wood',
      thickness: 32,
    },
    cabin: {
      wallColor: '#f0e6d4',
      seatColor: '#8b4513',
      fabricPattern: 'solid',
      curtainColor: '#c4956a',
      hasCurtains: true,
      hasLuggageRack: true,
      hasFan: false,
      lightColor: '#fff5e0',
      lightIntensity: 0.5,
    },
    motion: {
      swayAmount: 0.7,
      vibrationAmount: 0.6,
      joltChance: 0.008,
    },
    ambience: {
      fanHum: false,
      metallic: false,
      voiceChatter: 0.1,
    },
  },

  chaircar: {
    label: 'Chair Car',
    icon: '💺',
    description: 'Standard seating coach',
    window: {
      top: 0.14,
      bottom: 0.86,
      left: 0.09,
      right: 0.91,
      cornerRadius: 6,
    },
    frame: {
      color: '#6a7a8a',
      accent: '#4a5a6a',
      material: 'plastic',
      thickness: 24,
    },
    cabin: {
      wallColor: '#d8dce0',
      seatColor: '#4a7aaa',
      fabricPattern: 'patterned',
      curtainColor: '#8a9aaa',
      hasCurtains: true,
      hasLuggageRack: true,
      hasFan: true,
      lightColor: '#f0f0ff',
      lightIntensity: 0.7,
    },
    motion: {
      swayAmount: 0.9,
      vibrationAmount: 0.9,
      joltChance: 0.01,
    },
    ambience: {
      fanHum: true,
      metallic: true,
      voiceChatter: 0.3,
    },
  },

  vandebharat: {
    label: 'Vande Bharat',
    icon: '🚄',
    description: 'Modern premium express',
    window: {
      top: 0.08,
      bottom: 0.90,
      left: 0.05,
      right: 0.95,
      cornerRadius: 16,
    },
    frame: {
      color: '#e0e4e8',
      accent: '#2196f3',
      material: 'composite',
      thickness: 20,
    },
    cabin: {
      wallColor: '#f5f5f5',
      seatColor: '#37474f',
      fabricPattern: 'solid',
      curtainColor: null,
      hasCurtains: false,
      hasLuggageRack: false,
      hasFan: false,
      lightColor: '#f0f4ff',
      lightIntensity: 0.4,
      hasLedStrip: true,
      ledColor: '#4fc3f7',
    },
    motion: {
      swayAmount: 0.4,
      vibrationAmount: 0.3,
      joltChance: 0.004,
    },
    ambience: {
      fanHum: false,
      metallic: false,
      voiceChatter: 0.05,
    },
  },

  luggage: {
    label: 'Luggage Van',
    icon: '📦',
    description: 'View from the luggage van door',
    window: {
      top: 0.05,
      bottom: 0.95,
      left: 0.03,
      right: 0.97,
      cornerRadius: 4,
    },
    frame: {
      color: '#555555',
      accent: '#3a3a3a',
      material: 'metal',
      thickness: 18,
    },
    cabin: {
      wallColor: '#4a4a4a',
      seatColor: null,
      fabricPattern: null,
      curtainColor: null,
      hasCurtains: false,
      hasLuggageRack: false,
      hasFan: false,
      lightColor: '#ffe0a0',
      lightIntensity: 0.3,
      hasShelving: true,
    },
    motion: {
      swayAmount: 1.3,
      vibrationAmount: 1.4,
      joltChance: 0.02,
    },
    ambience: {
      fanHum: false,
      metallic: true,
      voiceChatter: 0,
    },
  },
};

/** Get coach config by name */
export function getCoach(name) {
  return COACHES[name] || COACHES.sleeper;
}

/** Get all coach names */
export function getCoachList() {
  return Object.keys(COACHES).map(key => ({
    key,
    ...COACHES[key],
  }));
}
