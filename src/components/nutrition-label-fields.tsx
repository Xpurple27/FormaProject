"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { LABEL_FIELDS, type LabelValues } from "@/lib/nutrition-label";
import { PhotoSourceButtons } from "./photo-source-buttons";

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export function NutritionLabelFields({ onReading }: { onReading: (reading: boolean) => void }) {
  const [values, setValues] = useState<LabelValues>({});
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef<AbortController | null>(null);
  const manual = useRef<LabelValues>({});
  useEffect(() => () => {
    active.current?.abort();
    active.current = null;
  }, []);

  async function scan(photo: File) {
    if (active.current) return;
    if (photo.size > MAX_PHOTO_BYTES) {
      setMessage("Pilih foto label berukuran maksimal 20 MB.");
      return;
    }
    const scan = new AbortController();
    active.current = scan;
    const timeout = window.setTimeout(() => scan.abort(new Error("OCR timed out")), 30000);
    setReading(true);
    onReading(true);
    setValues({ ...manual.current });
    setMessage("Membaca label di perangkatmu…");
    try {
      const { readLabelPhoto } = await import("@/lib/read-label-photo");
      const { values: found, perHundred } = await readLabelPhoto(photo, scan.signal);
      if (active.current !== scan) return;
      const matches = Object.keys(found).length;
      if (matches) setValues({ ...found, ...manual.current });
      setMessage(perHundred
        ? "Label memuat nilai per 100 g atau 100 ml. Isi angka per sajian dari label secara manual."
        : matches ? "Bacaan siap diperiksa. Cocokkan angka dengan label. Isian yang sudah kamu ketik tetap dipakai."
          : "Angka gizi belum terbaca. Foto lebih dekat atau isi angka yang terlihat secara manual.");
    } catch {
      if (active.current === scan) setMessage("Foto belum bisa dibaca. Coba foto yang lebih jelas atau isi secara manual.");
    } finally {
      window.clearTimeout(timeout);
      if (active.current === scan) {
        active.current = null;
        setReading(false);
        onReading(false);
      }
    }
  }

  return <>
    <p className="caption muted">Gunakan angka untuk satu sajian. Kolom kosong ditandai belum diketahui.</p>
    <div className="mt-2 grid gap-2">
      <PhotoSourceButtons disabled={reading} onPhoto={photo => void scan(photo)} />
      {message && <p className="caption muted flex items-start gap-2" role="status">
        {reading && <LoaderCircle size={17} className="shrink-0 motion-safe:animate-spin" aria-hidden="true" />}{message}
      </p>}
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 pb-3">
      {LABEL_FIELDS.map(([name, label, min, max]) => <label key={name} className="label">{label}
        <input className="field" type="number" name={name} min={min} max={max} step=".01" inputMode="decimal"
          value={values[name] ?? ""} onChange={event => {
            const value = event.target.value;
            manual.current[name] = value;
            setValues(previous => ({ ...previous, [name]: value }));
          }} />
      </label>)}
    </div>
  </>;
}
