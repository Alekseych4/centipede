import Link from "next/link";

type LandingPlatform = "telegram" | "x" | "reddit" | "linkedin";

const platformItems = [
  { key: "telegram" as const, name: "Telegram", note: "Share updates with channels and groups that move fast." },
  { key: "x" as const, name: "X", note: "Turn quick thoughts into timely social moments." },
  // Reddit is hidden until production support is enabled.
  // { key: "reddit" as const, name: "Reddit", note: "Bring discussion-ready posts into focused communities." },
  { key: "linkedin" as const, name: "LinkedIn", note: "Show up with polished updates for your professional audience." }
];

const featureItems = [
  {
    title: "Start With One Draft",
    description: "Write the core message once, then adjust the tone for each channel before it goes out."
  },
  {
    title: "Plan Around Your Rhythm",
    description:
      "Schedule posts ahead of time so launches, updates, and daily ideas do not depend on being online at the perfect moment."
  },
  {
    title: "Stay Clear On What Happened",
    description: "See what was sent, what needs attention, and where to follow up without digging through every platform."
  }
];

const workflowItems = [
  {
    step: "1",
    title: "Draft once",
    description: "Start with the core idea, announcement, or update you want to share."
  },
  {
    step: "2",
    title: "Shape each channel",
    description: "Adjust tone and length for the spaces where your audience expects to hear from you."
  },
  {
    step: "3",
    title: "Pick the moment",
    description: "Choose when the post should go out and keep your calendar moving ahead of time."
  },
  {
    step: "4",
    title: "Track the result",
    description: "Check what was sent, what is scheduled, and what needs another look."
  }
];

const pricingItems = [
  {
    tier: "Starter",
    price: "$0",
    cadence: "/month",
    description: "For trying the workflow and organizing a solo posting routine.",
    points: ["Plan posts ahead", "Tailor content by channel", "Track recent activity"]
  },
  {
    tier: "Builder",
    price: "$24",
    cadence: "/month",
    description: "For creators posting regularly across multiple social spaces.",
    points: ["Everything in Starter", "Better visibility across upcoming posts", "Activity history for repeat campaigns"],
    highlighted: true
  },
  {
    tier: "Scale",
    price: "$89",
    cadence: "/month",
    description: "For higher-volume creators and small teams managing more moving parts.",
    points: ["Everything in Builder", "Workspace-ready collaboration", "Longer campaign history"]
  }
];

