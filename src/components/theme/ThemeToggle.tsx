import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTheme, useTheme } from "./a11y";

/*
  Light/dark theme toggle. LIGHT BY DEFAULT (Pavan, 2026-10-07). The theme
  lives in the shared settings store (`a11y.ts`), so this and the
  Accessibility panel's Light | Dark are one switch (Pavan, 2026-10-21 — the
  WCAG modes moved into that panel as sliders).
*/
export function ThemeToggle() {
  const dark = useTheme() === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Moon /> : <Sun />}
    </Button>
  );
}
