"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function DiaryDate({ date, today, prev, next }: { date: string; today: string; prev: string | null; next: string | null }) {
  const router = useRouter();
  return <form action="/nutrisi" className="flex flex-wrap items-center gap-2" onSubmit={event => {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).get("tanggal");
    if (typeof selected === "string" && selected) router.push("/nutrisi?tanggal=" + encodeURIComponent(selected));
  }}>
    {prev && <Link className="btn btn-secondary !px-3" href={"/nutrisi?tanggal=" + prev} aria-label="Hari sebelumnya"><ChevronLeft size={17} /></Link>}
    <input className="field !w-auto max-w-full" name="tanggal" type="date" aria-label="Tanggal jurnal" key={date} defaultValue={date} min="1900-01-01" max={today} required />
    {next && <Link className="btn btn-secondary !px-3" href={"/nutrisi?tanggal=" + next} aria-label="Hari berikutnya"><ChevronRight size={17} /></Link>}
    <button className="btn btn-secondary">Lihat</button>
    {date !== today && <Link className="btn btn-quiet" href="/nutrisi">Hari ini</Link>}
  </form>;
}
