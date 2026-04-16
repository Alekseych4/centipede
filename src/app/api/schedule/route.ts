import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createSchedule } from "../../../lib/mockStore";
import { ScheduleRequest } from "../../../lib/types";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = (await request.json()) as ScheduleRequest;

  if (!payload?.content?.trim()) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  if (!Array.isArray(payload.selectedPlatforms) || payload.selectedPlatforms.length === 0) {
    return NextResponse.json({ error: "Select at least one platform." }, { status: 400 });
  }

  if (!payload.scheduleAtUtc) {
    return NextResponse.json({ error: "scheduleAtUtc is required." }, { status: 400 });
  }

  if (Number.isNaN(new Date(payload.scheduleAtUtc).valueOf())) {
    return NextResponse.json({ error: "scheduleAtUtc must be a valid ISO date." }, { status: 400 });
  }

  const created = createSchedule(payload);
  return NextResponse.json({ item: created }, { status: 201 });
}
