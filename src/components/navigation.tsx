"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Utensils, UserRound } from "lucide-react";

const destinations = [
  { path: "/beranda", title: "Beranda", icon: House },
  { path: "/nutrisi", title: "Nutrisi", icon: Utensils },
  { path: "/profil", title: "Profil", icon: UserRound },
];

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav aria-label="Navigasi utama" className={mobile ? "bottom-nav" : "mt-12 grid gap-2"}>
    {destinations.map(({ path, title, icon: Icon }) =>
      <Link key={path} href={path} aria-current={pathname === path ? "page" : undefined} className="nav-link">
        <Icon size={20} aria-hidden="true" strokeWidth={1.8} />{title}
      </Link>)}
  </nav>;
}
