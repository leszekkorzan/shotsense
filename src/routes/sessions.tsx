import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Crosshair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllSessions } from "@/lib/db-helpers";
import { TARGET_TEMPLATES } from "@/lib/targets/target-templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sessions")({
  component: RouteComponent,
});

function RouteComponent() {
  const sessions = useLiveQuery(() => getAllSessions(), []);
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:px-6 lg:px-8">
      <Card className="gap-0 py-0">
        <div className="border-foreground/10 border-b px-6 py-5">
          <h1 className="font-semibold text-base text-foreground tracking-tight">
            Twoje Sesje
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Przeglądaj swoje sesje, uzupełniaj brakujące dane i analizuj swoje
            postępy.
          </p>
        </div>

        <div className="overflow-hidden">
          <Table className="text-[15px]">
            <TableHeader className="sr-only">
              <TableRow>
                <TableHead>Sesja</TableHead>
                <TableHead>Wynik</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sessions && sessions.length > 0 ? (
                sessions.map((session) => (
                  <TableRow
                    className="group h-16 cursor-pointer border-border/70 hover:bg-muted/50"
                    key={session.id}
                    onClick={() =>
                      navigate({
                        to: "/session/$id",
                        params: { id: session.id as unknown as string },
                      })
                    }
                  >
                    <TableCell className="w-[46%] whitespace-normal px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors group-hover:bg-background ${getStatusIconContainerClass(session.status)}`}
                        >
                          <Crosshair className="size-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {TARGET_TEMPLATES.find(
                              (t) => t.id === session.targetTemplate
                            )?.title ?? ""}
                            <span className="font-mono text-foreground/70">
                              {" "}
                              #{session.id}
                            </span>
                          </div>
                          <div className="truncate text-muted-foreground text-sm">
                            {formatSessionDate(session.createdAt)}
                          </div>
                          <div className="flex items-center gap-2 truncate text-muted-foreground text-sm lg:hidden">
                            {session.score &&
                              session.shootsCount &&
                              `${session.score} pkt / ${session.shootsCount}`}

                            {session.status !== "COMPLETED" && (
                              <Badge
                                className={cn(
                                  getStatusBadgeClass(session.status),
                                  "mt-1 lg:hidden"
                                )}
                              >
                                {formatSessionStatus(session.status)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="max-lg:hidden">
                      {session.score !== undefined &&
                        session.shootsCount !== undefined && (
                          <Badge
                            className="border-dashed text-xs"
                            variant="outline"
                          >
                            {session.score} pkt / {session.shootsCount} strzałów
                          </Badge>
                        )}
                    </TableCell>

                    <TableCell className="w-[18%] whitespace-normal text-right max-lg:hidden">
                      <Badge className={getStatusBadgeClass(session.status)}>
                        {formatSessionStatus(session.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="h-24">
                  <TableCell
                    className="text-center text-muted-foreground text-sm"
                    colSpan={4}
                  >
                    Brak sesji do wyświetlenia
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function formatSessionStatus(status: string) {
  switch (status) {
    case "TO_CROP":
      return "Do przycięcia";
    case "TO_MARK":
      return "Do oznaczenia";
    case "COMPLETED":
      return "Zakończone";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "TO_CROP":
      return "bg-slate-500/10 text-slate-700 ring-1 ring-inset ring-slate-500/15 hover:bg-slate-500/10";
    case "TO_MARK":
      return "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/15 hover:bg-amber-500/10";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/15 hover:bg-emerald-500/10";
    default:
      return "bg-muted text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted";
  }
}

function getStatusIconContainerClass(status: string) {
  switch (status) {
    case "TO_CROP":
      return "bg-slate-500/10 text-slate-700 ring-slate-500/15";
    case "TO_MARK":
      return "bg-amber-500/10 text-amber-700 ring-amber-500/15";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15";
    default:
      return "bg-muted text-muted-foreground ring-foreground/5";
  }
}

function formatSessionDate(date: Date) {
  const now = new Date();
  const diffInDays = Math.floor(
    (date.getTime() - now.setHours(0, 0, 0, 0)) / 86_400_000
  );

  if (diffInDays === 0 || diffInDays === -1) {
    const rtf = new Intl.RelativeTimeFormat("pl-PL", { numeric: "auto" });
    const relative = rtf.format(diffInDays, "day");

    const label = relative.charAt(0).toUpperCase() + relative.slice(1);

    if (diffInDays === 0) {
      const time = new Intl.DateTimeFormat("pl-PL", {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
      return `${label}, ${time}`;
    }
    return label;
  }

  const withYear = date.getFullYear() !== now.getFullYear();
  return new Intl.DateTimeFormat("pl-PL", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date);
}
