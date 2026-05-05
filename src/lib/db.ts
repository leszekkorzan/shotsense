import Dexie, { type EntityTable } from "dexie";

export type SessionStatus = "TO_CROP" | "TO_MARK" | "COMPLETED";

export interface Session {
  createdAt: Date;
  id?: number;
  imageBlob: Blob;

  score?: number;
  shootsCount?: number;

  status: SessionStatus;
  targetTemplate?: string;
  updatedAt: Date;
}

export interface Shot {
  createdAt: Date;
  id?: number;

  isManual: boolean;
  nx: number;
  ny: number;
  score: number;
  sessionId: number;
}

export const db = new Dexie("shooting-app-db") as Dexie & {
  sessions: EntityTable<Session, "id">;
  shots: EntityTable<Shot, "id">;
};

db.version(1).stores({
  sessions: "++id, targetTemplate, status, createdAt, updatedAt",
  shots: "++id, sessionId, score",
});
