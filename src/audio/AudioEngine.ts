import { getCoach } from "../data/coaches";
import type { JourneyState } from "../types";

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private train: GainNode | null = null;
  private environment: GainNode | null = null;
  private weather: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];

  async enable(state: JourneyState): Promise<void> {
    if (!this.context) this.build(state);
    await this.context?.resume();
    this.apply(state);
  }

  apply(state: JourneyState): void {
    if (
      !this.context ||
      !this.master ||
      !this.train ||
      !this.environment ||
      !this.weather
    )
      return;
    const now = this.context.currentTime;
    const coach = getCoach(state.coach);
    this.master.gain.setTargetAtTime(
      state.sound ? state.audio.master : 0,
      now,
      0.5,
    );
    this.train.gain.setTargetAtTime(
      state.audio.train * coach.rhythm * state.speed * 0.22,
      now,
      0.35,
    );
    this.environment.gain.setTargetAtTime(
      state.audio.environment * coach.wind * (0.08 + state.speed * 0.12),
      now,
      0.5,
    );
    const wet = ["light-rain", "monsoon", "storm"].includes(state.weather)
      ? 1
      : 0;
    this.weather.gain.setTargetAtTime(
      state.audio.weather * wet * 0.22,
      now,
      0.8,
    );
  }

  suspend(): void {
    void this.context?.suspend();
  }

  resume(state: JourneyState): void {
    if (state.sound) void this.context?.resume();
  }

  dispose(): void {
    this.sources.forEach((source) => source.stop());
    void this.context?.close();
    this.sources = [];
    this.context = null;
  }

  private build(state: JourneyState): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.train = this.context.createGain();
    this.environment = this.context.createGain();
    this.weather = this.context.createGain();
    this.master.gain.value = 0;
    this.train.connect(this.master);
    this.environment.connect(this.master);
    this.weather.connect(this.master);
    this.master.connect(this.context.destination);

    const rail = this.context.createOscillator();
    rail.type = "triangle";
    rail.frequency.value = 3.1;
    const railFilter = this.context.createBiquadFilter();
    railFilter.type = "lowpass";
    railFilter.frequency.value = 145;
    rail.connect(railFilter).connect(this.train);
    rail.start();

    const hum = this.context.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 54;
    hum.connect(this.train);
    hum.start();

    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * 3,
      this.context.sampleRate,
    );
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1)
      channel[i] = Math.random() * 2 - 1;
    const wind = this.context.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const windFilter = this.context.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 680;
    wind.connect(windFilter).connect(this.environment);
    wind.start();

    const rain = this.context.createBufferSource();
    rain.buffer = buffer;
    rain.loop = true;
    const rainFilter = this.context.createBiquadFilter();
    rainFilter.type = "highpass";
    rainFilter.frequency.value = 1900;
    rain.connect(rainFilter).connect(this.weather);
    rain.start();
    this.sources = [rail, hum, wind, rain];
    this.apply(state);
  }
}
