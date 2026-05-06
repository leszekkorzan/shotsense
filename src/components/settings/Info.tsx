import {
  CircleCheck,
  CircleDashed,
  CircleOff,
  Download,
  HardDrive,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useBrowserEvent } from "@/hooks/use-browser-events";
import LoadingButton from "../common/LoadingButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "../ui/item";

type StorageEstimate = {
  quota?: number;
  usage?: number;
};

type StatusState = {
  offlineReady: boolean | null;
  installed: boolean | null;
  persisted: boolean | null;
  storageEstimate: StorageEstimate | null;
  storageSupported: boolean;
  isPersisting: boolean;
};

const initialState: StatusState = {
  offlineReady: null,
  installed: null,
  persisted: null,
  storageEstimate: null,
  storageSupported: true,
  isPersisting: false,
};

export default function InfoSettings() {
  const [status, setStatus] = useState<StatusState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      const storageSupported = Boolean(navigator.storage);

      const [persisted, estimate, offlineReady, installed] = await Promise.all([
        navigator.storage?.persisted?.(),
        navigator.storage?.estimate?.(),
        getOfflineReadyState(),
        getInstalledState(),
      ]);
      if (cancelled) {
        return;
      }

      setStatus((current) => ({
        ...current,
        offlineReady: offlineReady ?? false,
        installed: installed ?? false,
        persisted: persisted ?? null,
        storageEstimate: estimate ?? null,
        storageSupported,
      }));
    }

    loadStatus().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePersistStorage() {
    if (!navigator.storage?.persist) {
      toast.error("Ta przeglądarka nie obsługuje trwałej pamięci.");
      return;
    }

    setStatus((current) => ({ ...current, isPersisting: true }));

    try {
      const persisted = await navigator.storage.persist();
      const estimate = await navigator.storage.estimate();

      if (!persisted) {
        toast.error("Nie udało się włączyć trwałej pamięci.");
      }

      setStatus((current) => ({
        ...current,
        persisted,
        storageEstimate: estimate ?? current.storageEstimate,
        isPersisting: false,
      }));
    } catch {
      toast.error("Nie udało się włączyć trwałej pamięci.");
      setStatus((current) => ({ ...current, isPersisting: false }));
    }
  }

  const quota = formatBytes(status.storageEstimate?.quota);
  const usage = formatBytes(status.storageEstimate?.usage);
  const usagePercent =
    status.storageEstimate?.quota && status.storageEstimate.usage !== undefined
      ? Math.min(
          100,
          Math.round(
            (status.storageEstimate.usage / status.storageEstimate.quota) * 100
          )
        )
      : null;

  useBrowserEvent("app:pwa-offline-ready", () => {
    setStatus((current) => ({ ...current, offlineReady: true }));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informacje</CardTitle>
        <CardDescription>Stan aplikacji PWA</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          <Item
            className={getWarningItemClassName(status.offlineReady === false)}
            variant="outline"
          >
            <ItemMedia variant="icon">
              {status.offlineReady ? <CircleCheck /> : <WifiOff />}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Gotowa do pracy offline</ItemTitle>
              <ItemDescription>
                {renderBooleanState(
                  status.offlineReady,
                  "Aplikacja jest gotowa do pracy offline.",
                  "Aplikacja nie jest jeszcze gotowa do pracy offline."
                )}
              </ItemDescription>
            </ItemContent>
          </Item>

          <Item
            className={getWarningItemClassName(status.installed === false)}
            variant="outline"
          >
            <ItemMedia variant="icon">
              {status.installed ? <Smartphone /> : <CircleDashed />}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Zainstalowana jako PWA</ItemTitle>
              <ItemDescription>
                {renderBooleanState(
                  status.installed,
                  "Aplikacja jest prawidłowo zainstalowana jako PWA.",
                  "Aplikacja działa w przeglądarce. Zainstaluj aplikację na swoim urządzeniu."
                )}
              </ItemDescription>
            </ItemContent>
          </Item>

          <Item
            className={getWarningItemClassName(status.persisted === false)}
            variant="outline"
          >
            <ItemMedia variant="icon">
              {status.persisted ? <ShieldCheck /> : <CircleOff />}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Trwała pamięć przeglądarki</ItemTitle>
              <ItemDescription>
                {getPersistedMessage(status.persisted)}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {status.storageSupported && !status.persisted && (
                <LoadingButton
                  loading={status.isPersisting}
                  onClick={handlePersistStorage}
                  variant="outline"
                >
                  <Download />
                  Włącz
                </LoadingButton>
              )}
            </ItemActions>
          </Item>

          <Item
            className={getWarningItemClassName(
              usagePercent !== null && usagePercent > 95
            )}
            variant="outline"
          >
            <ItemMedia variant="icon">
              <HardDrive />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Zużycie i limit pamięci</ItemTitle>
              <ItemDescription>
                {getStorageMessage(
                  status.storageSupported,
                  usage,
                  quota,
                  usagePercent
                )}
              </ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

function renderBooleanState(
  value: boolean | null,
  trueText: string,
  falseText: string
) {
  if (value === null) {
    return "Stan jeszcze nie został ustalony.";
  }

  return value ? trueText : falseText;
}

async function getOfflineReadyState() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();

    return Boolean(
      registration?.active &&
        (navigator.serviceWorker.controller ||
          registration.active.state === "activated")
    );
  }

  return false;
}

function getInstalledState() {
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  if ("standalone" in navigator) {
    return Boolean(
      (navigator as Navigator & { standalone?: boolean }).standalone
    );
  }

  return false;
}

function getPersistedMessage(value: boolean | null) {
  if (value === null) {
    return "Przeglądarka nie udostępnia tej informacji.";
  }

  if (value) {
    return "Pamięć jest prawidłowo oznaczona jako persisted.";
  }

  return "Pamięć nie jest obecnie oznaczona jako persisted.";
}

function getStorageMessage(
  supported: boolean,
  usage: string,
  quota: string,
  usagePercent: number | null
) {
  if (!supported) {
    return "Navigator.storage nie jest dostępne w tej przeglądarce.";
  }

  if (usagePercent === null) {
    return "Brak danych o limitach pamięci z tej przeglądarki.";
  }

  return `${usage} z ${quota} (${usagePercent}%).`;
}

function formatBytes(value?: number) {
  if (value === undefined) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  let digits = 2;

  if (size >= 100 || unitIndex === 0) {
    digits = 0;
  } else if (size >= 10) {
    digits = 1;
  }

  return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

function getWarningItemClassName(isWarning: boolean) {
  return isWarning ? "border-orange-200 bg-orange-50/80 text-orange-950" : "";
}
