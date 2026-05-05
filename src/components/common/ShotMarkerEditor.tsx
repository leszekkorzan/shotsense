/** biome-ignore-all lint/style/noNestedTernary: <-> */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <-> */
/** biome-ignore-all lint/style/noNonNullAssertion: <-> */
import { useDrag } from "@use-gesture/react";
import { Calculator, Plus, RotateCcw, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TargetTemplate } from "@/lib/targets/target-templates";
import { cn } from "@/lib/utils";
import { mlWorker } from "@/workers";
import { Badge } from "../ui/badge";
import { DotmSquare8 } from "../ui/dotm-square-8";

export type Shot = {
  id: string;
  x: number;
  y: number;
  nx: number;
  ny: number;
  ringIndex?: number;
  isManual?: boolean;
};

type ShotMarkerEditorProps = {
  imageUrl: string;
  template: TargetTemplate | null;
  shots: Shot[];
  onShotsChange?: (shots: Shot[]) => void;
  readonly?: boolean;
};

const HITBOX_SIZE = 44;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateShotId(): string {
  return `shot-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function calculateRingIndex(
  x: number,
  y: number,
  template: TargetTemplate,
  size: { width: number; height: number }
): number {
  if (size.width === 0 || size.height === 0 || template.canvas_size_mm === 0) {
    return -1;
  }

  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const distancePx = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

  const imageSizePx = Math.min(size.width, size.height);
  const pxPerMm = imageSizePx / template.canvas_size_mm;
  const distanceMm = distancePx / pxPerMm;

  let bestIndex = -1;
  let smallestDiameter = Number.POSITIVE_INFINITY;

  for (let i = 0; i < template.rings.length; i++) {
    const ring = template.rings[i];
    if (
      distanceMm <= ring.diameter_mm / 2 &&
      ring.diameter_mm < smallestDiameter
    ) {
      smallestDiameter = ring.diameter_mm;
      bestIndex = i;
    }
  }

  return bestIndex;
}

type ShotMarkerProps = {
  shot: Shot;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  containerWidth: number;
  containerHeight: number;
  template: TargetTemplate | null;
  readonly?: boolean;
  imageUrl: string;
};

function ShotMarker({
  shot,
  index,
  isSelected,
  isEditing,
  onSelect,
  onMove,
  containerWidth,
  containerHeight,
  template,
  readonly = false,
  imageUrl,
}: ShotMarkerProps) {
  const markerRef = useRef<HTMLButtonElement>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const magnifierRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const MAGNIFIER_SIZE = 120;
  const ZOOM = 2.5;
  const MAGNIFIER_HALF = MAGNIFIER_SIZE / 2;

  const bind = useDrag(
    ({ event, first, movement: [mx, my], last }) => {
      if (!isEditing || readonly) {
        return;
      }

      event.preventDefault();

      if (first) {
        startPos.current = { x: shot.x, y: shot.y };
        setIsDragging(true);
      }

      if (startPos.current) {
        const newX = clamp(startPos.current.x + mx, 0, containerWidth);
        const newY = clamp(startPos.current.y + my, 0, containerHeight);

        if (markerRef.current && !last) {
          markerRef.current.style.transform = `translate3d(${newX - HITBOX_SIZE / 2}px, ${newY - HITBOX_SIZE / 2}px, 0)`;

          if (magnifierRef.current) {
            magnifierRef.current.style.backgroundPosition = `${MAGNIFIER_HALF - newX * ZOOM}px ${MAGNIFIER_HALF - newY * ZOOM}px`;
          }
        }

        if (last) {
          onMove(newX, newY);
        }
      }

      if (last) {
        startPos.current = null;
        setIsDragging(false);
      }
    },
    {
      pointer: { touch: true },
      eventOptions: { passive: false },
      filterTaps: true,
    }
  );

  return (
    <button
      ref={markerRef}
      {...bind()}
      className={cn(
        "absolute top-0 left-0 m-0 touch-none border-0 bg-transparent p-0 transition-opacity",
        isDragging ? "z-50" : isEditing ? "z-40" : "z-20",
        readonly
          ? "opacity-100"
          : isEditing
            ? "opacity-100"
            : "opacity-70 hover:opacity-100"
      )}
      onClick={() => {
        if (!readonly) {
          onSelect();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
        }
      }}
      style={{
        transform: `translate3d(${shot.x - HITBOX_SIZE / 2}px, ${shot.y - HITBOX_SIZE / 2}px, 0)`,
        width: HITBOX_SIZE,
        height: HITBOX_SIZE,
        cursor: readonly ? "default" : isEditing ? "grabbing" : "pointer",
      }}
      type="button"
    >
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all",
          "h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8",
          isEditing && "border-blue-400 shadow-blue-400/50 shadow-lg",
          !isEditing && isSelected && "border-blue-500 shadow-[0_0_3px_black]",
          !(isEditing || isSelected) &&
            "border-amber-400 shadow-[0_0_3px_black]"
        )}
      />

      <div className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-white" />

      <div className="pointer-events-none absolute top-1/2 left-1/2 ml-3 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold text-white text-xs [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
        {template
          ? shot.ringIndex === undefined || shot.ringIndex === -1
            ? 0
            : template.rings[shot.ringIndex]?.score
          : index + 1}
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute -top-30 left-1/2 z-50 h-30 w-30 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl">
          <div
            className="absolute inset-0 bg-no-repeat"
            ref={magnifierRef}
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${containerWidth * ZOOM}px ${containerHeight * ZOOM}px`,
              backgroundPosition: `${MAGNIFIER_HALF - shot.x * ZOOM}px ${MAGNIFIER_HALF - shot.y * ZOOM}px`,
            }}
          />
          <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
          <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-red-500/50" />
          <div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-red-500/50" />
        </div>
      )}
    </button>
  );
}

