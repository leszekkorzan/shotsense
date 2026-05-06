import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTargetsWithSessions } from "@/lib/db-helpers";
import { TARGET_TEMPLATES } from "@/lib/targets/target-templates";

export const Route = createFileRoute("/heatmaps")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });

  const targets = useLiveQuery(() => getTargetsWithSessions(), []);

  const isLoading = targets === undefined;
  const hasTargets = !!targets && targets.length > 0;

  const tableBodyContent = (() => {
    if (isLoading) {
      return (
        <TableRow className="h-24">
          <TableCell
            className="text-center text-muted-foreground text-sm"
            colSpan={5}
          >
            Ładowanie tarcz...
          </TableCell>
        </TableRow>
      );
    }

    if (!hasTargets) {
      return (
        <TableRow className="h-24">
          <TableCell
            className="text-center text-muted-foreground text-sm"
            colSpan={5}
          >
            Brak tarcz. Utwórz sesję aby zobaczyć heatmapy.
          </TableCell>
        </TableRow>
      );
    }

    return targets.map((target) => {
      const templateOption = TARGET_TEMPLATES.find(
        (t) => t.id === target.targetTemplate
      );

      return (
        <TableRow
          className="group h-16 cursor-pointer border-border/70 hover:bg-muted/50"
          key={target.targetTemplate}
          onClick={() =>
            navigate({
              to: "/heatmap/$templateId",
              params: { templateId: target.targetTemplate },
            })
          }
        >
          <TableCell className="w-[50%] px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100/50 ring-1 ring-orange-200 transition-colors group-hover:bg-background">
                <Flame className="size-4 text-orange-600" />
              </div>

              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">
                  {templateOption?.title ?? target.targetTemplate}
                </div>
                <div className="truncate text-muted-foreground text-sm">
                  Ostatnia aktualizacja:{" "}
                  {target.lastSessionDate.toLocaleDateString("pl-PL", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </div>
                <div className="truncate text-muted-foreground text-sm md:hidden">
                  {target.shotCount} strzałów / {target.sessionCount} sesji
                </div>
              </div>
            </div>
          </TableCell>

          <TableCell className="px-3 py-3 text-right max-md:hidden">
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {target.shotCount} / {target.sessionCount}
              </div>
              <div className="text-muted-foreground text-xs">
                strzałów / sesji
              </div>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  })();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:px-6 lg:px-8">
      <Card className="gap-0 py-0">
        <div className="border-foreground/10 border-b px-6 py-5">
          <h1 className="font-semibold text-base text-foreground tracking-tight">
            Heatmapy {!isLoading && `(${targets?.length ?? 0})`}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Przeanalizuj rozkład strzałów na każdej tarczy
          </p>
        </div>

        <div className="overflow-hidden">
          <Table className="text-[15px]">
            <TableHeader className="sr-only">
              <TableRow>
                <TableHead>Tarcza</TableHead>
                <TableHead className="text-right">Dane</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>{tableBodyContent}</TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
