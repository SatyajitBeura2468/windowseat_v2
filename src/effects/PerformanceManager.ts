import type { QualityMode } from "../types";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

export function chooseQuality(
  hints: Pick<
    NavigatorHints,
    "deviceMemory" | "connection"
  > = navigator as NavigatorHints,
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  width = window.innerWidth,
): QualityMode {
  if (
    hints.connection?.saveData ||
    reducedMotion ||
    (hints.deviceMemory ?? 8) <= 2
  )
    return "data-saver";
  if (width >= 1400 && (hints.deviceMemory ?? 8) >= 8) return "cinematic";
  return "balanced";
}

export const boundedDpr = (quality: QualityMode): number => {
  const maximum =
    quality === "cinematic" ? 2 : quality === "balanced" ? 1.5 : 1;
  return Math.min(window.devicePixelRatio || 1, maximum);
};
