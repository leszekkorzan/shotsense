import { useDrag } from "@use-gesture/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  MoveIcon,
  RotateCcw,
  RotateCcwIcon,
  RotateCcwSquare,
  RotateCw,
  RotateCwSquare,
  VectorSquareIcon,
} from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import TargetOverlay from "@/components/common/TargetOverlay";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TargetTemplate } from "@/lib/targets/target-templates";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type PointOffset = {
  x: number;
  y: number;
};

type TargetAlignmentStepProps = {
  imageBlob: Blob;
  imageUrl: string;
  template: TargetTemplate;
  onBack: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
};

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.2;
const AXIS_STEP = 0.005;
const MOVE_STEP = 0.005;
const ROTATE_STEP = 0.5;
const QUARTER_TURN = 90;
const OVERLAY_BUTTON_BASE_STYLE = {
  position: "absolute",
  zIndex: 30,
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 9999,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(0,0,0,0.7)",
  color: "#fff",
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function imageBlobToAlignedBlob(
  imageBlob: Blob,
  offset: PointOffset,
  scaleX: number,
  scaleY: number,
  rotation: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(imageBlob);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to create canvas context for aligned export");
    }

    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.translate(
      canvas.width / 2 + offset.x * canvas.width,
      canvas.height / 2 + offset.y * canvas.height
    );
    context.rotate((rotation * Math.PI) / 180);
    context.scale(scaleX, scaleY);
    context.translate(-canvas.width / 2, -canvas.height / 2);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    context.restore();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.95);
    });

    if (!blob) {
      throw new Error("Failed to export aligned image blob");
    }

    return blob;
  } finally {
    bitmap.close();
  }
}
type EditMode = "move" | "rotate" | "scale" | undefined;

