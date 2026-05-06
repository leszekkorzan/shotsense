export type TargetTemplateOption = {
  id: string;
  title: string;
  getTemplate: () => Promise<TargetTemplate>;
};

export interface TargetRing {
  diameter_mm: number;
  score: number;
}

export interface TargetTemplate {
  anchor_diameter_mm: number;
  canvas_size_mm: number;
  rings: TargetRing[];
}

export const TARGET_TEMPLATES: TargetTemplateOption[] = [
  {
    id: "DEFAULT_TS1",
    title: "TS1 / ISSF 50m",
    getTemplate: () =>
      import("./templates/TS1").then((t) => t.TS1_TARGET_TEMPLATE),
  },
  {
    id: "DEFAULT_TS2",
    title: "TS2 / ISSF PDW",
    getTemplate: () =>
      import("./templates/TS2").then((t) => t.TS2_TARGET_TEMPLATE),
  },
];
