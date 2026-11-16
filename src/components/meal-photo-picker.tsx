"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_MEAL_PHOTO_BYTES, MEAL_PHOTO_EDGE, type MealPhotoResult } from "@/lib/meal-photo";
import { PhotoSourceButtons } from "./photo-source-buttons";

export function MealPhotoPicker({ ready }: { ready: (result: MealPhotoResult) => void }) {
  const active = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [working, setWorking] = useState<"preparing" | "analyzing" | null>(null);
  const [error, setError] = useState("");
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  async function select(file: File) {
    if (active.current) return;
    setError("");
    setPhoto(null);
    if (file.size > 20 * 1024 * 1024) {
      setError("Pilih foto makanan berukuran maksimal 20 MB.");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setWorking("preparing");
    try {
      const { resizePhoto } = await import("@/lib/browser-photo");
      const blob = await resizePhoto(file, MEAL_PHOTO_EDGE, .8);
      if (controller.signal.aborted) return;
      if (blob.size > MAX_MEAL_PHOTO_BYTES) throw new Error("Photo still too large");
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      if (!controller.signal.aborted) setError("Foto belum bisa dibuka. Coba pilih foto lain.");
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setWorking(null);
    }
  }

  async function analyze() {
    if (!photo || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setError("");
    setWorking("analyzing");
    try {
      const response = await fetch("/api/nutrisi/foto", {
        method: "POST", headers: { "Content-Type": "image/jpeg" }, body: photo.blob,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(26_000)]),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "Foto belum bisa dianalisis.");
        return;
      }
      setPhoto(null);
      ready(result);
    } catch {
      if (!controller.signal.aborted) setError("Analisis foto belum selesai. Coba lagi atau susun menu manual.");
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setWorking(null);
    }
  }

  return <section id="foto-makanan" className="grid scroll-mt-20 gap-2 rounded-xl border line p-3" aria-label="Foto makanan">
    <h3>Foto makanan</h3>
    <p className="caption muted">Usahakan isi piring terlihat jelas. Foto dikirim ke OpenRouter dan penyedia model saat kamu memilih analisis.</p>
    {photo && /* eslint-disable-next-line @next/next/no-img-element */
      <img src={photo.url} alt="Foto makanan yang akan dianalisis" className="max-h-40 max-w-full rounded-lg object-contain object-left" />}
    <PhotoSourceButtons disabled={Boolean(working)} onPhoto={file => void select(file)} />
    {photo && <button className="btn btn-primary justify-self-start" type="button" disabled={Boolean(working)} onClick={() => void analyze()}>Analisis foto</button>}
    {working && <p role="status" className="caption muted">{working === "analyzing" ? "Menganalisis foto…" : "Menyiapkan foto…"}</p>}
    {error && <p role="alert" className="caption">{error}</p>}
  </section>;
}
