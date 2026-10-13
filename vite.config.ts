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
const unified = process.env.UNIFIED === "1" || process.env.SERVICE === "1";
// PORTAL=1 builds the *Customer Portal* — a separate module with its own entry
// (prototypes/customer-portal) and output (dist-portal), always single-file.
const portal = process.env.PORTAL === "1";
// SERVICE=1 is the Unified View locked to the Service Work module
// (prototypes/unified-view/service.html), built to dist-service/service.html.
const service = process.env.SERVICE === "1";
const singleFile = process.env.SINGLEFILE === "1" || unified || portal;

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
  ...(portal
    ? {
        root: path.resolve(__dirname, "prototypes/customer-portal"),
        build: {
          outDir: path.resolve(__dirname, "dist-portal"),
          emptyOutDir: true,
        },
        // 4310 = Customer Portal source, 4183 = its built artifact.
        server: {
          port: process.env.PORT ? Number(process.env.PORT) : 4310,
          strictPort: !process.env.PORT,
        },
        preview: {
          port: process.env.PORT ? Number(process.env.PORT) : 4183,
          strictPort: !process.env.PORT,
        },
      }
    : unified
    ? {
        root: path.resolve(__dirname, "prototypes/unified-view"),
        build: {
          outDir: path.resolve(__dirname, service ? "dist-service" : "dist-unified"),
          emptyOutDir: true,
          ...(service
            ? {
                rollupOptions: {
                  input: path.resolve(__dirname, "prototypes/unified-view/service.html"),
                },
              }
            : {}),
        },
        // Fixed, distinct ports so the two apps can never be mistaken for one
        // another: 4300 = Unified View source, 4173 = the built artifact.
        // `strictPort` fails loudly on a clash rather than sliding to a free
        // port and leaving you looking at whatever owns the one you expected.
        //
        // An explicitly assigned PORT overrides both, and relaxes strictPort
        // with it: when a harness hands us a port it has ALREADY decided which
        // server this is, so the clash-detection the fixed port exists for is
        // redundant — and failing there just stops a second session previewing
        // at all. Run by hand with no PORT and the fixed-port guarantee stands.
        server: {
          port: process.env.PORT ? Number(process.env.PORT) : 4300,
          strictPort: !process.env.PORT,
        },
        preview: {
          port: process.env.PORT ? Number(process.env.PORT) : 4173,
          strictPort: !process.env.PORT,
        },
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
