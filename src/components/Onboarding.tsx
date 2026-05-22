import { Crosshair, Download, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendBrowserEvent } from "@/hooks/use-browser-events";
import InfoSettings, { getPWAInstalledState } from "./settings/Info";
import { Badge } from "./ui/badge";

const STEPS = {
  WELCOME: 0,
  INSTALL_PWA: 1,
  SUMMARY: 2,
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
};

const IOS_USER_AGENT_REGEX = /iphone|ipad|ipod/;

export default function Onboarding() {
  const [isOpen, setIsOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [installAccepted, setInstallAccepted] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const isIOSDevice = getIsIOSDevice();
  const canShowInstallPrompt = Boolean(installPromptEvent);
  let installStepState: "prompt" | "accepted" | "manual" = "manual";

  if (canShowInstallPrompt) {
    installStepState = "prompt";
  } else if (installAccepted) {
    installStepState = "accepted";
  }

  const setup = useCallback(() => {
    setStep(STEPS.SUMMARY);
    window.localStorage.setItem("allowWorkerRegistration", "true");
    sendBrowserEvent("app:allow-worker-registration");
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallAccepted(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const initAndCheckPWA = () => {
    const isPWAInstalled = getPWAInstalledState();

    if (isPWAInstalled) {
      setup();
    } else {
      setStep(STEPS.INSTALL_PWA);
    }
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) {
      console.warn("Install prompt event is not available");
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPromptEvent(null);
      setInstallAccepted(true);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="overflow-hidden border-border/60 bg-background p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="relative isolate overflow-hidden px-6 pt-7 pb-6">
          <div className="pointer-events-none absolute top-6 -right-10 size-28 rounded-full bg-primary/10 blur-3xl" />

          <DialogHeader className="relative gap-4 text-center">
            {step === STEPS.WELCOME && (
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-primary/10 shadow-sm">
                <Crosshair className="size-6" />
              </div>
            )}

            <div className="space-y-2">
              <DialogTitle className="text-2xl">Witamy w ShotSense</DialogTitle>
              {step === STEPS.WELCOME && (
                <>
                  <Badge>BETA</Badge>
                  <DialogDescription className="text-pretty text-sm leading-6">
                    Aplikacja PWA do zapisu i analizy trafień na tarczy z
                    wykorzystaniem AI. Działa offline.
                  </DialogDescription>
                  <p className="mt-8 text-center text-muted-foreground text-xs">
                    Powered by{" "}
                    <a
                      className="underline underline-offset-4"
                      href="https://webaily.com"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      &copy; webaily
                    </a>
                    .
                  </p>
                </>
              )}
              {step === STEPS.SUMMARY && (
                <>
                  <DialogDescription className="mb-3">
                    Sprawdź informacje poniżej. Te informacje są też dostępne w
                    ustawieniach.
                  </DialogDescription>
                  <InfoSettings hideHeader />
                </>
              )}
              {step === STEPS.INSTALL_PWA && (
                <div className="space-y-3 text-left">
                  <DialogDescription className="text-center text-sm leading-6">
                    Dla wygody i najlepszego działania offline zainstaluj
                    ShotSense jako aplikację PWA na twoim urządzeniu.
                  </DialogDescription>

                  {installStepState === "prompt" && (
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm leading-6">
                      Ta przeglądarka wspiera szybką instalację. Kliknij
                      przycisk instalacji poniżej.
                    </div>
                  )}
                  {installStepState === "accepted" && (
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm leading-6">
                      Instalacja została zaakceptowana. Przejdź teraz do
                      zainstalowanej aplikacji. Jeśli jesteś już w niej, kliknij
                      przycisk dalej.
                    </div>
                  )}
                  {installStepState === "manual" && (
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm leading-6">
                      {isIOSDevice ? (
                        <>
                          <p>Na iOS instalacja odbywa się ręcznie. W Safari:</p>
                          <ol className="mt-2 list-decimal space-y-1 pl-5">
                            <li>
                              Kliknij ikonę udostępniania{" "}
                              <Share2 className="mx-1 inline size-4" />
                            </li>
                            <li>Wybierz „Dodaj do ekranu początkowego”</li>
                            <li>Zatwierdź przyciskiem „Dodaj”</li>
                          </ol>
                        </>
                      ) : (
                        <p>
                          Ta przeglądarka nie udostępnia szybkiego okna
                          instalacji. Otwórz menu przeglądarki i wybierz opcję
                          „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <DialogFooter className="mt-6 sm:flex-col sm:justify-center">
            {step === STEPS.WELCOME && (
              <Button className="min-w-32" onClick={initAndCheckPWA}>
                Zaczynamy
              </Button>
            )}
            {step === STEPS.INSTALL_PWA && (
              <>
                {canShowInstallPrompt && !installAccepted && (
                  <Button className="min-w-32" onClick={handleInstallApp}>
                    <Download />
                    Zainstaluj aplikację
                  </Button>
                )}
                {installAccepted ? (
                  <Button className="min-w-32" onClick={setup}>
                    Dalej
                  </Button>
                ) : (
                  <Button
                    className="min-w-32"
                    onClick={setup}
                    variant="outline"
                  >
                    Przejdź dalej, zostaję w przeglądarce
                  </Button>
                )}
              </>
            )}
            {step === STEPS.SUMMARY && (
              <Button
                className="min-w-32"
                onClick={() => setIsOpen(false)}
                variant="outline"
              >
                Zamknij
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getIsIOSDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return IOS_USER_AGENT_REGEX.test(userAgent);
}
