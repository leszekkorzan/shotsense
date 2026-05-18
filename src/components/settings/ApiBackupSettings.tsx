import { Scanner } from "@yudiel/react-qr-scanner";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import LoadingButton from "@/components/common/LoadingButton";
import { useConfirm } from "@/components/contexts/DialogProvider";
import { backupApiClient } from "@/lib/api/api-client";
import { createApiBackupStorage } from "@/lib/api/create-storage";
import {
  createBackupAuthKey,
  deleteBackupAuthKey,
  getBackupAuthKey,
} from "@/lib/db/config-db";
import { hmacSha256 } from "@/lib/hash-utils";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";

type ModalState = "closed" | "connect" | "create" | "show";

type BackupAuthKeyState = {
  id: string;
  key: string;
  uuid: string;
} | null;

const FOUR_DIGIT_PIN_REGEX = /^\d{4}$/;

function isFourDigitPin(pin: string) {
  return FOUR_DIGIT_PIN_REGEX.test(pin);
}

export default function ApiBackupSettings() {
  const confirm = useConfirm();
  const [isLoadingAuthKey, setIsLoadingAuthKey] = useState(true);
  const [backupAuthKey, setBackupAuthKey] = useState<BackupAuthKeyState>(null);
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [connectUuid, setConnectUuid] = useState("");
  const [connectPin, setConnectPin] = useState("");
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [createPin, setCreatePin] = useState("");
  const [createPinConfirmation, setCreatePinConfirmation] = useState("");
  const [createAdminKey, setCreateAdminKey] = useState("");
  const [isCreatingStorage, setIsCreatingStorage] = useState(false);
  const [isDeletingConnection, setIsDeletingConnection] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBackupAuthKey() {
      try {
        const key = await getBackupAuthKey();

        if (!cancelled) {
          setBackupAuthKey(key);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAuthKey(false);
        }
      }
    }

    loadBackupAuthKey().catch(() => {
      if (!cancelled) {
        setIsLoadingAuthKey(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasBackupAuthKey = Boolean(backupAuthKey);
  let authKeyStatusMessage =
    "Nie masz jeszcze zapisanego połączenia z bucketem. Możesz połączyć istniejący bucket albo utworzyć nowy storage online.";

  if (isLoadingAuthKey) {
    authKeyStatusMessage = "Sprawdzanie zapisanych danych połączenia...";
  } else if (hasBackupAuthKey) {
    authKeyStatusMessage =
      "Połączenie z bucketem jest zapisane lokalnie. Możesz podejrzeć UUID albo usunąć połączenie.";
  }

  const closeModal = () => {
    setModalState("closed");
    setConnectUuid("");
    setConnectPin("");
    setIsQrScannerOpen(false);
    setCreatePin("");
    setCreatePinConfirmation("");
    setCreateAdminKey("");
  };

  const openConnectModal = () => {
    setConnectUuid("");
    setConnectPin("");
    setIsQrScannerOpen(false);
    setModalState("connect");
  };

  const openCreateModal = () => {
    setCreatePin("");
    setCreatePinConfirmation("");
    setCreateAdminKey("");
    setModalState("create");
  };

  const openShowModal = () => {
    setModalState("show");
  };

  const handleConnectToBucket = async () => {
    if (!isFourDigitPin(connectPin)) {
      toast.error("Pin musi składać się dokładnie z 4 cyfr.");
      return;
    }

    if (!connectUuid.trim()) {
      toast.error("Podaj uuid bucketu.");
      return;
    }

    const normalizedUuid = connectUuid.trim().toUpperCase();
    const backupKey = await hmacSha256(normalizedUuid, connectPin);

    setIsConnecting(true);
    try {
      const response = await backupApiClient.POST("/api/validate-key", {
        body: {
          backupToken: backupKey,
        },
      });

      if (response.error) {
        throw new Error("invalid backup key");
      }

      await createBackupAuthKey({
        key: backupKey,
        uuid: normalizedUuid,
      });

      setBackupAuthKey({
        id: "backup_auth_key",
        key: backupKey,
        uuid: normalizedUuid,
      });
      toast.success("Połączenie z bucketem zostało zapisane.");
      closeModal();
    } catch (error) {
      console.error("Backup connection validation error:", error);
      toast.error("Nie udało się zweryfikować połączenia z bucketem.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateStorage = async () => {
    if (!isFourDigitPin(createPin)) {
      toast.error("Pin musi składać się dokładnie z 4 cyfr.");
      return;
    }

    if (createPin !== createPinConfirmation) {
      toast.error("Piny nie są takie same.");
      return;
    }

    if (!createAdminKey.trim()) {
      toast.error("Klucz administracyjny nie może być pusty.");
      return;
    }

    setIsCreatingStorage(true);
    try {
      await createApiBackupStorage({
        pin: createPin,
        creationKey: createAdminKey.trim(),
      });

      const createdKey = await getBackupAuthKey();
      setBackupAuthKey(createdKey);
      toast.success("Storage został utworzony.");
      setConnectUuid("");
      setConnectPin("");
      setCreatePin("");
      setCreatePinConfirmation("");
      setCreateAdminKey("");
      setModalState("show");
    } catch (error) {
      console.error("Backup storage creation error:", error);
      toast.error("Nie udało się utworzyć storage online.");
    } finally {
      setIsCreatingStorage(false);
    }
  };

  const handleDeleteConnection = async () => {
    const confirmed = await confirm({
      description: "Czy na pewno chcesz usunąć zapisane połączenie z bucketem?",
      confirmVariant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setIsDeletingConnection(true);
    try {
      await deleteBackupAuthKey();
      setBackupAuthKey(null);
      toast.success("Połączenie zostało usunięte.");
    } catch (error) {
      console.error("Backup connection delete error:", error);
      toast.error("Nie udało się usunąć połączenia z bucketem.");
    } finally {
      setIsDeletingConnection(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Backup online (BETA)</CardTitle>
              <CardDescription>
                Zarządzaj połączeniem z bucketem kopii zapasowych.
              </CardDescription>
            </div>
            {!isLoadingAuthKey && hasBackupAuthKey ? (
              <Badge variant="secondary">Aktywne</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-muted-foreground text-sm">
            {authKeyStatusMessage}
          </div>

          {hasBackupAuthKey ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <LoadingButton onClick={openShowModal}>Pokaż dane</LoadingButton>
              <LoadingButton
                loading={isDeletingConnection}
                onClick={handleDeleteConnection}
                variant="destructive"
              >
                Usuń połączenie
              </LoadingButton>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <LoadingButton onClick={openConnectModal}>
                Połącz z bucketem
              </LoadingButton>
              <LoadingButton onClick={openCreateModal}>
                Utwórz storage
              </LoadingButton>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
          }
        }}
        open={modalState === "connect"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Połącz z bucketem</DialogTitle>
            <DialogDescription>
              Podaj uuid bucketu i 4-cyfrowy pin. Aplikacja zweryfikuje klucz
              przez API, a następnie zapisze połączenie lokalnie.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldContent>
                <LoadingButton
                  onClick={() => setIsQrScannerOpen((previous) => !previous)}
                  type="button"
                  variant="outline"
                >
                  <QrCode />
                  {isQrScannerOpen ? "Wyłącz skaner" : "Skanuj kod QR"}
                </LoadingButton>
              </FieldContent>
            </Field>

            {isQrScannerOpen ? (
              <div className="overflow-hidden rounded-md border">
                <Scanner
                  classNames={{
                    container: "w-full",
                    video: "max-h-72 w-full object-cover",
                  }}
                  onError={(error) => {
                    console.error("QR scanner error:", error);
                    toast.error("Nie udało się uruchomić skanera QR.");
                  }}
                  onScan={(detectedCodes) => {
                    const detectedCode = detectedCodes[0]?.rawValue?.trim();

                    if (!detectedCode) {
                      return;
                    }

                    setConnectUuid(detectedCode);
                    setIsQrScannerOpen(false);
                    toast.success("Zeskanowano UUID bucketu.");
                  }}
                />
              </div>
            ) : null}

            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-bucket-uuid">
                  UUID bucketu
                </FieldLabel>
                <Input
                  id="backup-bucket-uuid"
                  onChange={(event) => setConnectUuid(event.target.value)}
                  placeholder="Wpisz UUID"
                  value={connectUuid}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-bucket-pin">Pin</FieldLabel>
                <Input
                  autoComplete="off"
                  id="backup-bucket-pin"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => setConnectPin(event.target.value)}
                  placeholder="0000"
                  type="password"
                  value={connectPin}
                />
                <FieldDescription>
                  Pin musi mieć dokładnie 4 cyfry.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <LoadingButton
              loading={isConnecting}
              onClick={handleConnectToBucket}
            >
              Połącz i zweryfikuj
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
          }
        }}
        open={modalState === "create"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Utwórz storage online</DialogTitle>
            <DialogDescription>
              Ustaw 4-cyfrowy pin i podaj alfanumeryczny klucz administracyjny
              do tworzenia bucketów. Pin trzeba potwierdzić dwa razy przed
              utworzeniem storage.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-create-pin">Pin</FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="backup-create-pin"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => setCreatePin(event.target.value)}
                  placeholder="0000"
                  type="password"
                  value={createPin}
                />
                <FieldDescription>
                  Pin musi zawierać dokładnie 4 cyfry.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-create-pin-confirmation">
                  Powtórz pin
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="backup-create-pin-confirmation"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) =>
                    setCreatePinConfirmation(event.target.value)
                  }
                  placeholder="0000"
                  type="password"
                  value={createPinConfirmation}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-create-admin-key">
                  Klucz administracyjny
                </FieldLabel>
                <Input
                  autoComplete="off"
                  id="backup-create-admin-key"
                  onChange={(event) => setCreateAdminKey(event.target.value)}
                  placeholder="Wpisz klucz administracyjny"
                  value={createAdminKey}
                />
                <FieldDescription>
                  Ten klucz służy do autoryzacji tworzenia bucketu.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <LoadingButton
              loading={isCreatingStorage}
              onClick={handleCreateStorage}
            >
              Utwórz storage
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
          }
        }}
        open={modalState === "show"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dane połączenia</DialogTitle>
            <DialogDescription>
              Zapisz ten UUID i zapamiętaj pin. Bez tych danych nie odzyskasz
              backupu ani połączenia z bucketem.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              UUID
            </div>
            <div className="mt-1 font-medium">
              {backupAuthKey?.uuid ?? "Brak danych"}
            </div>
            {backupAuthKey?.uuid && (
              <QRCodeSVG className="mx-auto mt-2" value={backupAuthKey.uuid} />
            )}
            <br />
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              PIN
            </div>
            <div className="mt-1 font-medium">****</div>
            <p className="text-[10px] text-muted-foreground italic">
              4 cyfrowy PIN, który podałeś podczas tworzenia bucketu
            </p>
          </div>

          <DialogFooter>
            <LoadingButton onClick={closeModal}>Zamknij</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
