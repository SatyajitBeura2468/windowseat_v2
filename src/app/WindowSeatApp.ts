import { AudioEngine } from "../audio/AudioEngine";
import { COACHES, getCoach } from "../data/coaches";
import { ROUTES, getRoute } from "../data/routes";
import {
  TIME_OPTIONS,
  WEATHER_DESCRIPTIONS,
  WEATHER_OPTIONS,
} from "../data/weather";
import { WeatherRenderer } from "../effects/WeatherRenderer";
import { RouteScheduler } from "../journey/RouteScheduler";
import { MediaEngine } from "../media/MediaEngine";
import type {
  JourneyState,
  QualityMode,
  RouteId,
  SpeedPreset,
  TimePreset,
  WeatherPreset,
} from "../types";
import { downloadCapture } from "../ui/capture";
import { icon } from "../ui/icons";
import { copyJourney, shareJourney } from "../ui/share";
import { loadPreferences, savePreferences } from "./persistence";
import { createDefaultState, stateForRoute } from "./state";
import { parseUrlState, syncUrlState } from "./urlState";

export class WindowSeatApp {
  private state: JourneyState;
  private readonly media: MediaEngine;
  private readonly weather: WeatherRenderer;
  private readonly audio = new AudioEngine();
  private scheduler: RouteScheduler;
  private sceneTimer = 0;
  private eventTimer = 0;
  private hideTimer = 0;
  private started = false;

  constructor(private readonly mount: HTMLElement) {
    const defaults = createDefaultState();
    this.state = parseUrlState(
      window.location.search,
      loadPreferences(defaults),
    );
    this.mount.innerHTML = this.template();
    const mediaHost = this.required<HTMLElement>("[data-media]");
    this.media = new MediaEngine(mediaHost, this.updateLoading);
    this.weather = new WeatherRenderer(
      this.required<HTMLCanvasElement>("[data-weather-canvas]"),
      this.state,
    );
    this.scheduler = new RouteScheduler(
      this.state.seed,
      getRoute(this.state.route).scenes.length,
    );
  }

  async start(): Promise<void> {
    this.bind();
    this.applyState();
    await this.loadScene(true);
    this.weather.start();
    this.required("[data-loading]").classList.add("is-complete");
    window.setTimeout(
      () => this.required("[data-loading]").setAttribute("hidden", ""),
      500,
    );
    this.announce(`${getRoute(this.state.route).name} is ready.`);
  }

