import { defineConfig } from "vite";

export default defineConfig({
  build: { target: "es2022", assetsDir: "assets" },
  server: { host: "127.0.0.1", port: 3000 },
  preview: { host: "127.0.0.1", port: 4173 },
});
