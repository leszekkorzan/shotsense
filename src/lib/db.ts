import Dexie, { type EntityTable } from "dexie";

export type SessionStatus = "TO_CROP" | "TO_MARK" | "COMPLETED";

export interface Session {
  createdAt: Date;
  id?: number;
  imageBlob: Blob;

  status: SessionStatus;
  targetTemplate?: string; // np. "BUILT_IN_TS4", "BUILT_IN_NT23"
  updatedAt: Date;
}

export interface Shot {
  createdAt: Date;
  id?: number;

  isManual: boolean;
  radius: number; // Wyliczony z Bounding Boxa YOLO np. (x2 - x1) / 2 * 1000
  score: number; // Wartość punktowa
  sessionId: number;

  x: number;
  y: number;
}

export const db = new Dexie("shooting-app-db") as Dexie & {
  sessions: EntityTable<Session, "id">;
  shots: EntityTable<Shot, "id">;
};

db.version(1).stores({
  sessions: "++id, targetTemplate, status, createdAt, updatedAt",
  shots: "++id, sessionId, score",
});
