import { useRegisterSW } from "virtual:pwa-register/react";
import { CircleFadingArrowUp, CloudCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingButton from "./components/common/LoadingButton";
import { Button } from "./components/ui/button";

function PWA() {
  const period = 60 * 60 * 1000; // 1h
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toastRef = useRef<string | number | undefined>(undefined);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (period <= 0) {
        return;
      }
      if (r?.active?.state === "activated") {
        registerPeriodicSync(period, swUrl, r);
      } else if (r?.installing) {
        toastRef.current = toast.loading("Wczytywanie aplikacji...", {
          id: toastRef.current,
        });

        r.installing.addEventListener("statechange", (e) => {
          const sw = e.target as ServiceWorker;
          if (sw.state === "activated") {
            toast.dismiss(toastRef.current);
            registerPeriodicSync(period, swUrl, r);
          }
        });
      }
    },
  });

  function close() {
    setOfflineReady(false);
    setNeedRefresh(false);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    updateServiceWorker(true);
  }

  return (
    <AlertDialog open={offlineReady || needRefresh}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            {offlineReady ? <CloudCheck /> : <CircleFadingArrowUp />}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {offlineReady
              ? "Aplikacja jest gotowa do pracy offline"
              : "Dostępna jest nowa wersja"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {offlineReady
              ? "Możesz teraz korzystać z aplikacji bez połączenia z internetem."
              : "Kliknij przycisk odśwież, aby załadować nową wersję aplikacji."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={close} variant="outline">
            Zamknij
          </Button>
          {needRefresh && (
            <LoadingButton loading={isRefreshing} onClick={handleRefresh}>
              Odśwież
            </LoadingButton>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default PWA;

function registerPeriodicSync(
  period: number,
  swUrl: string,
  r: ServiceWorkerRegistration
) {
  if (period <= 0) {
    return;
  }

  setInterval(async () => {
    if ("onLine" in navigator && !navigator.onLine) {
      return;
    }

    const resp = await fetch(swUrl, {
      cache: "no-store",
      headers: {
        cache: "no-store",
        "cache-control": "no-cache",
      },
    });

    if (resp?.status === 200) {
      await r.update();
    }
  }, period);
}