  private template(): string {
    return `
      <section class="experience coach--${this.state.coach}" data-experience data-coach="${this.state.coach}" data-time="${this.state.time}" data-weather="${this.state.weather}">
        <div class="loading-screen" data-loading role="status" aria-live="polite">
          <span class="wordmark">WINDOWSEAT</span>
          <div class="loading-track"><i data-loading-bar></i></div>
          <span class="loading-copy" data-loading-copy>Preparing the window</span>
        </div>

        <div class="coach-shell" aria-label="Cinematic train-window view">
          <div class="coach-top" aria-hidden="true"><span class="reading-light"></span><span class="coach-plate">WS · 02</span></div>
          <div class="coach-side coach-side--left" aria-hidden="true"><span class="panel-line"></span><span class="seat-edge"></span></div>
          <div class="coach-side coach-side--right" aria-hidden="true"><span class="panel-line"></span><span class="bottle-slot"></span></div>

          <div class="window-surround">
            <div class="window-seal">
              <div class="window-view" data-window-view tabindex="-1">
                <div class="media-stage" data-media aria-hidden="true"></div>
                <div class="time-grade" aria-hidden="true"></div>
                <div class="weather-grade" aria-hidden="true"></div>
                <canvas class="weather-canvas" data-weather-canvas aria-hidden="true"></canvas>
                <div class="glass-reflection" aria-hidden="true"></div>
                <div class="window-bars" aria-hidden="true"></div>

                <div class="onboarding" data-onboarding>
                  <p class="wordmark onboarding__mark">WINDOWSEAT</p>
                  <h1>The journey begins outside your window.</h1>
                  <p class="onboarding__support">No destination. No schedule. Just the view.</p>
                  <div class="onboarding__actions">
                    <button class="primary-action" type="button" data-action="begin">Take the window seat</button>
                    <button class="secondary-action" type="button" data-action="open-journeys">Choose a journey</button>
                  </div>
                  <p class="sound-notice">${icon("sound")} Headphones recommended. Sound begins only after you choose.</p>
                </div>

                <div class="route-beacon" data-route-beacon aria-hidden="true">
                  <span data-route-region></span>
                  <strong data-route-name></strong>
                  <small data-route-seed></small>
                </div>
                <div class="rare-event" data-rare-event aria-live="polite"></div>
                <p class="sr-only" data-route-description></p>
              </div>
            </div>
          </div>

          <div class="coach-sill">
            <div class="journey-status" aria-live="polite">
              <span class="journey-status__signal"></span>
              <span><strong data-status-route></strong><small data-status-detail></small></span>
            </div>
            <nav class="control-shelf" data-controls aria-label="Journey controls">
              ${this.controlButton("route", "Route", "open-journeys")}
              ${this.controlButton("coach", "Coach", "open-settings", "coach")}
              ${this.controlButton("weather", "Weather", "open-settings", "weather")}
              ${this.controlButton("time", "Time", "open-settings", "time")}
              ${this.controlButton("speed", "Speed", "cycle-speed")}
              ${this.controlButton("sound", "Sound", "toggle-sound")}
              ${this.controlButton("focus", "Focus", "toggle-focus")}
              ${this.controlButton("capture", "Capture", "capture")}
              ${this.controlButton("share", "Share", "share")}
              <button class="control control--settings" type="button" data-action="open-settings" aria-label="Open detailed settings">${icon("settings")}</button>
            </nav>
          </div>
        </div>

        <div class="overlay" data-journey-overlay hidden>
          <button class="overlay__backdrop" type="button" data-action="close-overlay" aria-label="Close journey picker"></button>
          <section class="journey-picker" role="dialog" aria-modal="true" aria-labelledby="journey-title">
            <header class="panel-header"><div><span>Curated journeys</span><h2 id="journey-title">Choose what passes by</h2></div><button type="button" data-action="close-overlay" aria-label="Close">${icon("close")}</button></header>
            <div class="journey-list">${ROUTES.map((route) => this.routeCard(route.id)).join("")}</div>
            <button class="random-journey" type="button" data-action="random">${icon("random")} Let the rails decide</button>
          </section>
        </div>

        <div class="overlay" data-settings-overlay hidden>
          <button class="overlay__backdrop" type="button" data-action="close-overlay" aria-label="Close settings"></button>
          <section class="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <header class="panel-header"><div><span>Window controls</span><h2 id="settings-title">Shape the journey</h2></div><button type="button" data-action="close-overlay" aria-label="Close">${icon("close")}</button></header>
            <div class="settings-scroll">
              ${this.selectField(
                "coach",
                "Coach",
                COACHES.map((item) => [item.id, item.name]),
              )}
              ${this.selectField(
                "weather",
                "Weather",
                WEATHER_OPTIONS.map((item) => [item.id, item.label]),
              )}
              ${this.selectField(
                "time",
                "Time of day",
                TIME_OPTIONS.map((item) => [item.id, item.label]),
              )}
              <label class="toggle-row"><span><strong>Lock time</strong><small>Keep this light through scene changes.</small></span><input type="checkbox" name="timeLocked" /></label>
              <fieldset class="quality-field"><legend>Image quality</legend>${(["cinematic", "balanced", "data-saver"] as QualityMode[]).map((quality) => `<label><input type="radio" name="quality" value="${quality}" /><span>${quality.replace("-", " ")}</span></label>`).join("")}</fieldset>
              <label class="toggle-row"><span><strong>Reduce visual effects</strong><small>Uses a calmer static composition.</small></span><input type="checkbox" name="reducedEffects" /></label>
              <div class="mixer"><h3>Audio mixer</h3>${this.rangeField("master", "Master")}${this.rangeField("train", "Train")}${this.rangeField("environment", "Environment")}${this.rangeField("weatherVolume", "Weather")}</div>
              <details class="credits"><summary>Credits and media licences</summary><p>All six landscape plates are original AI-generated project assets created for WindowSeat V2 and served locally. Regional names describe inspiration, not documentary accuracy.</p><a href="/media/asset-manifest.json" target="_blank" rel="noreferrer">Open machine-readable asset manifest</a><a href="https://github.com/SatyajitBeura2468/windowseat_v2/blob/main/ASSET_LICENSES.md" target="_blank" rel="noreferrer">Read media licence notes</a></details>
            </div>
          </section>
        </div>

        <div class="toast" data-toast role="status" aria-live="polite"></div>
        <div class="sr-only" data-announcer aria-live="polite"></div>
      </section>`;
  }

