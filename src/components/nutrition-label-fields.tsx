"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { LABEL_FIELDS, type LabelValues } from "@/lib/nutrition-label";

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export function NutritionLabelFields({ onReading }: { onReading: (reading: boolean) => void }) {
  const [values, setValues] = useState<LabelValues>({});
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef<AbortController | null>(null);
  const manual = useRef<LabelValues>({});
  const picker = useRef<HTMLInputElement>(null);
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
      <input ref={picker} type="file" accept="image/*" aria-label="Pilih foto label gizi" className="sr-only" tabIndex={-1}
        onChange={event => {
          const photo = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (photo) void scan(photo);
        }} />
      <button type="button" className="btn btn-secondary justify-self-start" disabled={reading} onClick={() => picker.current?.click()}>
        {reading ? <LoaderCircle size={17} className="motion-safe:animate-spin" aria-hidden="true" /> : <Camera size={17} aria-hidden="true" />}
        Foto label gizi
      </button>
      {message && <p className="caption muted" role="status">{message}</p>}
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
