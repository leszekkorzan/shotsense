import type { TargetTemplate } from "../target-templates";

export const TS2_TARGET_TEMPLATE: TargetTemplate = {
  anchor_diameter_mm: 200,
  canvas_size_mm: 520,
  rings: [
    { score: 10, diameter_mm: 50 },
    { score: 9, diameter_mm: 100 },
    { score: 8, diameter_mm: 150 },
    { score: 7, diameter_mm: 200 },
    { score: 6, diameter_mm: 250 },
    { score: 5, diameter_mm: 300 },
    { score: 4, diameter_mm: 350 },
    { score: 3, diameter_mm: 400 },
    { score: 2, diameter_mm: 450 },
    { score: 1, diameter_mm: 500 },
  ],
};
