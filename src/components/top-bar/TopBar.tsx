import { Search, Bell, ChevronDown, UserRound, Settings, LogOut, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface TopBarUser {
  name: string;
  email: string;
  /** Avatar fallback initials, e.g. "PS". */
  fallback: string;
  avatarSrc?: string;
}

export interface TopBarProps {
  user: TopBarUser;
  /** Unread notification count — shows a dot when > 0. */
  unread?: number;
}

/**
 * Global application top bar — a full-width chrome band above the rail + content.
 * Left: global search (⌘K). Right: notifications + profile menu.
 */
export function TopBar({ user, unread = 0 }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      {/* Left — brand logo */}
      <div className="flex flex-1 items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white [&_svg]:size-5">
          <Boxes />
        </span>
        <span className="truncate text-base font-semibold text-foreground">FleetPanda</span>
      </div>

      {/* Center — global search */}
      <div className="flex flex-1 justify-center">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search"
            aria-label="Search"
            className="h-9 rounded-md pr-12 pl-8"
          />
          <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">⌘K</Kbd>
        </div>
      </div>

      {/* Right — notifications + profile */}
      <div className="flex flex-1 items-center justify-end gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell />
          {unread > 0 && (
            <span
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-background"
              aria-label={`${unread} unread`}
            />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center gap-1.5 rounded-md p-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Avatar className="size-8">
                {user.avatarSrc && <AvatarImage src={user.avatarSrc} alt={user.name} />}
                <AvatarFallback>{user.fallback}</AvatarFallback>
              </Avatar>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><UserRound /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive"><LogOut /> Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