  private controlButton(
    iconName: string,
    label: string,
    action: string,
    valueKey = iconName,
  ): string {
    return `<button class="control" type="button" data-action="${action}" data-setting-target="${valueKey}" aria-label="${label}">${icon(iconName)}<span><small>${label}</small><strong data-control-value="${valueKey}">—</strong></span></button>`;
  }

  private routeCard(id: RouteId): string {
    const route = getRoute(id);
    return `<button class="journey-card" type="button" data-action="select-route" data-route="${route.id}" aria-label="Choose ${route.name}"><img src="${route.scenes[0]!.poster}" width="480" height="270" loading="lazy" alt="" /><span class="journey-card__shade"></span><span class="journey-card__copy"><small>${route.regionLabel}</small><strong>${route.name}</strong><span>${route.description}</span></span><span class="journey-card__arrow">${icon("arrow")}</span></button>`;
  }

  private selectField(
    name: string,
    label: string,
    options: string[][],
  ): string {
    return `<label class="field"><span>${label}</span><select name="${name}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select></label>`;
  }

  private rangeField(name: string, label: string): string {
    return `<label class="range-field"><span>${label}</span><input name="${name}" type="range" min="0" max="1" step="0.01" /></label>`;
  }

  private bind(): void {
    this.mount.addEventListener("click", this.onClick);
    this.mount.addEventListener("change", this.onChange);
    this.mount.addEventListener("input", this.onInput);
    document.addEventListener("keydown", this.onKeydown);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("resize", this.weather.resize);
    ["pointermove", "pointerdown", "focusin"].forEach((event) =>
      this.mount.addEventListener(event, this.revealControls),
    );
  }

