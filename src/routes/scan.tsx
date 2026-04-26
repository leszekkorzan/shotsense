import { createFileRoute } from "@tanstack/react-router";
import { SessionScanFlow } from "@/components/session-scan-flow";

export const Route = createFileRoute("/scan")({
  component: ScanRoute,
});

function ScanRoute() {
  return <SessionScanFlow />;
}
