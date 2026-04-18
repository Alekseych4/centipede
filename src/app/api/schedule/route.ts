import { NextResponse } from "next/server";
import { requireUserId } from "../../../lib/auth";
import { createSchedule } from "../../../lib/schedules";
import { ScheduleRequest } from "../../../lib/types";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  try {
    const payload = (await request.json()) as ScheduleRequest;
    const created = await createSchedule(userId, payload);
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schedule request failed." },
      { status: 400 }
    );
  }
}
