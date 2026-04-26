export type TargetTemplateOption = {
  description: string;
  id: string;
  title: string;
};

export const TARGET_TEMPLATES: TargetTemplateOption[] = [
  {
    id: "BUILT_IN_TS4",
    title: "Tarcza TS4",
    description: "Klasyczna tarcza pistoletowa treningowa.",
  },
  {
    id: "BUILT_IN_NT23",
    title: "Tarcza NT23",
    description: "Tarcza dynamiczna z wyraznymi strefami punktowymi.",
  },
  {
    id: "BUILT_IN_IDPA",
    title: "Tarcza IDPA",
    description: "Sylwetka IDPA do treningu praktycznego.",
  },
];
