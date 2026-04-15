import type { NextApiRequest, NextApiResponse } from "next";
import { processDueJobs } from "../../../lib/mockStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const result = await processDueJobs();
  res.status(200).json({ result });
}
