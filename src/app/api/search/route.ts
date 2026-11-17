import { db } from "@/db";
import { searchQueries, siteSearchItems } from "@/db/schema";
import { ensureSearchSeeded } from "@/db/seed";
import { asc, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);

  try {
    await ensureSearchSeeded();

    const results = query
      ? await db
          .select({
            title: siteSearchItems.title,
            description: siteSearchItems.description,
            category: siteSearchItems.category,
            url: siteSearchItems.url,
          })
          .from(siteSearchItems)
          .where(
            or(
              ilike(siteSearchItems.title, `%${query}%`),
              ilike(siteSearchItems.description, `%${query}%`),
              ilike(siteSearchItems.category, `%${query}%`),
              ilike(siteSearchItems.keywords, `%${query}%`),
            ),
          )
          .orderBy(asc(siteSearchItems.id))
          .limit(10)
      : await db
          .select({
            title: siteSearchItems.title,
            description: siteSearchItems.description,
            category: siteSearchItems.category,
            url: siteSearchItems.url,
          })
          .from(siteSearchItems)
          .orderBy(asc(siteSearchItems.id))
          .limit(8);

    if (query) {
      await db.insert(searchQueries).values({ query, resultCount: results.length }).catch(() => {});
    }
    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Site search unavailable:", error);
    return Response.json({ results: [], error: "Search is temporarily unavailable." }, { status: 503 });
  }
}
