import { db } from "@/db";
import { appointments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function generateCode() {
  return `WFA-${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function GET() {
  try {
    const items = await db.select().from(appointments).orderBy(desc(appointments.id)).limit(12);
    return Response.json({ appointments: items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Appointments load failed:", error);
    return Response.json({ appointments: [] }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const topic = String(body.topic ?? "").trim().slice(0, 140);
    const meetingType = String(body.meetingType ?? "In Branch").trim().slice(0, 40);
    const branchName = String(body.branchName ?? "").trim().slice(0, 160);
    const appointmentDate = String(body.appointmentDate ?? "").trim().slice(0, 32);
    const appointmentTime = String(body.appointmentTime ?? "").trim().slice(0, 32);
    const fullName = String(body.fullName ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().slice(0, 160);
    const phone = String(body.phone ?? "").trim().slice(0, 40);
    const notes = String(body.notes ?? "").trim().slice(0, 500);

    if (!topic || !branchName || !appointmentDate || !appointmentTime || !fullName || !email || !phone) {
      return Response.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    const confirmationCode = generateCode();
    const [created] = await db
      .insert(appointments)
      .values({
        confirmationCode,
        topic,
        meetingType,
        branchName,
        appointmentDate,
        appointmentTime,
        fullName,
        email,
        phone,
        notes: notes || null,
        status: "Pending Approval",
      })
      .returning();

    return Response.json({ appointment: created }, { status: 201 });
  } catch (error) {
    console.error("Appointment creation failed:", error);
    return Response.json({ error: "Could not schedule appointment right now." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const code = (request.nextUrl.searchParams.get("code") ?? "").trim();
    if (!code) return Response.json({ error: "Missing confirmation code." }, { status: 400 });

    await db.update(appointments).set({ status: "Canceled" }).where(eq(appointments.confirmationCode, code));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Appointment cancel failed:", error);
    return Response.json({ error: "Unable to cancel appointment." }, { status: 500 });
  }
}
