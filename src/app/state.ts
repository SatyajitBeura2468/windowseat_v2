import { getRoute } from "../data/routes";
import { chooseQuality } from "../effects/PerformanceManager";
import { createJourneySeed } from "../journey/seeds";
import type { JourneyState, RouteId } from "../types";

export const DEFAULT_ROUTE: RouteId = "konkan-monsoon";

export function createDefaultState(): JourneyState {
  const route = getRoute(DEFAULT_ROUTE);
  return {
    route: route.id,
    coach: "modern",
    weather: route.defaultWeather,
    time: route.nativeTime,
    timeLocked: false,
    speed: 1,
    quality: chooseQuality(),
    seed: createJourneySeed(route.seedPrefix),
    focus: false,
    sound: false,
    reducedEffects: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    sceneIndex: 0,
    audio: { master: 0.62, train: 0.65, environment: 0.48, weather: 0.5 },
  };
}

export function stateForRoute(
  current: JourneyState,
  routeId: RouteId,
): JourneyState {
  const route = getRoute(routeId);
  return {
    ...current,
    route: routeId,
    weather: route.defaultWeather,
    time: current.timeLocked ? current.time : route.nativeTime,
    seed: createJourneySeed(route.seedPrefix),
    sceneIndex: 0,
  };
}
