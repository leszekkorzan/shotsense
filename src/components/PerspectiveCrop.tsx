import { useDrag } from "@use-gesture/react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type Point = { x: number; y: number };

type PerspectiveCropProps = {
  imageUrl: string;
  confirmLabel?: string;
  onConfirm?: (points: Point[]) => void;
};

type CornerHandleProps = {
  index: number;
  getPointRef: RefObject<(index: number) => Point>;
  onMoveRef: RefObject<
    (
      index: number,
      movement: [number, number],
      start: Point,
      last: boolean
    ) => void
  >;
  setHandleRef: (index: number, element: HTMLDivElement | null) => void;
};

const HITBOX_SIZE = 48;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createInitialPoints(width: number, height: number): Point[] {
  return [
    { x: width * 0.12, y: height * 0.12 },
    { x: width * 0.88, y: height * 0.14 },
    { x: width * 0.86, y: height * 0.88 },
    { x: width * 0.14, y: height * 0.86 },
  ];
}

function createInitialNormalizedPoints(): Point[] {
  return [
    { x: 0.12, y: 0.12 },
    { x: 0.88, y: 0.14 },
    { x: 0.86, y: 0.88 },
    { x: 0.14, y: 0.86 },
  ];
}

function pointsToPolygon(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function buildDimmerPath(
  points: Point[],
  width: number,
  height: number
): string {
  const polygon = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  return `M0 0 H${width} V${height} H0 Z ${polygon} Z`;
}

function CornerHandle({
  index,
  getPointRef,
  onMoveRef,
  setHandleRef,
}: CornerHandleProps) {
  const bind = useDrag(
    ({ event, first, last, memo, movement: [mx, my] }) => {
      event.preventDefault();

      const startPoint =
        first || !memo ? getPointRef.current(index) : (memo as Point);

      onMoveRef.current(index, [mx, my], startPoint, last);
      return startPoint;
    },
    {
      pointer: { touch: true },
      eventOptions: { passive: false },
      filterTaps: true,
    }
  );

  return (
    <div
      {...bind()}
      className="absolute top-0 left-0 z-30 size-12 touch-none"
      ref={(element) => setHandleRef(index, element)}
    >
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/35 shadow-[0_0_0_2px_rgba(0,0,0,0.35)]" />
    </div>
  );
}

export function PerspectiveCrop({
  imageUrl,
  confirmLabel = "Zatwierdz kadr",
  onConfirm,
}: PerspectiveCropProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dimmerPathRef = useRef<SVGPathElement | null>(null);
  const outlineRef = useRef<SVGPolygonElement | null>(null);
  const handleRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pointsRef = useRef<Point[]>([]);
  const normalizedPointsRef = useRef<Point[]>([]);
  const frameRef = useRef<number | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [points, setPoints] = useState<Point[]>([]);

  const syncDom = useCallback(() => {
    frameRef.current = null;

    if (pointsRef.current.length !== 4) {
      return;
    }

    for (let index = 0; index < 4; index += 1) {
      const handle = handleRefs.current[index];
      const point = pointsRef.current[index];

      if (!(handle && point)) {
        continue;
      }

      handle.style.transform = `translate3d(${point.x - HITBOX_SIZE / 2}px, ${point.y - HITBOX_SIZE / 2}px, 0)`;
    }

    if (dimmerPathRef.current) {
      dimmerPathRef.current.setAttribute(
        "d",
        buildDimmerPath(pointsRef.current, size.width, size.height)
      );
    }

    if (outlineRef.current) {
      outlineRef.current.setAttribute(
        "points",
        pointsToPolygon(pointsRef.current)
      );
    }
  }, [size.height, size.width]);

  const queueSync = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = requestAnimationFrame(syncDom);
  }, [syncDom]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width === 0 || height === 0) {
        return;
      }

      setSize((current) => {
        if (current.width === width && current.height === height) {
          return current;
        }

        return { width, height };
      });
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.width === 0 || size.height === 0) {
      return;
    }

    if (normalizedPointsRef.current.length !== 4) {
      normalizedPointsRef.current = createInitialNormalizedPoints();
      setPoints(createInitialPoints(size.width, size.height));
      return;
    }

    setPoints(
      normalizedPointsRef.current.map((point) => ({
        x: clamp(point.x * size.width, 0, size.width),
        y: clamp(point.y * size.height, 0, size.height),
      }))
    );
  }, [size.height, size.width]);

  useEffect(() => {
    if (points.length !== 4) {
      return;
    }

    pointsRef.current = points.map((point) => ({ ...point }));
    queueSync();
  }, [points, queueSync]);

  const getPointRef = useRef((_index: number): Point => ({ x: 0, y: 0 }));
  getPointRef.current = (index: number): Point =>
    pointsRef.current[index] ?? { x: 0, y: 0 };

  const onMoveRef = useRef(
    (
      _index: number,
      _movement: [number, number],
      _start: Point,
      _last: boolean
    ) => {
      return;
    }
  );

  onMoveRef.current = (index, [mx, my], start, last) => {
    if (
      size.width === 0 ||
      size.height === 0 ||
      pointsRef.current.length !== 4
    ) {
      return;
    }

    pointsRef.current[index] = {
      x: clamp(start.x + mx, 0, size.width),
      y: clamp(start.y + my, 0, size.height),
    };

    normalizedPointsRef.current[index] = {
      x: pointsRef.current[index].x / size.width,
      y: pointsRef.current[index].y / size.height,
    };

    queueSync();

    if (last) {
      setPoints(pointsRef.current.map((point) => ({ ...point })));
    }
  };

  const setHandleRef = useCallback(
    (index: number, element: HTMLDivElement | null) => {
      handleRefs.current[index] = element;
      queueSync();
    },
    [queueSync]
  );

  const handleConfirm = useCallback(() => {
    const result = pointsRef.current.map((point) => ({ ...point }));
    if (onConfirm) {
      onConfirm(result);
      return;
    }

    console.log("Perspective crop points:", result);
  }, [onConfirm]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        className="relative mx-auto w-full max-w-xl touch-none select-none overflow-hidden rounded-xl border border-border bg-black"
        ref={stageRef}
      >
        {/** biome-ignore lint/correctness/useImageSize: <-> */}
        <img
          alt="Crop target"
          className="pointer-events-none block h-auto w-full select-none"
          draggable={false}
          src={imageUrl}
        />

        {size.width > 0 && size.height > 0 && points.length === 4 && (
          <>
            {/** biome-ignore lint/a11y/noSvgWithoutTitle: <-> */}
            <svg
              className="pointer-events-none absolute inset-0 z-10 h-full w-full"
              viewBox={`0 0 ${size.width} ${size.height}`}
            >
              <path
                fill="rgba(0, 0, 0, 0.58)"
                fillRule="evenodd"
                ref={dimmerPathRef}
              />
              <polygon
                fill="none"
                ref={outlineRef}
                stroke="white"
                strokeWidth="2"
              />
            </svg>

            {[0, 1, 2, 3].map((index) => (
              <CornerHandle
                getPointRef={getPointRef}
                index={index}
                key={index}
                onMoveRef={onMoveRef}
                setHandleRef={setHandleRef}
              />
            ))}
          </>
        )}
      </div>

      <button
        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-transparent bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90 active:translate-y-px"
        onClick={handleConfirm}
        type="button"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
