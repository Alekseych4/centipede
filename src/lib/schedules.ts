import { randomUUID } from "crypto";
import { Prisma, PublishJob as PrismaPublishJob, ScheduledPost as PrismaScheduledPost } from "@prisma/client";
import { getConnection, listPlatforms, markConnectionReconnectRequired } from "./connections";
import { prisma } from "./db";
import {
  FailureLog,
  HistoryResponseItem,
  MediaAsset,
  PlatformKey,
  PublishJob,
  RedditPlatformOptions,
  RichTextDocument,
  ScheduleRequest,
  ScheduledPost,
  ScheduledPostStatus,
  WorkerTickResult
} from "./types";
import type { AdapterPublishResult } from "../backend/adapters/base";
import { getAdapter } from "../backend/publisher";

const MAX_ATTEMPTS = 3;
const DEFAULT_WORKER_BATCH_SIZE = 25;
const DEFAULT_STALE_LOCK_MS = 15 * 60 * 1000;
type PublishJobWithPost = PrismaPublishJob & { post: PrismaScheduledPost };

interface ProcessDueJobsOptions {
  batchSize?: number;
  postId?: string;
  staleLockMs?: number;
  workerId?: string;
}

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

function normalizeRichTextDocument(value: Prisma.JsonValue | null | undefined): RichTextDocument | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  return value as RichTextDocument;
}

function normalizeVariantDocuments(
  value: Prisma.JsonValue | null | undefined
): Partial<Record<PlatformKey, RichTextDocument>> {
  if (!isObject(value)) {
    return {};
  }

  const result: Partial<Record<PlatformKey, RichTextDocument>> = {};
  for (const key of ["telegram", "x", "reddit", "linkedin"] as PlatformKey[]) {
    const candidate = value[key];
    if (isObject(candidate)) {
      result[key] = candidate as RichTextDocument;
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
    contentDocument: normalizeRichTextDocument(post.contentDocument),
    idempotencyKey: post.idempotencyKey,
    scheduleAtUtc: post.scheduleAtUtc.toISOString(),
    selectedPlatforms: post.selectedPlatforms as PlatformKey[],
    variants: normalizeVariants(post.variants),
    variantDocuments: normalizeVariantDocuments(post.variantDocuments),
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
  if (jobs.length > 0 && jobs.every((job) => job.status === "canceled")) {
    return "canceled";
  }
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

function assertEditablePost(status: string, jobs: PrismaPublishJob[]): void {
  if (status === "canceled") {
    throw new Error("Canceled posts cannot be edited or canceled.");
  }

  if (jobs.some((job) => job.status === "published" || job.status === "processing")) {
    throw new Error("Posts that are publishing or already published cannot be edited or canceled.");
  }
}

function getScheduleData(userId: string, payload: ScheduleRequest) {
  return {
    userId,
    content: payload.content,
    contentDocument: (payload.contentDocument || Prisma.DbNull) as Prisma.InputJsonValue,
    scheduleAtUtc: new Date(payload.scheduleAtUtc),
    imageUrl: payload.image?.url || null,
    imagePathname: payload.image?.pathname || null,
    imageMimeType: payload.image?.mimeType || null,
    imageSizeBytes: payload.image?.sizeBytes || null,
    selectedPlatforms: payload.selectedPlatforms,
    variants: (payload.variants || {}) as Prisma.InputJsonValue,
    variantDocuments: (payload.variantDocuments || {}) as Prisma.InputJsonValue,
    platformOptions: (payload.platformOptions || {}) as Prisma.InputJsonValue
  };
}

function getPublishJobCreateData(resolvedKey: string, payload: ScheduleRequest) {
  return payload.selectedPlatforms.map((platform) => ({
    platform,
    status: "queued",
    scheduledAtUtc: new Date(payload.scheduleAtUtc),
    idempotencyKey: `${resolvedKey}:${platform}`,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS
  }));
}

async function refreshPostStatus(postId: string): Promise<void> {
  const refreshedJobs = await prisma.publishJob.findMany({
    where: { postId }
  });

  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: computePostStatus(refreshedJobs)
    }
  });
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
      ...getScheduleData(userId, payload),
      idempotencyKey: resolvedKey,
      jobs: {
        create: getPublishJobCreateData(resolvedKey, payload)
      }
    }
  });

  return toScheduledPost(post);
}

