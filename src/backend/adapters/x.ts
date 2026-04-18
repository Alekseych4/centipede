import { PlatformAdapter } from "./base";
import { readAccessToken } from "../../lib/connections";

async function uploadXMedia(accessToken: string, imageUrl: string): Promise<string> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image for X upload.");
  }

  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const formData = new FormData();
  formData.append("media", new Blob([buffer], { type: contentType }), "upload.jpg");

  const uploadResponse = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: formData
  });

  const data = await uploadResponse.json().catch(() => null);
  if (!uploadResponse.ok || !data?.media_id_string) {
    throw new Error(data?.detail || data?.error || "X media upload failed.");
  }

  return data.media_id_string as string;
}

export const xAdapter: PlatformAdapter = {
  key: "x",
  async publish(payload, _schedule, connection) {
    const accessToken = readAccessToken(connection);
    if (!accessToken) {
      return { ok: false, error: "X access token missing.", retryable: false };
    }

    try {
      const mediaId = payload.image ? await uploadXMedia(accessToken, payload.image.url) : undefined;
      const response = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: payload.content,
          ...(mediaId
            ? {
                media: {
                  media_ids: [mediaId]
                }
              }
            : {})
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.data?.id) {
        return {
          ok: false,
          error: data?.detail || data?.title || "X publish failed.",
          retryable: response.status >= 500
        };
      }

      return {
        ok: true,
        externalId: data.data.id as string,
        externalUrl: connection.remoteAccountId
          ? `https://x.com/${connection.remoteAccountId}/status/${data.data.id}`
          : undefined
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "X publish failed.",
        retryable: true
      };
    }
  }
};
