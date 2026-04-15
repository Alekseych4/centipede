import Head from "next/head";
import { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FailureLog, HistoryResponseItem, PlatformDefinition, PlatformKey, ScheduleRequest } from "../lib/types";

function localDateTimeValue(date = new Date()) {
  const d = new Date(date.getTime() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

interface HistoryPayload {
  items: HistoryResponseItem[];
  failures: FailureLog[];
}

export default function HomePage() {
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>([]);
  const [history, setHistory] = useState<HistoryResponseItem[]>([]);
  const [failures, setFailures] = useState<FailureLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [workerMessage, setWorkerMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduleAtLocal, setScheduleAtLocal] = useState(localDateTimeValue());
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>([
    "telegram",
    "x",
    "reddit",
    "linkedin"
  ]);
  const [variants, setVariants] = useState<Partial<Record<PlatformKey, string>>>({});

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

  const selectedLabels = useMemo(() => {
    return platforms
      .filter((item) => selectedPlatforms.includes(item.key))
      .map((item) => item.label)
      .join(", ");
  }, [platforms, selectedPlatforms]);

  const togglePlatform = (key: PlatformKey) => {
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
    reader.onload = () => {
      setImageUrl(String(reader.result || ""));
      setError("");
    };
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const payload: ScheduleRequest = {
      content,
      imageUrl: imageUrl.trim() || undefined,
      selectedPlatforms,
      scheduleAtUtc: new Date(scheduleAtLocal).toISOString(),
      variants
    };

    try {
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
      setImageUrl("");
      setScheduleAtLocal(localDateTimeValue());
      setVariants({});
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

  return (
    <>
      <Head>
        <title>Centipede | Social Scheduler MVP</title>
        <meta
          name="description"
          content="MVP crossposting scheduler for Telegram, LinkedIn, Reddit, and X."
        />
      </Head>

      <main className="container">
        <section className="hero">
          <h1>Social Scheduler MVP</h1>
          <p>Write once, add platform variants, schedule in UTC, and execute via queue worker.</p>
        </section>

        <div className="layout">
          <form className="panel" onSubmit={onSubmit}>
            <h2>Compose and Schedule</h2>
            <p className="meta">MVP scope: text posts + optional single image, no analytics, no team features.</p>

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
                        {platform.connected ? platform.authType : "not connected"}
                      </span>
                    </div>
                    <ul className="meta-list">
                      {platform.constraints.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

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
                <label htmlFor="imageUrl">Optional single image (URL, drop, or paste)</label>
                <input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
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
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
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
                {imageUrl && (
                  <div className="image-preview-wrap">
                    <img className="image-preview" src={imageUrl} alt="Post attachment preview" />
                    <button className="secondary" type="button" onClick={() => setImageUrl("")}>
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

              <div className="grid">
                {selectedPlatforms.map((platform) => (
                  <div key={platform}>
                    <label htmlFor={`variant-${platform}`}>
                      {platform.toUpperCase()} variant (optional override)
                    </label>
                    <textarea
                      id={`variant-${platform}`}
                      value={variants[platform] || ""}
                      onChange={(event) => updateVariant(platform, event.target.value)}
                      placeholder="Leave empty to use base content."
                    />
                  </div>
                ))}
              </div>
            </div>

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
                    <p className="meta">Jobs: {item.jobs.map((job) => `${job.platform}:${job.status}(${job.attempts}/${job.maxAttempts})`).join(" | ")}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Failure Log</h2>
              {failures.length === 0 && <p className="meta">No failures logged.</p>}
              {failures.slice(0, 6).map((log) => (
                <article key={log.id} className="card history-item">
                  <h4>{log.platform.toUpperCase()}</h4>
                  <p>{log.message}</p>
                  <p className="meta">
                    Attempt {log.attempt} • {new Date(log.createdAt).toUTCString()}
                  </p>
                </article>
              ))}
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
