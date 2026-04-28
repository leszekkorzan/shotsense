import React from "react";
import type { TargetTemplate } from "../../lib/targets/target-templates";

type Variant = "outline" | "solid";

interface TargetOverlayProps {
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
  template: TargetTemplate;
  variant?: Variant;
}

const TargetOverlay: React.FC<TargetOverlayProps> = ({
  template,
  variant = "outline",
  className,
  svgRef,
}) => {
  const D = template.canvas_size_mm;
  const cx = D / 2;
  const cy = D / 2;

  const rings = React.useMemo(
    () => [...template.rings].sort((a, b) => b.diameter_mm - a.diameter_mm),
    [template.rings]
  );

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <->
    <svg
      aria-hidden
      className={className}
      height="100%"
      ref={svgRef}
      style={{ overflow: "visible", pointerEvents: "none" }}
      viewBox={`0 0 ${D} ${D}`}
      width="100%"
    >
      {rings.map((ring) => {
        const r = ring.diameter_mm / 2;
        const key = `${ring.score}-${ring.diameter_mm}`;

        if (variant === "outline") {
          return (
            <circle
              cx={cx}
              cy={cy}
              fill="transparent"
              key={key}
              r={r}
              stroke="#ff3b30"
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        // solid variant: decide whether ring sits inside the 'anchor' (black field)
        const inAnchor = ring.diameter_mm <= template.anchor_diameter_mm;
        const fill = inAnchor ? "#222" : "#FFF";
        const stroke = inAnchor ? "#FFF" : "#222";

        return (
          <circle
            cx={cx}
            cy={cy}
            fill={fill}
            key={key}
            r={r}
            stroke={stroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
};

export default TargetOverlay;
