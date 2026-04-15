import type { NextApiRequest, NextApiResponse } from "next";
import { createSchedule } from "../../lib/mockStore";
import { ScheduleRequest } from "../../lib/types";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const payload = req.body as ScheduleRequest;

  if (!payload?.content?.trim()) {
    res.status(400).json({ error: "Content is required." });
    return;
  }

  if (!Array.isArray(payload.selectedPlatforms) || payload.selectedPlatforms.length === 0) {
    res.status(400).json({ error: "Select at least one platform." });
    return;
  }

  if (!payload.scheduleAtUtc) {
    res.status(400).json({ error: "scheduleAtUtc is required." });
    return;
  }

  if (Number.isNaN(new Date(payload.scheduleAtUtc).valueOf())) {
    res.status(400).json({ error: "scheduleAtUtc must be a valid ISO date." });
    return;
  }

  const created = createSchedule(payload);
  res.status(201).json({ item: created });
}
