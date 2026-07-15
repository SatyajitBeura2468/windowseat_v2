import type { JourneyState, SceneAsset } from "../types";

type ProgressListener = (progress: number, label: string) => void;

export class MediaEngine {
  private activeSlot = 0;
  private generation = 0;
  private readonly slots: HTMLElement[];
  private currentScene: SceneAsset | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly onProgress: ProgressListener,
  ) {
    this.host.innerHTML =
      '<div class="scene-slot is-active"></div><div class="scene-slot"></div>';
    this.slots = Array.from(
      this.host.querySelectorAll<HTMLElement>(".scene-slot"),
    );
  }

  get scene(): SceneAsset | null {
    return this.currentScene;
  }

  async setScene(
    scene: SceneAsset,
    state: JourneyState,
    immediate = false,
  ): Promise<void> {
    const request = ++this.generation;
    const source =
      state.quality === "data-saver" ? scene.poster : scene.sources[0]!.src;
    this.onProgress(12, `Loading ${scene.biome}`);
    const loaded = await this.loadImage(source).catch(() => false);
    if (request !== this.generation) return;

    const resolvedSource = loaded ? source : scene.poster;
    this.onProgress(
      68,
      loaded ? "Composing depth layers" : "Using route poster fallback",
    );
    const targetIndex = immediate ? this.activeSlot : 1 - this.activeSlot;
    const target = this.slots[targetIndex]!;
    target.replaceChildren();
    target.dataset.scene = scene.id;

    const selectedLayers =
      state.quality === "data-saver"
        ? [scene.depthLayers[2]!]
        : scene.depthLayers;
    for (const layer of selectedLayers) {
      const element = document.createElement("div");
      element.className = `scene-depth scene-depth--${layer.id}`;
      element.style.setProperty("--scene-image", `url("${resolvedSource}")`);
      element.style.setProperty(
        "--depth-speed",
        `${Math.max(16, 12 / (layer.speed * state.speed + 0.08))}s`,
      );
      element.style.setProperty("--depth-scale", String(layer.scale));
      element.style.setProperty("--band-top", `${layer.verticalBand[0]}%`);
      element.style.setProperty("--band-bottom", `${layer.verticalBand[1]}%`);
      element.style.setProperty("--depth-blur", `${layer.blur ?? 0}px`);
      target.append(element);
    }

    target.classList.add("is-active");
    if (!immediate) {
      this.slots[this.activeSlot]!.classList.remove("is-active");
      this.activeSlot = targetIndex;
    }
    this.currentScene = scene;
    this.updateMotion(state);
    this.onProgress(100, "Journey ready");
  }

  updateMotion(state: JourneyState): void {
    this.host.style.setProperty("--journey-speed", String(state.speed));
    this.host.classList.toggle(
      "is-paused",
      state.speed === 0 || state.reducedEffects,
    );
    this.host.dataset.quality = state.quality;
  }

  prefetch(scene: SceneAsset, state: JourneyState): void {
    const source =
      state.quality === "data-saver" ? scene.poster : scene.sources[0]!.src;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = source;
    link.dataset.windowseatPrefetch = "true";
    document.head
      .querySelectorAll("[data-windowseat-prefetch]")
      .forEach((item) => item.remove());
    document.head.append(link);
  }

  pause(paused: boolean): void {
    this.host.classList.toggle("is-page-hidden", paused);
  }

  private loadImage(src: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(true);
      image.onerror = () => reject(new Error(`Unable to load ${src}`));
      image.src = src;
    });
  }
}
