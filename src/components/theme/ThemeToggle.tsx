import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
  Light/dark theme toggle. Flips `.dark` on <html> (the class the token system
  keys off). LIGHT BY DEFAULT (Pavan, 2026-10-07): only a choice made on this
  toggle is remembered, under its own key — the old key was written on every
  load, so it held the default rather than a choice, and is ignored.
*/
const STORAGE_KEY = "fp-theme-choice";

function getInitial(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

export function ThemeToggle() {
  const [dark, setDark] = React.useState(getInitial);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      onClick={() =>
        setDark((d) => {
          try {
            localStorage.setItem(STORAGE_KEY, d ? "light" : "dark");
          } catch {
            // Storage blocked — the switch still works for this visit.
          }
          return !d;
        })
      }
    >
      {dark ? <Moon /> : <Sun />}
    </Button>
  );
}
