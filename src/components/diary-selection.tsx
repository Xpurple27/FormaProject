"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteDiarySelection } from "@/lib/actions";
import { entryAmount, groupDiaryEntries, MEALS } from "@/lib/nutrition";
import type { Entry } from "@/lib/types";
import { MAX_DELETE_ENTRIES } from "@/lib/validation";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

export function DiarySelection({ date, entries }: { date: string; entries: Entry[] }) {
  const { state, pending, form } = useActionForm(deleteDiarySelection);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const items = selected.map(id => ({ id, version: entries.find(entry => entry.id === id)?.updated_at }));
  return <form {...form} className="grid gap-3" aria-label="Pilih catatan untuk dihapus">
    <input type="hidden" name="date" value={date} />
    <input type="hidden" name="items" value={JSON.stringify(items)} />
    <fieldset disabled={pending || confirming} className="grid min-w-0 gap-3">
      {Object.entries(MEALS).map(([meal, label]) => {
        const groups = groupDiaryEntries(entries.filter(entry => entry.meal_type === meal));
        if (!groups.length) return null;
        return <section className="diary-meal grid gap-1 p-3" key={meal}>
          <h3 className="mb-1">{label}</h3>
          {groups.map(group => <div key={group[0].meal_batch_id ?? group[0].id} className="grid">
            {group[0].meal_batch_id && <p className="caption muted">{group[0].meal_batch_name ?? "Susunan makanan"}</p>}
            {group.map(entry => <label key={entry.id} className="flex min-h-11 items-center gap-3 border-t line py-1.5">
              <input type="checkbox" checked={selected.includes(entry.id)} className="size-5 shrink-0 accent-[var(--accent)]"
                disabled={!selected.includes(entry.id) && selected.length >= MAX_DELETE_ENTRIES}
                onChange={event => setSelected(event.target.checked ? [...selected, entry.id] : selected.filter(id => id !== entry.id))} />
              <span className="min-w-0 break-words">{entry.food_name} <small className="muted">· {entryAmount(entry)}</small></span>
            </label>)}
          </div>)}
        </section>;
      })}
    </fieldset>
    <Feedback {...state} />
    {confirming ? <>
      <p>Hapus {selected.length} catatan terpilih?</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-danger" disabled={pending}>{pending ? "Menghapus…" : "Ya, hapus terpilih"}</button>
        <button type="button" className="btn btn-quiet" disabled={pending} onClick={() => setConfirming(false)}>Kembali memilih</button>
      </div>
    </> : <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-danger" disabled={!selected.length}
        onClick={() => setConfirming(true)}>Hapus terpilih ({selected.length})</button>
      <Link prefetch={false} href={"/nutrisi?tanggal=" + date + "#jurnal"} className="btn btn-quiet">Batal</Link>
    </div>}
  </form>;
}
