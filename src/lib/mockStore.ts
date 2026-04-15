import { getAdapter } from "../backend/publisher";
import {
  FailureLog,
  HistoryResponseItem,
  PlatformDefinition,
  PlatformKey,
  PublishJob,
  ScheduledPost,
  ScheduleRequest,
  WorkerTickResult
} from "./types";

const MAX_ATTEMPTS = 3;

const platforms: PlatformDefinition[] = [
  {
    key: "telegram",
    label: "Telegram",
    connected: true,
    authType: "bot_token",
    constraints: ["Bot token only", "Easy integration", "sendMessage/sendPhoto"]
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    connected: true,
    authType: "oauth",
    constraints: ["OAuth scopes needed", "More complex media flow", "Strict permissions"]
  },
  {
    key: "reddit",
    label: "Reddit",
    connected: false,
    authType: "oauth",
    constraints: ["OAuth required", "Subreddit policy constraints", "Approval process risk"]
  },
  {
    key: "x",
    label: "X",
    connected: true,
    authType: "oauth",
    constraints: ["OAuth required", "Rate limits", "Usage-based API cost"]
  }
];

const posts: ScheduledPost[] = [];
const jobs: PublishJob[] = [];
const failureLogs: FailureLog[] = [];
const idempotencyMap = new Map<string, string>();

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeIdempotencyKey(payload: ScheduleRequest): string {
  return `${payload.scheduleAtUtc}|${payload.selectedPlatforms.sort().join(",")}|${payload.content}`;
}

export function listPlatforms(): PlatformDefinition[] {
  return platforms;
}

export function listHistory(): HistoryResponseItem[] {
  return [...posts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((post) => ({
      post,
      jobs: jobs.filter((job) => job.postId === post.id)
    }));
}

function computePostStatus(postId: string): ScheduledPost["status"] {
  const postJobs = jobs.filter((job) => job.postId === postId);
  if (postJobs.every((job) => job.status === "published")) {
    return "published";
  }
  if (postJobs.every((job) => job.status === "failed")) {
    return "failed";
  }
  if (postJobs.some((job) => job.status === "published")) {
    return "partially_published";
  }
  return "queued";
}

export function createSchedule(payload: ScheduleRequest): ScheduledPost {
  const resolvedKey = payload.idempotencyKey?.trim() || makeIdempotencyKey(payload);
  const existingPostId = idempotencyMap.get(resolvedKey);
  if (existingPostId) {
    const existing = posts.find((item) => item.id === existingPostId);
    if (existing) {
      return existing;
    }
  }

  const now = new Date().toISOString();
  const post: ScheduledPost = {
    ...payload,
    id: generateId("pst"),
    idempotencyKey: resolvedKey,
    status: "queued",
    createdAt: now
  };

  posts.push(post);
  idempotencyMap.set(resolvedKey, post.id);

  for (const platform of payload.selectedPlatforms) {
    const job: PublishJob = {
      id: generateId("job"),
      postId: post.id,
      platform,
      status: "queued",
      scheduledAtUtc: payload.scheduleAtUtc,
      idempotencyKey: `${resolvedKey}:${platform}`,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      createdAt: now,
      updatedAt: now
    };
    jobs.push(job);
  }

  return post;
}

function getPayloadForPlatform(post: ScheduledPost, platform: PlatformKey): string {
  const variant = post.variants?.[platform]?.trim();
  return variant || post.content;
}

export async function processDueJobs(now = new Date()): Promise<WorkerTickResult> {
  const nowIso = now.toISOString();
  const due = jobs.filter((job) => job.status === "queued" && job.scheduledAtUtc <= nowIso);
  let succeeded = 0;
  let failed = 0;

  for (const job of due) {
    const post = posts.find((item) => item.id === job.postId);
    if (!post) {
      continue;
    }
    job.status = "processing";
    job.updatedAt = new Date().toISOString();

    const adapter = getAdapter(job.platform);
    const result = await adapter.publish(
      {
        postId: post.id,
        platform: job.platform,
        content: getPayloadForPlatform(post, job.platform),
        imageUrl: post.imageUrl
      },
      post
    );

    job.attempts += 1;
    job.updatedAt = new Date().toISOString();

    if (result.ok) {
      job.status = "published";
      job.publishedAt = new Date().toISOString();
      job.lastError = undefined;
      succeeded += 1;
    } else {
      job.lastError = result.error || "Unknown publish error.";
      if (job.attempts >= job.maxAttempts) {
        job.status = "failed";
      } else {
        job.status = "queued";
      }
      failureLogs.push({
        id: generateId("log"),
        jobId: job.id,
        platform: job.platform,
        message: job.lastError,
        attempt: job.attempts,
        createdAt: new Date().toISOString()
      });
      failed += 1;
    }

    post.status = computePostStatus(post.id);
  }

  return {
    processed: due.length,
    succeeded,
    failed,
    remainingQueued: jobs.filter((job) => job.status === "queued").length
  };
}

export function listFailureLogs(): FailureLog[] {
  return [...failureLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
