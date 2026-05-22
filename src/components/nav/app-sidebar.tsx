"use client";

import type * as React from "react";
import { NAV_ITEMS } from "@/components/nav/nav-items";
import { NavMain } from "@/components/nav/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";

export function AppSidebar({
  pathname,
  ...props
}: React.ComponentProps<typeof Sidebar> & { pathname: string }) {
  const navMain = NAV_ITEMS;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      {/* <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  );
}
