import { useEffect, useState } from "react";
import TargetOverlay from "@/components/common/TargetOverlay";
import { Button } from "@/components/ui/button";
import type { SessionStatus } from "@/lib/db";
import { completeSession } from "@/lib/db-helpers";
import {
  TARGET_TEMPLATES,
  type TargetTemplate,
} from "@/lib/targets/target-templates";

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
        console.error("Nie udalo sie zaladowac szablonu tarczy", error);

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
      await completeSession(sessionId);
    } catch (error: unknown) {
      console.error("Nie udalo sie zakonczyc sesji", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <p className="font-medium text-sm">Krok: oznaczanie strzalow</p>
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-black">
          <img
            alt="Wyprostowany obraz tarczy"
            className="block h-auto w-full"
            height={1000}
            src={imageUrl}
            width={1000}
          />

          {template ? (
            <TargetOverlay
              className="absolute inset-0 h-full w-full"
              template={template}
              variant="outline"
            />
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Brak obrazu do wyswietlenia.
        </p>
      )}
      <Button
        disabled={isSaving}
        onClick={() => {
          handleComplete().catch((error: unknown) => {
            console.error("Nie udalo sie zakonczyc sesji", error);
          });
        }}
        type="button"
      >
        Zakoncz
      </Button>
    </div>
  );
}
