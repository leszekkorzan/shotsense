import { Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CheckIcon,
  CircleCheckBig,
  ScanEyeIcon,
  ScanSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
  cancelSession,
  getSessionById,
  getSessionFileBySessionId,
} from "@/lib/db/db-helpers";
import LoadingButton from "./common/LoadingButton";
import { Spinner } from "./ui/spinner";

type SessionScanFlowProps = {
  sessionId?: number;
  existingSession?: boolean;
};

const steps = [
  { id: "UPLOAD", label: "Zdjęcie" },
  { id: "TO_CROP", label: "Kadrowanie" },
  { id: "TO_MARK", label: "Oznaczanie" },
] as const;

type FlowStep = (typeof steps)[number]["id"] | "COMPLETED";

export function SessionScanFlow({
  sessionId,
  existingSession,
}: SessionScanFlowProps) {
  const navigate = useNavigate();

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

  const sessionFile = useLiveQuery(
    () => {
      if (!activeSessionId) {
        return;
      }

      return getSessionFileBySessionId(activeSessionId);
    },
    [activeSessionId],
    undefined
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionFile?.imageBlob) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(sessionFile.imageBlob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [sessionFile?.imageBlob]);

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
      toast.success("Skanowanie zostało anulowane");

      if (existingSession) {
        navigate({ to: "/sessions" });
      }

      setActiveSessionId(undefined);
    } catch (error: unknown) {
      console.error("Error during session cancellation", error);
    } finally {
      setIsCancelling(false);
    }
  };

  if (activeSessionId) {
    if (session === undefined || sessionFile === undefined) {
      return (
        <Card className="flex items-center justify-center">
          <Spinner />
        </Card>
      );
    }

    if (!(session && sessionFile)) {
      return (
        <Card className="flex items-center justify-center p-8">
          <CardTitle>Brak danych sesji</CardTitle>
        </Card>
      );
    }
  }

  if (currentStep === "COMPLETED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="mb-2 flex gap-2">
            <CircleCheckBig size={21} />
            Sesja zakończona
          </CardTitle>
          <CardDescription>
            Wszystkie kroki zostały ukończone. Sesja zapisana.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2">
          <Button
            onClick={() => {
              setActiveSessionId(undefined);
            }}
            type="button"
            variant="outline"
          >
            <ScanSearch />
            Nowa sesja
          </Button>
          <Link
            params={{ id: activeSessionId as unknown as string }}
            to="/session/$id"
          >
            <Button variant="outline">
              <ScanEyeIcon />
              Zobacz sesję
            </Button>
          </Link>
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

          {currentStep === "TO_CROP" && session && sessionFile ? (
            <CropStep
              imageBlob={sessionFile.imageBlob}
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
          <CardFooter className="justify-end max-sm:p-2 max-sm:py-0">
            <LoadingButton
              className="text-slate-600"
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
