const ENV_ALIASES: Partial<Record<string, string[]>> = {
  DATABASE_URL: ["STORAGE_DATABASE_URL"]
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function readEnvWithAliases(name: string): string | undefined {
  const directValue = readEnv(name);
  if (directValue) {
    return directValue;
  }

  const aliases = ENV_ALIASES[name] || [];
  for (const alias of aliases) {
    const aliasedValue = readEnv(alias);
    if (aliasedValue) {
      return aliasedValue;
    }
  }

  return undefined;
}

export function requireEnv(name: string): string {
  const value = readEnvWithAliases(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return readEnvWithAliases(name);
}

export function getBaseUrl(requestUrl?: string): string {
  const configured =
    optionalEnv("APP_URL") ||
    optionalEnv("NEXT_PUBLIC_APP_URL") ||
    optionalEnv("NEXT_PUBLIC_VERCEL_URL") ||
    optionalEnv("VERCEL_URL");

  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return "http://localhost:3000";
}
