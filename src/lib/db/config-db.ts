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

export const configDb = new Dexie("shotsense-config-db") as Dexie & {
  keys: EntityTable<Key, "id">;
};

configDb.version(1).stores({
  keys: "id",
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
