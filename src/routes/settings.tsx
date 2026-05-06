import { createFileRoute } from "@tanstack/react-router";
import { Info, TriangleAlert } from "lucide-react";
import DangerZoneSettings from "@/components/settings/DangerZone";
import InfoSettings from "@/components/settings/Info";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const isMobile = useIsMobile();
  return (
    <Tabs
      className="mx-auto max-w-3xl"
      defaultValue="info"
      orientation={isMobile ? "horizontal" : "vertical"}
    >
      <TabsList>
        <TabsTrigger value="info">
          <Info />
          Informacje
        </TabsTrigger>
        <TabsTrigger value="danger-zone">
          <TriangleAlert />
          Reset danych
        </TabsTrigger>
      </TabsList>
      <TabsContent value="info">
        <InfoSettings />
      </TabsContent>

      <TabsContent value="danger-zone">
        <DangerZoneSettings />
      </TabsContent>
    </Tabs>
  );
}
