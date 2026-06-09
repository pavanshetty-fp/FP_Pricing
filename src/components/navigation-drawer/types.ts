import type * as React from "react";

/** A nested link shown under a collapsible parent item. */
export interface NavSubItem {
  key: string;
  label: string;
}

/** A top-level navigation entry. May expand into `children`. */
export interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** When present, the item is a collapsible group. */
  children?: NavSubItem[];
}

export interface NavGroup {
  /** Optional group heading (e.g. "Platform"). */
  label?: string;
  items: NavItem[];
}

export interface NavBrand {
  name: string;
  icon: React.ReactNode;
  /** Tailwind bg class for the icon tile (e.g. "bg-brand", "bg-sidebar-primary"). */
  iconClassName?: string;
}

export interface NavUser {
  name: string;
  email: string;
  avatarSrc?: string;
  fallback?: string;
}
