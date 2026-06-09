import {
  LayoutDashboard,
  Table2,
  KanbanSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Main Menu 1", icon: <LayoutDashboard /> },
  { key: "tables", label: "Main Menu 2", icon: <Table2 /> },
  { key: "kanban", label: "Main Menu 3", icon: <KanbanSquare /> },
  { key: "settings", label: "Main Menu 4", icon: <Settings /> },
];

export interface SideNavProps {
  activeKey?: string;
  onSelect?: (key: string) => void;
}

/** 52px icon rail — Figma "Side Navigation" (id 27614:56563). */
export function SideNav({ activeKey = "tables", onSelect }: SideNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-[52px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-3"
    >
      {/* Logo (36x36) */}
      <div className="mb-7 flex size-9 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
        FP
      </div>

      <ul className="flex flex-col gap-3.5">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => onSelect?.(item.key)}
                className={cn(
                  "flex h-7 w-[52px] items-center justify-center text-sidebar-foreground/70 outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-5",
                  active &&
                    "text-sidebar-foreground before:absolute before:left-0 before:h-7 before:w-0.5 before:bg-brand"
                )}
              >
                <span className="relative flex size-7 items-center justify-center rounded-md data-[active=true]:bg-sidebar-accent" data-active={active}>
                  {item.icon}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        <Avatar className="size-8">
          <AvatarFallback>PS</AvatarFallback>
        </Avatar>
      </div>
    </nav>
  );
}
