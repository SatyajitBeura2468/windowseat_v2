import type { TimePreset, WeatherPreset } from "../types";

export const WEATHER_OPTIONS: { id: WeatherPreset; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "overcast", label: "Overcast" },
  { id: "light-rain", label: "Light rain" },
  { id: "monsoon", label: "Monsoon" },
  { id: "fog", label: "Fog" },
  { id: "storm", label: "Storm" },
  { id: "snow", label: "Light snow" },
];

export const TIME_OPTIONS: { id: TimePreset; label: string }[] = [
  { id: "dawn", label: "Dawn" },
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "golden-hour", label: "Golden hour" },
  { id: "dusk", label: "Dusk" },
  { id: "night", label: "Night" },
];

export const WEATHER_DESCRIPTIONS: Record<WeatherPreset, string> = {
  clear: "clear visibility and dry glass",
  overcast: "soft cloud cover and muted contrast",
  "light-rain": "light rain collecting on the glass",
  monsoon: "heavy rain, wet glass and low cloud",
  fog: "reduced visibility in drifting mist",
  storm: "dark cloud, hard rain and distant lightning",
  snow: "light snow with softened visibility",
};
