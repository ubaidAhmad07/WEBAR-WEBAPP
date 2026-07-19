import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { storage } from "@/lib/storage";
import QrStudio from "@/components/admin/QrStudio";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const settings = db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();

  return (
    <QrStudio
      initialUrl={
        settings?.menuUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      }
      initialQrUrl={settings?.qrPngKey ? storage.url(settings.qrPngKey) : null}
      hasMarker={Boolean(settings?.mindTargetKey)}
    />
  );
}
