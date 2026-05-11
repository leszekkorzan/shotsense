import {
  createFileRoute,
  stripSearchParams,
  useNavigate,
} from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Crosshair } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSessionsCount,
  getSessionsPage,
  SESSIONS_PAGE_SIZE,
} from "@/lib/db/db-helpers";
import { TARGET_TEMPLATES } from "@/lib/targets/target-templates";
import { cn } from "@/lib/utils";

type SessionsSearch = {
  page?: number;
};

export const Route = createFileRoute("/sessions")({
  validateSearch: (search: Record<string, unknown>): SessionsSearch => ({
    page: Number.isFinite(Number(search.page))
      ? Math.max(1, Number(search.page))
      : undefined,
  }),
  search: {
    middlewares: [stripSearchParams({ page: 1 })],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { page } = Route.useSearch();
  const currentSearchPage = page ?? 1;
  const navigate = useNavigate({ from: Route.fullPath });

  const totalCount = useLiveQuery(() => getSessionsCount(), []);
  const totalPages =
    totalCount === undefined
      ? undefined
      : Math.max(1, Math.ceil(totalCount / SESSIONS_PAGE_SIZE));
  const currentPage =
    totalPages === undefined
      ? currentSearchPage
      : Math.min(currentSearchPage, totalPages);

  const sessions = useLiveQuery(
    () => getSessionsPage(currentPage, SESSIONS_PAGE_SIZE),
    [currentPage]
  );

  useEffect(() => {
    if (totalPages === undefined || currentSearchPage === currentPage) {
      return;
    }

    navigate({
      replace: true,
      search: (prev) => ({ ...prev, page: currentPage }),
    });
  }, [currentPage, currentSearchPage, navigate, totalPages]);

  const pageStart = totalCount ? (currentPage - 1) * SESSIONS_PAGE_SIZE + 1 : 0;
  const pageEnd = totalCount
    ? Math.min(totalCount, currentPage * SESSIONS_PAGE_SIZE)
    : 0;
  const isLoading = sessions === undefined || totalCount === undefined;
  const hasSessions = !!sessions && sessions.length > 0;
  const tableBodyContent = (() => {
    if (isLoading) {
      return (
        <TableRow className="h-24">
          <TableCell
            className="text-center text-muted-foreground text-sm"
            colSpan={4}
          >
            Ładowanie sesji...
          </TableCell>
        </TableRow>
      );
    }

    if (hasSessions) {
      return sessions.map((session) => (
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
                  {TARGET_TEMPLATES.find((t) => t.id === session.targetTemplate)
                    ?.title ?? ""}
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
                <Badge className="border-dashed text-xs" variant="outline">
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
      ));
    }

    return (
      <TableRow className="h-24">
        <TableCell
          className="text-center text-muted-foreground text-sm"
          colSpan={4}
        >
          Brak sesji do wyświetlenia
        </TableCell>
      </TableRow>
    );
  })();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:px-6 lg:px-8">
      <Card className="gap-0 py-0">
        <div className="border-foreground/10 border-b px-6 py-5">
          <h1 className="font-semibold text-base text-foreground tracking-tight">
            Twoje Sesje {!isLoading && `(${totalCount})`}
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

            <TableBody>{tableBodyContent}</TableBody>
          </Table>
        </div>

        <div className="flex flex-col items-end gap-3 border-foreground/10 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {totalCount && totalCount > 0
              ? `Wyświetlane ${pageStart}–${pageEnd} z ${totalCount} sesji`
              : "Brak sesji do wyświetlenia"}
          </p>

          <div className="flex items-center gap-2">
            <Button
              disabled={currentPage <= 1}
              onClick={() =>
                navigate({
                  search: (prev) => ({ ...prev, page: currentPage - 1 }),
                })
              }
              variant="outline"
            >
              Poprzednia
            </Button>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground text-sm">
              {currentPage} / {totalPages}
            </div>
            <Button
              disabled={!totalPages || currentPage >= totalPages}
              onClick={() =>
                navigate({
                  search: (prev) => ({ ...prev, page: currentPage + 1 }),
                })
              }
              variant="outline"
            >
              Następna
            </Button>
          </div>
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
