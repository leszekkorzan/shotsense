"use client";

import { BookCheck, Flame, Scan, Settings2Icon } from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/nav/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";

const data = {
  // user: {
  //   name: "todo: demo",
  //   email: "demo@example.com",
  //   avatar: "/avatars/shadcn.jpg",
  // },

  navMain: [
    {
      title: "Skaner",
      url: "/",
      icon: <Scan />,
    },
    {
      title: "Twoje sesje",
      url: "/sessions",
      icon: <BookCheck />,
    },
    {
      title: "Heatmapy",
      url: "/heatmaps",
      icon: <Flame />,
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
      {/* <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  );
}
