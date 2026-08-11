import * as React from "react";

/**
 * App navigation bridge — lets a reference screen jump to a live demo screen
 * (e.g. the Patterns screen → Board / Tables / Form Layout). App.tsx provides
 * the real `goTo`; consumers call `useAppNav()`.
 */
export type GoTo = (mainKey: string, subKey?: string) => void;

export const AppNavContext = React.createContext<GoTo>(() => {});

export const useAppNav = () => React.useContext(AppNavContext);
