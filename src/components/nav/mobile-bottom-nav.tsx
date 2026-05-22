"use client";

import { Link } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function MobileBottomNav() {
  const sidebar = useSidebar();

  return (
    <nav
      aria-label="Główna nawigacja"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-1.5 rounded-[30px] border border-border/60 bg-background/90 p-1.5 shadow-black/5 shadow-xl backdrop-blur supports-backdrop-filter:bg-background/60">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const base = cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2.5 text-center font-medium text-[11px] leading-4 transition-colors",
            "[&_svg]:size-5 [&_svg]:shrink-0",
            "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          );
          const active =
            "bg-muted/40 text-foreground ring-1 ring-border/50 shadow-none";

          return (
            <Link
              activeProps={{
                className: cn(base, active),
                "aria-current": "page",
              }}
              className={base}
              {...(item.url === "/" ? { activeOptions: { exact: true } } : {})}
              key={item.title}
              onClick={() => sidebar.setOpenMobile(false)}
              to={item.url}
            >
              <Icon />
              <span className="truncate leading-4">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
