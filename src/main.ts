import { WindowSeatApp } from "./app/WindowSeatApp";
import "./styles/base.css";
import "./styles/cabin.css";
import "./styles/onboarding.css";
import "./styles/controls.css";
import "./styles/responsive.css";

const mount = document.querySelector<HTMLElement>("#app");
if (!mount) throw new Error("WindowSeat mount point was not found.");

const app = new WindowSeatApp(mount);
void app.start();
