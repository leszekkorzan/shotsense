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
    id: "DEFAULT_ISSF_50M_RIFLE",
    title: "Karabin Sportowy 50m (ISSF)",
    getTemplate: () =>
      import("./templates/ISSF_50M_RIFLE").then(
        (t) => t.ISSF_50M_RIFLE_TARGET_TEMPLATE
      ),
  },
];
