import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
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

const RootLayout = () => (
  // <>
  //   <div className="flex gap-2 p-2">
  //     <Link className="[&.active]:font-bold" to="/">
  //       Home
  //     </Link>{" "}
  //     <Link className="[&.active]:font-bold" to="/about">
  //       About
  //     </Link>
  //   </div>
  //   <hr />
  //   <Outlet />
  //   <TanStackRouterDevtools />
  // </>
  <SidebarProvider>
    <AppSidebar />
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
                <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
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

export const Route = createRootRoute({ component: RootLayout });
