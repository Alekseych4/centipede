import { PlatformAdapter, PublishPayload } from "./base";
import { ScheduleRequest } from "../../lib/types";

export const xAdapter: PlatformAdapter = {
  key: "x",
  async publish(payload: PublishPayload, _schedule: ScheduleRequest) {
    if (payload.content.length > 280) {
      return { ok: false, error: "X content too long for MVP single post mode." };
    }
    return { ok: true, externalId: `x_${payload.postId}` };
  }
};
