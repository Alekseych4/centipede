import { NextResponse } from "next/server";
import { getWorkerInvocationAuth } from "../../../../../../lib/auth";
import { publishScheduledPostFromWorker } from "../../../../../../lib/schedules";

interface RouteContext {
  params: Promise<{
    postId: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await getWorkerInvocationAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.kind !== "secret") {
    return NextResponse.json({ error: "Worker secret authentication required." }, { status: 403 });
  }

  const { postId } = await context.params;

  try {
    const result = await publishScheduledPostFromWorker(postId);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Worker publish request failed." },
      { status: 400 }
    );
  }
}
