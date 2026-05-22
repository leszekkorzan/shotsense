import type { LucideIcon } from "lucide-react";
import { BookCheck, Flame, Scan, Settings2Icon } from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Skaner",
    url: "/",
    icon: Scan,
  },
  {
    title: "Twoje sesje",
    url: "/sessions",
    icon: BookCheck,
  },
  {
    title: "Heatmapy",
    url: "/heatmaps",
    icon: Flame,
  },
  {
    title: "Ustawienia",
    url: "/settings",
    icon: Settings2Icon,
  },
];
