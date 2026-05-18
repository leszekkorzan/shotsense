import { proxy } from "comlink";
import {
  CloudUpload,
  Download,
  LockKeyhole,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/contexts/DialogProvider";
import { backupApiClient } from "@/lib/api/api-client";
import {
  deleteEncryptionKey,
  getBackupAuthKey,
  loadEncryptionKey,
  saveEncryptionKey,
} from "@/lib/db/config-db";
import { dataSyncWorker } from "@/workers";
import LoadingButton from "../common/LoadingButton";
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
import { Progress } from "../ui/progress";

type ExportState = "idle" | "exporting";
type ImportState = "idle" | "importing";
type EncryptionKeyState = "loading" | "ready";
type ImportPasswordDialogState = "closed" | "open";

export default function ExportSettings({
  handleSwitchToInfoTab,
}: {
  handleSwitchToInfoTab: () => void;
}) {
  const confirm = useConfirm();
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [importState, setImportState] = useState<ImportState>("idle");
  const [isLoadingBackupAuthKey, setIsLoadingBackupAuthKey] = useState(true);
  const [backupAuthKey, setBackupAuthKey] = useState<{
    id: string;
    key: string;
    uuid: string;
  } | null>(null);
  const [isOnlineBackuping, setIsOnlineBackuping] = useState(false);
  const [encryptionKeyState, setEncryptionKeyState] =
    useState<EncryptionKeyState>("loading");
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isEncryptionDialogOpen, setIsEncryptionDialogOpen] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [encryptionPasswordConfirmation, setEncryptionPasswordConfirmation] =
    useState("");
  const [isSavingEncryptionKey, setIsSavingEncryptionKey] = useState(false);
  const [isDeletingEncryptionKey, setIsDeletingEncryptionKey] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [backups, setBackups] = useState<
    {
      key: string;
      lastModified?: string;
      size?: number;
      etag?: string;
    }[]
  >([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [importPasswordDialogState, setImportPasswordDialogState] =
    useState<ImportPasswordDialogState>("closed");
  const [importPassword, setImportPassword] = useState("");
  const [importPasswordMessage, setImportPasswordMessage] = useState("");
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const makeProgressCallback = (set: (n: number) => void) =>
    proxy(
      (progress: {
        totalTables: number;
        completedTables: number;
        totalRows: number | undefined;
        completedRows: number;
        done: boolean;
      }) => {
        const percent =
          progress.totalRows && progress.totalRows > 0
            ? Math.round((progress.completedRows / progress.totalRows) * 100)
            : 0;
        set(percent);
        return true;
      }
    );

  const formatSize = (size?: number) => {
    if (size == null) {
      return "-";
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  useEffect(() => {
    let cancelled = false;

    async function loadBackupAuthKey() {
      try {
        const keyRecord = await getBackupAuthKey();

        if (!cancelled) {
          setBackupAuthKey(keyRecord);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBackupAuthKey(false);
        }
      }
    }

    loadBackupAuthKey().catch(() => {
      if (!cancelled) {
        setIsLoadingBackupAuthKey(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!backupAuthKey) {
      return;
    }

    let cancelled = false;

    async function fetchBackups() {
      setIsLoadingBackups(true);
      try {
        const resp = await backupApiClient.GET("/api/backup/get-backups");
        if (cancelled) {
          return;
        }
        setBackups(resp.data?.backups ?? []);
      } catch (error) {
        console.error("Fetch backups error:", error);
        toast.error("Nie udało się pobrać listy kopii zapasowych.");
      } finally {
        if (!cancelled) {
          setIsLoadingBackups(false);
        }
      }
    }

    fetchBackups();

    return () => {
      cancelled = true;
    };
  }, [backupAuthKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredEncryptionKey() {
      const keyRecord = await loadEncryptionKey();

      if (cancelled) {
        return;
      }

      setEncryptionKey(keyRecord?.cryptoKey ?? null);
      setEncryptionKeyState("ready");
    }

    loadStoredEncryptionKey().catch(() => {
      if (!cancelled) {
        setEncryptionKeyState("ready");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasEncryptionKey = Boolean(encryptionKey);
  let encryptionStatusMessage =
    "Nie ustawiono hasła. Pobrane kopie nie będą szyfrowane.";

  if (encryptionKeyState === "loading") {
    encryptionStatusMessage = "Sprawdzanie ustawień szyfrowania...";
  } else if (hasEncryptionKey) {
    encryptionStatusMessage =
      "Klucz szyfrowania jest zapisany lokalnie w przeglądarce. Pobierane kopie zapasowe będą szyfrowane.";
  }

  const openEncryptionDialog = () => {
    setEncryptionPassword("");
    setEncryptionPasswordConfirmation("");
    setIsEncryptionDialogOpen(true);
  };

  const closeEncryptionDialog = () => {
    setIsEncryptionDialogOpen(false);
    setEncryptionPassword("");
    setEncryptionPasswordConfirmation("");
  };

  const handleEncryptionKeySave = async () => {
    if (!encryptionPassword.trim()) {
      toast.error("Podaj hasło do szyfrowania kopii zapasowej.");
      return;
    }

    if (encryptionPassword !== encryptionPasswordConfirmation) {
      toast.error("Hasła nie są takie same.");
      return;
    }

    setIsSavingEncryptionKey(true);

    try {
      const { key, salt } =
        await dataSyncWorker.deriveBackupEncryptionKey(encryptionPassword);

      await saveEncryptionKey({
        cryptoKey: key,
        saltData: salt,
      });

      setEncryptionKey(key);
      toast.success("Hasło szyfrowania zostało zapisane.");
      closeEncryptionDialog();
    } catch (error) {
      console.error("Encryption key save error:", error);
      toast.error("Nie udało się zapisać hasła szyfrowania.");
    } finally {
      setIsSavingEncryptionKey(false);
    }
  };

  const handleEncryptionKeyDelete = async () => {
    const confirmed = await confirm({
      description: "Czy na pewno chcesz usunąć klucz szyfrowania?",
      confirmVariant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setIsDeletingEncryptionKey(true);

    try {
      await deleteEncryptionKey();
      setEncryptionKey(null);
      toast.success("Klucz szyfrowania został usunięty.");
    } catch (error) {
      console.error("Encryption key delete error:", error);
      toast.error("Nie udało się usunąć klucza szyfrowania.");
    } finally {
      setIsDeletingEncryptionKey(false);
    }
  };

  const handleExport = async () => {
    setExportState("exporting");
    try {
      const progressCallback = makeProgressCallback(setExportProgress);

      const blob = await dataSyncWorker.exportDatabase(progressCallback);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shotsense-backup-${new Date().toISOString()}.ssbk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Dane zostały wyeksportowane pomyślnie!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Błąd podczas eksportu danych.");
    } finally {
      setExportState("idle");
      setExportProgress(0);
    }
  };

  const handleOnlineExport = async () => {
    if (!backupAuthKey) {
      toast.error("Najpierw skonfiguruj połączenie z bucketem.");
      return;
    }

    setExportState("exporting");
    setIsOnlineBackuping(true);

    try {
      const backupObjectHash = crypto.randomUUID().replaceAll("-", "");
      const uploadUrlResponse = await backupApiClient.POST(
        "/api/backup/generate-upload-url",
        {
          body: {
            hash: backupObjectHash,
          },
        }
      );

      const uploadUrl = uploadUrlResponse.data?.uploadUrl;

      if (!uploadUrl) {
        throw new Error("Missing upload URL response");
      }

      const progressCallback = makeProgressCallback(setExportProgress);

      const blob = await dataSyncWorker.exportDatabase(progressCallback);

      const uploadResponse = await fetch(uploadUrl, {
        body: blob,
        method: "PUT",
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      toast.success("Kopia zapasowa online została wysłana pomyślnie.");
      try {
        const resp = await backupApiClient.GET("/api/backup/get-backups");
        setBackups(resp.data?.backups ?? []);
      } catch (err) {
        console.error("Refresh backups after upload failed:", err);
      }
    } catch (error) {
      console.error("Online export error:", error);
      toast.error("Nie udało się wysłać kopii zapasowej online.");
    } finally {
      setExportState("idle");
      setExportProgress(0);
      setIsOnlineBackuping(false);
    }
  };

  const handleRestore = async (key: string) => {
    const confirmed = await confirm({
      description:
        "Czy chcesz przywrócić tę kopię zapasową? Obecne dane zostaną zastąpione.",
      confirmVariant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    try {
      const resp = await backupApiClient.POST(
        "/api/backup/generate-download-url",
        {
          body: { key },
        }
      );

      const downloadUrl = resp.data?.downloadUrl;

      if (!downloadUrl) {
        throw new Error("Missing download URL");
      }

      const dlResp = await fetch(downloadUrl);
      if (!dlResp.ok) {
        throw new Error(`Download failed: ${dlResp.status}`);
      }

      const blob = await dlResp.blob();
      const safeName = `${key.replace(/[^a-z0-9._-]/gi, "_")}.ssbk`;
      const file = new File([blob], safeName, {
        type: "application/octet-stream",
      });

      await runImport(file);
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Nie udało się pobrać i przywrócić kopii zapasowej.");
    }
  };

  const handleDeleteBackup = async (key: string) => {
    const confirmed = await confirm({
      description: "Czy na pewno chcesz usunąć tę kopię zapasową?",
      confirmVariant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setDeletingKey(key);

    try {
      const resp = await backupApiClient.DELETE("/api/backup/delete-backup", {
        body: { key },
      });

      if (resp.data?.success) {
        toast.success("Kopia zapasowa została usunięta.");
        const r = await backupApiClient.GET("/api/backup/get-backups");
        setBackups(r.data?.backups ?? []);
      } else {
        toast.error("Usuwanie kopii zapasowej nie powiodło się.");
      }
    } catch (error) {
      console.error("Delete backup error:", error);
      toast.error("Nie udało się usunąć kopii zapasowej.");
    } finally {
      setDeletingKey(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const closeImportPasswordDialog = () => {
    setImportPasswordDialogState("closed");
    setImportPassword("");
    setImportPasswordMessage("");
  };

  const runImport = async (file: File, password?: string) => {
    setImportState("importing");
    try {
      const progressCallback = proxy(
        (progress: {
          totalTables: number;
          completedTables: number;
          totalRows: number | undefined;
          completedRows: number;
          done: boolean;
        }) => {
          const percent =
            progress.totalRows && progress.totalRows > 0
              ? Math.round((progress.completedRows / progress.totalRows) * 100)
              : 0;
          setImportProgress(percent);
          return true;
        }
      );

      const result = await dataSyncWorker.importDatabase(
        file,
        progressCallback,
        password
      );

      if (result.status === "password-required") {
        setPendingImportFile(file);
        setImportPasswordMessage(result.message);
        setImportPasswordDialogState("open");
        return;
      }

      if (result.status === "password-invalid") {
        setPendingImportFile(file);
        setImportPasswordMessage(result.message);
        setImportPasswordDialogState("open");
        toast.error(result.message);
        return;
      }

      toast.success("Dane zostały zaimportowane pomyślnie!");
      handleSwitchToInfoTab();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Błąd podczas importu danych.");
    } finally {
      setImportState("idle");
      setImportProgress(0);
    }
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const confirmed = await confirm({
      description:
        "Czy chcesz zaimportować dane z tego pliku? Obecne dane zostaną zastąpione.",
      confirmVariant: "default",
    });

    if (!confirmed) {
      event.target.value = "";
      return;
    }

    await runImport(file);
    event.target.value = "";
  };

  const handleImportPasswordSubmit = async () => {
    if (!pendingImportFile) {
      closeImportPasswordDialog();
      return;
    }

    if (!importPassword.trim()) {
      toast.error("Podaj hasło do odszyfrowania kopii.");
      return;
    }

    const file = pendingImportFile;
    setPendingImportFile(null);
    closeImportPasswordDialog();
    await runImport(file, importPassword);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Eksportuj dane</CardTitle>
          <CardDescription>
            Pobierz kopię zapasową wszystkich danych na Twoim urządzeniu
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {exportState === "exporting" && (
            <div className="flex flex-col gap-2">
              <Progress value={exportProgress} />
              <div className="text-center text-muted-foreground text-xs">
                {exportProgress}%
              </div>
            </div>
          )}
          <LoadingButton
            className="w-full"
            disabled={importState === "importing" || exportState !== "idle"}
            loading={exportState === "exporting" && !isOnlineBackuping}
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Pobierz kopię zapasową
          </LoadingButton>

          {!isLoadingBackupAuthKey && backupAuthKey ? (
            <LoadingButton
              disabled={importState === "importing" || exportState !== "idle"}
              loading={isOnlineBackuping}
              onClick={handleOnlineExport}
              variant="secondary"
            >
              <CloudUpload className="mr-2 h-4 w-4" />
              Zrób kopię zapasową online
            </LoadingButton>
          ) : null}
        </CardContent>
      </Card>

      {!isLoadingBackupAuthKey && backupAuthKey ? (
        <Card>
          <CardHeader>
            <CardTitle>Kopie zapasowe online</CardTitle>
            <CardDescription>
              Lista kopii zapasowych przechowywanych online.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isLoadingBackups && (
              <div className="text-muted-foreground">Ładowanie kopii...</div>
            )}

            {!isLoadingBackups && backups.length === 0 && (
              <div className="text-muted-foreground">
                Brak kopii zapasowych.
              </div>
            )}
            {!isLoadingBackups &&
              backups.length > 0 &&
              backups.map((b) => {
                const name = b.key.split("/").pop() ?? b.key;
                const modified = b.lastModified
                  ? new Date(b.lastModified).toLocaleString()
                  : "-";
                const size = formatSize(b.size);

                return (
                  <div
                    className="flex flex-col items-start justify-between gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
                    key={b.key}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="truncate font-medium">
                        ...{name.slice(-20)}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {modified} · {size}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <LoadingButton
                        className="w-full sm:w-auto"
                        disabled={
                          importState === "importing" || Boolean(deletingKey)
                        }
                        loading={importState === "importing"}
                        onClick={() => handleRestore(b.key)}
                        variant="secondary"
                      >
                        Przywróć
                      </LoadingButton>
                      <LoadingButton
                        className="w-full sm:w-auto"
                        disabled={
                          importState === "importing" || Boolean(deletingKey)
                        }
                        loading={deletingKey === b.key}
                        onClick={() => handleDeleteBackup(b.key)}
                        variant="destructive"
                      >
                        Usuń
                      </LoadingButton>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Importuj dane</CardTitle>
          <CardDescription>
            Przywróć dane z wcześniej utworzonej kopii zapasowej
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {importState === "importing" && (
            <div className="flex flex-col gap-2">
              <Progress value={importProgress} />
              <div className="text-center text-muted-foreground text-xs">
                {importProgress}%
              </div>
            </div>
          )}
          <input
            accept=".ssbk"
            className="hidden"
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />
          <LoadingButton
            className="w-full"
            disabled={exportState === "exporting"}
            loading={importState === "importing"}
            onClick={handleImportClick}
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Wczytaj kopię zapasową
          </LoadingButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Szyfrowanie kopii zapasowej</CardTitle>
              <CardDescription>
                Ustaw lokalne hasło do szyfrowania kopii zapasowych.
              </CardDescription>
            </div>
            {encryptionKeyState === "ready" && hasEncryptionKey && (
              <Badge className="shrink-0" variant="secondary">
                Aktywne
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-muted-foreground text-sm">
            <span>{encryptionStatusMessage}</span>
          </div>

          {hasEncryptionKey ? (
            <LoadingButton
              disabled={isDeletingEncryptionKey}
              loading={isDeletingEncryptionKey}
              onClick={handleEncryptionKeyDelete}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń klucz
            </LoadingButton>
          ) : (
            <LoadingButton onClick={openEncryptionDialog}>
              <LockKeyhole className="mr-2 h-4 w-4" />
              Ustaw hasło
            </LoadingButton>
          )}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeEncryptionDialog();
            return;
          }

          setIsEncryptionDialogOpen(true);
        }}
        open={isEncryptionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ustaw hasło szyfrowania</DialogTitle>
            <DialogDescription>
              Na bazie podanego hasła zostanie wygenerowany klucz AES-GCM, który
              będzie używany do szyfrowania kopii zapasowych.{" "}
              <span className="text-destructive">
                Jeśli zapomnisz hasła, nie będziesz mógł odszyfrować wcześniej
                pobranych kopii zapasowych.
              </span>
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-encryption-password">
                  Hasło
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="backup-encryption-password"
                  onChange={(event) =>
                    setEncryptionPassword(event.target.value)
                  }
                  placeholder="Wpisz hasło"
                  type="password"
                  value={encryptionPassword}
                />
                <FieldDescription>
                  To hasło nie jest zapisywane wprost, tylko jako klucz
                  kryptograficzny.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-encryption-password-confirmation">
                  Powtórz hasło
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="backup-encryption-password-confirmation"
                  onChange={(event) =>
                    setEncryptionPasswordConfirmation(event.target.value)
                  }
                  placeholder="Powtórz hasło"
                  type="password"
                  value={encryptionPasswordConfirmation}
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <LoadingButton
              onClick={closeEncryptionDialog}
              type="button"
              variant="outline"
            >
              Anuluj
            </LoadingButton>
            <LoadingButton
              loading={isSavingEncryptionKey}
              onClick={handleEncryptionKeySave}
              type="button"
            >
              Zapisz hasło
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeImportPasswordDialog();
            return;
          }

          setImportPasswordDialogState("open");
        }}
        open={importPasswordDialogState === "open"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Podaj hasło do kopii</DialogTitle>
            <DialogDescription>
              {importPasswordMessage ||
                "Ta kopia zapasowa jest zaszyfrowana. Podaj hasło, aby ją odszyfrować."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="backup-import-password">Hasło</FieldLabel>
                <Input
                  autoComplete="current-password"
                  id="backup-import-password"
                  onChange={(event) => setImportPassword(event.target.value)}
                  placeholder="Wpisz hasło"
                  type="password"
                  value={importPassword}
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <LoadingButton
              onClick={closeImportPasswordDialog}
              type="button"
              variant="outline"
            >
              Anuluj
            </LoadingButton>
            <LoadingButton onClick={handleImportPasswordSubmit} type="button">
              Odszyfruj i importuj
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
