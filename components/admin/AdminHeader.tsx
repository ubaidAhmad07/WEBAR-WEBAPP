"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminHeader({ restaurantName }: { restaurantName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex items-center gap-3 border-b border-line px-7 py-4">
      <Link
        href="/admin"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-terra font-display text-[17px] text-white"
      >
        {restaurantName.charAt(0).toUpperCase() || "R"}
      </Link>
      <Link href="/admin" className="font-display text-lg text-ink">
        {restaurantName}{" "}
        <span className="font-sans text-[13px] text-faint">· Admin</span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/admin/qr"
          className="rounded-full border border-line-strong px-4.5 py-2 font-sans text-[13px] font-bold text-ink transition-colors hover:bg-card"
        >
          QR code
        </Link>
        <button
          onClick={logout}
          title="Log out"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-sage font-sans text-[13px] font-semibold text-white transition-colors hover:bg-sage-deep"
        >
          A
        </button>
      </div>
    </header>
  );
}
