import { randomUUID } from "crypto";
import { prisma } from "../lib/db";
import { optionalEnv } from "../lib/env";
import { processDueJobs } from "../lib/schedules";

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_STALE_LOCK_MS = 15 * 60 * 1000;

let stopping = false;

function readPositiveInteger(name: string, fallback: number): number {
  const raw = optionalEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function setupShutdownHandlers(): void {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      console.log(`[worker] Received ${signal}; stopping after the current tick.`);
      stopping = true;
    });
  }
}

async function run(): Promise<void> {
  const workerId = `scheduler-${process.pid}-${randomUUID()}`;
  const pollIntervalMs = readPositiveInteger("WORKER_POLL_INTERVAL_MS", DEFAULT_POLL_INTERVAL_MS);
  const batchSize = readPositiveInteger("WORKER_BATCH_SIZE", DEFAULT_BATCH_SIZE);
  const staleLockMs = readPositiveInteger("WORKER_STALE_LOCK_MS", DEFAULT_STALE_LOCK_MS);

  console.log(
    `[worker] Started ${workerId}; interval=${pollIntervalMs}ms batch=${batchSize} staleLock=${staleLockMs}ms.`
  );

  while (!stopping) {
    try {
      const result = await processDueJobs(new Date(), undefined, {
        batchSize,
        staleLockMs,
        workerId
      });

      console.log(
        `[worker] Tick processed=${result.processed} succeeded=${result.succeeded} failed=${result.failed} remainingQueued=${result.remainingQueued}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown worker error.";
      console.error(`[worker] Tick failed: ${message}`);
    }

    if (!stopping) {
      await sleep(pollIntervalMs);
    }
  }
}

setupShutdownHandlers();

run()
  .catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    console.error(`[worker] Fatal error: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("[worker] Stopped.");
  });
