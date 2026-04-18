function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return readEnv(name);
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
