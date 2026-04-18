import { PlatformDefinition, PlatformKey } from "./types";

interface StaticPlatformDefinition {
  key: PlatformKey;
  label: string;
  authType: PlatformDefinition["authType"];
  supportsImage: boolean;
  constraints: string[];
}

export const PLATFORM_DEFINITIONS: StaticPlatformDefinition[] = [
  {
    key: "telegram",
    label: "Telegram",
    authType: "bot_token",
    supportsImage: true,
    constraints: ["Requires bot token", "Requires default chat or channel target", "Uses sendMessage/sendPhoto"]
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    authType: "oauth",
    supportsImage: true,
    constraints: ["Member profile posting only", "Requires w_member_social", "Token re-connect needed after expiry"]
  },
  {
    key: "reddit",
    label: "Reddit",
    authType: "oauth",
    supportsImage: false,
    constraints: ["Self-post only", "Requires subreddit + title", "Images ignored in v1"]
  },
  {
    key: "x",
    label: "X",
    authType: "oauth",
    supportsImage: true,
    constraints: ["User context only", "Single post only", "Usage limits depend on app access"]
  }
];

export function isPlatformKey(value: string): value is PlatformKey {
  return PLATFORM_DEFINITIONS.some((platform) => platform.key === value);
}

export function getStaticPlatform(platform: PlatformKey): StaticPlatformDefinition {
  const match = PLATFORM_DEFINITIONS.find((item) => item.key === platform);
  if (!match) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return match;
}

export function getDefaultPlatformDefinitions(): PlatformDefinition[] {
  return PLATFORM_DEFINITIONS.map((platform) => ({
    ...platform,
    connected: false,
    needsReconnect: false,
    supportsScheduling: false,
    accountLabel: undefined,
    warnings: platform.key === "reddit" ? ["Reddit publishes self-posts only and ignores the shared image in v1."] : []
  }));
}
