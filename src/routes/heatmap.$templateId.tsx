import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FlameIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Heatmap from "@/components/common/Heatmap";
import TargetOverlay from "@/components/common/TargetOverlay";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getShotsForTarget } from "@/lib/db/db-helpers";
import {
  TARGET_TEMPLATES,
  type TargetTemplate,
} from "@/lib/targets/target-templates";

export const Route = createFileRoute("/heatmap/$templateId")({
  component: RouteComponent,
});

function BackButton() {
  const navigate = useNavigate();

  return (
    <Button
      className="self-start"
      onClick={() => navigate({ to: "/heatmaps" })}
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

function RouteComponent() {
  const { templateId } = Route.useParams();

  const [template, setTemplate] = useState<TargetTemplate | null>(null);
  const [shots, setShots] = useState<
    Awaited<ReturnType<typeof getShotsForTarget>> | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load template and shots
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const option = TARGET_TEMPLATES.find((item) => item.id === templateId);
        if (!option) {
          setError("Nieznana tarcza");
          setIsLoading(false);
          return;
        }

        const [loadedTemplate, loadedShots] = await Promise.all([
          option.getTemplate(),
          getShotsForTarget(templateId),
        ]);

        if (!cancelled) {
          setTemplate(loadedTemplate);
          setShots(loadedShots);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load data", err);
        if (!cancelled) {
          setError("Błąd przy ładowaniu danych");
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const templateOption = TARGET_TEMPLATES.find((t) => t.id === templateId);

  const stats = useMemo(() => {
    if (!shots || shots.length === 0) {
      return {
        totalShots: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
      };
    }

    const totalScore = shots.reduce((sum, shot) => sum + shot.score, 0);
    const scores = shots.map((s) => s.score);

    return {
      totalShots: shots.length,
      avgScore: (totalScore / shots.length).toFixed(1),
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
    };
  }, [shots]);

  if (error) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <BackButton />
        <Card>
          <CardHeader>
            <CardTitle>{error}</CardTitle>
          </CardHeader>
        </Card>
      </section>
    );
  }

  if (!templateOption) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <BackButton />
        <Card>
          <CardHeader>
            <CardTitle>Nieznana tarcza</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Nie znaleziono szablonu tarczy.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      <BackButton />
      <Card className="max-sm:gap-1 max-sm:py-1">
        <CardHeader className="gap-3 max-sm:p-4 max-sm:py-3">
          <CardTitle className="flex items-center gap-2">
            <FlameIcon className="mb-1" size={20} />
            {templateOption.title}
          </CardTitle>
          <CardDescription>Heatmapa strzałów na danej tarczy.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 max-sm:p-2">
          {(() => {
            if (isLoading || !template) {
              return (
                <div className="flex h-96 items-center justify-center">
                  <Spinner />
                </div>
              );
            }

            if (shots && shots.length > 0) {
              return (
                <div
                  className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-neutral-100"
                  style={{ minHeight: "24rem" }}
                >
                  <TargetOverlay
                    className="absolute inset-0 z-10"
                    template={template}
                    variant="solid"
                  />
                  <Heatmap className="absolute inset-0 z-20" shots={shots} />
                </div>
              );
            }

            return (
              <div className="flex h-96 items-center justify-center rounded-lg bg-muted">
                <p className="text-muted-foreground">
                  Brak strzałów dla tej tarczy
                </p>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card className="mt-1 border-dashed md:mt-2">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/50 px-3 py-2">
            <div className="text-muted-foreground text-xs">Strzały</div>
            <div className="font-semibold text-lg leading-none">
              {stats.totalShots}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 px-3 py-2">
            <div className="text-muted-foreground text-xs">Średnia</div>
            <div className="font-semibold text-lg leading-none">
              {stats.totalShots > 0 ? stats.avgScore : 0} pkt
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 px-3 py-2">
            <div className="text-muted-foreground text-xs">Min</div>
            <div className="font-semibold text-lg leading-none">
              {stats.totalShots > 0 ? stats.minScore : 0}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 px-3 py-2">
            <div className="text-muted-foreground text-xs">Max</div>
            <div className="font-semibold text-lg leading-none">
              {stats.totalShots > 0 ? stats.maxScore : 0}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
