"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useSearchParams } from "next/navigation";
import {
  FailureLog,
  HistoryResponseItem,
  MediaAsset,
  PlatformDefinition,
  PlatformKey,
  ScheduleRequest,
  TelegramConnectionRequest
} from "../lib/types";

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

interface HistoryPayload {
  items: HistoryResponseItem[];
  failures: FailureLog[];
}

interface StudioClientProps {
  userName: string | null;
  userEmail: string | null;
}

type PendingImage =
  | {
      kind: "dataUrl";
      value: string;
      fileName?: string;
    }
  | {
      kind: "remoteUrl";
      value: string;
    };

const OAUTH_PLATFORMS: PlatformKey[] = ["x", "reddit", "linkedin"];

export function StudioClient({ userName, userEmail }: StudioClientProps) {
  const searchParams = useSearchParams();
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>([]);
  const [history, setHistory] = useState<HistoryResponseItem[]>([]);
  const [failures, setFailures] = useState<FailureLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [workerMessage, setWorkerMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [remoteImageUrl, setRemoteImageUrl] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [scheduleAtLocal, setScheduleAtLocal] = useState(localDateTimeValue());
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>([]);
  const [variants, setVariants] = useState<Partial<Record<PlatformKey, string>>>({});
  const [redditTitle, setRedditTitle] = useState("");
  const [redditSubreddit, setRedditSubreddit] = useState("");
  const [telegramConfig, setTelegramConfig] = useState<TelegramConnectionRequest>({
    botToken: "",
    chatId: ""
  });

  async function loadInitial() {
    const [platformRes, historyRes] = await Promise.all([fetch("/api/platforms"), fetch("/api/history")]);
    const platformData = await platformRes.json();
    const historyData = (await historyRes.json()) as HistoryPayload;

    setPlatforms(platformData.platforms || []);
    setHistory(historyData.items || []);
    setFailures(historyData.failures || []);
  }

  useEffect(() => {
    loadInitial().catch(() => setError("Failed to load initial data."));
  }, []);

  useEffect(() => {
    const connected = searchParams?.get("connected");
    const connectionError = searchParams?.get("connection_error");
    const message = searchParams?.get("message");

    if (connected === "1") {
      setWorkerMessage("Platform connection saved.");
    }

    if (connectionError === "1") {
      setError(message || "Platform connection failed.");
    }
  }, [searchParams]);

  const selectedLabels = useMemo(() => {
    return platforms
      .filter((item) => selectedPlatforms.includes(item.key))
      .map((item) => item.label)
      .join(", ");
  }, [platforms, selectedPlatforms]);

  const connectedPlatforms = useMemo(() => {
    return platforms.filter((item) => item.connected);
  }, [platforms]);

  const selectedPlatformDefinitions = useMemo(() => {
    return platforms.filter((item) => selectedPlatforms.includes(item.key));
  }, [platforms, selectedPlatforms]);

  const togglePlatform = (key: PlatformKey) => {
    const platform = platforms.find((item) => item.key === key);
    if (!platform?.connected) {
      setError(`${platform?.label || key} is not connected.`);
      return;
    }

    setSelectedPlatforms((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const updateVariant = (platform: PlatformKey, value: string) => {
    setVariants((current) => ({
      ...current,
      [platform]: value
    }));
  };

  const setImageFromDataUrl = (value: string, fileName?: string) => {
    setPendingImage({ kind: "dataUrl", value, fileName });
    setImagePreviewUrl(value);
    setRemoteImageUrl("");
    setError("");
  };

  const loadImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageFromDataUrl(String(reader.result || ""), file.name);
    reader.readAsDataURL(file);
  };

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const onImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const onImagePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = event.clipboardData.files?.[0];
    if (file) {
      event.preventDefault();
      loadImageFile(file);
    }
  };

  async function uploadPendingImage(): Promise<MediaAsset | undefined> {
    if (!pendingImage) {
      return undefined;
    }

    const payload =
      pendingImage.kind === "dataUrl"
        ? {
            dataUrl: pendingImage.value,
            fileName: pendingImage.fileName
          }
        : {
            remoteUrl: pendingImage.value
          };

    const response = await fetch("/api/media/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Image upload failed.");
    }

    return data.asset as MediaAsset;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setWorkerMessage("");
    setLoading(true);

    try {
      const image = await uploadPendingImage();
      const payload: ScheduleRequest = {
        content,
        selectedPlatforms,
        scheduleAtUtc: new Date(scheduleAtLocal).toISOString(),
        variants,
        image,
        platformOptions: selectedPlatforms.includes("reddit")
          ? {
              reddit: {
                title: redditTitle,
                subreddit: redditSubreddit
              }
            }
          : undefined
      };

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Schedule request failed.");
      }

      setContent("");
      setRemoteImageUrl("");
      setImagePreviewUrl("");
      setPendingImage(null);
      setScheduleAtLocal(localDateTimeValue());
      setVariants({});
      setRedditTitle("");
      setRedditSubreddit("");
      await loadInitial();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  };

  const runWorker = async () => {
    setWorkerLoading(true);
    setError("");
    setWorkerMessage("");
    try {
      const response = await fetch("/api/worker/tick", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Worker failed.");
      }
      const result = data.result;
      setWorkerMessage(
        `Processed ${result.processed}, succeeded ${result.succeeded}, failed ${result.failed}, queued ${result.remainingQueued}.`
      );
      await loadInitial();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setWorkerLoading(false);
    }
  };

  const connectTelegram = async () => {
    setConnectLoading(true);
    setError("");
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
      await loadInitial();
      setWorkerMessage("Telegram connection saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
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
    try {
      const response = await fetch(`/api/connections/${platform}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Disconnect failed.");
      }

      setSelectedPlatforms((current) => current.filter((item) => item !== platform));
      await loadInitial();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
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
        <h1>Social Scheduler MVP</h1>
        <p>Connect accounts, upload one durable image, schedule in UTC, and execute via queue worker.</p>
      </section>

      <div className="layout">
        <form className="panel" onSubmit={onSubmit}>
          <h2>Compose and Schedule</h2>
          <p className="meta">Current scope: connected user accounts, single post per platform, optional single image.</p>

          <div className="grid platforms">
            {platforms.map((platform) => {
              const active = selectedPlatforms.includes(platform.key);
              return (
                <article
                  key={platform.key}
                  className={`card platform-card ${active ? "active" : ""}`}
                  onClick={() => togglePlatform(platform.key)}
                >
                  <div className="platform-row">
                    <strong>{platform.label}</strong>
                    <span className={`pill ${platform.connected ? "ok" : "no"}`}>
                      {platform.connected ? platform.accountLabel || platform.authType : "not connected"}
                    </span>
                  </div>
                  <ul className="meta-list">
                    {platform.constraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                    {platform.warnings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="actions">
                    {platform.key === "telegram" ? null : !platform.connected ? (
                      <button
                        className="secondary"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startOAuthConnection(platform.key);
                        }}
                      >
                        Connect
                      </button>
                    ) : (
                      <button
                        className="secondary"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void disconnect(platform.key);
                        }}
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <section className="panel">
            <h3>Connections</h3>
            <p className="meta">
              Connected: {connectedPlatforms.length === 0 ? "none" : connectedPlatforms.map((item) => item.label).join(", ")}
            </p>
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
            <p className="meta">OAuth connections: X, Reddit, and LinkedIn use the connect buttons on their platform cards.</p>
          </section>

          <div className="grid">
            <div>
              <label htmlFor="content">Base content</label>
              <textarea
                id="content"
                placeholder="Shared text for all platforms..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="imageUrl">Optional single image (upload, paste, drop, or remote URL)</label>
              <input
                id="imageUrl"
                value={remoteImageUrl}
                onChange={(event) => {
                  const value = event.target.value;
                  setRemoteImageUrl(value);
                  setImagePreviewUrl(value);
                  setPendingImage(value.trim() ? { kind: "remoteUrl", value: value.trim() } : null);
                }}
                placeholder="https://..."
              />
              <div
                className={`dropzone ${dragOver ? "drag-over" : ""}`}
                tabIndex={0}
                onPaste={onImagePaste}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onImageDrop}
              >
                <p>Drop image here or focus this box and paste from clipboard.</p>
                <button className="secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                  Choose Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-input"
                  onChange={onFileSelected}
                />
              </div>
              {imagePreviewUrl && (
                <div className="image-preview-wrap">
                  <img className="image-preview" src={imagePreviewUrl} alt="Post attachment preview" />
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setRemoteImageUrl("");
                      setImagePreviewUrl("");
                      setPendingImage(null);
                    }}
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="scheduleAt">Publish time (local input, stored as UTC)</label>
              <input
                id="scheduleAt"
                type="datetime-local"
                value={scheduleAtLocal}
                onChange={(event) => setScheduleAtLocal(event.target.value)}
              />
              <p className="meta">UTC value: {new Date(scheduleAtLocal).toISOString()}</p>
            </div>
          </div>

          <div className="grid">
            {selectedPlatformDefinitions.map((platform) => (
              <div key={platform.key}>
                <label htmlFor={`variant-${platform.key}`}>{platform.label} variant</label>
                <textarea
                  id={`variant-${platform.key}`}
                  value={variants[platform.key] || ""}
                  onChange={(event) => updateVariant(platform.key, event.target.value)}
                  placeholder="Leave empty to use base content."
                />
              </div>
            ))}
          </div>

          {selectedPlatforms.includes("reddit") ? (
            <div className="grid">
              <div>
                <label htmlFor="redditSubreddit">Reddit subreddit</label>
                <input
                  id="redditSubreddit"
                  value={redditSubreddit}
                  onChange={(event) => setRedditSubreddit(event.target.value)}
                  placeholder="sideproject"
                />
              </div>
              <div>
                <label htmlFor="redditTitle">Reddit title</label>
                <input
                  id="redditTitle"
                  value={redditTitle}
                  onChange={(event) => setRedditTitle(event.target.value)}
                  placeholder="Title required for Reddit self-posts"
                />
              </div>
            </div>
          ) : null}

          {error && <p className="error">{error}</p>}
          {workerMessage && <p className="success">{workerMessage}</p>}

          <div className="actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Scheduling..." : "Queue Post"}
            </button>
            <button className="secondary" type="button" onClick={runWorker} disabled={workerLoading}>
              {workerLoading ? "Running..." : "Run Worker Tick"}
            </button>
          </div>
        </form>

        <aside className="grid">
          <section className="panel">
            <h2>Preview</h2>
            <p className="meta">{selectedLabels || "No platform selected."}</p>
            <div className="preview">{content || "Base content preview appears here."}</div>
          </section>

          <section className="panel">
            <h2>Queue and Status</h2>
            <div>
              {history.length === 0 && <p className="meta">No scheduled posts yet.</p>}
              {history.map((item) => (
                <article key={item.post.id} className="card history-item">
                  <h4>{item.post.selectedPlatforms.join(", ")}</h4>
                  <p>{item.post.content.slice(0, 120)}</p>
                  <p className="meta">
                    {item.post.status.toUpperCase()} • {new Date(item.post.scheduleAtUtc).toUTCString()}
                  </p>
                  <p className="meta">
                    Jobs:{" "}
                    {item.jobs
                      .map((job) => `${job.platform}:${job.status}(${job.attempts}/${job.maxAttempts})`)
                      .join(" | ")}
                  </p>
                  {item.jobs.some((job) => job.externalUrl) ? (
                    <p className="meta">
                      Links:{" "}
                      {item.jobs
                        .filter((job) => job.externalUrl)
                        .map((job) => (
                          <a key={job.id} href={job.externalUrl} target="_blank" rel="noreferrer">
                            {job.platform}
                          </a>
                        ))}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Failure Log</h2>
            {failures.length === 0 && <p className="meta">No failures logged.</p>}
            {failures.slice(0, 8).map((log) => (
              <article key={log.id} className="card history-item">
                <h4>{log.platform.toUpperCase()}</h4>
                <p>{log.message}</p>
                <p className="meta">
                  Attempt {log.attempt} • {new Date(log.createdAt).toUTCString()}
                </p>
              </article>
            ))}
          </section>

          <section className="panel">
            <h2>Connection Notes</h2>
            <ul className="meta-list">
              {OAUTH_PLATFORMS.map((platform) => (
                <li key={platform}>{platform.toUpperCase()} connections use OAuth and redirect back to the studio.</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
