import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// The design system's token layer — the single source for every colour, radius
// and spacing value this prototype uses. Imported, never forked.
import "@/index.css";
import { PreferencesProvider } from "@/components/preferences";
import { Toaster } from "@/components/ui/sonner";
import { UnifiedView } from "./UnifiedView";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      {/* THE pricing-work BRANCH (Pavan, 2026-11-16): opens on Pricing; every
          other module stays reachable to read from. */}
      <UnifiedView landing="pricing" />
      {/* §4b "Apply -> toast": the bulk-edit dialog fires a confirmation on
          commit, which needs a Toaster mounted to land anywhere. */}
      <Toaster position="bottom-right" />
    </PreferencesProvider>
  </StrictMode>
);
