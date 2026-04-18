import { NextResponse } from "next/server";
import { getWorkerInvocationAuth } from "../../../../lib/auth";
import { processDueJobs } from "../../../../lib/schedules";

export async function POST(request: Request) {
  const authResult = await getWorkerInvocationAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const result = await processDueJobs();
  return NextResponse.json({ result });
}
