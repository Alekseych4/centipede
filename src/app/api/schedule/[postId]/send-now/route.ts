import { NextResponse } from "next/server";
import { requireUserId } from "../../../../../lib/auth";
import { sendQueuedPostNow } from "../../../../../lib/schedules";

interface RouteContext {
  params: Promise<{
    postId: string;
  }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  const { postId } = await context.params;

  try {
    const result = await sendQueuedPostNow(userId, postId);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send now request failed." },
      { status: 400 }
    );
  }
}
