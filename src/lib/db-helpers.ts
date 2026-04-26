import { db, type Session } from "@/lib/db";

export function getSessionById(
  sessionId: number
): Promise<Session | undefined> {
  return db.sessions.get(sessionId);
}

export async function createSessionFromImage(imageBlob: Blob): Promise<number> {
  const now = new Date();
  const id = await db.sessions.add({
    imageBlob,
    status: "TO_CROP",
    createdAt: now,
    updatedAt: now,
  });

  if (id === undefined) {
    throw new Error("Session id was not generated");
  }

  return id;
}

export async function advanceSessionToMark(
  sessionId: number,
  targetTemplate: string
): Promise<void> {
  await db.sessions.update(sessionId, {
    status: "TO_MARK",
    targetTemplate,
    updatedAt: new Date(),
  });
}

export async function completeSession(sessionId: number): Promise<void> {
  await db.sessions.update(sessionId, {
    status: "COMPLETED",
    updatedAt: new Date(),
  });
}

export async function cancelSession(sessionId: number): Promise<void> {
  await db.transaction("rw", db.sessions, db.shots, async () => {
    await db.shots.where("sessionId").equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}
