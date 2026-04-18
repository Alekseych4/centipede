import { randomBytes, createHash } from "crypto";

export function createStateToken(): string {
  return randomBytes(24).toString("base64url");
}

export function createCodeVerifier(): string {
  return randomBytes(48).toString("base64url");
}

export function createCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
