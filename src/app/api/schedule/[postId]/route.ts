import { NextResponse } from "next/server";
import { requireUserId } from "../../../../lib/auth";
import { cancelCronJob, updateCronJob } from "../../../../lib/cron-service";
import { cancelScheduledPost, updateScheduledPost } from "../../../../lib/schedules";
import { ScheduleRequest } from "../../../../lib/types";

interface RouteContext {
  params: Promise<{
    postId: string;
  }>;
}

async function bestEffortCronUpdate(postId: string, operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron service error.";
    console.warn(`Cron service update failed for post ${postId}: ${message}`);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  const { postId } = await context.params;

  try {
    const payload = (await request.json()) as ScheduleRequest;
    const item = await updateScheduledPost(userId, postId, payload);
    await bestEffortCronUpdate(postId, () => updateCronJob(item));
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schedule update failed." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  const { postId } = await context.params;

  try {
    const item = await cancelScheduledPost(userId, postId);
    await bestEffortCronUpdate(postId, () => cancelCronJob(postId));
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schedule cancel failed." },
      { status: 400 }
    );
  }
}
