import type { TargetTemplate } from "../target-templates";

export const ISSF_50M_RIFLE_TARGET_TEMPLATE: TargetTemplate = {
  anchor_diameter_mm: 112.4,
  // Nominal paper size for ISSF 50m rifle target.
  canvas_size_mm: 170,
  rings: [
    { score: 10, diameter_mm: 5.0 }, // Wewnętrzna mucha
    { score: 10, diameter_mm: 10.4 }, // Zwykła 10
    { score: 9, diameter_mm: 26.4 },
    { score: 8, diameter_mm: 42.4 },
    { score: 7, diameter_mm: 58.4 },
    { score: 6, diameter_mm: 74.4 },
    { score: 5, diameter_mm: 90.4 },
    { score: 4, diameter_mm: 106.4 },
    { score: 3, diameter_mm: 122.4 },
    { score: 2, diameter_mm: 138.4 },
    { score: 1, diameter_mm: 154.4 },
  ],
};
