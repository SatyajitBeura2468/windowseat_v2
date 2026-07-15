import type { JourneyState } from "../types";

const STORAGE_KEY = "windowseat-v2-preferences";
const persistedKeys: (keyof JourneyState)[] = [
  "route",
  "coach",
  "weather",
  "time",
  "timeLocked",
  "speed",
  "quality",
  "seed",
  "reducedEffects",
  "audio",
];

export function savePreferences(
  state: JourneyState,
  storage: Storage = localStorage,
): void {
  const data = Object.fromEntries(
    persistedKeys.map((key) => [key, state[key]]),
  );
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPreferences(
  fallback: JourneyState,
  storage: Storage = localStorage,
): JourneyState {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<JourneyState>;
    return {
      ...fallback,
      ...parsed,
      sound: false,
      focus: false,
      sceneIndex: 0,
    };
  } catch {
    return fallback;
  }
}

export const clearPreferences = (storage: Storage = localStorage): void =>
  storage.removeItem(STORAGE_KEY);
