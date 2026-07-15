import { getRoute } from "../data/routes";
import type { CaptureState } from "../types";

export function captureDimensions(
  format: CaptureState["format"],
): [number, number] {
  return format === "square" ? [1600, 1600] : [1920, 1080];
}

export async function createCapture(state: CaptureState): Promise<Blob> {
  const [width, height] = captureDimensions(state.format);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Capture is not supported by this browser.");
  const image = await loadImage(state.sceneSrc);
  drawCover(context, image, width, height);
  drawAtmosphere(context, state, width, height);
  drawFrame(context, state, width, height);
  if (state.label) drawLabel(context, state, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Capture encoding failed.")),
      "image/jpeg",
      0.92,
    ),
  );
}

export async function downloadCapture(state: CaptureState): Promise<void> {
  const blob = await createCapture(state);
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `windowseat-${state.route}-${state.format}.jpg`;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(anchor.href);
    anchor.remove();
  }, 1000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The active scene could not be captured."));
    image.src = src;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

function drawAtmosphere(
  context: CanvasRenderingContext2D,
  state: CaptureState,
  width: number,
  height: number,
): void {
  const grade: Record<CaptureState["time"], string> = {
    dawn: "rgba(83,98,130,.08)",
    morning: "rgba(244,211,165,.03)",
    afternoon: "rgba(255,245,219,.02)",
    "golden-hour": "rgba(219,141,73,.12)",
    dusk: "rgba(77,56,91,.18)",
    night: "rgba(5,17,36,.58)",
  };
  context.fillStyle = grade[state.time];
  context.fillRect(0, 0, width, height);
  if (["light-rain", "monsoon", "storm"].includes(state.weather)) {
    context.strokeStyle = "rgba(225,239,245,.25)";
    context.lineWidth = 2;
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 191) % width;
      const y = (i * 347) % height;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - 4, y + 22 + (i % 4) * 8);
      context.stroke();
    }
  }
}

function drawFrame(
  context: CanvasRenderingContext2D,
  state: CaptureState,
  width: number,
  height: number,
): void {
  const border = Math.round(
    Math.min(width, height) * (state.coach === "luggage" ? 0.045 : 0.085),
  );
  context.strokeStyle =
    state.coach === "sleeper"
      ? "#315e78"
      : state.coach === "ac-first"
        ? "#594637"
        : "#11161b";
  context.lineWidth = border;
  context.strokeRect(border / 2, border / 2, width - border, height - border);
  context.strokeStyle = "rgba(143,154,162,.72)";
  context.lineWidth = Math.max(4, border * 0.08);
  context.strokeRect(
    border * 0.82,
    border * 0.82,
    width - border * 1.64,
    height - border * 1.64,
  );
  if (state.coach === "sleeper") {
    context.strokeStyle = "rgba(49,64,70,.8)";
    context.lineWidth = Math.max(5, border * 0.07);
    for (let y = height * 0.26; y < height * 0.76; y += height * 0.1) {
      context.beginPath();
      context.moveTo(border, y);
      context.lineTo(width - border, y);
      context.stroke();
    }
  }
}

function drawLabel(
  context: CanvasRenderingContext2D,
  state: CaptureState,
  width: number,
  height: number,
): void {
  const route = getRoute(state.route);
  const size = Math.max(20, width * 0.016);
  context.fillStyle = "rgba(4,8,11,.68)";
  context.fillRect(width * 0.08, height * 0.81, width * 0.34, height * 0.1);
  context.fillStyle = "#eef2f3";
  context.font = `500 ${size}px system-ui, sans-serif`;
  context.fillText(route.name, width * 0.1, height * 0.855);
  context.fillStyle = "rgba(238,242,243,.68)";
  context.font = `400 ${size * 0.62}px system-ui, sans-serif`;
  context.fillText(
    "WINDOWSEAT V2 · REGION-INSPIRED JOURNEY",
    width * 0.1,
    height * 0.888,
  );
}
