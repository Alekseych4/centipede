import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { requireEnv } from "./env";

function getKey(): Buffer {
  return createHash("sha256").update(requireEnv("CONNECTION_ENCRYPTION_KEY")).digest();
}

export function encryptValue(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptValue(payload?: string | null): string | undefined {
  if (!payload) {
    return undefined;
  }

  const [ivBase64, tagBase64, encryptedBase64] = payload.split(".");
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted payload.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function encryptJson(value: unknown): string {
  return encryptValue(JSON.stringify(value));
}

export function decryptJson<T>(payload?: string | null): T | undefined {
  const value = decryptValue(payload);
  return value ? (JSON.parse(value) as T) : undefined;
}
