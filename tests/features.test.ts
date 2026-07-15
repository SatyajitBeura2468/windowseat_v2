import { describe, expect, it } from "vitest";
import manifest from "../public/media/asset-manifest.json";
import { createDefaultState } from "../src/app/state";
import { captureDimensions } from "../src/ui/capture";
import { journeyLink } from "../src/ui/share";

describe("share, capture, and licences", () => {
  it("generates a share link with exact journey state", () => {
    const state = createDefaultState();
    const link = journeyLink({
      ...state,
      route: "southern-coast",
      seed: "COAST-7777",
    });
    expect(link).toContain("route=southern-coast");
    expect(link).toContain("seed=COAST-7777");
  });

  it("defines stable capture aspect ratios", () => {
    expect(captureDimensions("wide")).toEqual([1920, 1080]);
    expect(captureDimensions("square")).toEqual([1600, 1600]);
  });

  it("validates every production media record has redistribution and licence metadata", () => {
    expect(manifest.assets).toHaveLength(6);
    for (const asset of manifest.assets) {
      expect(asset.localFiles.length).toBeGreaterThanOrEqual(3);
      expect(asset.licence).toBeTruthy();
      expect(asset.licenceUrl).toMatch(/^https:/);
      expect(asset.redistributionPermitted).toBe(true);
      expect(asset.generated).toBe(true);
    }
  });
});
