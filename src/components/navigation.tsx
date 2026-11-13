"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChartNoAxesCombined, Dumbbell, House, Plus, Utensils, UserRound } from "lucide-react";
import { Brand } from "./brand";

const destinations = [
  { path: "/beranda", title: "Beranda", icon: House },
  { path: "/nutrisi", title: "Nutrisi", icon: Utensils },
  { path: "/latihan", title: "Latihan", icon: Dumbbell },
  { path: "/progres", title: "Progres", icon: ChartNoAxesCombined },
];

export function MobileHeader() {
  const pathname = usePathname();
  return <header className="topbar">
    <Link href="/beranda" aria-label="Beranda FORMA"><Brand /></Link>
    <div className="flex gap-1">
      <Link href="/pengingat" className="topbar-action" aria-label="Pengingat" aria-current={pathname === "/pengingat" ? "page" : undefined}>
        <Bell size={19} aria-hidden="true" />
      </Link>
      <Link href="/profil" className="topbar-action" aria-label="Profil" aria-current={pathname === "/profil" ? "page" : undefined}>
        <UserRound size={19} aria-hidden="true" />
      </Link>
    </div>
  </header>;
}

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const links = [...destinations, { path: "/profil", title: "Profil", icon: UserRound }];
  function item({ path, title, icon: Icon }: typeof links[number]) {
    return <Link key={path} href={path} aria-current={pathname === path ? "page" : undefined} className="nav-link">
      <span className="nav-icon"><Icon size={20} aria-hidden="true" strokeWidth={1.8} /></span>{title}
    </Link>;
  }
  return <nav aria-label="Navigasi utama" className={mobile ? "bottom-nav" : "mt-10 grid gap-1"}>
    {mobile ? <>
      {destinations.slice(0, 2).map(item)}
      <Link href="/nutrisi#catat" aria-label="Catat makanan" className="nav-link nav-add">
        <span className="nav-icon"><Plus size={22} aria-hidden="true" /></span>Catat
      </Link>
      {destinations.slice(2).map(item)}
    </> : links.map(item)}
  </nav>;
}
