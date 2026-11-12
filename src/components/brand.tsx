import Image from "next/image";

export function Brand() {
  return <span className="brand"><Image className="brand-mark" src="/forma.png" width={36} height={36} alt="" unoptimized />FORMA</span>;
}
