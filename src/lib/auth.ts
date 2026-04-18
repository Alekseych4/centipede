import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { optionalEnv } from "./env";
import { WorkerInvocationAuth } from "./types";

export async function requireUserId(): Promise<string | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return userId;
}

export async function getWorkerInvocationAuth(request: Request): Promise<WorkerInvocationAuth | NextResponse> {
  const workerSecret = optionalEnv("WORKER_SECRET");
  const providedSecret = request.headers.get("x-worker-secret");

  if (workerSecret && providedSecret === workerSecret) {
    return { kind: "secret" };
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return { kind: "clerk", userId };
}
