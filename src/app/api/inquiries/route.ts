import { db } from "@/db";
import { productInquiries } from "@/db/schema";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const productName = String(body.productName ?? "").trim().slice(0, 160);
    const category = String(body.category ?? "Personal Banking").trim().slice(0, 80);
    const applicantName = String(body.applicantName ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().slice(0, 160);
    const zipCode = String(body.zipCode ?? "").trim().slice(0, 16);
    const notes = String(body.notes ?? "").trim().slice(0, 400);

    if (!productName || !applicantName || !email || !zipCode) {
      return Response.json({ error: "Please fill in your name, email, and ZIP code." }, { status: 400 });
    }

    const referenceCode = `WF-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const [inquiry] = await db
      .insert(productInquiries)
      .values({ referenceCode, productName, category, applicantName, email, zipCode, notes: notes || null })
      .returning();

    return Response.json({ inquiry }, { status: 201 });
  } catch (error) {
    console.error("Inquiry save failed:", error);
    return Response.json({ error: "Unable to submit request right now." }, { status: 500 });
  }
}
