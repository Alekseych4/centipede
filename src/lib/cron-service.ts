import { requireEnv } from "./env";
import { ScheduledPost } from "./types";

function getCronServiceUrl(): string {
  return requireEnv("CRON_SERVICE_URL").replace(/\/+$/, "");
}

async function callCron(path: string, init: RequestInit): Promise<void> {
  const baseUrl = getCronServiceUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-cron-secret": requireEnv("CRON_API_SECRET"),
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    let message = `Cron service request failed with HTTP ${response.status}.`;

    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error.trim()) {
        message = body.error;
      }
    } catch {
      const text = await response.text().catch(() => "");
      if (text.trim()) {
        message = text.trim();
      }
    }

    throw new Error(message);
  }
}

export async function registerCronJob(post: ScheduledPost): Promise<void> {
  await callCron("/jobs", {
    method: "POST",
    body: JSON.stringify({
      postId: post.id,
      scheduledAtUtc: post.scheduleAtUtc,
      idempotencyKey: post.idempotencyKey
    })
  });
}

export async function updateCronJob(post: ScheduledPost): Promise<void> {
  await callCron(`/jobs/${encodeURIComponent(post.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      scheduledAtUtc: post.scheduleAtUtc,
      idempotencyKey: post.idempotencyKey
    })
  });
}

export async function cancelCronJob(postId: string): Promise<void> {
  await callCron(`/jobs/${encodeURIComponent(postId)}`, {
    method: "DELETE"
  });
}

export async function triggerCronJobNow(postId: string): Promise<void> {
  await callCron(`/jobs/${encodeURIComponent(postId)}/run-now`, {
    method: "POST"
  });
}
