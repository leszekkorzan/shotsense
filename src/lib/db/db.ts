import Dexie, { type EntityTable } from "dexie";
import "dexie-export-import";

export type SessionStatus = "TO_CROP" | "TO_MARK" | "COMPLETED";

export interface Session {
  createdAt: Date;
  id?: number;

  score?: number;
  shootsCount?: number;

  status: SessionStatus;
  targetTemplate?: string;
  updatedAt: Date;
}

export interface SessionFile {
  createdAt: Date;
  imageBlob: Blob;
  sessionId: number;
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
  sessionFiles: EntityTable<SessionFile, "sessionId">;
  shots: EntityTable<Shot, "id">;
};

db.version(1).stores({
  sessions: "++id, targetTemplate, status, createdAt, updatedAt",
  sessionFiles: "&sessionId",
  shots: "++id, sessionId, score",
});
