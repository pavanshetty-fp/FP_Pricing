import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// SINGLEFILE=1 inlines all JS/CSS into one portable index.html (shareable as a
// file, opens via double-click). Otherwise builds for the GitHub Pages site.
const singleFile = process.env.SINGLEFILE === "1";

// https://vite.dev/config/
export default defineConfig({
  // Pages project site: https://pavanshetty-rgb.github.io/FP-DS-2026/
  // For the single-file build, relative base so it runs from file://.
  base: singleFile ? "./" : "/FP-DS-2026/",
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
  // Honour a PORT assigned by the environment (e.g. running two dev servers
  // side by side); falls back to Vite's default 5173 when unset.
  server: { port: process.env.PORT ? Number(process.env.PORT) : undefined },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
