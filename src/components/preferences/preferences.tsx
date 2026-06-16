import * as React from "react";

/** Action-bar components that can be shown/hidden from Settings → Action bar. */
export type ActionBarComponent =
  | "search"
  | "columnFilters"
  | "filters"
  | "groupBy"
  | "savedViews"
  | "cta";

const ACTION_BAR_DEFAULT: Record<ActionBarComponent, boolean> = {
  search: true,
  columnFilters: true,
  filters: true,
  groupBy: true,
  savedViews: true,
  cta: true,
};

interface PreferencesValue {
  /** Show the breadcrumb under the page title. */
  showBreadcrumb: boolean;
  setShowBreadcrumb: (v: boolean) => void;
  /** Per-component action-bar visibility. */
  actionBar: Record<ActionBarComponent, boolean>;
  setActionBarComponent: (key: ActionBarComponent, v: boolean) => void;
}

const PreferencesContext = React.createContext<PreferencesValue | null>(null);

export function usePreferences(): PreferencesValue {
  const ctx = React.useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider.");
  }
  return ctx;
}

/**
 * App-wide UI preferences (persisted to localStorage). Drives the content-layer
 * breadcrumb and which action-bar components are visible. Toggled from the
 * Settings screen; read by AppShell / ActionBar.
 */
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showBreadcrumb, setShowBreadcrumb] = React.useState(
    () =>
      typeof localStorage === "undefined" ||
      localStorage.getItem("fp-breadcrumb") !== "off"
  );
  React.useEffect(() => {
    localStorage.setItem("fp-breadcrumb", showBreadcrumb ? "on" : "off");
  }, [showBreadcrumb]);

  const [actionBar, setActionBar] = React.useState<
    Record<ActionBarComponent, boolean>
  >(() => {
    if (typeof localStorage === "undefined") return ACTION_BAR_DEFAULT;
    try {
      const saved = localStorage.getItem("fp-actionbar");
      return saved
        ? { ...ACTION_BAR_DEFAULT, ...JSON.parse(saved) }
        : ACTION_BAR_DEFAULT;
    } catch {
      return ACTION_BAR_DEFAULT;
    }
  });
  React.useEffect(() => {
    localStorage.setItem("fp-actionbar", JSON.stringify(actionBar));
  }, [actionBar]);

  const setActionBarComponent = React.useCallback(
    (key: ActionBarComponent, v: boolean) =>
      setActionBar((prev) => ({ ...prev, [key]: v })),
    []
  );

  const value = React.useMemo(
    () => ({
      showBreadcrumb,
      setShowBreadcrumb,
      actionBar,
      setActionBarComponent,
    }),
    [showBreadcrumb, actionBar, setActionBarComponent]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
