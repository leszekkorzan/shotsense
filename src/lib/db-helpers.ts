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
  targetTemplate: string,
  imageBlob?: Blob
): Promise<void> {
  await db.sessions.update(sessionId, {
    ...(imageBlob ? { imageBlob } : {}),
    status: "TO_MARK",
    targetTemplate,
    updatedAt: new Date(),
  });
}

export type ShotPayload = {
  isManual: boolean;
  score: number;
  nx: number;
  ny: number;
};

export async function completeSession(
  sessionId: number,
  shots: ShotPayload[]
): Promise<void> {
  await db.transaction("rw", db.sessions, db.shots, async () => {
    await db.shots.where("sessionId").equals(sessionId).delete();

    if (shots.length > 0) {
      const now = new Date();
      const records = shots.map((shot) => ({
        ...shot,
        sessionId,
        createdAt: now,
      }));
      await db.shots.bulkAdd(records);
    }

    await db.sessions.update(sessionId, {
      status: "COMPLETED",
      updatedAt: new Date(),
      score: shots.reduce((acc, shot) => acc + shot.score, 0),
      shootsCount: shots.length,
    });
  });
}

export async function cancelSession(sessionId: number): Promise<void> {
  await db.transaction("rw", db.sessions, db.shots, async () => {
    await db.shots.where("sessionId").equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

export async function getAllSessions() {
  const sessions = await db.sessions.orderBy("createdAt").reverse().toArray();
  return sessions;
}
