import { Crosshair } from "lucide-react";
import { useState } from "react";
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
import InfoSettings from "./settings/Info";
import { Badge } from "./ui/badge";

const STEPS = {
  WELCOME: 0,
  SUMMARY: 1,
};

export default function Onboarding() {
  const [isOpen, setIsOpen] = useState(true);

  const [step, setStep] = useState(0);

  const setup = () => {
    setStep(STEPS.SUMMARY);
    window.localStorage.setItem("allowWorkerRegistration", "true");
    sendBrowserEvent("app:allow-worker-registration");
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
            </div>
          </DialogHeader>

          <DialogFooter className="mt-6 sm:justify-center">
            {step === STEPS.WELCOME && (
              <Button className="min-w-32" onClick={setup}>
                Zaczynamy
              </Button>
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