export function ShotMarkerEditor({
  imageUrl,
  template,
  shots,
  onShotsChange,
  readonly = false,
}: ShotMarkerEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const prevSizeRef = useRef({ width: 0, height: 0 });
  const latestSizeRef = useRef({ width: 0, height: 0 });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [normalizedInitialShots, setNormalizedInitialShots] = useState<
    { id: string; nx: number; ny: number }[] | null
  >(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const detectedUrlRef = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <->
  useEffect(() => {
    if (readonly) {
      return;
    }
    if (!imageUrl || size.width === 0 || size.height === 0) {
      return;
    }
    if (detectedUrlRef.current === imageUrl) {
      return;
    }

    detectedUrlRef.current = imageUrl;
    setIsDetecting(true);

    mlWorker
      .detectHoles(imageUrl)
      .then((detections) => {
        const currentSize = latestSizeRef.current;

        const normalized = detections.map((det) => {
          const [x, y] = det.point;
          const [imgW, imgH] = det.imageSize;
          return {
            id: generateShotId(),
            nx: x / imgW,
            ny: y / imgH,
          };
        });
        setNormalizedInitialShots(normalized);

        const newShots: Shot[] = normalized.map((norm) => {
          const sx = norm.nx * currentSize.width;
          const sy = norm.ny * currentSize.height;
          return {
            id: norm.id,
            x: sx,
            y: sy,
            nx: norm.nx,
            ny: norm.ny,
            ringIndex: template
              ? calculateRingIndex(sx, sy, template, size)
              : undefined,
            isManual: false,
          };
        });

        onShotsChange?.(newShots);
      })
      .catch((err) => {
        console.error("Failed to detect holes:", err);
      })
      .finally(() => {
        setIsDetecting(false);
      });
  }, [imageUrl, size.width, size.height, template, onShotsChange]);

  useEffect(() => {
    if (
      readonly ||
      !template ||
      size.width === 0 ||
      size.height === 0 ||
      shots.length === 0
    ) {
      return;
    }

    let changed = false;
    const newShots = shots.map((shot) => {
      if (shot.ringIndex === undefined) {
        changed = true;
        return {
          ...shot,
          ringIndex: calculateRingIndex(shot.x, shot.y, template, size),
        };
      }
      return shot;
    });

    if (changed) {
      onShotsChange?.(newShots);
    }
  }, [template, shots, size, onShotsChange, readonly]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <->
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);

      if (width > 0 && height > 0) {
        prevSizeRef.current = { width, height };
        latestSizeRef.current = { width, height };
        setSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [onShotsChange, shots]);

  const handleAddShot = useCallback(() => {
    const x = size.width / 2;
    const y = size.height / 2;
    const newShot: Shot = {
      id: generateShotId(),
      x,
      y,
      nx: size.width > 0 ? x / size.width : 0.5,
      ny: size.height > 0 ? y / size.height : 0.5,
      ringIndex: template
        ? calculateRingIndex(x, y, template, size)
        : undefined,
      isManual: true,
    };
    const newShots = [...shots, newShot];
    onShotsChange?.(newShots);
    setSelectedIndex(newShots.length - 1);
    setEditingIndex(newShots.length - 1);
  }, [shots, size, template, onShotsChange]);

  const handleReset = useCallback(() => {
    if (normalizedInitialShots) {
      const resetShots: Shot[] = normalizedInitialShots.map((norm) => {
        const sx = norm.nx * size.width;
        const sy = norm.ny * size.height;
        return {
          id: generateShotId(),
          x: sx,
          y: sy,
          nx: norm.nx,
          ny: norm.ny,
          ringIndex: template
            ? calculateRingIndex(sx, sy, template, size)
            : undefined,
          isManual: false,
        };
      });
      onShotsChange?.(resetShots);
    } else {
      onShotsChange?.([]);
    }
    setSelectedIndex(null);
    setEditingIndex(null);
  }, [onShotsChange, normalizedInitialShots, size, template]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIndex !== null) {
      const newShots = shots.filter((_, i) => i !== selectedIndex);
      onShotsChange?.(newShots);
      setSelectedIndex(null);
      setEditingIndex(null);
    }
  }, [shots, selectedIndex, onShotsChange]);

  const handleMoveShot = useCallback(
    (x: number, y: number) => {
      if (editingIndex !== null) {
        const newShots = [...shots];
        newShots[editingIndex] = {
          ...newShots[editingIndex],
          x,
          y,
          nx: size.width > 0 ? x / size.width : newShots[editingIndex].nx,
          ny: size.height > 0 ? y / size.height : newShots[editingIndex].ny,
          ringIndex: template
            ? calculateRingIndex(x, y, template, size)
            : newShots[editingIndex].ringIndex,
        };
        onShotsChange?.(newShots);
      }
    },
    [shots, editingIndex, template, size, onShotsChange]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          className="relative max-h-full max-w-full shadow-sm"
          ref={containerRef}
        >
          {isDetecting && (
            <div className="absolute top-0 left-0 z-20 m-5 max-sm:m-2">
              <DotmSquare8 color="black" opacityBase={0.3} pattern="diamond" />
            </div>
          )}
          <img
            alt="Target"
            className={cn(
              "block max-h-full max-w-full object-contain",
              !readonly && "pointer-events-none"
            )}
            height="1000"
            ref={imageRef}
            src={imageUrl}
            width="1000"
          />

          {template && (
            <svg
              aria-label="Ring visualization"
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 0 ${template.canvas_size_mm} ${template.canvas_size_mm}`}
            >
              {template.rings.map((ring) => (
                <circle
                  cx={template.canvas_size_mm / 2}
                  cy={template.canvas_size_mm / 2}
                  fill="none"
                  key={`ring-${ring.score}-${ring.diameter_mm}`}
                  r={ring.diameter_mm / 2}
                  stroke="rgba(156, 163, 175, 0.3)"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}

          {shots.map((shot, index) => {
            const displayX =
              size.width > 0 && shot.nx !== undefined
                ? shot.nx * size.width
                : shot.x;
            const displayY =
              size.height > 0 && shot.ny !== undefined
                ? shot.ny * size.height
                : shot.y;

            return (
              <ShotMarker
                containerHeight={size.height}
                containerWidth={size.width}
                imageUrl={imageUrl}
                index={index}
                isEditing={editingIndex === index}
                isSelected={selectedIndex === index}
                key={shot.id}
                onMove={handleMoveShot}
                onSelect={() => {
                  if (readonly) {
                    return;
                  }
                  setSelectedIndex(index);
                  setEditingIndex(editingIndex === index ? null : index);
                }}
                readonly={readonly}
                shot={{ ...shot, x: displayX, y: displayY }}
                template={template}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 max-sm:gap-2">
        {!readonly && (
          <div className="flex items-center gap-2">
            <Button
              className="gap-2"
              disabled={isDetecting}
              onClick={handleAddShot}
              size="sm"
              variant="outline"
            >
              <Plus size={16} /> Dodaj
            </Button>
            <Button
              className="gap-2"
              disabled={selectedIndex === null || isDetecting}
              onClick={handleDeleteSelected}
              size="sm"
              variant="outline"
            >
              <X size={16} /> Usuń
            </Button>
            <Button
              className="gap-2"
              disabled={isDetecting}
              onClick={handleReset}
              size="sm"
              variant="outline"
            >
              <RotateCcw size={16} /> Reset
            </Button>
            {template && (
              <Badge
                className="ml-auto gap-1 border-dashed text-sm"
                variant="secondary"
              >
                <Calculator
                  className="max-sm:hidden"
                  size={14}
                  strokeWidth={1}
                />
                {shots.reduce((sum, shot) => {
                  if (shot.ringIndex === undefined || shot.ringIndex === -1) {
                    return sum;
                  }
                  return sum + (template.rings[shot.ringIndex]?.score ?? 0);
                }, 0)}{" "}
                pkt
              </Badge>
            )}
          </div>
        )}

        {!readonly && selectedIndex !== null && template && (
          <div className="overflow-x-auto">
            <ToggleGroup
              className="w-full justify-start"
              onValueChange={(value) => {
                if (selectedIndex === null) {
                  return;
                }
                let ringIndex: number | undefined;
                if (value !== "") {
                  const targetScore = Number.parseFloat(value);
                  const foundIndex = template.rings.findIndex(
                    (r) => r.score === targetScore
                  );

                  const currentShot = shots[selectedIndex];
                  const currentScore =
                    currentShot?.ringIndex === undefined
                      ? undefined
                      : currentShot.ringIndex === -1
                        ? 0
                        : template.rings[currentShot.ringIndex]?.score;

                  if (currentScore === targetScore) {
                    ringIndex = undefined;
                  } else if (foundIndex !== -1) {
                    ringIndex = foundIndex;
                  } else if (targetScore === 0) {
                    ringIndex = -1;
                  }
                }

                const newShots = [...shots];
                newShots[selectedIndex] = {
                  ...newShots[selectedIndex],
                  ringIndex,
                };
                onShotsChange?.(newShots);
              }}
              spacing={4}
              type="single"
              value={
                shots[selectedIndex]?.ringIndex === undefined ||
                shots[selectedIndex]!.ringIndex === -1
                  ? "0"
                  : String(
                      template.rings[shots[selectedIndex]!.ringIndex!]?.score ??
                        ""
                    )
              }
            >
              {template.rings
                .reduce(
                  (unique, ring) => {
                    if (!unique.some((r) => r.score === ring.score)) {
                      unique.push(ring);
                    }
                    return unique;
                  },
                  [] as typeof template.rings
                )
                .map((ring) => (
                  <ToggleGroupItem
                    aria-label={`${ring.score} pkt`}
                    className="flex min-w-10 items-center justify-center px-3"
                    key={`ring-score-${ring.score}`}
                    type="button"
                    value={String(ring.score)}
                  >
                    <span className="font-medium text-sm">{ring.score}</span>
                  </ToggleGroupItem>
                ))}
              {!template.rings.some((r) => r.score === 0) && (
                <ToggleGroupItem
                  aria-label="0 pkt"
                  className="flex min-w-10 items-center justify-center px-3"
                  type="button"
                  value="0"
                >
                  <span className="font-medium text-sm">0</span>
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          </div>
        )}

        <div
          className={cn(
            "grid gap-2 overflow-y-auto",
            readonly ? "max-h-full" : "max-h-32"
          )}
        >
          {shots.map((shot, index) => (
            <button
              className={cn(
                "flex items-center gap-2 rounded px-3 py-2 font-medium text-sm transition-colors",
                selectedIndex === index
                  ? "bg-blue-500/20 text-blue-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              key={shot.id}
              onClick={() => {
                if (readonly) {
                  return;
                }
                setSelectedIndex(index);
                setEditingIndex(index);
              }}
              type="button"
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-semibold text-white text-xs",
                  editingIndex === index ? "bg-blue-500" : "bg-gray-400"
                )}
              >
                {template
                  ? shot.ringIndex === undefined || shot.ringIndex === -1
                    ? 0
                    : template.rings[shot.ringIndex]?.score
                  : index + 1}
              </span>
              <span>Strzał {index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
