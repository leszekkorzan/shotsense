import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, Download, Info, TriangleAlert } from "lucide-react";
import { useState } from "react";
import ApiBackupSettings from "@/components/settings/ApiBackupSettings";
import DangerZoneSettings from "@/components/settings/DangerZone";
import ExportSettings from "@/components/settings/ExportSettings";
import InfoSettings from "@/components/settings/Info";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("info");
  return (
    <Tabs
      className="mx-auto max-w-3xl"
      onValueChange={(value) => setActiveTab(value)}
      orientation={isMobile ? "horizontal" : "vertical"}
      value={activeTab}
    >
      <TabsList
        className={cn(
          isMobile &&
            "w-full max-w-full justify-start overflow-x-auto overflow-y-hidden"
        )}
      >
        <TabsTrigger className={cn(isMobile && "flex-none")} value="info">
          <Info />
          Informacje
        </TabsTrigger>
        <TabsTrigger className={cn(isMobile && "flex-none")} value="export">
          <Download />
          Eksport / Import
        </TabsTrigger>
        <TabsTrigger className={cn(isMobile && "flex-none")} value="api-backup">
          <CloudUpload />
          Chmura (backup)
        </TabsTrigger>
        <TabsTrigger
          className={cn(isMobile && "flex-none")}
          value="danger-zone"
        >
          <TriangleAlert />
          Reset danych
        </TabsTrigger>
      </TabsList>
      <TabsContent value="info">
        <InfoSettings />
      </TabsContent>

      <TabsContent value="export">
        <ExportSettings handleSwitchToInfoTab={() => setActiveTab("info")} />
      </TabsContent>

      <TabsContent value="api-backup">
        <ApiBackupSettings />
      </TabsContent>

      <TabsContent value="danger-zone">
        <DangerZoneSettings />
      </TabsContent>
    </Tabs>
  );
}
