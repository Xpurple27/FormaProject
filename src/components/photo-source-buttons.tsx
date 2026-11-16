"use client";

import { useRef, type ChangeEvent } from "react";
import { Camera, Images } from "lucide-react";

export function PhotoSourceButtons({ disabled, onPhoto }: { disabled: boolean; onPhoto: (photo: File) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (photo) onPhoto(photo);
  }

  return <div className="flex flex-wrap gap-2">
    <input ref={camera} type="file" accept="image/*" capture="environment" aria-hidden="true"
      className="sr-only" tabIndex={-1} disabled={disabled} onChange={choose} />
    <input ref={gallery} type="file" accept="image/*" aria-hidden="true"
      className="sr-only" tabIndex={-1} disabled={disabled} onChange={choose} />
    <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => camera.current?.click()}>
      <Camera size={17} aria-hidden="true" />Ambil foto
    </button>
    <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => gallery.current?.click()}>
      <Images size={17} aria-hidden="true" />Pilih dari galeri
    </button>
  </div>;
}
