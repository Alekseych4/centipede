export type PlatformKey = "telegram" | "x" | "reddit" | "linkedin";

export interface PlatformDefinition {
  key: PlatformKey;
  label: string;
  connected: boolean;
  authType: "bot_token" | "oauth";
  constraints: string[];
}

export interface ScheduleRequest {
  content: string;
  imageUrl?: string;
  idempotencyKey?: string;
  selectedPlatforms: PlatformKey[];
  scheduleAtUtc: string;
  variants?: Partial<Record<PlatformKey, string>>;
}

export interface ScheduledPost extends ScheduleRequest {
  id: string;
  status: "queued" | "partially_published" | "published" | "failed";
  createdAt: string;
}

export type QueueJobStatus = "queued" | "processing" | "published" | "failed";

export interface PublishJob {
  id: string;
  postId: string;
  platform: PlatformKey;
  status: QueueJobStatus;
  scheduledAtUtc: string;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FailureLog {
  id: string;
  jobId: string;
  platform: PlatformKey;
  message: string;
  attempt: number;
  createdAt: string;
}

export interface HistoryResponseItem {
  post: ScheduledPost;
  jobs: PublishJob[];
}

export interface WorkerTickResult {
  processed: number;
  succeeded: number;
  failed: number;
  remainingQueued: number;
}
