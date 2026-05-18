import { loadEncryptionKey } from "@/lib/db/config-db";
import { db } from "@/lib/db/db";

const BACKUP_MAGIC = "BKP1";
const BACKUP_VERSION = 0x01;
const BACKUP_SALT_LENGTH = 16;
const BACKUP_IV_LENGTH = 12;

type BackupImportResult =
  | { status: "ok" }
  | { status: "password-required"; message: string }
  | { status: "password-invalid"; message: string };

type ParsedBackup =
  | { encrypted: false; compressedBlob: Blob }
  | {
      encrypted: true;
      salt: Uint8Array;
      iv: Uint8Array;
      ciphertext: Uint8Array;
    };

class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupFormatError";
  }
}

function areBytesEqual(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  for (let index = 0; index < left.byteLength; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function normalizeBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;

  return new Uint8Array(buffer);
}

async function readBackupHeader(blob: Blob): Promise<ParsedBackup> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 5) {
    return { encrypted: false, compressedBlob: blob };
  }
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  if (magic !== BACKUP_MAGIC) {
    return { encrypted: false, compressedBlob: blob };
  }
  const version = bytes[4];
  if (version !== BACKUP_VERSION) {
    throw new BackupFormatError(`Unsupported backup version: ${version}`);
  }
  const headerLength = 4 + 1 + BACKUP_SALT_LENGTH + BACKUP_IV_LENGTH;
  if (bytes.byteLength < headerLength) {
    throw new BackupFormatError("Backup header is incomplete.");
  }
  const salt = bytes.slice(5, 5 + BACKUP_SALT_LENGTH);
  const iv = bytes.slice(5 + BACKUP_SALT_LENGTH, headerLength);
  const ciphertext = bytes.slice(headerLength);
  return {
    encrypted: true,
    salt,
    iv,
    ciphertext,
  };
}

export async function deriveBackupEncryptionKey(
  password: string,
  salt?: Uint8Array
) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const derivedSalt: Uint8Array<ArrayBuffer> = normalizeBytes(
    salt ?? crypto.getRandomValues(new Uint8Array(16))
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: derivedSalt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return { key, salt: derivedSalt };
}

async function decryptBackupBytes(params: {
  key: CryptoKey;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}) {
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: normalizeBytes(params.iv) },
    params.key,
    normalizeBytes(params.ciphertext)
  );

  return new Blob([plainBuffer]);
}

async function blobToCompressedBlob(blob: Blob): Promise<Blob> {
  const compressedStream = blob
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return await new Response(compressedStream).blob();
}

async function blobToDecompressedBlob(blob: Blob): Promise<Blob> {
  const decompressedStream = blob
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return await new Response(decompressedStream).blob();
}

export async function exportDatabase(
  onProgress?: (progress: {
    totalTables: number;
    completedTables: number;
    totalRows: number | undefined;
    completedRows: number;
    done: boolean;
  }) => boolean
): Promise<Blob> {
  const blob = await db.export({
    progressCallback: onProgress,
  });

  const compressed = await blobToCompressedBlob(blob);

  const record = await loadEncryptionKey();
  if (record?.cryptoKey) {
    const ab = await compressed.arrayBuffer();

    const iv: Uint8Array<ArrayBuffer> = normalizeBytes(
      crypto.getRandomValues(new Uint8Array(12))
    );
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      record.cryptoKey,
      ab
    );

    // Header layout:
    // [4B magic 'BKP1'][1B version][16B salt][12B iv][ciphertext...]
    const magic = new TextEncoder().encode("BKP1");
    const version = 0x01;
    const salt =
      record.saltData instanceof Uint8Array
        ? record.saltData
        : new Uint8Array(record.saltData);
    const ivBuf = iv;
    const cipherU8 = new Uint8Array(cipherBuffer);

    const header = new Uint8Array(4 + 1 + salt.byteLength + ivBuf.byteLength);
    let off = 0;
    header.set(magic, off);
    off += 4;
    header[off] = version;
    off += 1;
    header.set(salt, off);
    off += salt.byteLength;
    header.set(ivBuf, off);
    off += ivBuf.byteLength;

    return new Blob([header, cipherU8], { type: "application/octet-stream" });
  }

  return compressed;
}

export async function importDatabase(
  blob: Blob,
  onProgress?: (progress: {
    totalTables: number;
    completedTables: number;
    totalRows: number | undefined;
    completedRows: number;
    done: boolean;
  }) => boolean,
  password?: string
): Promise<BackupImportResult> {
  const parsed = await readBackupHeader(blob);

  if (!parsed.encrypted) {
    const decompressedBlob = await blobToDecompressedBlob(
      parsed.compressedBlob
    );

    await db.import(decompressedBlob, {
      overwriteValues: true,
      clearTablesBeforeImport: true,
      progressCallback: onProgress,
    });

    return { status: "ok" };
  }

  const storedKey = await loadEncryptionKey();
  if (storedKey && areBytesEqual(storedKey.saltData, parsed.salt)) {
    try {
      const decryptedBlob = await decryptBackupBytes({
        key: storedKey.cryptoKey,
        iv: parsed.iv,
        ciphertext: parsed.ciphertext,
      });
      const decompressedBlob = await blobToDecompressedBlob(decryptedBlob);

      await db.import(decompressedBlob, {
        overwriteValues: true,
        clearTablesBeforeImport: true,
        progressCallback: onProgress,
      });

      return { status: "ok" };
    } catch {
      // pass
    }
  }

  if (!password) {
    return {
      status: "password-required",
      message: "Ta kopia jest zaszyfrowana. Podaj hasło, aby ją odszyfrować.",
    };
  }

  try {
    const { key } = await deriveBackupEncryptionKey(password, parsed.salt);
    const decryptedBlob = await decryptBackupBytes({
      key,
      iv: parsed.iv,
      ciphertext: parsed.ciphertext,
    });
    const decompressedBlob = await blobToDecompressedBlob(decryptedBlob);

    await db.import(decompressedBlob, {
      overwriteValues: true,
      clearTablesBeforeImport: true,
      progressCallback: onProgress,
    });

    return { status: "ok" };
  } catch {
    return {
      status: "password-invalid",
      message: "Podane hasło jest nieprawidłowe albo kopia jest uszkodzona.",
    };
  }
}
