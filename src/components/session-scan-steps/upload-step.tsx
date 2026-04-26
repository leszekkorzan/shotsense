import { ImagePlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSessionFromImage } from "@/lib/db-helpers";

type UploadStepProps = {
  onSessionCreated: (id: number) => void;
};

export function UploadStep({ onSessionCreated }: UploadStepProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = async (file: File | null) => {
    if (!file || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const id = await createSessionFromImage(file);

      onSessionCreated(id);
    } catch (error: unknown) {
      console.error("Error during file selection", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border border-dashed bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background shadow-xs">
          <ImagePlusIcon />
        </span>
        <p className="font-medium text-sm">Dodaj zdjecie tarczy</p>
      </div>

      <input
        accept="image/*"
        className="sr-only"
        id="scan-file-input"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          handleFileChange(file).catch((error: unknown) => {
            console.error("Error during file selection", error);
          });
        }}
        type="file"
      />

      <Button asChild disabled={isSaving}>
        <label className="cursor-pointer" htmlFor="scan-file-input">
          Wybierz zdjecie
        </label>
      </Button>
    </div>
  );
}
