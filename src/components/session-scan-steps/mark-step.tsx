import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SessionStatus } from "@/lib/db";
import { completeSession } from "@/lib/db-helpers";

type MarkStepProps = {
  sessionId?: number;
  sessionStatus?: SessionStatus;
};

export function MarkStep({ sessionId, sessionStatus }: MarkStepProps) {
  const [isSaving, setIsSaving] = useState(false);

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
      <p className="text-muted-foreground text-sm">
        Placeholder. W kolejnym etapie tutaj pojawi sie interfejs manualnego
        oznaczania trafien.
      </p>
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
