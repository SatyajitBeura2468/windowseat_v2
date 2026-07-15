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
