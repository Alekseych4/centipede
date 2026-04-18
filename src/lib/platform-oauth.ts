import { prisma } from "./db";
import { createCodeChallenge, createCodeVerifier, createStateToken } from "./oauth";
import { getBaseUrl, requireEnv } from "./env";
import { saveOAuthConnection } from "./connections";
import { PlatformKey } from "./types";

type OAuthProvider = Extract<PlatformKey, "x" | "reddit" | "linkedin">;

interface StoredState {
  provider: OAuthProvider;
  state: string;
  redirectUri: string;
  codeVerifier?: string;
}

async function storeState(userId: string, provider: OAuthProvider, redirectUri: string, codeVerifier?: string) {
  const state = createStateToken();
  await prisma.oAuthState.create({
    data: {
      provider,
      userId,
      state,
      redirectUri,
      codeVerifier,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  return state;
}

async function consumeState(provider: OAuthProvider, state: string): Promise<{ userId: string } & StoredState> {
  const record = await prisma.oAuthState.findUnique({
    where: { state }
  });

  if (!record || record.provider !== provider || record.expiresAt < new Date()) {
    throw new Error("OAuth state is missing or expired.");
  }

  await prisma.oAuthState.delete({
    where: { id: record.id }
  });

  return {
    userId: record.userId,
    provider,
    state: record.state,
    redirectUri: record.redirectUri,
    codeVerifier: record.codeVerifier || undefined
  };
}

export async function getAuthorizationUrl(platform: OAuthProvider, userId: string, requestUrl: string): Promise<string> {
  const baseUrl = getBaseUrl(requestUrl);
  const redirectUri = `${baseUrl}/api/connections/${platform}/callback`;

  switch (platform) {
    case "x": {
      const codeVerifier = createCodeVerifier();
      const state = await storeState(userId, "x", redirectUri, codeVerifier);
      const challenge = createCodeChallenge(codeVerifier);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: requireEnv("X_CLIENT_ID"),
        redirect_uri: redirectUri,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "tweet.read users.read tweet.write offline.access"
      });
      return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    }
    case "reddit": {
      const state = await storeState(userId, "reddit", redirectUri);
      const params = new URLSearchParams({
        client_id: requireEnv("REDDIT_CLIENT_ID"),
        response_type: "code",
        state,
        redirect_uri: redirectUri,
        duration: "permanent",
        scope: "identity submit read"
      });
      return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
    }
    case "linkedin": {
      const state = await storeState(userId, "linkedin", redirectUri);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: requireEnv("LINKEDIN_CLIENT_ID"),
        redirect_uri: redirectUri,
        state,
        scope: "openid profile w_member_social"
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }
  }
}

export async function completeOAuth(platform: OAuthProvider, request: Request): Promise<{ userId: string }> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    throw new Error(error);
  }

  if (!state || !code) {
    throw new Error("Missing OAuth callback parameters.");
  }

  const stored = await consumeState(platform, state);

  switch (platform) {
    case "x": {
      const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: requireEnv("X_CLIENT_ID"),
          redirect_uri: stored.redirectUri,
          code_verifier: stored.codeVerifier || ""
        })
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to complete X OAuth.");
      }

      const meResponse = await fetch("https://api.x.com/2/users/me?user.fields=username", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      const meData = await meResponse.json();
      if (!meResponse.ok || !meData.data?.id) {
        throw new Error("Failed to load X account profile.");
      }

      await saveOAuthConnection({
        userId: stored.userId,
        platform: "x",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        remoteAccountId: meData.data.username || meData.data.id,
        accountLabel: meData.data.username ? `@${meData.data.username}` : undefined,
        scopes: typeof tokenData.scope === "string" ? tokenData.scope.split(" ") : []
      });
      return { userId: stored.userId };
    }
    case "reddit": {
      const credentials = Buffer.from(
        `${requireEnv("REDDIT_CLIENT_ID")}:${requireEnv("REDDIT_CLIENT_SECRET")}`
      ).toString("base64");
      const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "centipede/1.0"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: stored.redirectUri
        })
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to complete Reddit OAuth.");
      }

      const meResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "centipede/1.0"
        }
      });
      const meData = await meResponse.json();
      if (!meResponse.ok || !meData.name) {
        throw new Error("Failed to load Reddit account profile.");
      }

      await saveOAuthConnection({
        userId: stored.userId,
        platform: "reddit",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        remoteAccountId: meData.name,
        accountLabel: `u/${meData.name}`,
        scopes: typeof tokenData.scope === "string" ? tokenData.scope.split(" ") : []
      });
      return { userId: stored.userId };
    }
    case "linkedin": {
      const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: stored.redirectUri,
          client_id: requireEnv("LINKEDIN_CLIENT_ID"),
          client_secret: requireEnv("LINKEDIN_CLIENT_SECRET")
        })
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to complete LinkedIn OAuth.");
      }

      const meResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      const meData = await meResponse.json();
      if (!meResponse.ok || !meData.sub) {
        throw new Error("Failed to load LinkedIn member profile.");
      }

      await saveOAuthConnection({
        userId: stored.userId,
        platform: "linkedin",
        accessToken: tokenData.access_token,
        accessTokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        remoteAccountId: `urn:li:person:${meData.sub}`,
        accountLabel: meData.name || meData.email || undefined,
        scopes: typeof tokenData.scope === "string" ? tokenData.scope.split(" ") : []
      });
      return { userId: stored.userId };
    }
  }
}
