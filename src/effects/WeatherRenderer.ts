import { boundedDpr } from "./PerformanceManager";
import type { JourneyState, WeatherPreset } from "../types";
import { seededRandom } from "../journey/seeds";

interface Drop {
  x: number;
  y: number;
  radius: number;
  speed: number;
  trail: number;
}

const rainIntensity: Record<WeatherPreset, number> = {
  clear: 0,
  overcast: 0,
  "light-rain": 0.38,
  monsoon: 0.9,
  fog: 0.04,
  storm: 1,
  snow: 0.12,
};

export class WeatherRenderer {
  private readonly context: CanvasRenderingContext2D;
  private drops: Drop[] = [];
  private frame = 0;
  private width = 0;
  private height = 0;
  private state: JourneyState;
  private lastLightning = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    state: JourneyState,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    this.state = state;
    this.resize();
    this.seedDrops();
  }

  start(): void {
    if (!this.frame) this.frame = requestAnimationFrame(this.render);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  update(state: JourneyState): void {
    const routeChanged = state.seed !== this.state.seed;
    this.state = state;
    if (routeChanged) this.seedDrops();
    this.canvas.dataset.weather = state.weather;
  }

  resize = (): void => {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = boundedDpr(this.state.quality);
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private seedDrops(): void {
    const random = seededRandom(this.state.seed);
    this.drops = Array.from(
      { length: this.state.quality === "cinematic" ? 110 : 58 },
      () => ({
        x: random() * Math.max(this.width, 1),
        y: random() * Math.max(this.height, 1),
        radius: 0.8 + random() * 3.4,
        speed: 0.08 + random() * 0.34,
        trail: random() * 16,
      }),
    );
  }

  private render = (time: number): void => {
    this.context.clearRect(0, 0, this.width, this.height);
    const intensity =
      rainIntensity[this.state.weather] * (this.state.reducedEffects ? 0.3 : 1);
    if (intensity > 0.08) {
      const gradient = this.context.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, "rgba(225,238,244,.34)");
      gradient.addColorStop(1, "rgba(120,154,170,.09)");
      this.context.strokeStyle = gradient;
      this.context.fillStyle = "rgba(220,238,245,.17)";
      this.context.lineWidth = 0.8;
      for (const drop of this.drops.slice(
        0,
        Math.floor(this.drops.length * intensity),
      )) {
        drop.y += drop.speed * (0.55 + this.state.speed) * 4;
        drop.x -= this.state.speed * 0.08;
        if (drop.y > this.height + 20) {
          drop.y = -12;
          drop.x = (drop.x + this.width * 0.61) % this.width;
        }
        this.context.beginPath();
        this.context.ellipse(
          drop.x,
          drop.y,
          drop.radius,
          drop.radius * 1.5,
          -0.16,
          0,
          Math.PI * 2,
        );
        this.context.fill();
        if (drop.radius > 2) {
          this.context.beginPath();
          this.context.moveTo(drop.x, drop.y + drop.radius);
          this.context.lineTo(
            drop.x - this.state.speed * 2,
            drop.y + drop.radius + drop.trail,
          );
          this.context.stroke();
        }
      }
    }
    if (
      this.state.weather === "storm" &&
      !this.state.reducedEffects &&
      time - this.lastLightning > 9000
    ) {
      this.canvas.classList.add("lightning");
      window.setTimeout(() => this.canvas.classList.remove("lightning"), 120);
      this.lastLightning = time;
    }
    this.frame = requestAnimationFrame(this.render);
  };
}
