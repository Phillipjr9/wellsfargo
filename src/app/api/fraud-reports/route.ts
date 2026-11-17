import { db } from "@/db";
import { fraudReports } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reports = await db.select().from(fraudReports).orderBy(desc(fraudReports.id)).limit(6);
    return Response.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ reports: [] }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const incidentType = String(body.incidentType ?? "").trim().slice(0, 100);
    const channel = String(body.channel ?? "").trim().slice(0, 80);
    const incidentDate = String(body.incidentDate ?? "").trim().slice(0, 32);
    const contactEmail = String(body.contactEmail ?? "").trim().slice(0, 160);
    const summary = String(body.summary ?? "").trim().slice(0, 1000);

    if (!incidentType || !channel || !incidentDate || !contactEmail || !summary) {
      return Response.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    const referenceCode = `FRD-${Math.floor(100000 + Math.random() * 900000)}`;
    const [report] = await db
      .insert(fraudReports)
      .values({ referenceCode, incidentType, channel, incidentDate, contactEmail, summary })
      .returning();

    return Response.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Fraud report failed:", error);
    return Response.json({ error: "Unable to submit report right now." }, { status: 500 });
  }
}
