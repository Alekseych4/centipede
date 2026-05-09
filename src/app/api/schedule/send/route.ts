import { NextResponse } from "next/server";
import { requireUserId } from "../../../../lib/auth";
import { createAndSendSchedule } from "../../../../lib/schedules";
import { ScheduleRequest } from "../../../../lib/types";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  try {
    const payload = (await request.json()) as ScheduleRequest;
    const result = await createAndSendSchedule(userId, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send request failed." },
      { status: 400 }
    );
  }
}
