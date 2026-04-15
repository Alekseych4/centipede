import { PlatformAdapter } from "./adapters/base";
import { linkedinAdapter } from "./adapters/linkedin";
import { redditAdapter } from "./adapters/reddit";
import { telegramAdapter } from "./adapters/telegram";
import { xAdapter } from "./adapters/x";
import { PlatformKey } from "../lib/types";

const adapters: Record<PlatformKey, PlatformAdapter> = {
  telegram: telegramAdapter,
  x: xAdapter,
  reddit: redditAdapter,
  linkedin: linkedinAdapter
};

export function getAdapter(platform: PlatformKey): PlatformAdapter {
  return adapters[platform];
}
