import { put } from "@vercel/blob";
import { MediaAsset, UploadMediaRequest } from "./types";

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned || `upload-${Date.now()}`;
}

function extractExtension(fileName?: string, mimeType?: string): string {
  if (fileName && fileName.includes(".")) {
    return fileName.split(".").pop() || "bin";
  }

  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

async function buildUploadBody(payload: UploadMediaRequest): Promise<{
  body: Blob;
  fileName: string;
  mimeType: string;
}> {
  if (payload.dataUrl) {
    const match = payload.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid data URL.");
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const extension = extractExtension(payload.fileName, mimeType);
    return {
      body: new Blob([buffer], { type: mimeType }),
      fileName: sanitizeFileName(payload.fileName || `image.${extension}`),
      mimeType
    };
  }

  if (payload.remoteUrl) {
    const response = await fetch(payload.remoteUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch remote image.");
    }

    const mimeType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = extractExtension(payload.fileName, mimeType);

    return {
      body: new Blob([buffer], { type: mimeType }),
      fileName: sanitizeFileName(payload.fileName || `remote-image.${extension}`),
      mimeType
    };
  }

  throw new Error("Provide either dataUrl or remoteUrl.");
}

export async function uploadMediaAsset(userId: string, payload: UploadMediaRequest): Promise<MediaAsset> {
  const { body, fileName, mimeType } = await buildUploadBody(payload);
  const pathname = `scheduled/${userId}/${Date.now()}-${fileName}`;
  const blob = await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    contentType: mimeType
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    mimeType,
    sizeBytes: body.size
  };
}
