import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { AlertDialogProvider } from "./components/contexts/DialogProvider";
import { ThemeProvider } from "./components/contexts/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// biome-ignore lint/style/noNonNullAssertion: <->
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <AlertDialogProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AlertDialogProvider>
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>
  );
}
