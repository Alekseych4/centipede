import type { NextApiRequest, NextApiResponse } from "next";
import { listFailureLogs, listHistory } from "../../lib/mockStore";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ items: listHistory(), failures: listFailureLogs() });
}
