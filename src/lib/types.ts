export type PlatformKey = "telegram" | "x" | "reddit" | "linkedin";

export type PlatformAuthType = "bot_token" | "oauth";
export type ConnectionStatus = "connected" | "disconnected" | "reconnect_required";
export type ScheduledPostStatus = "queued" | "partially_published" | "published" | "failed";
export type QueueJobStatus = "queued" | "processing" | "published" | "failed";

export interface MediaAsset {
  url: string;
  pathname: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RedditPlatformOptions {
  subreddit: string;
  title: string;
}

export interface ScheduleRequest {
  content: string;
  idempotencyKey?: string;
  selectedPlatforms: PlatformKey[];
  scheduleAtUtc: string;
  image?: MediaAsset;
  variants?: Partial<Record<PlatformKey, string>>;
  platformOptions?: {
    reddit?: RedditPlatformOptions;
  };
}

export interface ScheduledPost extends ScheduleRequest {
  id: string;
  userId: string;
  idempotencyKey: string;
  status: ScheduledPostStatus;
  createdAt: string;
  updatedAt: string;
}

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
  externalId?: string;
  externalUrl?: string;
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

export interface PlatformDefinition {
  key: PlatformKey;
  label: string;
  authType: PlatformAuthType;
  connected: boolean;
  needsReconnect: boolean;
  supportsImage: boolean;
  supportsScheduling: boolean;
  accountLabel?: string;
  warnings: string[];
  constraints: string[];
}

export interface PlatformConnectionSnapshot {
  platform: PlatformKey;
  status: ConnectionStatus;
  accountLabel?: string;
  remoteAccountId?: string;
  needsReconnect: boolean;
  lastError?: string;
}

export interface WorkerInvocationAuth {
  kind: "clerk" | "secret";
  userId?: string;
}

export interface TelegramConnectionRequest {
  botToken: string;
  chatId: string;
}

export interface UploadMediaRequest {
  dataUrl?: string;
  remoteUrl?: string;
  fileName?: string;
}
