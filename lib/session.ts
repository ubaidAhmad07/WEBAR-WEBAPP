import crypto from "node:crypto";
import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = { admin?: boolean };

export async function getSession(): Promise<IronSession<SessionData>> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (32+ characters)");
  }
  return getIronSession<SessionData>(await cookies(), {
    password: secret,
    cookieName: "webar_admin",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  });
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session.admin === true;
}

/** Constant-time credential check against env-configured admin account. */
export function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedEmail || !expectedPassword) return false;
  const hash = (v: string) => crypto.createHash("sha256").update(v).digest();
  const emailOk = crypto.timingSafeEqual(hash(email.trim().toLowerCase()), hash(expectedEmail.trim().toLowerCase()));
  const passwordOk = crypto.timingSafeEqual(hash(password), hash(expectedPassword));
  return emailOk && passwordOk;
}

/** For API route handlers: returns a 401 Response, or null when authorized. */
export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
