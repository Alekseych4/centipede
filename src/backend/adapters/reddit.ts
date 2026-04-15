import { PlatformAdapter, PublishPayload } from "./base";
import { ScheduleRequest } from "../../lib/types";

export const redditAdapter: PlatformAdapter = {
  key: "reddit",
  async publish(payload: PublishPayload, _schedule: ScheduleRequest) {
    if (!payload.content.trim()) {
      return { ok: false, error: "Reddit requires post content." };
    }
    return { ok: true, externalId: `rd_${payload.postId}` };
  }
};
