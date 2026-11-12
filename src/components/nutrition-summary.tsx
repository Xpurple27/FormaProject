import type { CSSProperties } from "react";
import { Flame } from "lucide-react";
import { fmt } from "@/lib/nutrition";
import type { Nutrients, Target } from "@/lib/types";

const macros = [
  { key: "protein_g", label: "Protein", color: "var(--protein)" },
  { key: "carbs_g", label: "Karbohidrat", color: "var(--carb)" },
  { key: "fat_g", label: "Lemak", color: "var(--fat)" },
] as const;

export function NutritionSummary({ totals, target, label }: { totals: Nutrients; target: Target | null; label: string }) {
  const percent = target ? Math.round(totals.calories / target.calories * 100) : null;
  const diff = target ? target.calories - totals.calories : null;
  return <section aria-label="Ringkasan nutrisi" className="grid gap-3">
    <div className="card energy-card flex items-center justify-between gap-4 sm:gap-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2 muted text-sm font-medium"><Flame size={18} className="accent" aria-hidden="true" />{label}</div>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 numeric">
          <strong className="text-[clamp(2rem,7vw,3.7rem)] leading-none tracking-[-.07em]" data-testid="total-calories">{fmt(totals.calories)}</strong>
          <span className="muted text-sm">{target && "/ " + fmt(target.calories) + " "}kkal</span>
        </p>
        <p className="mt-3 caption">{diff === null ? "Target belum berlaku pada tanggal ini." : diff < 0
          ? <><b>{fmt(-diff)} kkal</b> di atas target</> : <><b>{fmt(diff)} kkal</b> tersisa</>}</p>
      </div>
      {percent !== null && <div className="ring numeric" style={{ "--fill": Math.min(100, percent) + "%" } as CSSProperties}
        role="img" aria-label={fmt(percent, 0) + "% dari target kalori"}><span>{percent > 999 ? "999+" : percent}%</span></div>}
    </div>
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {macros.map(({ key, label, color }) => {
        const limit = target?.[key];
        const value = totals[key];
        return <div key={key} className="card !rounded-xl !p-2.5 sm:!p-4">
          <div className="flex items-center gap-1 sm:gap-2" style={{ color }}>
            <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-current sm:block" aria-hidden="true" />
            <span className="text-[.68rem] min-[380px]:text-xs sm:text-sm font-semibold">{label}</span>
          </div>
          <p className="mt-2 numeric text-sm sm:text-base"><strong>{fmt(value)}</strong> <span className="muted text-xs">g</span></p>
          {limit !== undefined && <>
            {limit > 0 && <progress className="meter mt-2" style={{ "--fill-color": color } as CSSProperties}
              aria-label={"Progres " + label.toLowerCase()} value={Math.min(limit, value)} max={limit} />}
            <p className="muted mt-2 text-[.68rem] sm:text-xs">
              {value > limit ? fmt(value - limit) + " g di atas target" : fmt(limit - value) + " g tersisa"}
            </p>
          </>}
        </div>;
      })}
    </div>
  </section>;
}
