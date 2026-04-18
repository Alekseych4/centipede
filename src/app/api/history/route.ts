import { NextResponse } from "next/server";
import { requireUserId } from "../../../lib/auth";
import { listFailureLogs, listHistory } from "../../../lib/schedules";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  return NextResponse.json({
    items: await listHistory(userId),
    failures: await listFailureLogs(userId)
  });
}
