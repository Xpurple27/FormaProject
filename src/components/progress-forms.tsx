"use client";

import { saveMeasurement, deleteMeasurement } from "@/lib/training-actions";
import { uploadProgressPhoto, deleteProgressPhoto } from "@/lib/photo-actions";
import type { Measurement } from "@/lib/types";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

export function MeasurementForm({ today, existing }: { today: string; existing?: Measurement }) {
  const { state, pending, form } = useActionForm(saveMeasurement);
  return <form {...form} className="grid gap-3">
    <label className="label max-w-xs">Tanggal pengukuran
      <input className="field" type="date" name={existing ? undefined : "date"} readOnly={Boolean(existing)}
        defaultValue={existing?.measured_date ?? today} min="1900-01-01" max={today} required />
    </label>
    {existing && <><input type="hidden" name="date" value={existing.measured_date} />
      <input type="hidden" name="version" value={existing.updated_at} /></>}
    <div className="grid grid-cols-2 gap-2">
      <label className="label">Berat (kg)
        <input className="field" name="weight" type="number" min="25" max="350" step=".01" inputMode="decimal"
          defaultValue={existing?.weight_kg ?? ""} />
      </label>
      <label className="label">Lingkar pinggang (cm)
        <input className="field" name="waist" type="number" min="30" max="300" step=".01" inputMode="decimal"
          defaultValue={existing?.waist_cm ?? ""} />
      </label>
    </div>
    <p className="caption muted">Isi salah satu atau keduanya. Ukur pinggang dengan pita mendatar tepat di atas tulang pinggul setelah mengembuskan napas.</p>
    <label className="label">Catatan opsional
      <textarea className="field" name="notes" rows={2} maxLength={300} defaultValue={existing?.notes ?? ""} />
    </label>
    <Feedback {...state} />
    <button className="btn btn-primary justify-self-start" disabled={pending}>
      {pending ? "Menyimpan…" : existing ? "Simpan perubahan" : "Simpan pengukuran"}
    </button>
  </form>;
}

export function RemoveMeasurementForm({ measurement }: { measurement: Measurement }) {
  const { state, pending, form } = useActionForm(deleteMeasurement);
  return <details><summary className="caption">Hapus pengukuran</summary>
    <form {...form} className="grid gap-2 pb-2">
      <input type="hidden" name="date" value={measurement.measured_date} />
      <input type="hidden" name="version" value={measurement.updated_at} />
      <Feedback {...state} />
      <button className="btn btn-danger justify-self-start" disabled={pending}>Ya, hapus pengukuran</button>
    </form>
  </details>;
}

export function PhotoForm({ today, id }: { today: string; id: string }) {
  const { state, pending, form } = useActionForm(uploadProgressPhoto);
  return <form {...form} className="grid gap-3 sm:max-w-sm">
    <input type="hidden" name="id" value={id} />
    <label className="label">Tanggal foto<input name="date" type="date" className="field" defaultValue={today}
      min="1900-01-01" max={today} required /></label>
    <label className="label">Foto (JPG, PNG, atau WebP)
      <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="field" required
        onChange={event => {
          const input = event.currentTarget;
          input.setCustomValidity((input.files?.[0]?.size ?? 0) > 3 * 1024 * 1024 ? "Ukuran foto maksimal 3 MB." : "");
        }} />
    </label>
    <p className="caption muted">Maksimal 3 MB. Foto hanya bisa dibuka dari akunmu.</p>
    <Feedback {...state} />
    <button className="btn btn-secondary justify-self-start" disabled={pending}>
      {pending ? "Mengunggah…" : "Simpan foto"}
    </button>
  </form>;
}

export function RemovePhotoForm({ file }: { file: string }) {
  const { state, pending, form } = useActionForm(deleteProgressPhoto);
  return <details><summary className="caption">Hapus foto</summary>
    <form {...form} className="grid gap-2 pb-2">
      <input type="hidden" name="file" value={file} />
      <Feedback {...state} />
      <button className="btn btn-danger justify-self-start" disabled={pending}>Ya, hapus foto</button>
    </form>
  </details>;
}
