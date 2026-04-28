import { useLiveQuery } from "dexie-react-hooks";
import { CheckIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/contexts/DialogProvider";
import { CropStep } from "@/components/session-scan-steps/crop-step";
import { MarkStep } from "@/components/session-scan-steps/mark-step";
import { UploadStep } from "@/components/session-scan-steps/upload-step";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cancelSession, getSessionById } from "@/lib/db-helpers";
import LoadingButton from "./common/LoadingButton";

type SessionScanFlowProps = {
  sessionId?: number;
};

const steps = [
  { id: "UPLOAD", label: "Zdjęcie" },
  { id: "TO_CROP", label: "Kadrowanie" },
  { id: "TO_MARK", label: "Oznaczanie" },
] as const;

type FlowStep = (typeof steps)[number]["id"] | "COMPLETED";

export function SessionScanFlow({ sessionId }: SessionScanFlowProps) {
  const [activeSessionId, setActiveSessionId] = useState<number | undefined>(
    sessionId
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);

  const session = useLiveQuery(
    () => {
      if (!activeSessionId) {
        return;
      }

      return getSessionById(activeSessionId);
    },
    [activeSessionId],
    undefined
  );

  const imageUrl = useMemo(() => {
    if (!session?.imageBlob) {
      return null;
    }

    return URL.createObjectURL(session.imageBlob);
  }, [session?.imageBlob]);

  useEffect(
    () => () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    },
    [imageUrl]
  );

  const currentStep: FlowStep = useMemo(() => {
    if (!activeSessionId) {
      return "UPLOAD";
    }

    if (!session) {
      return "UPLOAD";
    }

    return session.status;
  }, [activeSessionId, session]);

  const activeStepIndex = steps.findIndex((step) => step.id === currentStep);

  const handleCancelScan = async () => {
    if (!activeSessionId || isCancelling) {
      return;
    }

    const sessionIdToCancel = activeSessionId;
    const isConfirmed = await confirm({
      confirmVariant: "destructive",
      description:
        "Czy na pewno chcesz anulować to skanowanie? Usunie to całą sesję i zapisane dane.",
    });

    if (!isConfirmed) {
      return;
    }

    setIsCancelling(true);

    try {
      await cancelSession(sessionIdToCancel);

      setActiveSessionId(undefined);
    } catch (error: unknown) {
      console.error("Error during session cancellation", error);
    } finally {
      setIsCancelling(false);
    }
  };

  if (activeSessionId && !session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>TODO: Ladowanie sesji</CardTitle>
          <CardDescription>
            Pobieram zapisane dane z pamieci lokalnej.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (currentStep === "COMPLETED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sesja zakonczona</CardTitle>
          <CardDescription>
            Ta sesja jest juz zakonczona. Mozesz rozpoczec kolejne skanowanie.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            onClick={() => {
              setActiveSessionId(undefined);
            }}
            type="button"
            variant="outline"
          >
            Nowa sesja
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Card className="max-sm:py-2.5">
        <CardHeader className="gap-3 max-sm:p-2.5 max-sm:py-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Skanowanie tarczy</CardTitle>
            {activeSessionId && (
              <Badge className="border-dashed" variant="outline">
                Sesja #{activeSessionId}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((step, index) => {
              const isActive = activeStepIndex === index;
              const isDone = activeStepIndex > index;
              let badgeVariant: "default" | "outline" | "secondary" = "outline";

              if (isActive) {
                badgeVariant = "default";
              } else if (isDone) {
                badgeVariant = "secondary";
              }

              return (
                <Badge key={step.id} variant={badgeVariant}>
                  {isDone ? <CheckIcon data-icon="inline-start" /> : null}
                  {step.label}
                </Badge>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 max-sm:p-2">
          {currentStep === "UPLOAD" ? (
            <UploadStep
              onSessionCreated={(id) => {
                setActiveSessionId(id);
              }}
            />
          ) : null}

          {currentStep === "TO_CROP" && session ? (
            <CropStep
              imageBlob={session.imageBlob}
              imageUrl={imageUrl}
              initialTargetTemplate={session.targetTemplate}
              sessionId={session.id}
              sessionStatus={session.status}
            />
          ) : null}

          {currentStep === "TO_MARK" ? (
            <MarkStep
              imageUrl={imageUrl}
              sessionId={session?.id}
              sessionStatus={session?.status}
              targetTemplateId={session?.targetTemplate}
            />
          ) : null}
        </CardContent>

        {activeSessionId ? (
          <CardFooter className="justify-end">
            <LoadingButton
              loading={isCancelling}
              onClick={handleCancelScan}
              size="xs"
              type="button"
              variant="link"
            >
              Anuluj skanowanie
            </LoadingButton>
          </CardFooter>
        ) : null}
      </Card>
    </section>
  );
}
