import Dexie, { type EntityTable } from "dexie";

export interface Key {
  id: string;
  keyData: CryptoKey;
  saltData: Uint8Array;
}

export interface EncryptionKeyRecord {
  cryptoKey: CryptoKey;
  saltData: Uint8Array;
}

export interface BackupAuthKeyRecord {
  id: string;
  key: string;
  uuid: string;
}

export const configDb = new Dexie("shotsense-config-db") as Dexie & {
  keys: EntityTable<Key, "id">;
  backupAuthKeys: EntityTable<BackupAuthKeyRecord, "id">;
};

configDb.version(1).stores({
  keys: "id",
  backupAuthKeys: "id",
});

const BACKUP_KEY_ID = "backup_main_user_key";

export async function saveEncryptionKey(params: {
  cryptoKey: CryptoKey;
  saltData: Uint8Array;
}) {
  await configDb.keys.put({
    id: BACKUP_KEY_ID,
    keyData: params.cryptoKey,
    saltData: params.saltData,
  });
}

export async function loadEncryptionKey(): Promise<EncryptionKeyRecord | null> {
  try {
    const record = await configDb.keys.get(BACKUP_KEY_ID);

    if (!record) {
      return null;
    }

    return {
      cryptoKey: record.keyData,
      saltData: record.saltData,
    };
  } catch {
    return null;
  }
}

export async function deleteEncryptionKey() {
  await configDb.keys.delete(BACKUP_KEY_ID);
}

const BACKUP_AUTH_KEY_ID = "backup_auth_key";

export async function getBackupAuthKey() {
  const res = await configDb.backupAuthKeys.get(BACKUP_AUTH_KEY_ID);
  return res || null;
}
export async function createBackupAuthKey({
  key,
  uuid,
}: {
  key: string;
  uuid: string;
}) {
  const existingKey = await getBackupAuthKey();
  if (existingKey) {
    throw new Error("Backup auth key already exists");
  }

  return configDb.backupAuthKeys.put({
    id: BACKUP_AUTH_KEY_ID,
    key,
    uuid,
  });
}
export async function deleteBackupAuthKey() {
  await configDb.backupAuthKeys.delete(BACKUP_AUTH_KEY_ID);
}
