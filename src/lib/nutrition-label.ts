export const LABEL_FIELDS = [
  ["weight", "Berat satu porsi (g)", .01, 3000],
  ["calories", "Kalori (kkal)", 0, 9500],
  ["protein", "Protein (g)", 0, 3000],
  ["carbs", "Karbohidrat (g)", 0, 3000],
  ["fat", "Lemak (g)", 0, 3000],
] as const;

type LabelField = (typeof LABEL_FIELDS)[number][0];
export type LabelValues = Partial<Record<LabelField, string>>;

const rowNames: Record<LabelField, RegExp> = {
  weight: /^(?:takaran saji(?:an)?|serving size)\b/i,
  calories: /^(?:energi total|total energi|total energy|energy total|kalori(?: total)?|calories)\b(?!\s+(?:dari|from|lemak|fat))/i,
  protein: /^protein\b/i,
  carbs: /^(?:karbohidrat(?: total)?|total carbohydrates?|carbohydrates?)\b/i,
  fat: /^(?:lemak total|total lemak|total fat|fat total)\b/i,
};

function readRow(row: string, unit: RegExp): number[] {
  const values = row.matchAll(new RegExp(String.raw`(?<![\d.,<>−≤≥-])\b(\d{1,4}(?:[.,]\d{1,2})?)\s*${unit.source}\b`, "gi"));
  return Array.from(values, match => Number(match[1].replace(",", ".")));
}

export function parseNutritionLabel(raw: string): { values: LabelValues; perHundred: boolean } {
  const lines = raw.normalize("NFKC").split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const text = lines.join(" ");
  const perHundred = /(?:\b(?:per|tiap)|\/)\s*100\s*(?:g(?:ram)?|ml)\b/i.test(text);
  const values: LabelValues = {};

  for (const [key, , min, max] of LABEL_FIELDS) {
    if (perHundred && key !== "weight") continue;
    const unit = key === "calories" ? /(?:kkal|kcal)/ : /(?:g|gram)/;
    const possible = lines.flatMap((line, index) => {
      if (!rowNames[key].test(line)) return [];
      const afterName = line.replace(rowNames[key], "");
      if (/[<>≤≥]|[-−]\s*\d/.test(afterName)) return [];
      const amounts = readRow(afterName, unit);
      if (amounts.length) return amounts;
      const next = lines[index + 1];
      return next && /^\d/.test(next) ? readRow(next, unit) : [];
    });
    if (possible.length && possible.every(amount => amount === possible[0]) && possible[0] >= min && possible[0] <= max) {
      values[key] = String(possible[0]);
    }
  }
  return { values, perHundred };
}
