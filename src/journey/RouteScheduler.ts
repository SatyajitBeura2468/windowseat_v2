import { seededRandom } from "./seeds";

export class RouteScheduler {
  private readonly random: () => number;
  private sceneIndex = 0;

  constructor(
    seed: string,
    private readonly sceneCount: number,
  ) {
    this.random = seededRandom(seed);
    this.sceneIndex = Math.floor(this.random() * Math.max(sceneCount, 1));
  }

  current(): number {
    return this.sceneIndex;
  }

  next(): number {
    if (this.sceneCount <= 1) return 0;
    const step = 1 + Math.floor(this.random() * (this.sceneCount - 1));
    this.sceneIndex = (this.sceneIndex + step) % this.sceneCount;
    return this.sceneIndex;
  }

  rareEvent(chance = 0.14): boolean {
    return this.random() < chance;
  }
}
