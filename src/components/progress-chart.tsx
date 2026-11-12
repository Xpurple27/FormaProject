import { longDate } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { chartPoints } from "@/lib/progress";

export function ProgressChart({ title, unit, color, series }: {
  title: string; unit: string; color: string; series: { date: string; value: number }[];
}) {
  const visible = series.slice(-90);
  const points = chartPoints(visible, 290, 116);
  const first = visible[0];
  const last = visible.at(-1);
  const xs = points.map(point => point.x + 18);
  const ys = points.map(point => point.y + 18);
  return <section className="card grid gap-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2>{title}</h2>
      {last && <strong className="numeric" style={{ color }}>{fmt(last.value, 2)} {unit}</strong>}
    </div>
    {!last || !first ? <p className="muted">Belum ada pengukuran.</p> : <>
      <svg viewBox="0 0 326 152" role="img" aria-label={"Grafik " + title + " dari " + longDate(first.date) + " hingga " + longDate(last.date)}
        className="w-full rounded-xl bg-[#142634]">
        {[18, 76, 134].map(y => <line key={y} x1="18" y1={y} x2="308" y2={y} stroke="#416071" strokeDasharray="3 5" />)}
        {points.length > 1 && <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          points={xs.map((x, i) => x + "," + ys[i]).join(" ")} />}
        {points.map((_, i) => <circle key={visible[i].date} cx={xs[i]} cy={ys[i]} r={points.length > 20 ? 2 : 4} fill={color}>
          <title>{longDate(visible[i].date)} · {fmt(visible[i].value, 2)} {unit}</title></circle>)}
      </svg>
      <div className="flex flex-wrap justify-between gap-1 caption muted"><span>{longDate(first.date)}</span>
        {first.date !== last.date && <span>{longDate(last.date)}</span>}</div>
      <p className="caption muted">{visible.length} pengukuran{series.length > 90 ? " terakhir" : ""}. Titik berasal dari catatanmu.</p>
    </>}
  </section>;
}