export function TargetAlignmentStep({
  imageBlob,
  imageUrl,
  template,
  onBack,
  onConfirm,
}: TargetAlignmentStepProps) {
  const isMobile = useIsMobile();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scaleXRef = useRef(1);
  const scaleYRef = useRef(1);
  const rotationRef = useRef(0);
  const [offset, setOffset] = useState<PointOffset>({ x: 0, y: 0 });
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [editMode, setEditMode] = useState<EditMode>();

  useEffect(() => {
    scaleXRef.current = scaleX;
    scaleYRef.current = scaleY;
  }, [scaleX, scaleY]);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    if (!imageBlob) {
      return;
    }

    setOffset({ x: 0, y: 0 });
    setScaleX(1);
    setScaleY(1);
    setRotation(0);
  }, [imageBlob]);

  // No drag gestures: simplified control via +/- buttons only (horizontal/vertical)

  const bindPan = useDrag(
    ({ movement: [mx, my], memo }) => {
      if (isSaving || editMode !== "move" || isMobile) {
        return memo;
      }

      const viewport = viewportRef.current;
      if (!viewport) {
        return memo;
      }

      const rect = viewport.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return memo;
      }

      const start = (memo as PointOffset | undefined) ?? offset;
      const nextOffset = {
        x: start.x + mx / rect.width,
        y: start.y + my / rect.height,
      };

      setOffset(nextOffset);
      return start;
    },
    {
      pointer: { touch: false, mouse: true },
      eventOptions: { passive: false },
      filterTaps: true,
    }
  );

  // Repeat/hold logic for +/- buttons
  const repeatRef = useRef<number | null>(null);
  const repeatDelayRef = useRef<number | null>(null);
  const REPEAT_DELAY = 350; // ms before continuous repeat starts
  const REPEAT_INTERVAL = 120; // ms between repeats

  const startRepeat = (action: () => void) => {
    // start a timeout; if the user releases before it fires, only onClick will apply single step
    stopRepeat();
    repeatDelayRef.current = window.setTimeout(() => {
      repeatRef.current = window.setInterval(action, REPEAT_INTERVAL);
    }, REPEAT_DELAY) as unknown as number;
  };

  const stopRepeat = () => {
    if (repeatDelayRef.current !== null) {
      window.clearTimeout(repeatDelayRef.current);
      repeatDelayRef.current = null;
    }
    if (repeatRef.current !== null) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  };

  const adjustAxis = (axis: "x" | "y", delta: number) => {
    if (axis === "x") {
      setScaleX((s) => {
        const next = clamp(s + delta, MIN_SCALE, MAX_SCALE);
        scaleXRef.current = next;
        return next;
      });
    } else {
      setScaleY((s) => {
        const next = clamp(s + delta, MIN_SCALE, MAX_SCALE);
        scaleYRef.current = next;
        return next;
      });
    }
  };

  const adjustOffset = (axis: "x" | "y", delta: number) => {
    setOffset((current) => ({
      ...current,
      [axis]: current[axis] + delta,
    }));
  };

  const applyArrowAction = (axis: "x" | "y", delta: number) => {
    if (editMode === "scale") {
      adjustAxis(axis, delta);
      return;
    }

    if (editMode === "move") {
      adjustOffset(axis, delta);
    }
  };

  const adjustRotation = (delta: number) => {
    setRotation((current) => {
      const next = current + delta;
      rotationRef.current = next;
      return next;
    });
  };

  const renderOverlayButton = ({
    key,
    label,
    title,
    icon,
    onPress,
    positionStyle,
    repeat = true,
  }: {
    key: string;
    label: string;
    title: string;
    icon: ReactNode;
    onPress: () => void;
    positionStyle: CSSProperties;
    repeat?: boolean;
  }) => {
    const repeatHandlers = repeat
      ? {
          onMouseDown: () => startRepeat(onPress),
          onMouseLeave: stopRepeat,
          onMouseUp: stopRepeat,
          onTouchEnd: stopRepeat,
          onTouchStart: () => startRepeat(onPress),
        }
      : {};

    return (
      <button
        aria-label={label}
        key={key}
        onClick={onPress}
        style={{
          ...OVERLAY_BUTTON_BASE_STYLE,
          ...positionStyle,
        }}
        title={title}
        type="button"
        {...repeatHandlers}
      >
        {icon}
      </button>
    );
  };

  const directionalControls = [
    {
      key: "up",
      axis: "y" as const,
      delta: editMode === "scale" ? AXIS_STEP : -MOVE_STEP,
      label: editMode === "scale" ? "Powiększ pionowo" : "Przesuń do góry",
      positionStyle: {
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
      },
      icon: <ArrowUp size={16} />,
    },
    {
      key: "down",
      axis: "y" as const,
      delta: editMode === "scale" ? -AXIS_STEP : MOVE_STEP,
      label: editMode === "scale" ? "Zmniejsz pionowo" : "Przesuń w dół",
      positionStyle: {
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
      },
      icon: <ArrowDown size={16} />,
    },
    {
      key: "left",
      axis: "x" as const,
      delta: editMode === "scale" ? -AXIS_STEP : -MOVE_STEP,
      label: editMode === "scale" ? "Zmniejsz poziomo" : "Przesuń w lewo",
      positionStyle: {
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
      },
      icon: <ArrowLeft size={16} />,
    },
    {
      key: "right",
      axis: "x" as const,
      delta: editMode === "scale" ? AXIS_STEP : MOVE_STEP,
      label: editMode === "scale" ? "Powiększ poziomo" : "Przesuń w prawo",
      positionStyle: {
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
      },
      icon: <ArrowRight size={16} />,
    },
  ];

  const rotateControls = [
    {
      key: "rotate-ccw",
      label: "Obróć w lewo (krok)",
      delta: -ROTATE_STEP,
      repeat: true,
      positionStyle: { top: 12, left: 12 },
      icon: <RotateCcw size={16} />,
    },
    {
      key: "rotate-cw",
      label: "Obróć w prawo (krok)",
      delta: ROTATE_STEP,
      repeat: true,
      positionStyle: { top: 12, right: 12 },
      icon: <RotateCw size={16} />,
    },
    {
      key: "rotate-ccw-square",
      label: "Obróć w lewo o 90°",
      delta: -QUARTER_TURN,
      repeat: false,
      positionStyle: { bottom: 12, left: 12 },
      icon: <RotateCcwSquare size={16} />,
    },
    {
      key: "rotate-cw-square",
      label: "Obróć w prawo o 90°",
      delta: QUARTER_TURN,
      repeat: false,
      positionStyle: { bottom: 12, right: 12 },
      icon: <RotateCwSquare size={16} />,
    },
  ];

  const handleReset = () => {
    if (isSaving) {
      return;
    }

    setOffset({ x: 0, y: 0 });
    setScaleX(1);
    setScaleY(1);
    setRotation(0);
  };

  const handleCommit = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const alignedBlob = await imageBlobToAlignedBlob(
        imageBlob,
        offset,
        scaleXRef.current,
        scaleYRef.current,
        rotationRef.current
      );
      await onConfirm(alignedBlob);
    } catch (error: unknown) {
      console.error("Nie udalo sie zapisac dopasowanej tarczy", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mx-auto mb-2 flex max-w-2xl justify-between gap-3">
        <ToggleGroup
          onValueChange={(value) => setEditMode(value as EditMode)}
          size="sm"
          type="single"
          value={editMode}
        >
          <ToggleGroupItem value="scale">
            <VectorSquareIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="move">
            <MoveIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="rotate">
            <RotateCw />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          disabled={isSaving}
          onClick={handleReset}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset
        </Button>
      </div>

      <div
        {...bindPan()}
        className="relative mx-auto aspect-square w-full max-w-2xl touch-none select-none overflow-hidden rounded-xl border border-border bg-black"
        ref={viewportRef}
      >
        {/** biome-ignore lint/correctness/useImageSize: <- */}
        <img
          alt="Dopasowywana tarcza"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
          draggable={false}
          src={imageUrl}
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${offset.x * 100}%, ${offset.y * 100}%) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
            transformOrigin: "center center",
          }}
        />

        <TargetOverlay
          className="absolute inset-0 h-full w-full"
          template={template}
          variant="outline"
        />

        {/* Axis controls on-image: up/down/left/right */}

        {(editMode === "scale" || editMode === "move") &&
          directionalControls.map((control) =>
            renderOverlayButton({
              key: control.key,
              label: control.label,
              title: control.label,
              icon: control.icon,
              onPress: () => applyArrowAction(control.axis, control.delta),
              positionStyle: control.positionStyle,
              repeat: true,
            })
          )}

        {editMode === "rotate" &&
          rotateControls.map((control) =>
            renderOverlayButton({
              key: control.key,
              label: control.label,
              title: control.label,
              icon: control.icon,
              onPress: () => adjustRotation(control.delta),
              positionStyle: control.positionStyle,
              repeat: control.repeat,
            })
          )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <Button
          className="w-full"
          disabled={isSaving}
          onClick={() => {
            handleCommit().catch((error: unknown) => {
              console.error("Nie udalo sie zapisac dopasowanej tarczy", error);
            });
          }}
          type="button"
        >
          {isSaving ? "Zapisywanie..." : "Zatwierdź i przejdź dalej"}
        </Button>
        <Button
          className="w-full"
          disabled={isSaving}
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          Wróć do kadrowania
        </Button>
      </div>
    </div>
  );
}
