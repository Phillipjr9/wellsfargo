import { db } from "@/db";
import { contentSettings } from "@/db/schema";
import { ensureAdminSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureAdminSeeded();
    const [row] = await db.select().from(contentSettings).where(eq(contentSettings.key, "rates")).limit(1);
    if (!row) return Response.json({ rates: null }, { headers: { "Cache-Control": "no-store" } });

    const parsed = JSON.parse(row.value) as unknown;
    return Response.json(
      { rates: parsed, updatedAt: row.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Rate content load failed:", error);
    return Response.json({ rates: null, error: "Rate content unavailable." }, { status: 503 });
  }
}