function PlatformIcon({ platform }: { platform: LandingPlatform }) {
  switch (platform) {
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.6 4.1c-.2-.2-.6-.3-.9-.2L2.8 10.8c-.4.2-.7.5-.8.9-.1.4.2.8.6 1l4.7 1.9 1.9 5.8c.1.4.5.7.9.7h.1c.4 0 .7-.2.9-.5l2.6-3.2 4.5 3.3c.3.2.6.3.8.3.2 0 .4-.1.6-.2.3-.2.5-.5.6-.9l2.9-14.8c.1-.4 0-.7-.2-1Zm-4.1 4.2-8.7 7.8-.7-2.1 8.4-7.6c.2-.2.2-.5 0-.7s-.5-.2-.7 0l-9.3 8.4-2.6-1.1 14.5-5.5-2.4 12.1-4.2-3.1 6-7.3c.2-.2.2-.6-.1-.8-.2-.2-.6-.2-.8.1Z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.9 2h3.2l-7 8 8.2 12h-6.4l-5-7.2L5.5 22H2.2l7.5-8.6L1.8 2h6.6l4.6 6.7L18.9 2Zm-1.1 18h1.8L7.4 3.9H5.5L17.8 20Z" />
        </svg>
      );
    case "reddit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.9 8.2c1.4.1 2.8.6 4 1.5.5-.4 1.1-.6 1.7-.6 1.5 0 2.8 1.2 2.8 2.8 0 1.1-.7 2.1-1.7 2.5 0 .2.1.5.1.7 0 3.6-4.3 6.5-9.7 6.5s-9.7-2.9-9.7-6.5c0-.2 0-.5.1-.7-1-.4-1.7-1.4-1.7-2.5C.8 10.3 2 9 3.6 9c.7 0 1.3.2 1.7.6 1.4-1 3-1.5 4.7-1.6l1-4.4c0-.2.2-.4.4-.3l3.1.7c.2-.8.9-1.3 1.7-1.3 1 0 1.8.8 1.8 1.8S17.2 6.3 16.2 6.3c-.8 0-1.4-.5-1.7-1.2l-2.7-.6-.9 3.7Zm5.1 6.9c0-2.7-3.6-4.9-8-4.9s-8 2.2-8 4.9 3.6 4.9 8 4.9 8-2.2 8-4.9Zm-10.8 1.2c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5.7 1.5 1.5 1.5 1.5-.7 1.5-1.5Zm7.1 0c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5.7 1.5 1.5 1.5 1.5-.7 1.5-1.5Zm-1.4 2.9c.2-.2.2-.5 0-.7-.2-.2-.5-.2-.7 0-.4.4-1.2.7-2.1.7-.9 0-1.7-.3-2.1-.7-.2-.2-.5-.2-.7 0-.2.2-.2.5 0 .7.6.6 1.6 1 2.8 1 1.2 0 2.2-.4 2.8-1Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.9 3.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8ZM3 9.5h3.7V21H3V9.5Zm6.5 0H13v1.6h.1c.5-.9 1.7-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.9V21h-3.7v-4.9c0-1.2 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V21H9.5V9.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LandingPage() {
  return (
    <main className="lp-page">
      <section className="lp-hero">
        <p className="lp-kicker">Social planning for creators who post everywhere</p>
        <h1>Keep your content moving without rewriting your day.</h1>
        <p className="lp-subtitle">
          Centipede helps you prepare, tailor, and schedule posts across your favorite social channels so your ideas show
          up consistently where your audience already spends time.
        </p>
        <div className="lp-actions">
          <Link className="lp-btn-primary" href="/studio">
            Go To Studio
          </Link>
          <a className="lp-btn-secondary" href="#preview-workflow">
            Preview Workflow
          </a>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-head">
          <h2>Where Your Content Can Go</h2>
          <p>Plan once, then shape each post for the spaces where your audience listens, replies, and shares.</p>
        </div>
        <div className="lp-platform-grid">
          {platformItems.map((platform) => (
            <article key={platform.name} className="lp-platform-card">
              <span className={`lp-platform-icon lp-platform-icon-${platform.key}`}>
                <PlatformIcon platform={platform.key} />
              </span>
              <h3>{platform.name}</h3>
              <p>{platform.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-workflow-section" id="preview-workflow">
        <div className="lp-workflow-copy">
          <div className="lp-section-head">
            <h2>See The Workflow Before You Start</h2>
            <p>
              A simple path from idea to scheduled posts, designed for creators who want to stay visible without rebuilding
              every update from scratch.
            </p>
          </div>
          <ol className="lp-workflow-steps">
            {workflowItems.map((item) => (
              <li key={item.step} className="lp-workflow-step">
                <span>{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lp-workflow-preview" aria-label="Workflow preview">
          <div className="lp-preview-toolbar">
            <span>Campaign draft</span>
            <strong>Tue, 10:30</strong>
          </div>
          <div className="lp-preview-composer">
            <p>New drop is live today. Here is what changed and why it matters.</p>
          </div>
          <div className="lp-preview-channels" aria-label="Selected channels">
            <span>Telegram</span>
            <span>X</span>
            <span>LinkedIn</span>
          </div>
          <div className="lp-preview-schedule">
            <span>Scheduled for</span>
            <strong>Tue, 10:30</strong>
          </div>
          <div className="lp-preview-status-grid">
            <div>
              <span>Ready</span>
              <strong>Ready to post</strong>
            </div>
            <div>
              <span>Variants</span>
              <strong>Tailored for each channel</strong>
            </div>
            <div>
              <span>History</span>
              <strong>Recent activity visible</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <h2>Made For Consistent Posting</h2>
          <p>Less juggling, more momentum for your content calendar.</p>
        </div>
        <div className="lp-feature-grid">
          {featureItems.map((item) => (
            <article key={item.title} className="lp-feature-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-head">
          <h2>Plans For Different Posting Rhythms</h2>
          <p>Simple options for testing the workflow, building consistency, or managing a fuller content calendar.</p>
        </div>
        <div className="lp-pricing-grid">
          {pricingItems.map((plan) => (
            <article key={plan.tier} className={`lp-price-card ${plan.highlighted ? "is-highlighted" : ""}`}>
              <h3>{plan.tier}</h3>
              <p className="lp-price">
                {plan.price}
                <span>{plan.cadence}</span>
              </p>
              <p className="lp-price-description">{plan.description}</p>
              <ul>
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <a href="#" className="lp-price-cta">
                Choose {plan.tier}
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
