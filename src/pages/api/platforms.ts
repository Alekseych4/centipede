import type { NextApiRequest, NextApiResponse } from "next";
import { listPlatforms } from "../../lib/mockStore";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ platforms: listPlatforms() });
}
