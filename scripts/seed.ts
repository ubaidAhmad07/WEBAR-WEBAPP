/* Seed the local database with demo data. Run: npm run db:seed */
import { db, tables } from "../lib/db";
import { storage } from "../lib/storage";

const SAMPLE_GLB_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb";

async function main() {
  const existing = db.select().from(tables.categories).all();
  if (existing.length > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  db.insert(tables.settings)
    .values({
      id: 1,
      restaurantName: "Casa Verde",
      menuUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    })
    .onConflictDoNothing()
    .run();

  const cats = db
    .insert(tables.categories)
    .values([
      { name: "Starters", sortOrder: 0 },
      { name: "Mains", sortOrder: 1 },
      { name: "Desserts", sortOrder: 2 },
    ])
    .returning()
    .all();
  const [starters, mains, desserts] = cats;

  const items = db
    .insert(tables.menuItems)
    .values([
      {
        categoryId: starters.id,
        name: "Charred Avocado",
        description:
          "Fire-roasted avocado with lime crema, toasted seeds and a touch of chili oil.",
        priceCents: 850,
        tags: JSON.stringify(["Vegan", "Bestseller"]),
        sortOrder: 0,
      },
      {
        categoryId: starters.id,
        name: "Garden Flatbread",
        description: "Wood-fired flatbread with whipped herb ricotta and seasonal greens.",
        priceCents: 700,
        tags: JSON.stringify(["Halal"]),
        sortOrder: 1,
      },
      {
        categoryId: mains.id,
        name: "Harissa Chicken",
        description:
          "Slow-roasted half chicken glazed with harissa butter, served over saffron rice.",
        priceCents: 1650,
        tags: JSON.stringify(["Halal", "Spicy", "Bestseller"]),
        sortOrder: 0,
      },
      {
        categoryId: mains.id,
        name: "Miso Eggplant",
        description: "Caramelized miso-glazed eggplant with sesame, scallion and steamed rice.",
        priceCents: 1400,
        tags: JSON.stringify(["Vegan"]),
        sortOrder: 1,
      },
      {
        categoryId: desserts.id,
        name: "Burnt Basque Cheesecake",
        description: "Caramelized top, molten center, a whisper of sea salt.",
        priceCents: 900,
        tags: JSON.stringify(["Bestseller"]),
        sortOrder: 0,
      },
      {
        categoryId: desserts.id,
        name: "Citrus Olive Oil Cake",
        description: "Bright orange sponge with candied peel and soft cream.",
        priceCents: 800,
        tags: JSON.stringify([]),
        sortOrder: 1,
      },
    ])
    .returning()
    .all();

  console.log(`Seeded ${cats.length} categories, ${items.length} items.`);

  // Attach a CC0 sample model to the first starter so AR is testable immediately.
  try {
    console.log("Downloading sample .glb (Khronos Avocado)…");
    const res = await fetch(SAMPLE_GLB_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const key = "models/seed-avocado.glb";
    await storage.put(key, buf);
    db.insert(tables.itemModels)
      .values({
        itemId: items[0].id,
        originalKey: key,
        compressedKey: key,
        status: "ready",
        originalBytes: buf.length,
        compressedBytes: buf.length,
        updatedAt: Date.now(),
      })
      .run();
    console.log(`Sample model stored (${(buf.length / 1024 / 1024).toFixed(1)} MB).`);
  } catch (err) {
    console.warn(
      `Could not download sample model (${String(err)}) — seed continues without it.`,
    );
  }
}

main().then(() => process.exit(0));