  private onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-action]",
    );
    if (!button) return;
    const action = button.dataset.action;
    if (action === "begin") void this.beginJourney();
    if (action === "open-journeys") this.openOverlay("journey");
    if (action === "open-settings")
      this.openOverlay("settings", button.dataset.settingTarget);
    if (action === "close-overlay") this.closeOverlays();
    if (action === "select-route")
      void this.selectRoute(button.dataset.route as RouteId, true);
    if (action === "random") void this.randomJourney();
    if (action === "cycle-speed") this.cycleSpeed();
    if (action === "toggle-sound") void this.toggleSound();
    if (action === "toggle-focus") this.toggleFocus();
    if (action === "capture") void this.capture();
    if (action === "share") void this.share();
  };

  private onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (!input.name) return;
    if (input.name === "coach")
      this.state.coach = input.value as JourneyState["coach"];
    if (input.name === "weather")
      this.state.weather = input.value as WeatherPreset;
    if (input.name === "time") this.state.time = input.value as TimePreset;
    if (input.name === "timeLocked")
      this.state.timeLocked = (input as HTMLInputElement).checked;
    if (input.name === "quality") {
      this.state.quality = input.value as QualityMode;
      void this.loadScene(true);
    }
    if (input.name === "reducedEffects")
      this.state.reducedEffects = (input as HTMLInputElement).checked;
    this.commitState();
  };

  private onInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (input.name === "master") this.state.audio.master = value;
    if (input.name === "train") this.state.audio.train = value;
    if (input.name === "environment") this.state.audio.environment = value;
    if (input.name === "weatherVolume") this.state.audio.weather = value;
    this.audio.apply(this.state);
    savePreferences(this.state);
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement;
    if (
      ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) &&
      event.key !== "Escape"
    )
      return;
    if (event.key === "Escape") {
      if (this.state.focus) this.toggleFocus();
      else this.closeOverlays();
    }
    if (event.key.toLowerCase() === "f") this.toggleFocus();
    if (event.key.toLowerCase() === "m") void this.toggleSound();
    if (event.key.toLowerCase() === "r") void this.randomJourney();
    if (event.key.toLowerCase() === "c") void this.capture();
    if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      void this.share();
    }
    if (event.key === "ArrowRight") this.adjustSpeed(1);
    if (event.key === "ArrowLeft") this.adjustSpeed(-1);
  };

  private onVisibility = (): void => {
    const hidden = document.hidden;
    this.media.pause(hidden);
    if (hidden) {
      this.audio.suspend();
      this.weather.stop();
    } else {
      this.audio.resume(this.state);
      this.weather.start();
    }
  };

  private revealControls = (): void => {
    this.required("[data-experience]").classList.add("controls-visible");
    window.clearTimeout(this.hideTimer);
    if (this.started && !this.state.focus) {
      this.hideTimer = window.setTimeout(
        () =>
          this.required("[data-experience]").classList.remove(
            "controls-visible",
          ),
        4200,
      );
    }
  };

  private async beginJourney(): Promise<void> {
    this.started = true;
    this.required("[data-experience]").classList.add(
      "has-started",
      "controls-visible",
    );
    this.required("[data-onboarding]").setAttribute("aria-hidden", "true");
    this.state.sound = true;
    await this.audio.enable(this.state);
    window.setTimeout(() => this.showRouteBeacon(), 900);
    this.scheduleJourney();
    this.commitState();
    this.revealControls();
  }

  private openOverlay(which: "journey" | "settings", field?: string): void {
    this.closeOverlays();
    const overlay = this.required<HTMLElement>(
      which === "journey"
        ? "[data-journey-overlay]"
        : "[data-settings-overlay]",
    );
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    const focusTarget = field
      ? overlay.querySelector<HTMLElement>(`[name="${field}"]`)
      : overlay.querySelector<HTMLElement>("button, select");
    focusTarget?.focus();
  }

  private closeOverlays(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest(".overlay")) {
      active.blur();
      this.required<HTMLElement>("[data-window-view]").focus({
        preventScroll: true,
      });
    }
    this.mount
      .querySelectorAll<HTMLElement>(".overlay.is-open")
      .forEach((overlay) => {
        overlay.classList.remove("is-open");
        window.setTimeout(() => (overlay.hidden = true), 220);
      });
  }

  private async selectRoute(route: RouteId, begin = false): Promise<void> {
    this.state = stateForRoute(this.state, route);
    this.scheduler = new RouteScheduler(
      this.state.seed,
      getRoute(route).scenes.length,
    );
    this.state.sceneIndex = this.scheduler.current();
    await this.loadScene(false);
    this.closeOverlays();
    const wasStarted = this.started;
    if (begin && !this.started) await this.beginJourney();
    if (wasStarted || !begin) this.showRouteBeacon();
    this.commitState();
  }

  private async randomJourney(): Promise<void> {
    const current = ROUTES.findIndex((route) => route.id === this.state.route);
    const jump = 1 + Math.floor(Math.random() * (ROUTES.length - 1));
    await this.selectRoute(ROUTES[(current + jump) % ROUTES.length]!.id, true);
  }

  private cycleSpeed(): void {
    const speeds: SpeedPreset[] = [0, 0.65, 1, 1.35];
    this.state.speed =
      speeds[(speeds.indexOf(this.state.speed) + 1) % speeds.length]!;
    this.commitState();
  }

  private adjustSpeed(direction: -1 | 1): void {
    const speeds: SpeedPreset[] = [0, 0.65, 1, 1.35];
    const index = Math.min(
      speeds.length - 1,
      Math.max(0, speeds.indexOf(this.state.speed) + direction),
    );
    this.state.speed = speeds[index]!;
    this.commitState();
  }

  private async toggleSound(): Promise<void> {
    this.state.sound = !this.state.sound;
    if (this.state.sound) await this.audio.enable(this.state);
    else this.audio.apply(this.state);
    this.commitState();
    this.toast(this.state.sound ? "Sound on" : "Sound muted");
  }

  private toggleFocus(): void {
    this.state.focus = !this.state.focus;
    this.required("[data-experience]").classList.toggle(
      "focus-mode",
      this.state.focus,
    );
    this.commitState();
    this.toast(
      this.state.focus ? "Focus mode · press Escape to exit" : "Focus mode off",
    );
  }

  private async capture(): Promise<void> {
    const scene = this.media.scene;
    if (!scene) return;
    this.toast("Composing your window…");
    try {
      await downloadCapture({
        route: this.state.route,
        coach: this.state.coach,
        weather: this.state.weather,
        time: this.state.time,
        sceneSrc:
          this.state.quality === "data-saver"
            ? scene.poster
            : scene.sources[0]!.src,
        label: true,
        format: "wide",
      });
      this.toast("Window captured");
    } catch (error) {
      this.toast(error instanceof Error ? error.message : "Capture failed");
    }
  }

  private async share(): Promise<void> {
    try {
      const result = await shareJourney(this.state);
      this.toast(
        result === "shared" ? "Journey shared" : "Journey link copied",
      );
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
      try {
        await copyJourney(this.state);
        this.toast("Journey link copied");
      } catch {
        this.toast("Could not copy the journey link");
      }
    }
  }

  private scheduleJourney(): void {
    window.clearInterval(this.sceneTimer);
    window.clearInterval(this.eventTimer);
    this.sceneTimer = window.setInterval(
      () => void this.advanceScene(),
      32_000,
    );
    this.eventTimer = window.setInterval(() => this.maybeShowEvent(), 24_000);
  }

  private async advanceScene(): Promise<void> {
    this.state.sceneIndex = this.scheduler.next();
    if (!this.state.timeLocked) {
      const order: TimePreset[] = [
        "dawn",
        "morning",
        "afternoon",
        "golden-hour",
        "dusk",
        "night",
      ];
      const current = order.indexOf(this.state.time);
      if (Math.random() > 0.6)
        this.state.time = order[(current + 1) % order.length]!;
    }
    await this.loadScene(false);
    this.commitState();
  }

  private maybeShowEvent(): void {
    if (!this.scheduler.rareEvent()) return;
    const route = getRoute(this.state.route);
    const event =
      route.rareEvents[Math.floor(Math.random() * route.rareEvents.length)]!;
    const element = this.required<HTMLElement>("[data-rare-event]");
    element.textContent = event;
    element.classList.add("is-visible");
    window.setTimeout(() => element.classList.remove("is-visible"), 4200);
  }

  private async loadScene(immediate: boolean): Promise<void> {
    const route = getRoute(this.state.route);
    const scene = route.scenes[this.state.sceneIndex % route.scenes.length]!;
    await this.media.setScene(scene, this.state, immediate);
    this.media.prefetch(
      route.scenes[(this.state.sceneIndex + 1) % route.scenes.length]!,
      this.state,
    );
  }

  private commitState(): void {
    savePreferences(this.state);
    syncUrlState(this.state);
    this.applyState();
  }

  private applyState(): void {
    const route = getRoute(this.state.route);
    const coach = getCoach(this.state.coach);
    const experience = this.required<HTMLElement>("[data-experience]");
    experience.dataset.coach = this.state.coach;
    experience.dataset.time = this.state.time;
    experience.dataset.weather = this.state.weather;
    experience.dataset.quality = this.state.quality;
    experience.classList.toggle("focus-mode", this.state.focus);
    experience.classList.toggle("reduced-effects", this.state.reducedEffects);
    this.setText("[data-status-route]", route.shortName);
    this.setText(
      "[data-status-detail]",
      `${coach.name} · ${this.speedLabel()} · ${this.state.time.replace("-", " ")}`,
    );
    this.setText("[data-route-name]", route.name);
    this.setText("[data-route-region]", route.regionLabel);
    this.setText("[data-route-seed]", this.state.seed);
    this.setText(
      "[data-route-description]",
      `${route.name}, ${route.regionLabel}: ${route.description}. Current conditions: ${WEATHER_DESCRIPTIONS[this.state.weather]}.`,
    );
    this.setControl("route", route.shortName);
    this.setControl(
      "coach",
      coach.name.replace("Classic ", "").replace("Modern ", ""),
    );
    this.setControl(
      "weather",
      WEATHER_OPTIONS.find((item) => item.id === this.state.weather)?.label ??
        this.state.weather,
    );
    this.setControl(
      "time",
      TIME_OPTIONS.find((item) => item.id === this.state.time)?.label ??
        this.state.time,
    );
    this.setControl("speed", this.speedLabel());
    this.setControl("sound", this.state.sound ? "On" : "Off");
    this.setControl("focus", this.state.focus ? "On" : "View");
    this.setControl("capture", "Photo");
    this.setControl("share", "Link");
    this.syncForm();
    this.media.updateMotion(this.state);
    this.weather.update(this.state);
    this.audio.apply(this.state);
  }

  private syncForm(): void {
    const setValue = (name: string, value: string) => {
      const element = this.mount.querySelector<
        HTMLInputElement | HTMLSelectElement
      >(`[name="${name}"]`);
      if (element) element.value = value;
    };
    setValue("coach", this.state.coach);
    const weatherSelect =
      this.mount.querySelector<HTMLSelectElement>('[name="weather"]');
    if (weatherSelect) {
      for (const option of Array.from(weatherSelect.options))
        option.disabled = !getRoute(this.state.route).weather.includes(
          option.value as WeatherPreset,
        );
      weatherSelect.value = this.state.weather;
    }
    setValue("time", this.state.time);
    setValue("master", String(this.state.audio.master));
    setValue("train", String(this.state.audio.train));
    setValue("environment", String(this.state.audio.environment));
    setValue("weatherVolume", String(this.state.audio.weather));
    const timeLocked = this.mount.querySelector<HTMLInputElement>(
      '[name="timeLocked"]',
    );
    if (timeLocked) timeLocked.checked = this.state.timeLocked;
    const reduced = this.mount.querySelector<HTMLInputElement>(
      '[name="reducedEffects"]',
    );
    if (reduced) reduced.checked = this.state.reducedEffects;
    const quality = this.mount.querySelector<HTMLInputElement>(
      `[name="quality"][value="${this.state.quality}"]`,
    );
    if (quality) quality.checked = true;
  }

  private showRouteBeacon(): void {
    const beacon = this.required<HTMLElement>("[data-route-beacon]");
    beacon.classList.add("is-visible");
    window.setTimeout(() => beacon.classList.remove("is-visible"), 5200);
  }

  private speedLabel(): string {
    return this.state.speed === 0
      ? "Paused"
      : this.state.speed === 0.65
        ? "Slow"
        : this.state.speed === 1
          ? "Cruise"
          : "Express";
  }

  private setControl(name: string, value: string): void {
    this.setText(`[data-control-value="${name}"]`, value);
  }

  private setText(selector: string, value: string): void {
    const element = this.mount.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }

  private updateLoading = (progress: number, label: string): void => {
    const bar = this.mount.querySelector<HTMLElement>("[data-loading-bar]");
    const copy = this.mount.querySelector<HTMLElement>("[data-loading-copy]");
    if (bar) bar.style.width = `${progress}%`;
    if (copy) copy.textContent = label;
  };

  private toast(message: string): void {
    const toast = this.required<HTMLElement>("[data-toast]");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  private announce(message: string): void {
    this.setText("[data-announcer]", message);
  }

  private required<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.mount.querySelector<T>(selector);
    if (!element) throw new Error(`Missing required element: ${selector}`);
    return element;
  }
}
