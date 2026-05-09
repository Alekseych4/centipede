import { NextResponse } from "next/server";
import { getWorkerInvocationAuth } from "../../../../lib/auth";
import { processDueJobs } from "../../../../lib/schedules";

async function runWorker(request: Request) {
  const authResult = await getWorkerInvocationAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const result = await processDueJobs(new Date(), authResult.kind === "clerk" ? authResult.userId : undefined);
  return NextResponse.json({ result });
}

export async function GET(request: Request) {
  return runWorker(request);
}

export async function POST(request: Request) {
  return runWorker(request);
}
