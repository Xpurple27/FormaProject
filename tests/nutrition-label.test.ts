import { describe, expect, it } from "vitest";
import { parseNutritionLabel } from "../src/lib/nutrition-label";

describe("nutrition label OCR parsing", () => {
  it("extracts Indonesian per-serving values, ignoring percentages and related rows", () => {
    expect(parseNutritionLabel(`INFORMASI NILAI GIZI
Takaran saji 25 g (1 bungkus)
2 sajian per kemasan
JUMLAH PER SAJIAN
Energi total 125 kkal
Energi dari lemak 40 kkal
Lemak total 4,5 g 7%
Lemak jenuh 1 g 5%
Protein 2 g 3%
Karbohidrat total 19 g 6%
Gula 9 g
* Persen AKG berdasarkan kebutuhan energi 2150 kkal`)).toEqual({
      perHundred: false, values: { weight: "25", calories: "125", fat: "4.5", protein: "2", carbs: "19" },
    });
  });

  it("keeps zero, skips unknown amounts, and never treats milliliters as grams", () => {
    expect(parseNutritionLabel(`Serving size 180 ml
Total energy
100 kcal
Total fat 0 g 0%
Protein < 1 g
Total carbohydrates 8 g 20 g`)).toEqual({ perHundred: false, values: { calories: "100", fat: "0" } });
  });

  it("leaves amounts unset when the serving basis or columns are ambiguous", () => {
    expect(parseNutritionLabel(`Takaran saji 25 g
per 100 g | per sajian
Energi total 400 kkal 100 kkal`).values).toEqual({ weight: "25" });
    expect(parseNutritionLabel("Kalori 1,250 kkal\nProtein -2 g\nProtein 35%\nLemak jenuh 7 g").values).toEqual({});
  });
});
