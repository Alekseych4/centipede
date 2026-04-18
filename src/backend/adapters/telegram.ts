import { PlatformAdapter } from "./base";
import { requireTelegramConfig } from "../../lib/connections";

export const telegramAdapter: PlatformAdapter = {
  key: "telegram",
  async publish(payload, _schedule, connection) {
    const config = requireTelegramConfig(connection);
    const endpoint = payload.image ? "sendPhoto" : "sendMessage";
    const url = `https://api.telegram.org/bot${config.botToken}/${endpoint}`;

    const body = payload.image
      ? {
          chat_id: config.chatId,
          photo: payload.image.url,
          caption: payload.content
        }
      : {
          chat_id: config.chatId,
          text: payload.content
        };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; result?: { message_id?: number } ; description?: string }
      | null;

    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.description || "Telegram publish failed.",
        retryable: response.status >= 500
      };
    }

    return {
      ok: true,
      externalId: data.result?.message_id ? String(data.result.message_id) : undefined
    };
  }
};
