"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlatformDefinition, PlatformKey, TelegramConnectionRequest } from "../lib/types";
import { getDefaultPlatformDefinitions } from "../lib/platforms";

interface SettingsClientProps {
  userName: string | null;
  userEmail: string | null;
}

export function SettingsClient({ userName, userEmail }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(() => getDefaultPlatformDefinitions());
  const [connectLoading, setConnectLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [telegramConfig, setTelegramConfig] = useState<TelegramConnectionRequest>({
    botToken: "",
    chatId: ""
  });

  async function loadPlatforms() {
    const response = await fetch("/api/platforms");
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.platforms)) {
      throw new Error(data.error || "Failed to load platform settings.");
    }

    setPlatforms(data.platforms);
  }

  useEffect(() => {
    loadPlatforms().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load platform settings.");
    });
  }, []);

  useEffect(() => {
    const connected = searchParams?.get("connected");
    const connectionError = searchParams?.get("connection_error");
    const searchMessage = searchParams?.get("message");

    if (connected === "1") {
      setMessage("Platform connection saved.");
    }

    if (connectionError === "1") {
      setError(searchMessage || "Platform connection failed.");
    }
  }, [searchParams]);

  const connectedPlatforms = useMemo(() => {
    return platforms.filter((item) => item.connected);
  }, [platforms]);

  const getPlatformStatusLabel = (platform: PlatformDefinition) => {
    if (platform.needsReconnect) {
      return "reconnect required";
    }

    if (platform.connected) {
      return platform.accountLabel || platform.authType;
    }

    return "not connected";
  };

  const connectTelegram = async () => {
    setConnectLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/connections/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(telegramConfig)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save Telegram connection.");
      }

      setTelegramConfig({ botToken: "", chatId: "" });
      await loadPlatforms();
      setMessage("Telegram connection saved.");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Unknown error.");
    } finally {
      setConnectLoading(false);
    }
  };

  const startOAuthConnection = (platform: PlatformKey) => {
    window.location.href = `/api/connections/${platform}/start`;
  };

  const disconnect = async (platform: PlatformKey) => {
    setConnectLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/connections/${platform}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Disconnect failed.");
      }

      await loadPlatforms();
      setMessage(`${platforms.find((item) => item.key === platform)?.label || platform} disconnected.`);
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Unknown error.");
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <div className="hero-account-row">
          <p className="meta">
            Signed in as {userName || "Clerk user"}
            {userEmail ? ` (${userEmail})` : ""}
          </p>
        </div>
        <h1>Platform Settings</h1>
        <p>Handle one-time account setup here. The studio page stays focused on composing, scheduling, and queue status.</p>
      </section>

      <div className="layout">
        <section className="panel">
          <h2>Account Connections</h2>
          <p className="meta">
            Connected: {connectedPlatforms.length === 0 ? "none" : connectedPlatforms.map((item) => item.label).join(", ")}
          </p>

          <div className="grid platforms">
            {platforms.map((platform) => (
              <article key={platform.key} className="card platform-card static">
                <div className="platform-row">
                  <strong>{platform.label}</strong>
                  <span className={`pill ${platform.connected ? "ok" : "no"}`}>
                    {getPlatformStatusLabel(platform)}
                  </span>
                </div>
                <ul className="meta-list">
                  {platform.constraints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {platform.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {platform.lastError ? <li>{platform.lastError}</li> : null}
                </ul>
                <div className="actions">
                  {platform.key === "telegram" ? null : !platform.connected ? (
                    <button className="secondary" type="button" disabled={connectLoading} onClick={() => startOAuthConnection(platform.key)}>
                      Connect
                    </button>
                  ) : (
                    <button className="secondary" type="button" disabled={connectLoading} onClick={() => void disconnect(platform.key)}>
                      Disconnect
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
        </section>

        <aside className="grid">
          <section className="panel">
            <h2>Telegram Setup</h2>
            <p className="meta">Telegram uses a bot token plus one default chat or channel destination for each user.</p>

            <div className="grid">
              <div>
                <label htmlFor="telegramToken">Telegram bot token</label>
                <input
                  id="telegramToken"
                  value={telegramConfig.botToken}
                  onChange={(event) => setTelegramConfig((current) => ({ ...current, botToken: event.target.value }))}
                  placeholder="123456:ABCDEF..."
                />
              </div>
              <div>
                <label htmlFor="telegramChatId">Telegram chat id or channel username</label>
                <input
                  id="telegramChatId"
                  value={telegramConfig.chatId}
                  onChange={(event) => setTelegramConfig((current) => ({ ...current, chatId: event.target.value }))}
                  placeholder="@channel_or_-100123"
                />
              </div>
            </div>

            <div className="actions">
              <button className="secondary" type="button" disabled={connectLoading} onClick={() => void connectTelegram()}>
                {connectLoading ? "Saving..." : "Save Telegram Connection"}
              </button>
              {platforms.find((item) => item.key === "telegram")?.connected ? (
                <button className="secondary" type="button" disabled={connectLoading} onClick={() => void disconnect("telegram")}>
                  Disconnect Telegram
                </button>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <h2>OAuth Platforms</h2>
            <ul className="meta-list">
              <li>X uses OAuth and redirects back here after consent.</li>
              <li>Reddit uses OAuth and needs subreddit plus title later at schedule time.</li>
              <li>LinkedIn uses member-profile OAuth and may require reconnect after token expiry.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
