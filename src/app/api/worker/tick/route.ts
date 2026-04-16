import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { processDueJobs } from "../../../../lib/mockStore";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const result = await processDueJobs();
  return NextResponse.json({ result });
}
