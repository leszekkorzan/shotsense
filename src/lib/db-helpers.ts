import { db, type Session, type SessionFile } from "@/lib/db";

function toSessionFile(sessionId: number, imageBlob: Blob): SessionFile {
  const now = new Date();
  return {
    sessionId,
    imageBlob,
    createdAt: now,
    updatedAt: now,
  };
}

export function getSessionById(
  sessionId: number
): Promise<Session | undefined> {
  return db.sessions.get(sessionId);
}

export function getSessionFileBySessionId(
  sessionId: number
): Promise<SessionFile | undefined> {
  return db.sessionFiles.get(sessionId);
}

export function createSessionFromImage(imageBlob: Blob): Promise<number> {
  const now = new Date();
  return db.transaction("rw", db.sessions, db.sessionFiles, async () => {
    const id = await db.sessions.add({
      status: "TO_CROP",
      createdAt: now,
      updatedAt: now,
    });

    if (id === undefined) {
      throw new Error("Session id was not generated");
    }

    await db.sessionFiles.put(toSessionFile(id, imageBlob));

    return id;
  });
}

export async function advanceSessionToMark(
  sessionId: number,
  targetTemplate: string,
  imageBlob?: Blob
): Promise<void> {
  const updates: Partial<Session> = {
    status: "TO_MARK",
    targetTemplate,
    updatedAt: new Date(),
  };

  await db.transaction("rw", db.sessions, db.sessionFiles, async () => {
    await db.sessions.update(sessionId, updates);

    if (imageBlob) {
      await db.sessionFiles.put(toSessionFile(sessionId, imageBlob));
    }
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
  await db.transaction(
    "rw",
    db.sessions,
    db.sessionFiles,
    db.shots,
    async () => {
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
    }
  );
}

export async function cancelSession(sessionId: number): Promise<void> {
  await db.transaction(
    "rw",
    db.sessions,
    db.sessionFiles,
    db.shots,
    async () => {
      await db.shots.where("sessionId").equals(sessionId).delete();
      await db.sessions.delete(sessionId);
      await db.sessionFiles.delete(sessionId);
    }
  );
}

export async function getAllSessions() {
  const sessions = await db.sessions.orderBy("createdAt").reverse().toArray();
  return sessions;
}

export async function clearAllData(confirm: "DELETE") {
  if (confirm !== "DELETE") {
    throw new Error("Confirmation text does not match");
  }
  return await db.delete({ disableAutoOpen: false });
}
