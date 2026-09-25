import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { PreferencesProvider } from "@/components/preferences";
import { Toaster } from "@/components/ui/sonner";
import { UnifiedView } from "./UnifiedView";

/* THE SERVICE WORK BUILD (Pavan, 2026-09-25) — the same app, locked to the
   Service Work module, shipped as its own single HTML. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      <UnifiedView only="service" />
      <Toaster position="bottom-right" />
    </PreferencesProvider>
  </StrictMode>
);
