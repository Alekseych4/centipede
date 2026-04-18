import { UserPlatformConnection } from "@prisma/client";
import { prisma } from "./db";
import { decryptJson, decryptValue, encryptJson, encryptValue } from "./crypto";
import { getStaticPlatform, PLATFORM_DEFINITIONS } from "./platforms";
import { ConnectionStatus, PlatformConnectionSnapshot, PlatformDefinition, PlatformKey } from "./types";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

interface XConfig {
  codeVerifier?: string;
}

export interface PlatformCredentials {
  accessToken?: string;
  refreshToken?: string;
  tokenSecret?: string;
  config?: Record<string, unknown>;
}

function toConnectionStatus(record?: UserPlatformConnection | null): ConnectionStatus {
  if (!record) {
    return "disconnected";
  }

  if (record.status === "reconnect_required") {
    return "reconnect_required";
  }

  return "connected";
}

export function readConnectionConfig<T>(record?: UserPlatformConnection | null): T | undefined {
  return decryptJson<T>(record?.encryptedConfig);
}

export function readAccessToken(record?: UserPlatformConnection | null): string | undefined {
  return decryptValue(record?.encryptedAccessToken);
}

export function readRefreshToken(record?: UserPlatformConnection | null): string | undefined {
  return decryptValue(record?.encryptedRefreshToken);
}

export function readTokenSecret(record?: UserPlatformConnection | null): string | undefined {
  return decryptValue(record?.encryptedTokenSecret);
}

export async function getConnection(userId: string, platform: PlatformKey): Promise<UserPlatformConnection | null> {
  return prisma.userPlatformConnection.findUnique({
    where: {
      userId_platform: {
        userId,
        platform
      }
    }
  });
}

export async function disconnectPlatform(userId: string, platform: PlatformKey): Promise<void> {
  await prisma.userPlatformConnection.deleteMany({
    where: {
      userId,
      platform
    }
  });
}

export async function saveTelegramConnection(userId: string, payload: TelegramConfig): Promise<void> {
  await prisma.userPlatformConnection.upsert({
    where: {
      userId_platform: {
        userId,
        platform: "telegram"
      }
    },
    create: {
      userId,
      platform: "telegram",
      status: "connected",
      accountLabel: payload.chatId,
      encryptedConfig: encryptJson(payload),
      scopes: []
    },
    update: {
      status: "connected",
      accountLabel: payload.chatId,
      encryptedConfig: encryptJson(payload),
      lastError: null,
      lastValidatedAt: new Date()
    }
  });
}

export async function saveOAuthConnection(input: {
  userId: string;
  platform: PlatformKey;
  accountLabel?: string;
  remoteAccountId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenSecret?: string;
  accessTokenExpiresAt?: Date;
  scopes?: string[];
  config?: Record<string, unknown>;
}): Promise<void> {
  await prisma.userPlatformConnection.upsert({
    where: {
      userId_platform: {
        userId: input.userId,
        platform: input.platform
      }
    },
    create: {
      userId: input.userId,
      platform: input.platform,
      status: "connected",
      accountLabel: input.accountLabel,
      remoteAccountId: input.remoteAccountId,
      encryptedAccessToken: encryptValue(input.accessToken),
      encryptedRefreshToken: input.refreshToken ? encryptValue(input.refreshToken) : null,
      encryptedTokenSecret: input.tokenSecret ? encryptValue(input.tokenSecret) : null,
      encryptedConfig: input.config ? encryptJson(input.config) : null,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      scopes: input.scopes || [],
      lastValidatedAt: new Date(),
      lastError: null
    },
    update: {
      status: "connected",
      accountLabel: input.accountLabel,
      remoteAccountId: input.remoteAccountId,
      encryptedAccessToken: encryptValue(input.accessToken),
      encryptedRefreshToken: input.refreshToken ? encryptValue(input.refreshToken) : null,
      encryptedTokenSecret: input.tokenSecret ? encryptValue(input.tokenSecret) : null,
      encryptedConfig: input.config ? encryptJson(input.config) : null,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      scopes: input.scopes || [],
      lastValidatedAt: new Date(),
      lastError: null
    }
  });
}

export async function markConnectionReconnectRequired(
  userId: string,
  platform: PlatformKey,
  error: string
): Promise<void> {
  await prisma.userPlatformConnection.updateMany({
    where: {
      userId,
      platform
    },
    data: {
      status: "reconnect_required",
      lastError: error
    }
  });
}

export async function listConnectionSnapshots(userId: string): Promise<Record<PlatformKey, PlatformConnectionSnapshot>> {
  const connections = await prisma.userPlatformConnection.findMany({
    where: { userId }
  });

  const byPlatform = new Map(connections.map((connection) => [connection.platform, connection]));

  return PLATFORM_DEFINITIONS.reduce((result, platform) => {
    const record = byPlatform.get(platform.key);
    result[platform.key] = {
      platform: platform.key,
      status: toConnectionStatus(record),
      accountLabel: record?.accountLabel || undefined,
      remoteAccountId: record?.remoteAccountId || undefined,
      needsReconnect: record?.status === "reconnect_required",
      lastError: record?.lastError || undefined
    };
    return result;
  }, {} as Record<PlatformKey, PlatformConnectionSnapshot>);
}

export async function listPlatforms(userId: string): Promise<PlatformDefinition[]> {
  const snapshots = await listConnectionSnapshots(userId);

  return PLATFORM_DEFINITIONS.map((platform) => {
    const snapshot = snapshots[platform.key];
    const warnings = snapshot.needsReconnect ? ["Reconnect required before scheduling."] : [];

    if (platform.key === "reddit") {
      warnings.push("Reddit publishes self-posts only and ignores the shared image in v1.");
    }

    return {
      ...platform,
      connected: snapshot.status === "connected",
      needsReconnect: snapshot.needsReconnect,
      supportsScheduling: snapshot.status === "connected",
      accountLabel: snapshot.accountLabel,
      warnings,
      constraints: getStaticPlatform(platform.key).constraints
    };
  });
}

export function requireTelegramConfig(connection: UserPlatformConnection): TelegramConfig {
  const config = readConnectionConfig<TelegramConfig>(connection);
  if (!config?.botToken || !config.chatId) {
    throw new Error("Telegram connection is missing required configuration.");
  }

  return config;
}

export function readXConfig(connection: UserPlatformConnection): XConfig | undefined {
  return readConnectionConfig<XConfig>(connection);
}
