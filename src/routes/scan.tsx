import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/scan")({
  beforeLoad: () => {
    throw Route.redirect({ to: "/" });
  },
});
