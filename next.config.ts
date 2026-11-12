import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
      ] },
      { source: "/:path(beranda|nutrisi|profil|latihan|progres|orientasi|masuk|daftar|auth/confirm|api/ekspor)", headers: [
        { key: "Cache-Control", value: "private, no-store" },
      ] },
    ];
  },
};

export default config;
