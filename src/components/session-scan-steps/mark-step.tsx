import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SessionStatus } from "@/lib/db/db";
import { completeSession } from "@/lib/db/db-helpers";
import {
  TARGET_TEMPLATES,
  type TargetTemplate,
} from "@/lib/targets/target-templates";
import LoadingButton from "../common/LoadingButton";
import { type Shot, ShotMarkerEditor } from "../common/ShotMarkerEditor";

type MarkStepProps = {
  imageUrl?: string | null;
  targetTemplateId?: string;
  sessionId?: number;
  sessionStatus?: SessionStatus;
};

export function MarkStep({
  imageUrl,
  targetTemplateId,
  sessionId,
  sessionStatus,
}: MarkStepProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<TargetTemplate | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!targetTemplateId) {
      setTemplate(null);
      return;
    }

    const option = TARGET_TEMPLATES.find(
      (item) => item.id === targetTemplateId
    );

    if (!option) {
      setTemplate(null);
      return;
    }

    option
      .getTemplate()
      .then((loadedTemplate) => {
        if (!cancelled) {
          setTemplate(loadedTemplate);
        }
      })
      .catch((error: unknown) => {
        console.error("Error occurred while loading target template", error);

        if (!cancelled) {
          setTemplate(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [targetTemplateId]);

  const handleComplete = async () => {
    if (!sessionId || sessionStatus !== "TO_MARK" || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const shotPayloads = shots.map((shot) => {
        let score = 0;
        if (template && shot.ringIndex !== undefined && shot.ringIndex !== -1) {
          score = template.rings[shot.ringIndex]?.score ?? 0;
        }

        return {
          nx: shot.nx,
          ny: shot.ny,
          score,
          isManual: shot.isManual ?? false,
        };
      });
      await completeSession(sessionId, shotPayloads);
    } catch (error: unknown) {
      console.error("Error occurred while completing session", error);
      toast.error(
        "Wystąpił błąd podczas zapisywania strzałów. Proszę spróbować ponownie."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {imageUrl ? (
        <ShotMarkerEditor
          imageUrl={imageUrl}
          onShotsChange={setShots}
          shots={shots}
          template={template}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          Brak obrazu do wyswietlenia.
        </p>
      )}
      <LoadingButton
        className="w-full"
        disabled={!(imageUrl && template) || shots.length === 0}
        loading={isSaving}
        onClick={handleComplete}
        type="button"
      >
        Zakończ
      </LoadingButton>
    </div>
  );
}
