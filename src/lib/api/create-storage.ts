import { createBackupAuthKey, getBackupAuthKey } from "../db/config-db";
import { hmacSha256 } from "../hash-utils";
import { backupApiClient } from "./api-client";

type Props = {
  pin: string;
  creationKey: string;
};
export async function createApiBackupStorage({ pin, creationKey }: Props) {
  const currentKey = await getBackupAuthKey();
  if (currentKey) {
    throw new Error("Backup storage already exists");
  }

  const uuid = crypto.randomUUID().toUpperCase();

  const key = await hmacSha256(uuid, pin);

  const response = await backupApiClient.POST("/api/backup/create-bucket", {
    body: {
      backupKey: key,
      creationToken: creationKey,
    },
  });

  if (response.error) {
    throw new Error("Failed to create backup storage");
  }

  await createBackupAuthKey({
    key,
    uuid,
  });

  return {
    uuid,
    pin,
  };
}
