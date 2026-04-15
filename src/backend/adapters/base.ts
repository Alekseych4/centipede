import { PlatformKey, ScheduleRequest } from "../../lib/types";

export interface PublishPayload {
  postId: string;
  platform: PlatformKey;
  content: string;
  imageUrl?: string;
}

export interface AdapterPublishResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

export interface PlatformAdapter {
  key: PlatformKey;
  publish(payload: PublishPayload, schedule: ScheduleRequest): Promise<AdapterPublishResult>;
}
