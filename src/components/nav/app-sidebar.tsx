"use client";

import { BookCheck, Scan, Settings2Icon } from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/nav/nav-main";
import { NavUser } from "@/components/nav/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";

// This is sample data.
const data = {
  user: {
    name: "todo: demo",
    email: "demo@example.com",
    avatar: "/avatars/shadcn.jpg",
  },

  navMain: [
    {
      title: "Skaner",
      url: "/scan",
      icon: <Scan />,
    },
    {
      title: "Twoje sesje",
      url: "/sessions",
      icon: <BookCheck />,
    },
    {
      title: "Ustawienia",
      url: "/settings",
      icon: <Settings2Icon />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
