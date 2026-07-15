import { describe, expect, it } from "vitest";
import { createDefaultState } from "../src/app/state";
import { getRoute } from "../src/data/routes";
import { MediaEngine } from "../src/media/MediaEngine";

describe("media engine", () => {
  it("composes depth layers and pauses hidden-tab motion", async () => {
    const host = document.createElement("div");
    const media = new MediaEngine(host, () => undefined);
    const state = createDefaultState();
    await media.setScene(getRoute(state.route).scenes[0]!, state, true);
    expect(host.querySelectorAll(".scene-depth")).toHaveLength(4);
    media.pause(true);
    expect(host.classList.contains("is-page-hidden")).toBe(true);
    media.pause(false);
    expect(host.classList.contains("is-page-hidden")).toBe(false);
  });

  it("uses the poster when a primary scene source fails", async () => {
    const host = document.createElement("div");
    const media = new MediaEngine(host, () => undefined);
    const state = createDefaultState();
    const base = getRoute(state.route).scenes[0]!;
    await media.setScene(
      { ...base, sources: [{ ...base.sources[0]!, src: "/fail-scene.avif" }] },
      state,
      true,
    );
    expect(
      host
        .querySelector<HTMLElement>(".scene-depth")
        ?.style.getPropertyValue("--scene-image"),
    ).toContain(base.poster);
  });
});
