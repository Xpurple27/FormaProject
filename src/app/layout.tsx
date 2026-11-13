import { PwaRuntime } from "@/components/pwa";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FORMA", template: "%s · FORMA" },
  description: "Jurnal nutrisi, latihan, dan progres pribadi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FORMA" },
  icons: { icon: "/forma.png", apple: "/forma.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#101d2b", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><a className="skip-link" href="#isi">Ke isi halaman</a><PwaRuntime />{children}</body></html>;
}
