import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
  Light/dark theme toggle. Flips `.dark` on <html> (the class the token system
  keys off) and persists the choice. Defaults to dark — the FleetPanda theme.
*/
const STORAGE_KEY = "fp-theme";

function getInitial(): boolean {
  if (typeof document === "undefined") return true;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light") return false;
  if (saved === "dark") return true;
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const [dark, setDark] = React.useState(getInitial);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      onClick={() => setDark((d) => !d)}
    >
      {dark ? <Moon /> : <Sun />}
    </Button>
  );
}
