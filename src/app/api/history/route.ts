import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listFailureLogs, listHistory } from "../../../lib/mockStore";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({ items: listHistory(), failures: listFailureLogs() });
}
