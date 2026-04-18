import { NextResponse } from "next/server";
import { requireUserId } from "../../../lib/auth";
import { listPlatforms } from "../../../lib/connections";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  return NextResponse.json({ platforms: await listPlatforms(userId) });
}
