import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { Logo } from "@/components/nav/logo";
import { MobileBottomNav } from "@/components/nav/mobile-bottom-nav";
import Onboarding from "@/components/Onboarding";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useBrowserEvent } from "@/hooks/use-browser-events";
import { getPageTitle } from "@/lib/page-title-mapper";
import PWA from "@/PWA";

const RootLayout = () => {
  const { pathname } = useLocation();

  const [allowWorkerRegistration, setAllowWorkerRegistration] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const checkStatus = (skipOnboarding = false) => {
    const val = localStorage.getItem("allowWorkerRegistration");
    setAllowWorkerRegistration(val === "true");

    if (!skipOnboarding) {
      setShowOnboarding(val !== "true");
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <->
  useEffect(() => {
    checkStatus();
  }, []);

  useBrowserEvent("app:allow-worker-registration", () => {
    checkStatus(true);
  });

  return (
    <SidebarProvider>
      <AppSidebar pathname={pathname} />
      {showOnboarding && <Onboarding />}
      {allowWorkerRegistration && <PWA />}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between px-4 md:justify-start md:gap-2">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <span className="truncate font-medium text-sm">
                {getPageTitle(pathname)}
              </span>
            </div>
            <div className="hidden md:block">
              <SidebarTrigger className="-ml-1" />
            </div>
            <Separator
              className="my-auto mr-2 hidden data-[orientation=vertical]:h-4 md:block"
              orientation="vertical"
            />
            <Breadcrumb className="hidden md:block">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink className="hover:text-current">
                    Strona główna
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageTitle(pathname)}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="p-4 pt-0 pb-28 md:p-4 md:pt-0 md:pb-4">
          <Outlet />
        </div>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
};

export const Route = createRootRoute({ component: RootLayout });
