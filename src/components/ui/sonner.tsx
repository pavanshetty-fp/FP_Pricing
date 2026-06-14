import * as React from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Sonner toaster — Figma "Sonner" (18482:48401). Mount once at the app root.
 * Type icons map to Lucide (Sonner / Icon variants: Success / Error / Info /
 * Warning / Loading) and the surface is driven off the FP popover tokens.
 *
 * The shadcn original reads theme via next-themes; we don't use it — instead we
 * observe the `.dark` class that ThemeToggle flips on <html>.
 */
function useFpTheme(): "dark" | "light" {
  const [theme, setTheme] = React.useState<"dark" | "light">(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  );

  React.useEffect(() => {
    const el = document.documentElement;
    const update = () =>
      setTheme(el.classList.contains("dark") ? "dark" : "light");
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    update();
    return () => observer.disconnect();
  }, []);

  return theme;
}

function Toaster({ ...props }: ToasterProps) {
  const theme = useFpTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
