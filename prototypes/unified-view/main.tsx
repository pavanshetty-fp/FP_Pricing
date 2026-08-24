import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// The design system's token layer — the single source for every colour, radius
// and spacing value this prototype uses. Imported, never forked.
import "@/index.css";
import { PreferencesProvider } from "@/components/preferences";
import { UnifiedView } from "./UnifiedView";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      <UnifiedView />
    </PreferencesProvider>
  </StrictMode>
);
