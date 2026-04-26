import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { SessionScanFlow } from "@/components/session-scan-flow";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";

export const Route = createFileRoute("/session/$id")({
  component: SessionRoute,
});

function SessionRoute() {
  const { id } = Route.useParams();
  const sessionId = Number(id);

  const session = useLiveQuery(
    () => db.sessions.get(sessionId),
    [sessionId],
    null
  );

  if (session === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ladowanie sesji</CardTitle>
          <CardDescription>Pobieram dane z IndexedDB.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sesja nie istnieje</CardTitle>
          <CardDescription>
            Nie znaleziono rekordu o podanym identyfikatorze.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (session.status === "COMPLETED") {
    return <section className="min-h-45">todo: session completed</section>;
  }

  return <SessionScanFlow sessionId={sessionId} />;
}
