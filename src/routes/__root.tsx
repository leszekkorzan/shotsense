import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/nav/app-sidebar";
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
      <AppSidebar />
      {showOnboarding && <Onboarding />}
      {allowWorkerRegistration && <PWA />}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="my-auto mr-2 data-[orientation=vertical]:h-4"
              orientation="vertical"
            />
            <Breadcrumb>
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
        <div className="p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export const Route = createRootRoute({ component: RootLayout });
