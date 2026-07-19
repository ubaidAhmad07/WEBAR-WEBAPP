"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Panel = "login" | "signup" | "forgot";

const inputClass =
  "w-full rounded-full border border-line bg-card px-4 py-3 font-sans text-[13.5px] text-ink placeholder:text-faint outline-none focus:border-terra";
const labelClass = "font-sans text-xs font-semibold text-muted";
const primaryClass =
  "mt-1 w-full cursor-pointer rounded-full bg-terra py-3 text-center font-sans text-sm font-bold text-white transition-colors hover:bg-terra-deep disabled:opacity-60";
const linkClass =
  "cursor-pointer font-sans text-[12.5px] font-semibold text-rust hover:text-rust-deep";

export default function AdminLoginPage() {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Login failed");
    }
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-cream p-6">
      <div className="pointer-events-none absolute -left-[70px] -top-[70px] h-[260px] w-[260px] rounded-full bg-peach" />
      <div className="pointer-events-none absolute -bottom-[90px] -right-[50px] h-[300px] w-[300px] rounded-full bg-sage-tint" />

      <div className="relative flex w-[360px] flex-col gap-3.5 rounded-panel bg-surface p-7 shadow-lift">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-terra font-display text-[21px] text-white">
          R
        </div>

        {panel === "login" && (
          <form onSubmit={submitLogin} className="flex flex-col gap-3.5">
            <h1 className="font-display text-[22px] text-ink">Log in</h1>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            {error && (
              <div className="rounded-full bg-peach-pale px-4 py-2 font-sans text-xs font-semibold text-rust-deep">
                {error}
              </div>
            )}
            <button type="submit" disabled={busy} className={primaryClass}>
              {busy ? "Logging in…" : "Log in"}
            </button>
            <div className="flex justify-between">
              <span className={linkClass} onClick={() => setPanel("forgot")}>
                Forgot password?
              </span>
              <span className={linkClass} onClick={() => setPanel("signup")}>
                Create an account
              </span>
            </div>
          </form>
        )}

        {panel === "signup" && (
          <div className="flex flex-col gap-3.5">
            <h1 className="font-display text-[22px] text-ink">Create account</h1>
            <p className="font-sans text-[13px] leading-relaxed text-muted">
              This menu is run by a single restaurant account. Account creation
              isn&apos;t available in this version — ask the site owner for
              access.
            </p>
            <div className="text-center">
              <span className={linkClass} onClick={() => setPanel("login")}>
                Already have an account? Log in
              </span>
            </div>
          </div>
        )}

        {panel === "forgot" && (
          <div className="flex flex-col gap-3.5">
            <h1 className="font-display text-[22px] text-ink">Forgot password</h1>
            <p className="font-sans text-[13px] leading-relaxed text-muted">
              Password reset by email isn&apos;t available in this version. The
              admin password is managed in the server configuration — ask the
              site owner to reset it there.
            </p>
            <div className="text-center">
              <span className={linkClass} onClick={() => setPanel("login")}>
                Back to log in
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
