import { PlatformAdapter } from "./base";
import { readAccessToken } from "../../lib/connections";

export const redditAdapter: PlatformAdapter = {
  key: "reddit",
  async publish(payload, _schedule, connection) {
    const accessToken = readAccessToken(connection);
    const reddit = payload.platformOptions?.reddit;

    if (!accessToken) {
      return { ok: false, error: "Reddit access token missing.", retryable: false };
    }

    if (!reddit?.subreddit || !reddit.title) {
      return { ok: false, error: "Reddit requires subreddit and title.", retryable: false };
    }

    const body = new URLSearchParams({
      api_type: "json",
      kind: "self",
      sr: reddit.subreddit,
      title: reddit.title,
      text: payload.content,
      resubmit: "true"
    });

    const response = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "centipede/1.0"
      },
      body
    });

    const data = (await response.json().catch(() => null)) as
      | {
          json?: {
            data?: {
              id?: string;
              url?: string;
            };
            errors?: [string, string, string][];
          };
          message?: string;
        }
      | null;

    const errors = data?.json?.errors || [];
    if (!response.ok || errors.length > 0) {
      const errorMessage = errors[0]?.[1] || data?.message || "Reddit publish failed.";
      return {
        ok: false,
        error: errorMessage,
        retryable: response.status >= 500
      };
    }

    return {
      ok: true,
      externalId: data?.json?.data?.id,
      externalUrl: data?.json?.data?.url
    };
  }
};