export async function updateScheduledPost(
  userId: string,
  postId: string,
  payload: ScheduleRequest
): Promise<ScheduledPost> {
  validateCommonPayload(payload);
  await validatePlatformSelections(userId, payload);

  const existing = await prisma.scheduledPost.findFirst({
    where: {
      id: postId,
      userId
    },
    include: {
      jobs: true
    }
  });

  if (!existing) {
    throw new Error("Scheduled post not found.");
  }

  assertEditablePost(existing.status, existing.jobs);

  const resolvedKey = payload.idempotencyKey?.trim() || makeIdempotencyKey(payload);
  const duplicate = await prisma.scheduledPost.findUnique({
    where: { idempotencyKey: resolvedKey }
  });

  if (duplicate && duplicate.id !== postId) {
    throw new Error("A scheduled post with the same idempotency key already exists.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.publishJob.deleteMany({
      where: {
        postId
      }
    });

    return tx.scheduledPost.update({
      where: {
        id: postId
      },
      data: {
        ...getScheduleData(userId, payload),
        idempotencyKey: resolvedKey,
        status: "queued",
        jobs: {
          create: getPublishJobCreateData(resolvedKey, payload)
        }
      }
    });
  });

  return toScheduledPost(updated);
}

export async function cancelScheduledPost(userId: string, postId: string): Promise<ScheduledPost> {
  const existing = await prisma.scheduledPost.findFirst({
    where: {
      id: postId,
      userId
    },
    include: {
      jobs: true
    }
  });

  if (!existing) {
    throw new Error("Scheduled post not found.");
  }

  assertEditablePost(existing.status, existing.jobs);

  const canceled = await prisma.$transaction(async (tx) => {
    await tx.publishJob.updateMany({
      where: {
        postId
      },
      data: {
        status: "canceled",
        lockedBy: null,
        lockedAt: null
      }
    });

    return tx.scheduledPost.update({
      where: {
        id: postId
      },
      data: {
        status: "canceled"
      }
    });
  });

  return toScheduledPost(canceled);
}

export async function createAndSendSchedule(
  userId: string,
  payload: ScheduleRequest
): Promise<{ item: ScheduledPost; result: WorkerTickResult }> {
  const now = new Date();
  const item = await createSchedule(userId, {
    ...payload,
    scheduleAtUtc: now.toISOString()
  });
  const result = await sendQueuedPostNow(userId, item.id, now);

  return { item, result };
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

async function processJobs(due: PublishJobWithPost[], userId?: string): Promise<WorkerTickResult> {
  let succeeded = 0;
  let failed = 0;

  for (const job of due) {
    const post = toScheduledPost(job.post);
    const connection = await getConnection(post.userId, job.platform as PlatformKey);

    if (!connection || connection.status !== "connected") {
      const error = "Platform connection is missing or requires reconnection.";
      await prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: error,
          lockedBy: null,
          lockedAt: null
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
      await refreshPostStatus(post.id);
      failed += 1;
      continue;
    }

    const adapter = getAdapter(job.platform as PlatformKey);
    let result: AdapterPublishResult;

    try {
      result = await adapter.publish(
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
    } catch (error) {
      result = {
        ok: false,
        error: error instanceof Error ? error.message : "Publish failed.",
        retryable: true
      };
    }

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
          externalUrl: result.externalUrl,
          lockedBy: null,
          lockedAt: null
        }
      });
      succeeded += 1;
    } else {
      const finalStatus = result.retryable === false || attempts >= job.maxAttempts ? "failed" : "queued";
      const message = result.error || "Unknown publish error.";

      if (result.requiresReconnect) {
        await markConnectionReconnectRequired(post.userId, job.platform as PlatformKey, message);
      }

      await prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: finalStatus,
          attempts,
          lastError: message,
          lockedBy: null,
          lockedAt: null
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

    await refreshPostStatus(post.id);
  }

  return {
    processed: due.length,
    succeeded,
    failed,
    remainingQueued: await prisma.publishJob.count({
      where: {
        status: "queued",
        ...(userId
          ? {
              post: {
                userId
              }
            }
          : {})
      }
    })
  };
}

