import { COACHES } from "../data/coaches";
import { ROUTE_IDS, getRoute } from "../data/routes";
import { TIME_OPTIONS, WEATHER_OPTIONS } from "../data/weather";
import type { JourneyState, QualityMode, SpeedPreset } from "../types";

const speeds: SpeedPreset[] = [0, 0.65, 1, 1.35];
const qualities: QualityMode[] = ["cinematic", "balanced", "data-saver"];

export function parseUrlState(
  search: string,
  fallback: JourneyState,
): JourneyState {
  const params = new URLSearchParams(search);
  const route = ROUTE_IDS.includes(params.get("route") as never)
    ? (params.get("route") as JourneyState["route"])
    : fallback.route;
  const definition = getRoute(route);
  const coach = COACHES.some((item) => item.id === params.get("coach"))
    ? (params.get("coach") as JourneyState["coach"])
    : fallback.coach;
  const requestedWeather = params.get("weather");
  const weather =
    WEATHER_OPTIONS.some((item) => item.id === requestedWeather) &&
    definition.weather.includes(requestedWeather as JourneyState["weather"])
      ? (requestedWeather as JourneyState["weather"])
      : definition.defaultWeather;
  const time = TIME_OPTIONS.some((item) => item.id === params.get("time"))
    ? (params.get("time") as JourneyState["time"])
    : fallback.time;
  const speedParameter = params.get("speed");
  const speedValue =
    speedParameter === null ? Number.NaN : Number(speedParameter);
  const speed = speeds.includes(speedValue as SpeedPreset)
    ? (speedValue as SpeedPreset)
    : fallback.speed;
  const quality = qualities.includes(params.get("quality") as QualityMode)
    ? (params.get("quality") as QualityMode)
    : fallback.quality;
  const seed =
    (params.get("seed") || fallback.seed)
      .replace(/[^A-Z0-9-]/gi, "")
      .slice(0, 28) || fallback.seed;
  return { ...fallback, route, coach, weather, time, speed, quality, seed };
}

export function serializeUrlState(
  state: JourneyState,
  origin = window.location.origin,
  pathname = window.location.pathname,
): string {
  const params = new URLSearchParams({
    route: state.route,
    coach: state.coach,
    weather: state.weather,
    time: state.time,
    speed: String(state.speed),
    quality: state.quality,
    seed: state.seed,
  });
  return `${origin}${pathname}?${params.toString()}`;
}

export function syncUrlState(state: JourneyState): void {
  history.replaceState(
    null,
    "",
    serializeUrlState(state, window.location.origin, window.location.pathname),
  );
}
