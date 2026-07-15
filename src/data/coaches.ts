import type { CoachDefinition } from "../types";

export const COACHES: CoachDefinition[] = [
  {
    id: "sleeper",
    name: "Classic Sleeper",
    description:
      "Practical railway blue, metal fittings, bars and a stronger track rhythm.",
    rhythm: 1.18,
    wind: 0.72,
  },
  {
    id: "ac-first",
    name: "AC First",
    description:
      "Warm fabric, restrained timber tones and a quieter sealed compartment.",
    rhythm: 0.72,
    wind: 0.28,
  },
  {
    id: "modern",
    name: "Modern Express",
    description:
      "Broad sealed glass, graphite composite trim and smooth motion.",
    rhythm: 0.82,
    wind: 0.18,
  },
  {
    id: "luggage",
    name: "Open Luggage View",
    description:
      "A wide rugged opening with strong air movement and minimal framing.",
    rhythm: 1.3,
    wind: 1.35,
  },
];

export const getCoach = (id: CoachDefinition["id"]) =>
  COACHES.find((coach) => coach.id === id) ?? COACHES[2]!;
