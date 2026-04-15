import { PlatformAdapter, PublishPayload } from "./base";
import { ScheduleRequest } from "../../lib/types";

export const linkedinAdapter: PlatformAdapter = {
  key: "linkedin",
  async publish(payload: PublishPayload, _schedule: ScheduleRequest) {
    if (payload.content.length > 3000) {
      return { ok: false, error: "LinkedIn content too long." };
    }
    return { ok: true, externalId: `ln_${payload.postId}` };
  }
};
