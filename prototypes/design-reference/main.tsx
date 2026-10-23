import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// The design system's token layer — imported, never forked.
import "@/index.css";
import { PreferencesProvider } from "@/components/preferences";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Reference } from "./Reference";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      <TooltipProvider>
        <Reference />
      </TooltipProvider>
      <Toaster position="bottom-right" />
    </PreferencesProvider>
  </StrictMode>
);
