import { checkCredentials, getSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (!checkCredentials(email, password)) {
    return Response.json({ error: "Wrong email or password" }, { status: 401 });
  }
  const session = await getSession();
  session.admin = true;
  await session.save();
  return Response.json({ ok: true });
}
