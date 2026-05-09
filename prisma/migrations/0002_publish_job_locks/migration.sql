ALTER TABLE "PublishJob" ADD COLUMN "lockedBy" TEXT;
ALTER TABLE "PublishJob" ADD COLUMN "lockedAt" TIMESTAMP(3);

CREATE INDEX "PublishJob_status_lockedAt_idx" ON "PublishJob"("status", "lockedAt");
