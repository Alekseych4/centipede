import { PlatformAdapter } from "./base";
import { readAccessToken } from "../../lib/connections";

async function registerLinkedInUpload(accessToken: string, author: string) {
  const response = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: author,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent"
          }
        ]
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "LinkedIn upload registration failed.");
  }

  const uploadMechanism = data.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"];
  return {
    asset: data.value?.asset as string | undefined,
    uploadUrl: uploadMechanism?.uploadUrl as string | undefined
  };
}

async function uploadLinkedInImage(uploadUrl: string, imageUrl: string) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image for LinkedIn upload.");
  }

  const buffer = await imageResponse.arrayBuffer();
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: Buffer.from(buffer)
  });

  if (!uploadResponse.ok) {
    throw new Error("LinkedIn image upload failed.");
  }
}

export const linkedinAdapter: PlatformAdapter = {
  key: "linkedin",
  async publish(payload, _schedule, connection) {
    const accessToken = readAccessToken(connection);
    if (!accessToken) {
      return { ok: false, error: "LinkedIn access token missing.", retryable: false, requiresReconnect: true };
    }

    if (connection.accessTokenExpiresAt && connection.accessTokenExpiresAt < new Date()) {
      return { ok: false, error: "LinkedIn connection expired; reconnect required.", retryable: false, requiresReconnect: true };
    }

    const author = connection.remoteAccountId?.startsWith("urn:li:person:")
      ? connection.remoteAccountId
      : `urn:li:person:${connection.remoteAccountId}`;

    let media;
    if (payload.image) {
      const upload = await registerLinkedInUpload(accessToken, author);
      if (!upload.asset || !upload.uploadUrl) {
        return { ok: false, error: "LinkedIn upload registration failed.", retryable: true };
      }

      await uploadLinkedInImage(upload.uploadUrl, payload.image.url);
      media = [
        {
          status: "READY",
          media: upload.asset
        }
      ];
    }

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: payload.content
            },
            shareMediaCategory: media ? "IMAGE" : "NONE",
            media
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const authFailure = response.status === 401 || response.status === 403;
      return {
        ok: false,
        error: data?.message || "LinkedIn publish failed.",
        retryable: authFailure ? false : response.status >= 500,
        requiresReconnect: authFailure
      };
    }

    return {
      ok: true,
      externalId: response.headers.get("x-restli-id") || undefined
    };
  }
};
