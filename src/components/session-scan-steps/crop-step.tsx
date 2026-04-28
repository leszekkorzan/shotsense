import { Edit2Icon, TargetIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PerspectiveCrop, type Point } from "@/components/PerspectiveCrop";
import { Button } from "@/components/ui/button";
import type { SessionStatus } from "@/lib/db";
import { advanceSessionToMark } from "@/lib/db-helpers";
import {
  TARGET_TEMPLATES,
  type TargetTemplate,
} from "@/lib/targets/target-templates";
import { mlWorker, openCvWorker } from "@/workers";
import { TargetAlignmentStep } from "./target-alignment-step";

type BoundingBox = [number, number, number, number];

type CropStepProps = {
  imageBlob: Blob | null;
  imageUrl: string | null;
  initialTargetTemplate?: string;
  sessionId?: number;
  sessionStatus?: SessionStatus;
};

async function blobToImageData(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error(
        "Failed to create canvas context for ImageData extraction"
      );
    }

    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create canvas context for blob conversion");
  }

  context.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", 0.95);
  });

  if (!blob) {
    throw new Error("Failed to convert transformed image to blob");
  }

  return blob;
}

export function CropStep({
  imageBlob,
  imageUrl,
  initialTargetTemplate,
  sessionId,
  sessionStatus,
}: CropStepProps) {
  const [step, setStep] = useState<"select" | "crop" | "adjust">(
    initialTargetTemplate ? "crop" : "select"
  );
  const [selectedTargetTemplate, setSelectedTargetTemplate] = useState(
    initialTargetTemplate ?? ""
  );
  const [loadedTemplate, setLoadedTemplate] = useState<TargetTemplate | null>(
    null
  );
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [detectedBoundingBox, setDetectedBoundingBox] =
    useState<BoundingBox | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const imageBlobKey = imageBlob
    ? `${imageBlob.size}:${imageBlob.type}`
    : "none";

  useEffect(() => {
    setSelectedTargetTemplate(initialTargetTemplate ?? "");
    setStep(initialTargetTemplate ? "crop" : "select");
    setPreviewBlob(null);
    setLoadedTemplate(null);
  }, [initialTargetTemplate]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedTargetTemplate) {
      setLoadedTemplate(null);
      return;
    }

    const option = TARGET_TEMPLATES.find(
      (template) => template.id === selectedTargetTemplate
    );

    if (!option) {
      setLoadedTemplate(null);
      return;
    }

    option
      .getTemplate()
      .then((template) => {
        if (!cancelled) {
          setLoadedTemplate(template);
        }
      })
      .catch((error: unknown) => {
        console.error("Nie udalo sie zaladowac szablonu tarczy", error);

        if (!cancelled) {
          setLoadedTemplate(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTargetTemplate]);

  useEffect(() => {
    if (selectedTargetTemplate && step !== "adjust") {
      setStep("crop");
    }
  }, [selectedTargetTemplate, step]);

  useEffect(() => {
    if (!previewBlob) {
      setPreviewImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(previewBlob);
    setPreviewImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewBlob]);

  useEffect(() => {
    if (imageBlobKey) {
      setDetectedBoundingBox(null);
    }
  }, [imageBlobKey]);

  const selectedTemplate = TARGET_TEMPLATES.find(
    (template) => template.id === selectedTargetTemplate
  );

  const handlePerspectiveConfirm = async (points: Point[]) => {
    if (sessionId === undefined || sessionStatus !== "TO_CROP" || isSaving) {
      return;
    }

    if (!selectedTargetTemplate) {
      return;
    }

    setIsSaving(true);

    try {
      if (!imageBlob) {
        throw new Error("Missing image blob for inference");
      }

      const template = await selectedTemplate?.getTemplate();

      if (!template) {
        throw new Error("Missing target template definition");
      }

      const sourceImageData = await blobToImageData(imageBlob);
      const warpedImageData = await openCvWorker.warpAndCropTarget(
        sourceImageData,
        points,
        template,
        1000
      );
      const warpedImageBlob = await imageDataToBlob(warpedImageData);

      setPreviewBlob(warpedImageBlob);
      setStep("adjust");
    } catch (error: unknown) {
      console.error("Nie udalo sie zapisac kadru", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetect = async () => {
    if (!imageBlob || isDetecting || isSaving) {
      return;
    }

    setIsDetecting(true);

    try {
      const detection = await mlWorker.detectBlackContour(imageBlob);
      if (detection) {
        setDetectedBoundingBox(detection.bbox);
      } else {
        setDetectedBoundingBox(null);
      }
    } catch (error: unknown) {
      console.error("Nie udało się wykryć tarczy", error);
      setDetectedBoundingBox(null);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFinalConfirm = async (alignedBlob: Blob) => {
    if (sessionId === undefined || sessionStatus !== "TO_CROP" || isSaving) {
      return;
    }

    if (!selectedTargetTemplate) {
      return;
    }

    setIsSaving(true);

    try {
      await advanceSessionToMark(
        sessionId,
        selectedTargetTemplate,
        alignedBlob
      );
    } catch (error: unknown) {
      console.error("Nie udalo sie zapisac dopasowanej tarczy", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToCrop = () => {
    setPreviewBlob(null);
    setStep("crop");
  };

  const alignmentPreview =
    step === "adjust" && previewBlob && previewImageUrl && loadedTemplate
      ? {
          blob: previewBlob,
          template: loadedTemplate,
          url: previewImageUrl,
        }
      : null;

  return (
    <>
      {step === "select" || !selectedTemplate ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <TargetIcon />
            <p className="font-medium text-sm">Wybierz tarczę</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {TARGET_TEMPLATES.map((template) => (
              <button
                className="flex w-full flex-col items-start gap-1 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition hover:bg-muted/50"
                key={template.id}
                onClick={() => {
                  setSelectedTargetTemplate(template.id);
                  setStep("crop");
                }}
                type="button"
              >
                <span className="font-medium">{template.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TargetIcon />
              <p className="font-medium text-sm">{selectedTemplate.title}</p>
            </div>

            {step === "crop" && (
              <div className="flex items-center gap-2">
                <Button
                  className="h-auto px-0"
                  onClick={handleDetect}
                  size="xs"
                  type="button"
                  variant="link"
                >
                  {isDetecting ? "Wykrywanie..." : "Wykryj tarczę"}
                </Button>

                <Button
                  className=""
                  onClick={() => setSelectedTargetTemplate("")}
                  size="icon-lg"
                  type="button"
                  variant="ghost"
                >
                  <Edit2Icon />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "crop" && selectedTemplate && imageUrl ? (
        <div className="relative">
          <PerspectiveCrop
            confirmLabel="Przygotuj podgląd"
            imageUrl={imageUrl}
            initialBoundingBox={detectedBoundingBox}
            isAutoDetecting={isDetecting || isSaving}
            isLoading={isSaving}
            onConfirm={(points) => {
              handlePerspectiveConfirm(points).catch((error: unknown) => {
                console.error("Nie udalo sie przygotowac podgladu", error);
              });
            }}
          />
        </div>
      ) : null}

      {alignmentPreview ? (
        <TargetAlignmentStep
          imageBlob={alignmentPreview.blob}
          imageUrl={alignmentPreview.url}
          onBack={handleBackToCrop}
          onConfirm={async (alignedBlob) => {
            await handleFinalConfirm(alignedBlob);
          }}
          template={alignmentPreview.template}
        />
      ) : null}
    </>
  );
}
