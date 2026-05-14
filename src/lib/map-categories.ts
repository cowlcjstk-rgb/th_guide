const CATEGORY_COLORS = [
  "#0f766e",
  "#2563eb",
  "#c2410c",
  "#a21caf",
  "#b45309",
  "#be123c",
  "#4338ca",
  "#0369a1",
  "#15803d",
  "#334155",
];

export function buildCategoryColorMap(categories: string[]) {
  const map = new Map<string, string>();
  categories.forEach((category, index) => {
    map.set(category, CATEGORY_COLORS[index % CATEGORY_COLORS.length]);
  });
  return map;
}
