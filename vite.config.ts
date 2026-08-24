import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// SINGLEFILE=1 inlines all JS/CSS into one portable index.html (shareable as a
// file, opens via double-click). Otherwise builds for the GitHub Pages site.
//
// UNIFIED=1 builds the *Unified View* prototype instead of the DS gallery — a
// separate entry (prototypes/unified-view) and a separate output (dist-unified),
// always single-file. The prototype consumes the DS via the `@` alias; it is not
// a section of the gallery, so the two never share a bundle.
const unified = process.env.UNIFIED === "1";
const singleFile = process.env.SINGLEFILE === "1" || unified;

// https://vite.dev/config/
export default defineConfig({
  // Pages project site: https://pavanshetty-rgb.github.io/FP-DS-2026/
  // For the single-file build, relative base so it runs from file://.
  base: singleFile ? "./" : "/FP-DS-2026/",
  // The prototype's Vite `root` IS its own folder. That is the whole point: it
  // gets served at the ORIGIN (http://localhost:4300/) with no path and no base
  // prefix, so that URL cannot resolve to anything but the Unified View. Serving
  // it as a path under the gallery's dev server is what made a stray reload land
  // on the gallery instead. The build lands flat in dist-unified/index.html.
  ...(unified
    ? {
        root: path.resolve(__dirname, "prototypes/unified-view"),
        build: {
          outDir: path.resolve(__dirname, "dist-unified"),
          emptyOutDir: true,
        },
        // Fixed, distinct ports so the two apps can never be mistaken for one
        // another: 4300 = Unified View source, 4173 = the built artifact.
        // `strictPort` fails loudly on a clash rather than sliding to a free
        // port and leaving you looking at whatever owns the one you expected.
        server: { port: 4300, strictPort: true },
        preview: { port: 4173, strictPort: true },
      }
    : {
        // Honour a PORT assigned by the environment (e.g. running two dev
        // servers side by side); falls back to Vite's default 5173 when unset.
        server: {
          port: process.env.PORT ? Number(process.env.PORT) : undefined,
        },
      }),
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
