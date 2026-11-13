import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FORMA",
    short_name: "FORMA",
    description: "Jurnal nutrisi, latihan, dan progres pribadi.",
    lang: "id",
    start_url: "/beranda",
    scope: "/",
    display: "standalone",
    background_color: "#101d2b",
    theme_color: "#101d2b",
    icons: [
      { src: "/forma.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/forma-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/forma-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
