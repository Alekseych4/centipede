import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listPlatforms } from "../../../lib/mockStore";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({ platforms: listPlatforms() });
}
