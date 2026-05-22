"use client";

import { Link } from "@tanstack/react-router";
import { Crosshair } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function Logo({ compact = false }: { compact?: boolean }) {
  const sidebar = useSidebar();

  if (compact) {
    return (
      <Link
        className="flex items-center gap-2 rounded-md py-1.5 text-left"
        to="/"
      >
        <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Crosshair className="size-4" />
        </div>
        <div className="grid flex-1 leading-tight">
          <span className="truncate font-medium text-[12px]">ShotSense</span>
          <span className="truncate text-[9px]">AI Target Scoring</span>
        </div>
      </Link>
    );
  }

  return (
    <SidebarMenu>
      <Link onClick={() => sidebar.setOpenMobile(false)} to="/">
        <SidebarMenuItem>
          <SidebarMenuButton
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            size="lg"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Crosshair />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">ShotSense</span>
              <span className="truncate text-xs">AI Target Scoring</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </Link>
    </SidebarMenu>
  );
}