async function recoverStaleProcessingJobs(now: Date, userId: string | undefined, options: ProcessDueJobsOptions): Promise<void> {
  const staleLockMs = options.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
  const staleBefore = new Date(now.valueOf() - staleLockMs);

  await prisma.publishJob.updateMany({
    where: {
      status: "processing",
      lockedAt: {
        lt: staleBefore
      },
      ...(options.postId ? { postId: options.postId } : {}),
      ...(userId
        ? {
            post: {
              userId
            }
          }
        : {})
    },
    data: {
      status: "queued",
      lockedBy: null,
      lockedAt: null
    }
  });
}

async function claimDueJobs(now: Date, userId: string | undefined, options: ProcessDueJobsOptions): Promise<PublishJobWithPost[]> {
  const workerId = options.workerId || `worker-${randomUUID()}`;
  const batchSize = options.batchSize ?? DEFAULT_WORKER_BATCH_SIZE;
  const userFilter = userId ? Prisma.sql`AND p."userId" = ${userId}` : Prisma.empty;
  const postFilter = options.postId ? Prisma.sql`AND due."postId" = ${options.postId}` : Prisma.empty;

  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "PublishJob" AS j
    SET
      "status" = 'processing',
      "lockedBy" = ${workerId},
      "lockedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE j."id" IN (
      SELECT due."id"
      FROM "PublishJob" AS due
      INNER JOIN "ScheduledPost" AS p ON p."id" = due."postId"
      WHERE due."status" = 'queued'
        AND due."scheduledAtUtc" <= ${now}
        ${userFilter}
        ${postFilter}
      ORDER BY due."scheduledAtUtc" ASC
      LIMIT ${batchSize}
      FOR UPDATE OF due SKIP LOCKED
    )
    RETURNING j."id"
  `;

  if (claimed.length === 0) {
    return [];
  }

  return prisma.publishJob.findMany({
    where: {
      id: {
        in: claimed.map((job) => job.id)
      }
    },
    include: {
      post: true
    },
    orderBy: {
      scheduledAtUtc: "asc"
    }
  });
}

export async function processDueJobs(
  now = new Date(),
  userId?: string,
  options: ProcessDueJobsOptions = {}
): Promise<WorkerTickResult> {
  await recoverStaleProcessingJobs(now, userId, options);
  const due = await claimDueJobs(now, userId, options);

  return processJobs(due, userId);
}

export async function publishScheduledPostFromWorker(postId: string, now = new Date()): Promise<WorkerTickResult> {
  const post = await prisma.scheduledPost.findUnique({
    where: {
      id: postId
    }
  });

  if (!post) {
    throw new Error("Scheduled post not found.");
  }

  if (post.status === "canceled") {
    throw new Error("Canceled posts cannot be published.");
  }

  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      scheduleAtUtc: now
    }
  });

  await prisma.publishJob.updateMany({
    where: {
      postId,
      status: "queued"
    },
    data: {
      scheduledAtUtc: now
    }
  });

  return processDueJobs(now, undefined, {
    postId,
    batchSize: 100,
    workerId: `external-cron-${randomUUID()}`
  });
}

export async function sendQueuedPostNow(
  userId: string,
  postId: string,
  now = new Date()
): Promise<WorkerTickResult> {
  const post = await prisma.scheduledPost.findFirst({
    where: {
      id: postId,
      userId
    }
  });

  if (!post) {
    throw new Error("Scheduled post not found.");
  }

  if (post.status === "canceled") {
    throw new Error("Canceled posts cannot be sent.");
  }

  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      scheduleAtUtc: now
    }
  });

  await prisma.publishJob.updateMany({
    where: {
      postId,
      status: "queued"
    },
    data: {
      scheduledAtUtc: now
    }
  });

  return processDueJobs(now, userId, {
    postId,
    batchSize: 100,
    workerId: `send-now-${randomUUID()}`
  });
}
