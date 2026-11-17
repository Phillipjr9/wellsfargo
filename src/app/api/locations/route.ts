import { db } from "@/db";
import { branches } from "@/db/schema";
import { ensureBranchesSeeded } from "@/db/seed";
import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const qp = (request.nextUrl.searchParams.get("qp") ?? "").trim().slice(0, 80);
  const driveUp = request.nextUrl.searchParams.get("driveUp") === "1";
  const notary = request.nextUrl.searchParams.get("notary") === "1";
  const safeDeposit = request.nextUrl.searchParams.get("safeDeposit") === "1";
  const premier = request.nextUrl.searchParams.get("premier") === "1";
  const spanish = request.nextUrl.searchParams.get("spanish") === "1";

  try {
    await ensureBranchesSeeded();

    const conditions: SQL[] = [];
    if (qp) {
      const textMatch = or(
        ilike(branches.city, `%${qp}%`),
        ilike(branches.state, `%${qp}%`),
        ilike(branches.zip, `%${qp}%`),
        ilike(branches.name, `%${qp}%`),
        ilike(branches.address, `%${qp}%`),
      );
      if (textMatch) conditions.push(textMatch);
    }
    if (driveUp) conditions.push(eq(branches.hasDriveUp, true));
    if (notary) conditions.push(eq(branches.hasNotary, true));
    if (safeDeposit) conditions.push(eq(branches.hasSafeDeposit, true));
    if (premier) conditions.push(eq(branches.hasPremierBanker, true));
    if (spanish) conditions.push(eq(branches.hasSpanish, true));

    const results =
      conditions.length > 0
        ? await db.select().from(branches).where(and(...conditions)).orderBy(asc(branches.id))
        : await db.select().from(branches).orderBy(asc(branches.id));

    return Response.json({ branches: results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Locations search failed:", error);
    return Response.json({ branches: [], error: "Unable to load branch locations." }, { status: 503 });
  }
}
