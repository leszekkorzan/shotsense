import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/types/api-types";
import { getBackupAuthKey } from "../db/config-db";

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const backupAuthKey = await getBackupAuthKey();
    if (!backupAuthKey) {
      return request;
    }
    request.headers.set("Authorization", `Bearer ${backupAuthKey.key}`);
    return request;
  },
};

export const backupApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_BACKEND_URL,
});

backupApiClient.use(authMiddleware);
