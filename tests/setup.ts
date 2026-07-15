import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockImage {
  width = 1600;
  height = 900;
  decoding = "async";
  crossOrigin = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private value = "";

  set src(value: string) {
    this.value = value;
    queueMicrotask(() =>
      value.includes("fail") ? this.onerror?.() : this.onload?.(),
    );
  }

  get src(): string {
    return this.value;
  }
}

vi.stubGlobal("Image", MockImage);
vi.stubGlobal(
  "requestAnimationFrame",
  vi.fn(() => 1),
);
vi.stubGlobal("cancelAnimationFrame", vi.fn());

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  beginPath: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  strokeStyle: "",
  fillStyle: "",
  lineWidth: 1,
  font: "",
})) as never;

HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) =>
  callback(new Blob(["capture"], { type: "image/jpeg" })),
);

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
});
