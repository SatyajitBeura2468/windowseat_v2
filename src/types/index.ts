export type RouteId =
  | "konkan-monsoon"
  | "odisha-green"
  | "himalayan-dawn"
  | "rajasthan-twilight"
  | "bengal-countryside"
  | "southern-coast";

export type CoachId = "sleeper" | "ac-first" | "modern" | "luggage";
export type WeatherPreset =
  "clear" | "overcast" | "light-rain" | "monsoon" | "fog" | "storm" | "snow";
export type TimePreset =
  "dawn" | "morning" | "afternoon" | "golden-hour" | "dusk" | "night";
export type QualityMode = "cinematic" | "balanced" | "data-saver";
export type SpeedPreset = 0 | 0.65 | 1 | 1.35;

export interface DepthLayer {
  id: "sky" | "distant" | "midground" | "foreground";
  speed: number;
  scale: number;
  verticalBand: [number, number];
  blur?: number;
}

export interface MediaSource {
  src: string;
  type: "image/avif" | "image/webp";
  width: number;
  height: number;
}

export interface SceneAsset {
  id: string;
  route: RouteId;
  biome: string;
  type: "layered-image";
  sources: MediaSource[];
  poster: string;
  duration: number;
  loopStrategy: "crossfade" | "ping-pong";
  depthLayers: DepthLayer[];
  dominantPalette: string[];
  naturalTime: TimePreset;
  supportedWeather: WeatherPreset[];
  attributionId: string;
}

export interface RouteDefinition {
  id: RouteId;
  name: string;
  shortName: string;
  regionLabel: string;
  description: string;
  seedPrefix: string;
  nativeTime: TimePreset;
  defaultWeather: WeatherPreset;
  weather: WeatherPreset[];
  ambience: "forest" | "fields" | "mountain" | "desert" | "wetland" | "coast";
  scenes: SceneAsset[];
  rareEvents: string[];
}

export interface CoachDefinition {
  id: CoachId;
  name: string;
  description: string;
  rhythm: number;
  wind: number;
}

export interface AudioMix {
  master: number;
  train: number;
  environment: number;
  weather: number;
}

export interface JourneyState {
  route: RouteId;
  coach: CoachId;
  weather: WeatherPreset;
  time: TimePreset;
  timeLocked: boolean;
  speed: SpeedPreset;
  quality: QualityMode;
  seed: string;
  focus: boolean;
  sound: boolean;
  reducedEffects: boolean;
  sceneIndex: number;
  audio: AudioMix;
}

export interface CaptureState {
  route: RouteId;
  coach: CoachId;
  weather: WeatherPreset;
  time: TimePreset;
  sceneSrc: string;
  label: boolean;
  format: "wide" | "square";
}
