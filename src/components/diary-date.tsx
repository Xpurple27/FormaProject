"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function DiaryDate({ date, today, prev, next }: { date: string; today: string; prev: string | null; next: string | null }) {
  const router = useRouter();
  return <form action="/nutrisi" className="diary-date" onSubmit={event => {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).get("tanggal");
    if (typeof selected === "string" && selected) router.push("/nutrisi?tanggal=" + encodeURIComponent(selected));
  }}>
    {prev && <Link className="topbar-action" href={"/nutrisi?tanggal=" + prev} aria-label="Hari sebelumnya"><ChevronLeft size={17} /></Link>}
    <input className="field diary-date-input" name="tanggal" type="date" aria-label="Tanggal jurnal" key={date} defaultValue={date} min="1900-01-01" max={today} required />
    {next && <Link className="topbar-action" href={"/nutrisi?tanggal=" + next} aria-label="Hari berikutnya"><ChevronRight size={17} /></Link>}
    <button className="btn btn-secondary !px-2.5">Lihat</button>
    {date !== today && <Link className="btn btn-quiet" href="/nutrisi">Hari ini</Link>}
  </form>;
}
