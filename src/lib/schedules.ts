import { Prisma, PublishJob as PrismaPublishJob, ScheduledPost as PrismaScheduledPost } from "@prisma/client";
import { getConnection, listPlatforms } from "./connections";
import { prisma } from "./db";
import {
  FailureLog,
  HistoryResponseItem,
  MediaAsset,
  PlatformKey,
  PublishJob,
  RedditPlatformOptions,
  ScheduleRequest,
  ScheduledPost,
  ScheduledPostStatus,
  WorkerTickResult
} from "./types";
import { getAdapter } from "../backend/publisher";

const MAX_ATTEMPTS = 3;

function makeIdempotencyKey(payload: ScheduleRequest): string {
  const selected = [...payload.selectedPlatforms].sort().join(",");
  return `${payload.scheduleAtUtc}|${selected}|${payload.content}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRedditOptions(payload: ScheduleRequest): RedditPlatformOptions | undefined {
  const reddit = payload.platformOptions?.reddit;
  if (!reddit) {
    return undefined;
  }

  return {
    subreddit: reddit.subreddit.trim(),
    title: reddit.title.trim()
  };
}

function normalizeVariants(value: Prisma.JsonValue | null | undefined): Partial<Record<PlatformKey, string>> {
  if (!isObject(value)) {
    return {};
  }

  const result: Partial<Record<PlatformKey, string>> = {};
  for (const key of ["telegram", "x", "reddit", "linkedin"] as PlatformKey[]) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      result[key] = candidate;
    }
  }
  return result;
}

function normalizeMedia(post: PrismaScheduledPost): MediaAsset | undefined {
  if (!post.imageUrl || !post.imagePathname || !post.imageMimeType || typeof post.imageSizeBytes !== "number") {
    return undefined;
  }

  return {
    url: post.imageUrl,
    pathname: post.imagePathname,
    mimeType: post.imageMimeType,
    sizeBytes: post.imageSizeBytes
  };
}

function toScheduledPost(post: PrismaScheduledPost): ScheduledPost {
  return {
    id: post.id,
    userId: post.userId,
    content: post.content,
    idempotencyKey: post.idempotencyKey,
    scheduleAtUtc: post.scheduleAtUtc.toISOString(),
    selectedPlatforms: post.selectedPlatforms as PlatformKey[],
    variants: normalizeVariants(post.variants),
    image: normalizeMedia(post),
    platformOptions: isObject(post.platformOptions)
      ? {
          reddit: isObject(post.platformOptions.reddit)
            ? {
                subreddit: String(post.platformOptions.reddit.subreddit || ""),
                title: String(post.platformOptions.reddit.title || "")
              }
            : undefined
        }
      : undefined,
    status: post.status as ScheduledPostStatus,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString()
  };
}

function toPublishJob(job: PrismaPublishJob): PublishJob {
  return {
    id: job.id,
    postId: job.postId,
    platform: job.platform as PlatformKey,
    status: job.status as PublishJob["status"],
    scheduledAtUtc: job.scheduledAtUtc.toISOString(),
    idempotencyKey: job.idempotencyKey,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    lastError: job.lastError || undefined,
    externalId: job.externalId || undefined,
    externalUrl: job.externalUrl || undefined,
    publishedAt: job.publishedAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}

function getPayloadForPlatform(post: ScheduledPost, platform: PlatformKey): string {
  const variant = post.variants?.[platform]?.trim();
  return variant || post.content;
}

function validateCommonPayload(payload: ScheduleRequest): void {
  if (!payload.content.trim()) {
    throw new Error("Content is required.");
  }

  if (!Array.isArray(payload.selectedPlatforms) || payload.selectedPlatforms.length === 0) {
    throw new Error("Select at least one platform.");
  }

  if (!payload.scheduleAtUtc || Number.isNaN(new Date(payload.scheduleAtUtc).valueOf())) {
    throw new Error("scheduleAtUtc must be a valid ISO date.");
  }
}

async function validatePlatformSelections(userId: string, payload: ScheduleRequest): Promise<void> {
  const platforms = await listPlatforms(userId);

  for (const platform of payload.selectedPlatforms) {
    const definition = platforms.find((item) => item.key === platform);
    if (!definition?.connected) {
      throw new Error(`${platform.toUpperCase()} is not connected.`);
    }
  }

  if (payload.selectedPlatforms.includes("reddit")) {
    const reddit = getRedditOptions(payload);
    if (!reddit?.subreddit || !reddit.title) {
      throw new Error("Reddit requires both subreddit and title.");
    }
  }

  if (payload.selectedPlatforms.includes("telegram") && payload.image) {
    const telegramContent = getPayloadForPlatform(
      {
        id: "",
        userId,
        content: payload.content,
        idempotencyKey: "",
        scheduleAtUtc: payload.scheduleAtUtc,
        selectedPlatforms: payload.selectedPlatforms,
        variants: payload.variants,
        image: payload.image,
        platformOptions: payload.platformOptions,
        status: "queued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      "telegram"
    );

    if (telegramContent.length > 1024) {
      throw new Error("Telegram image captions must be 1024 characters or fewer.");
    }
  }
}

function computePostStatus(jobs: PrismaPublishJob[]): ScheduledPostStatus {
  if (jobs.length > 0 && jobs.every((job) => job.status === "published")) {
    return "published";
  }
  if (jobs.length > 0 && jobs.every((job) => job.status === "failed")) {
    return "failed";
  }
  if (jobs.some((job) => job.status === "published")) {
    return "partially_published";
  }
  return "queued";
}

export async function createSchedule(userId: string, payload: ScheduleRequest): Promise<ScheduledPost> {
  validateCommonPayload(payload);
  await validatePlatformSelections(userId, payload);

  const resolvedKey = payload.idempotencyKey?.trim() || makeIdempotencyKey(payload);
  const existing = await prisma.scheduledPost.findUnique({
    where: { idempotencyKey: resolvedKey }
  });

  if (existing) {
    return toScheduledPost(existing);
  }

  const post = await prisma.scheduledPost.create({
    data: {
      userId,
      content: payload.content,
      idempotencyKey: resolvedKey,
      scheduleAtUtc: new Date(payload.scheduleAtUtc),
      imageUrl: payload.image?.url,
      imagePathname: payload.image?.pathname,
      imageMimeType: payload.image?.mimeType,
      imageSizeBytes: payload.image?.sizeBytes,
      selectedPlatforms: payload.selectedPlatforms,
      variants: payload.variants || {},
      platformOptions: (payload.platformOptions || {}) as Prisma.InputJsonValue,
      jobs: {
        create: payload.selectedPlatforms.map((platform) => ({
          platform,
          status: "queued",
          scheduledAtUtc: new Date(payload.scheduleAtUtc),
          idempotencyKey: `${resolvedKey}:${platform}`,
          attempts: 0,
          maxAttempts: MAX_ATTEMPTS
        }))
      }
    }
  });

  return toScheduledPost(post);
}

export async function listHistory(userId: string): Promise<HistoryResponseItem[]> {
  const posts = await prisma.scheduledPost.findMany({
    where: { userId },
    include: {
      jobs: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return posts.map((post) => ({
    post: toScheduledPost(post),
    jobs: post.jobs.map(toPublishJob)
  }));
}

export async function listFailureLogs(userId: string): Promise<FailureLog[]> {
  const logs = await prisma.failureLog.findMany({
    where: {
      job: {
        post: {
          userId
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return logs.map((log) => ({
    id: log.id,
    jobId: log.jobId,
    platform: log.platform as PlatformKey,
    message: log.message,
    attempt: log.attempt,
    createdAt: log.createdAt.toISOString()
  }));
}

export async function processDueJobs(now = new Date()): Promise<WorkerTickResult> {
  const due = await prisma.publishJob.findMany({
    where: {
      status: "queued",
      scheduledAtUtc: {
        lte: now
      }
    },
    include: {
      post: true
    },
    orderBy: {
      scheduledAtUtc: "asc"
    },
    take: 25
  });

  let succeeded = 0;
  let failed = 0;

  for (const job of due) {
    const post = toScheduledPost(job.post);
    const connection = await getConnection(post.userId, job.platform as PlatformKey);

    await prisma.publishJob.update({
      where: { id: job.id },
      data: {
        status: "processing"
      }
    });

    if (!connection || connection.status !== "connected") {
      const error = "Platform connection is missing or requires reconnection.";
      await prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: error
        }
      });
      await prisma.failureLog.create({
        data: {
          jobId: job.id,
          platform: job.platform,
          message: error,
          attempt: job.attempts + 1
        }
      });
      failed += 1;
      continue;
    }

    const adapter = getAdapter(job.platform as PlatformKey);
    const result = await adapter.publish(
      {
        postId: post.id,
        platform: job.platform as PlatformKey,
        content: getPayloadForPlatform(post, job.platform as PlatformKey),
        image: post.image,
        platformOptions: post.platformOptions
      },
      post,
      connection
    );

    const attempts = job.attempts + 1;

    if (result.ok) {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: "published",
          attempts,
          lastError: null,
          publishedAt: new Date(),
          externalId: result.externalId,
          externalUrl: result.externalUrl
        }
      });
      succeeded += 1;
    } else {
      const finalStatus = result.retryable === false || attempts >= job.maxAttempts ? "failed" : "queued";
      const message = result.error || "Unknown publish error.";

      await prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: finalStatus,
          attempts,
          lastError: message
        }
      });
      await prisma.failureLog.create({
        data: {
          jobId: job.id,
          platform: job.platform,
          message,
          attempt: attempts
        }
      });
      failed += 1;
    }

    const refreshedJobs = await prisma.publishJob.findMany({
      where: { postId: post.id }
    });

    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: computePostStatus(refreshedJobs)
      }
    });
  }

  return {
    processed: due.length,
    succeeded,
    failed,
    remainingQueued: await prisma.publishJob.count({
      where: { status: "queued" }
    })
  };
}
