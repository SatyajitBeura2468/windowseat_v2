import { serializeUrlState } from "../app/urlState";
import type { JourneyState } from "../types";

export const journeyLink = (state: JourneyState): string =>
  serializeUrlState(state);

export async function shareJourney(
  state: JourneyState,
): Promise<"shared" | "copied"> {
  const url = journeyLink(state);
  if (navigator.share) {
    await navigator.share({
      title: "WindowSeat V2",
      text: "Take this window seat.",
      url,
    });
    return "shared";
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export async function copyJourney(state: JourneyState): Promise<void> {
  await navigator.clipboard.writeText(journeyLink(state));
}
