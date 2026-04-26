import { TargetIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PerspectiveCrop, type Point } from "@/components/PerspectiveCrop";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SessionStatus } from "@/lib/db";
import { advanceSessionToMark } from "@/lib/db-helpers";
import { TARGET_TEMPLATES } from "@/lib/target-templates";
import { workerInstance } from "@/workers";

type CropStepProps = {
  imageUrl: string | null;
  initialTargetTemplate?: string;
  sessionId?: number;
  sessionStatus?: SessionStatus;
};

export function CropStep({
  imageUrl,
  initialTargetTemplate,
  sessionId,
  sessionStatus,
}: CropStepProps) {
  const [selectedTargetTemplate, setSelectedTargetTemplate] = useState(
    initialTargetTemplate ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedTargetTemplate(initialTargetTemplate ?? "");
  }, [initialTargetTemplate]);

  const selectedTemplate = TARGET_TEMPLATES.find(
    (template) => template.id === selectedTargetTemplate
  );

  const handleConfirm = async (_points: Point[]) => {
    if (!sessionId || sessionStatus !== "TO_CROP" || isSaving) {
      return;
    }

    if (!selectedTargetTemplate) {
      return;
    }

    setIsSaving(true);

    try {
      const test = await workerInstance.test();

      console.log("Test z workerem:", test);
      // TODO: Po zatwierdzeniu cropa trzeba faktycznie przyciac obraz i zapisac nowy blob.
      await advanceSessionToMark(sessionId, selectedTargetTemplate);
    } catch (error: unknown) {
      console.error("Nie udalo sie zapisac kadru", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {selectedTemplate ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-2">
            <TargetIcon />
            <p className="font-medium text-sm">{selectedTemplate.title}</p>
          </div>

          <Button
            className="h-auto px-0"
            onClick={() => setSelectedTargetTemplate("")}
            size="xs"
            type="button"
            variant="link"
          >
            Zmień tarczę
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <TargetIcon />
            <p className="font-medium text-sm">Wybierz tarczę</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {TARGET_TEMPLATES.map((template) => (
              <button
                className="flex w-full flex-col items-start gap-1 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition hover:bg-muted/50"
                key={template.id}
                onClick={() => setSelectedTargetTemplate(template.id)}
                type="button"
              >
                <span className="font-medium">{template.title}</span>
                <span className="text-muted-foreground text-xs">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {selectedTemplate && imageUrl ? (
        <PerspectiveCrop
          confirmLabel={isSaving ? "Zapisywanie..." : "Zatwierdz kadr"}
          imageUrl={imageUrl}
          onConfirm={(points) => {
            handleConfirm(points).catch((error: unknown) => {
              console.error("Nie udalo sie zapisac kadru", error);
            });
          }}
        />
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-5 text-muted-foreground text-sm">
          Wybierz szablon tarczy, aby przejść do kadrowania perspektywy.
        </div>
      )}
    </>
  );
}
