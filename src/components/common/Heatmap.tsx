import type React from "react";
import { useEffect, useRef } from "react";
import type { Shot } from "@/lib/db";

interface HeatmapProps {
  className?: string;
  shots: Shot[];
}

interface ColorValue {
  b: number;
  g: number;
  r: number;
}

function getColorFromIntensity(intensity: number): ColorValue {
  if (intensity < 0.25) {
    // Blue -> Cyan
    const t = intensity / 0.25;
    return {
      r: 0,
      g: Math.floor(255 * t),
      b: 255,
    };
  }
  if (intensity < 0.5) {
    // Cyan -> Green
    const t = (intensity - 0.25) / 0.25;
    return {
      r: 0,
      g: 255,
      b: Math.floor(255 * (1 - t)),
    };
  }
  if (intensity < 0.75) {
    // Green -> Yellow
    const t = (intensity - 0.5) / 0.25;
    return {
      r: Math.floor(255 * t),
      g: 255,
      b: 0,
    };
  }
  // Yellow -> Red
  const t = (intensity - 0.75) / 0.25;
  return {
    r: 255,
    g: Math.floor(255 * (1 - t)),
    b: 0,
  };
}

function drawDensityLayer(
  shots: Shot[],
  canvas: HTMLCanvasElement
): HTMLCanvasElement {
  const densityCanvas = document.createElement("canvas");
  densityCanvas.width = canvas.width;
  densityCanvas.height = canvas.height;
  const densityCtx = densityCanvas.getContext("2d");
  if (!densityCtx) {
    return densityCanvas;
  }

  const radiusPixels = 30;

  for (const shot of shots) {
    const x = shot.nx * canvas.width;
    const y = shot.ny * canvas.height;

    const shotGradient = densityCtx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      radiusPixels
    );
    shotGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    shotGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
    shotGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    densityCtx.fillStyle = shotGradient;
    densityCtx.fillRect(
      x - radiusPixels,
      y - radiusPixels,
      radiusPixels * 2,
      radiusPixels * 2
    );
  }

  return densityCanvas;
}

const Heatmap: React.FC<HeatmapProps> = ({ shots, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || shots.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return;
    }

    const renderHeatmap = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      if (width === 0 || height === 0) {
        return;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const densityCanvas = drawDensityLayer(shots, canvas);

      ctx.filter = "blur(15px)";
      ctx.drawImage(densityCanvas, 0, 0);
      ctx.filter = "none";

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];

        if (alpha > 0) {
          const intensity = alpha / 255;
          const color = getColorFromIntensity(intensity);

          data[i] = color.r;
          data[i + 1] = color.g;
          data[i + 2] = color.b;
          data[i + 3] = Math.floor(200 * intensity);
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const resizeObserver = new ResizeObserver(() => {
      renderHeatmap();
    });

    resizeObserver.observe(parent);

    renderHeatmap();

    return () => {
      resizeObserver.disconnect();
    };
  }, [shots]);

  return (
    <canvas
      className={className}
      ref={canvasRef}
      style={{
        display: "block",
        left: 0,
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default Heatmap;
