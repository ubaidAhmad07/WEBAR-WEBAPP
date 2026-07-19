import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const settings = db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-cream">
      <AdminHeader restaurantName={settings?.restaurantName ?? "Restaurant"} />
      {children}
    </div>
  );
}
