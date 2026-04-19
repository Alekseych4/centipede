import { UserPlatformConnection } from "@prisma/client";
import { PlatformKey, RedditPlatformOptions, ScheduledPost } from "../../lib/types";

export interface PublishPayload {
  postId: string;
  platform: PlatformKey;
  content: string;
  image?: ScheduledPost["image"];
  platformOptions?: {
    reddit?: RedditPlatformOptions;
  };
}

export interface AdapterPublishResult {
  ok: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  retryable?: boolean;
  requiresReconnect?: boolean;
}

export interface PlatformAdapter {
  key: PlatformKey;
  publish(
    payload: PublishPayload,
    schedule: ScheduledPost,
    connection: UserPlatformConnection
  ): Promise<AdapterPublishResult>;
}
