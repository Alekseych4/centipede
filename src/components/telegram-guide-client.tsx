"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TelegramConnectionRequest } from "../lib/types";

interface TelegramGuideStep {
  eyebrow: string;
  title: string;
  description: string;
  checklist: string[];
}

const steps: TelegramGuideStep[] = [
  {
    eyebrow: "Step 1",
    title: "Create a bot in Telegram",
    description: "Open Telegram, find BotFather, and create a new bot for Centipede publishing.",
    checklist: [
      "Send /newbot to BotFather.",
      "Choose a display name and username.",
      "Keep the bot token ready for the final setup form."
    ]
  },
  {
    eyebrow: "Step 2",
    title: "Add the bot to your destination",
    description: "Invite the bot to the chat, group, or channel that should receive scheduled posts.",
    checklist: [
      "For channels, add the bot as an administrator.",
      "Allow posting messages in the destination.",
      "Use a public t.me link, @channel username, or numeric chat id."
    ]
  },
  {
    eyebrow: "Step 3",
    title: "Connect Centipede",
    description: "Paste the BotFather token and destination link, username, or id. Centipede validates access without posting.",
    checklist: [
      "The token is stored encrypted.",
      "Centipede checks bot identity and destination access.",
      "A connected destination appears in Telegram Setup."
    ]
  },
  {
    eyebrow: "Step 4",
    title: "Schedule a Telegram post",
    description: "Return to Studio, select Telegram, then send immediately or queue the post for its due time.",
    checklist: [
      "Telegram supports text posts and image captions.",
      "Image captions must stay within Telegram limits.",
      "Permission failures will ask you to reconnect."
    ]
  }
];

export function TelegramGuideClient() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [connectLoading, setConnectLoading] = useState(false);
  const [error, setError] = useState("");
  const [telegramConfig, setTelegramConfig] = useState<TelegramConnectionRequest>({
    botToken: "",
    chatId: ""
  });
  const current = steps[activeStep];
  const progressLabel = `${activeStep + 1} of ${steps.length}`;

  const goPrevious = () => {
    setActiveStep((value) => Math.max(0, value - 1));
  };

  const goNext = () => {
    setError("");
    setActiveStep((value) => Math.min(steps.length - 1, value + 1));
  };

  const saveTelegramConnection = async () => {
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

      router.push("/settings?connected=1");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Unknown error.");
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <div className="hero-account-row">
          <Link className="button-link secondary" href="/settings">
            Back to Settings
          </Link>
        </div>
        <h1>Connect Telegram</h1>
        <p>Follow these steps to prepare a Telegram bot and connect one default destination for scheduled posts.</p>
      </section>

      <section className="telegram-guide">
        <div className="telegram-guide-rail" aria-label="Telegram connection steps">
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              className={`telegram-guide-dot ${index === activeStep ? "active" : ""}`}
              onClick={() => setActiveStep(index)}
              aria-current={index === activeStep ? "step" : undefined}
            >
              <span>{index + 1}</span>
              {step.title}
            </button>
          ))}
        </div>

        <article className="panel telegram-guide-card">
          <div className="telegram-guide-card-head">
            <p className="telegram-guide-eyebrow">{current.eyebrow}</p>
            <span className="pill ok">{progressLabel}</span>
          </div>
          <h2>{current.title}</h2>
          <p className="meta">{current.description}</p>

          <ul className="telegram-guide-checklist">
            {current.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {activeStep === steps.length - 1 ? (
            <div className="telegram-guide-form">
              <div>
                <label htmlFor="telegramToken">BotFather bot token</label>
                <input
                  id="telegramToken"
                  value={telegramConfig.botToken}
                  onChange={(event) => setTelegramConfig((value) => ({ ...value, botToken: event.target.value }))}
                  placeholder="123456:ABCDEF..."
                />
              </div>
              <div>
                <label htmlFor="telegramChatId">Chat, group, or channel link/target</label>
                <input
                  id="telegramChatId"
                  value={telegramConfig.chatId}
                  onChange={(event) => setTelegramConfig((value) => ({ ...value, chatId: event.target.value }))}
                  placeholder="https://t.me/channel_name, @channel_name, or -100123"
                />
              </div>
              {error ? <p className="error">{error}</p> : null}
            </div>
          ) : null}

          <div className="telegram-guide-actions">
            <button className="secondary" type="button" onClick={goPrevious} disabled={activeStep === 0}>
              Previous
            </button>
            {activeStep === steps.length - 1 ? (
              <button
                className="primary"
                type="button"
                disabled={connectLoading || !telegramConfig.botToken.trim() || !telegramConfig.chatId.trim()}
                onClick={() => void saveTelegramConnection()}
              >
                {connectLoading ? "Validating..." : "Connect Telegram"}
              </button>
            ) : (
              <button className="primary" type="button" onClick={goNext}>
                Next
              </button>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
