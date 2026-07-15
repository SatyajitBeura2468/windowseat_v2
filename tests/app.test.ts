import { beforeEach, describe, expect, it } from "vitest";
import { WindowSeatApp } from "../src/app/WindowSeatApp";

describe("keyboard controls", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, "", "/");
  });

  it("toggles focus and adjusts speed without a focused form control", async () => {
    const mount = document.createElement("main");
    document.body.append(mount);
    const app = new WindowSeatApp(mount);
    await app.start();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    expect(
      mount
        .querySelector("[data-experience]")
        ?.classList.contains("focus-mode"),
    ).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(
      mount.querySelector('[data-control-value="speed"]')?.textContent,
    ).toBe("Express");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(
      mount
        .querySelector("[data-experience]")
        ?.classList.contains("focus-mode"),
    ).toBe(false);
    mount.remove();
  });
});

describe("in-scene quick controls", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, "", "/");
    document.body.innerHTML = "";
  });

  it("changes coach without opening the settings drawer", async () => {
    const mount = document.createElement("main");
    document.body.append(mount);
    const app = new WindowSeatApp(mount);
    await app.start();

    mount.querySelector<HTMLElement>('[data-setting-target="coach"]')?.click();
    expect(
      mount.querySelector<HTMLElement>("[data-quick-popover]")?.hidden,
    ).toBe(false);
    expect(
      mount.querySelector<HTMLElement>("[data-settings-overlay]")?.hidden,
    ).toBe(true);

    mount
      .querySelector<HTMLElement>(
        '[data-action="select-quick"][data-quick-value="sleeper"]',
      )
      ?.click();
    expect(
      mount.querySelector<HTMLElement>("[data-experience]")?.dataset.coach,
    ).toBe("sleeper");

    mount.querySelector<HTMLElement>(".menu-trigger")?.click();
    expect(
      mount.querySelector<HTMLElement>("[data-settings-overlay]")?.hidden,
    ).toBe(false);
    mount.remove();
  });
});
