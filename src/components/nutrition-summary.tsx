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
  return <section aria-label="Ringkasan nutrisi" className="card energy-card">
    <div className="energy-overview">
      <div className="min-w-0">
        <div className="flex items-center gap-2 muted text-sm font-medium">
          <Flame size={17} className="accent shrink-0" aria-hidden="true" />{label}
        </div>
        <p className="energy-total numeric">
          <strong data-testid="total-calories">{fmt(totals.calories)}</strong>
          <span className="muted text-sm">kkal</span>
        </p>
        <p className="caption muted">{target ? <>Target {fmt(target.calories)} kkal</> : "Target belum berlaku pada tanggal ini."}</p>
        {diff !== null && <p className={diff < 0 ? "energy-balance energy-balance-over" : "energy-balance"}>
          <b>{fmt(Math.abs(diff))} kkal</b> {diff < 0 ? "di atas target" : "tersisa"}
        </p>}
      </div>
      {percent !== null && <div className="ring numeric" style={{ "--fill": Math.min(100, percent) + "%" } as CSSProperties}
        role="img" aria-label={fmt(percent, 0) + "% dari target kalori"}><span>{percent > 999 ? "999+" : percent}%</span></div>}
    </div>
    <dl className="macro-grid">
      {macros.map(({ key, label, color }) => {
        const limit = target?.[key];
        const value = totals[key];
        return <div key={key} className="macro-item" style={{ "--fill-color": color } as CSSProperties}>
          <dt><span className="macro-dot" aria-hidden="true" />{label}</dt>
          <dd className="numeric">
            <strong>{fmt(value)}</strong> <span className="muted text-xs">g</span>
            {limit !== undefined && <span className="macro-target muted" title={value > limit
              ? fmt(value - limit) + " g di atas target" : fmt(limit - value) + " g tersisa"}> / {fmt(limit)} g</span>}
            {limit !== undefined && limit > 0 && <progress className="meter mt-1.5"
              aria-label={"Progres " + label.toLowerCase()} value={Math.min(limit, value)} max={limit} />}
          </dd>
        </div>;
      })}
    </dl>
  </section>;
}
