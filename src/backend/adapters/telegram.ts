import { PlatformAdapter, PublishPayload } from "./base";
import { ScheduleRequest } from "../../lib/types";

export const telegramAdapter: PlatformAdapter = {
  key: "telegram",
  async publish(payload: PublishPayload, _schedule: ScheduleRequest) {
    if (payload.imageUrl && payload.imageUrl.length > 2048) {
      return { ok: false, error: "Telegram rejected image URL." };
    }
    return { ok: true, externalId: `tg_${payload.postId}` };
  }
};
