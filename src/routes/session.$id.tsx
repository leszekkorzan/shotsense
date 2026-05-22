import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Calculator, Target, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Shot as EditorShot,
  ShotMarkerEditor,
} from "@/components/common/ShotMarkerEditor";
import { useConfirm } from "@/components/contexts/DialogProvider";
import { SessionScanFlow } from "@/components/session-scan-flow";
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
import { Spinner } from "@/components/ui/spinner";
import { type Shot as DbShot, db, type Session } from "@/lib/db/db";
import { cancelSession, getSessionFileBySessionId } from "@/lib/db/db-helpers";
import {
  TARGET_TEMPLATES,
  type TargetTemplate,
} from "@/lib/targets/target-templates";

export const Route = createFileRoute("/session/$id")({
  component: SessionRoute,
});

function BackButton() {
  const navigate = useNavigate();

  return (
    <Button
      className="self-start"
      onClick={() => navigate({ to: "/sessions" })}
      size="sm"
      style={{
        height: "2rem",
        paddingLeft: "0.75rem",
        paddingRight: "0.75rem",
      }}
      variant="ghost"
    >
      <ArrowLeft className="mr-2 size-4" />
      Cofnij
    </Button>
  );
}

function CompletedSessionView({
  session,
  imageBlob,
  dbShots,
}: {
  session: Session;
  imageBlob: Blob;
  dbShots: DbShot[];
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const [template, setTemplate] = useState<TargetTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!session.targetTemplate) {
      setTemplate(null);
      return;
    }

    const option = TARGET_TEMPLATES.find(
      (item) => item.id === session.targetTemplate
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
      .catch((err) => {
        console.error("Failed to load template", err);
        if (!cancelled) {
          setTemplate(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.targetTemplate]);

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(imageBlob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageBlob]);

  const editorShots: EditorShot[] = useMemo(() => {
    if (!template) {
      return [];
    }
    return dbShots.map((shot) => {
      const ringIndex = template.rings.findIndex((r) => r.score === shot.score);
      let finalRingIndex: number | undefined = ringIndex;
      if (ringIndex === -1) {
        finalRingIndex = shot.score === 0 ? -1 : undefined;
      }
      return {
        id: shot.id?.toString() ?? Math.random().toString(),
        x: 0,
        y: 0,
        nx: shot.nx ?? 0.5, // Fallback for old DB records
        ny: shot.ny ?? 0.5,
        ringIndex: finalRingIndex,
        isManual: shot.isManual,
      };
    });
  }, [dbShots, template]);

  const totalScore = useMemo(
    () => dbShots.reduce((acc, shot) => acc + shot.score, 0),
    [dbShots]
  );

  const [internalShots, setInternalShots] = useState<EditorShot[]>([]);

  useEffect(() => {
    setInternalShots(editorShots);
  }, [editorShots]);

  if (!(imageUrl && template)) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <BackButton />
        <Card className="flex items-center justify-center p-8">
          <Spinner />
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      <BackButton />
      <Card className="max-sm:py-1">
        <CardHeader className="gap-3 max-sm:p-4 max-sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Target size={20} />
              Podsumowanie #{session.id}
            </CardTitle>
            <Badge
              className="gap-1 border-dashed text-sm dark:text-gray-300"
              variant="secondary"
            >
              <Calculator size={14} />
              Suma: {totalScore} pkt
            </Badge>
          </div>
          <CardDescription>
            Oddano {dbShots.length} strzałów w tej sesji.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 max-sm:p-2">
          <div className="flex flex-col gap-4">
            <ShotMarkerEditor
              imageUrl={imageUrl}
              onShotsChange={setInternalShots}
              readonly
              shots={internalShots}
              template={template}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end max-md:px-2">
          <Button
            disabled={isDeleting}
            onClick={async () => {
              const isConfirmed = await confirm({
                confirmVariant: "destructive",
                description:
                  "Czy na pewno chcesz usunąć tę sesję? Ta operacja jest nieodwracalna.",
              });

              if (isConfirmed && session.id) {
                setIsDeleting(true);
                try {
                  await cancelSession(session.id);
                  toast.success("Sesja została usunięta");
                  navigate({ to: "/sessions" });
                } catch (error) {
                  console.error("Failed to delete session", error);
                  setIsDeleting(false);
                }
              }
            }}
            variant="destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Usuń sesję
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

function SessionRoute() {
  const { id } = Route.useParams();
  const sessionId = Number(id);

  const session = useLiveQuery(
    () => db.sessions.get(sessionId),
    [sessionId],
    null
  );

  const shots = useLiveQuery(
    () => db.shots.where("sessionId").equals(sessionId).toArray(),
    [sessionId],
    null
  );

  const sessionFile = useLiveQuery(
    () => getSessionFileBySessionId(sessionId),
    [sessionId],
    null
  );

  if (session === null || shots === null || sessionFile === null) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <BackButton />
        <Card className="flex items-center justify-center p-8">
          <Spinner />
        </Card>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <BackButton />
        <Card>
          <CardHeader>
            <CardTitle>Sesja nie istnieje</CardTitle>
            <CardDescription>
              Nie znaleziono rekordu o podanym identyfikatorze.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  if (!sessionFile) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <BackButton />
        <Card>
          <CardHeader>
            <CardTitle>Brak pliku sesji</CardTitle>
            <CardDescription>
              Nie znaleziono obrazu przypisanego do tej sesji.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  if (session.status === "COMPLETED") {
    return (
      <CompletedSessionView
        dbShots={shots}
        imageBlob={sessionFile.imageBlob}
        session={session}
      />
    );
  }

  return <SessionScanFlow existingSession sessionId={sessionId} />;
}
