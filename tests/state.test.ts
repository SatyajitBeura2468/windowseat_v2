import { beforeEach, describe, expect, it } from "vitest";
import { loadPreferences, savePreferences } from "../src/app/persistence";
import { createDefaultState } from "../src/app/state";
import { parseUrlState, serializeUrlState } from "../src/app/urlState";
import { chooseQuality } from "../src/effects/PerformanceManager";
import { RouteScheduler } from "../src/journey/RouteScheduler";
import {
  createJourneySeed,
  hashSeed,
  seededRandom,
} from "../src/journey/seeds";

describe("journey state", () => {
  beforeEach(() => localStorage.clear());

  it("keeps seeded random journeys deterministic", () => {
    const first = seededRandom("KONKAN-0726");
    const second = seededRandom("KONKAN-0726");
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
    expect(hashSeed("KONKAN-0726")).toBe(hashSeed("KONKAN-0726"));
    expect(createJourneySeed("KONKAN", () => 0.0726)).toBe("KONKAN-0725");
  });

  it("schedules scene transitions deterministically", () => {
    const first = new RouteScheduler("ODISHA-2044", 4);
    const second = new RouteScheduler("ODISHA-2044", 4);
    expect([first.current(), first.next(), first.next()]).toEqual([
      second.current(),
      second.next(),
      second.next(),
    ]);
  });

  it("parses and serializes a complete share URL", () => {
    const fallback = createDefaultState();
    const state = parseUrlState(
      "?route=rajasthan-twilight&coach=sleeper&weather=storm&time=dusk&speed=1.35&quality=data-saver&seed=RAJ-2042",
      fallback,
    );
    expect(state).toMatchObject({
      route: "rajasthan-twilight",
      coach: "sleeper",
      weather: "storm",
      time: "dusk",
      speed: 1.35,
      quality: "data-saver",
      seed: "RAJ-2042",
    });
    expect(serializeUrlState(state, "https://example.test", "/")).toContain(
      "route=rajasthan-twilight",
    );
  });

  it("recovers from invalid URL values with route-safe defaults", () => {
    const fallback = createDefaultState();
    expect(parseUrlState("", fallback).speed).toBe(fallback.speed);
    const state = parseUrlState(
      "?route=unknown&coach=yacht&weather=snow&speed=99&seed=%2Fbad%3F",
      fallback,
    );
    expect(state.route).toBe(fallback.route);
    expect(state.coach).toBe(fallback.coach);
    expect(state.weather).toBe("monsoon");
    expect(state.speed).toBe(fallback.speed);
    expect(state.seed).toBe("bad");
  });

  it("persists preferences without reactivating audio", () => {
    const state = {
      ...createDefaultState(),
      route: "bengal-countryside" as const,
      sound: true,
      focus: true,
    };
    savePreferences(state);
    const restored = loadPreferences(createDefaultState());
    expect(restored.route).toBe("bengal-countryside");
    expect(restored.sound).toBe(false);
    expect(restored.focus).toBe(false);
  });

  it("selects conservative quality for save-data and reduced motion", () => {
    expect(
      chooseQuality(
        { deviceMemory: 8, connection: { saveData: true } },
        false,
        1920,
      ),
    ).toBe("data-saver");
    expect(
      chooseQuality(
        { deviceMemory: 16, connection: { saveData: false } },
        true,
        1920,
      ),
    ).toBe("data-saver");
    expect(
      chooseQuality(
        { deviceMemory: 16, connection: { saveData: false } },
        false,
        1920,
      ),
    ).toBe("cinematic");
  });
});
