import {
  type Shot as DbShot,
  db,
  type Session,
  type SessionFile,
} from "@/lib/db/db";

export const SESSIONS_PAGE_SIZE = 15;

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

export function getSessionsCount(): Promise<number> {
  return db.sessions.count();
}

export function getSessionsPage(
  page: number,
  pageSize: number = SESSIONS_PAGE_SIZE
) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const offset = (safePage - 1) * safePageSize;

  return db.sessions
    .orderBy("createdAt")
    .reverse()
    .offset(offset)
    .limit(safePageSize)
    .toArray();
}

export async function clearAllData(confirm: "DELETE") {
  if (confirm !== "DELETE") {
    throw new Error("Confirmation text does not match");
  }
  return await db.delete({ disableAutoOpen: false });
}

export interface TargetHeatmapInfo {
  lastSessionDate: Date;
  sessionCount: number;
  shotCount: number;
  targetTemplate: string;
  title: string;
}

export async function getTargetsWithSessions(): Promise<TargetHeatmapInfo[]> {
  const completedSessions = await db.sessions
    .where("status")
    .equals("COMPLETED")
    .toArray();

  const sessionToTarget = new Map<number, TargetHeatmapInfo>();
  const targetMap = new Map<string, TargetHeatmapInfo>();

  for (const session of completedSessions) {
    if (!session.targetTemplate) {
      continue;
    }

    const existing = targetMap.get(session.targetTemplate);
    let target: TargetHeatmapInfo;

    if (existing) {
      target = existing;
      target.sessionCount++;
      target.lastSessionDate = new Date(
        Math.max(target.lastSessionDate.getTime(), session.createdAt.getTime())
      );
    } else {
      target = {
        targetTemplate: session.targetTemplate,
        title: session.targetTemplate,
        sessionCount: 1,
        shotCount: 0,
        lastSessionDate: session.createdAt,
      };
      targetMap.set(session.targetTemplate, target);
    }

    sessionToTarget.set(session.id as number, target);
  }

  if (sessionToTarget.size > 0) {
    const allShots = await db.shots
      .where("sessionId")
      .anyOf(Array.from(sessionToTarget.keys()))
      .toArray();

    for (const shot of allShots) {
      const target = sessionToTarget.get(shot.sessionId);
      if (target) {
        target.shotCount++;
      }
    }
  }

  return Array.from(targetMap.values()).sort(
    (a, b) => b.lastSessionDate.getTime() - a.lastSessionDate.getTime()
  );
}

export async function getShotsForTarget(
  targetTemplate: string
): Promise<(DbShot & { sessionId: number })[]> {
  const sessions = await db.sessions
    .where("targetTemplate")
    .equals(targetTemplate)
    .and((s) => s.status === "COMPLETED")
    .toArray();

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((s) => s.id as number);
  const shots = await db.shots.where("sessionId").anyOf(sessionIds).toArray();

  return shots;
}
