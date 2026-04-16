import Head from "next/head";
import Link from "next/link";

const platformItems = [
  { name: "Telegram", note: "Fast channel and group delivery." },
  { name: "X", note: "Short-form, high-tempo social updates." },
  { name: "Reddit", note: "Community-driven threads and posts." },
  { name: "LinkedIn", note: "Professional audience positioning." }
];

const featureItems = [
  {
    title: "One Composer, Multiple Variants",
    description: "Write base content once, then override per platform when tone or length needs to differ."
  },
  {
    title: "Queue + Worker Tick Model",
    description: "Schedule in UTC and process posts through a deterministic queue worker for clear publish state."
  },
  {
    title: "Failure Logging Built In",
    description: "Track attempts and failure details per platform to understand what failed and why."
  }
];

const pricingItems = [
  {
    tier: "Starter",
    price: "$0",
    cadence: "/month",
    description: "Local MVP evaluation for solo testing.",
    points: ["Manual worker tick", "4 platform adapters", "In-memory data store"]
  },
  {
    tier: "Builder",
    price: "$24",
    cadence: "/month",
    description: "Suggested plan shape for early teams.",
    points: ["All Starter features", "Priority queue visibility", "Exportable activity feed"],
    highlighted: true
  },
  {
    tier: "Scale",
    price: "$89",
    cadence: "/month",
    description: "Template for larger scheduling operations.",
    points: ["All Builder features", "Role-based workspace access", "Extended retention windows"]
  }
];

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "Telegram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.6 4.7a1.2 1.2 0 0 0-1.3-.2L2.8 11.2a1 1 0 0 0 .1 1.9l4.2 1.3 1.7 5.1a1 1 0 0 0 1.8.2l2.4-3.3 4.3 3.2a1 1 0 0 0 1.6-.6l2.5-13.1a1.2 1.2 0 0 0-.8-1.2Zm-3.8 3.5-8 7.4-.5 1.8-.9-2.8-3.5-1.1 12.9-5.3Z" />
      </svg>
    );
  }

  if (platform === "X") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.9 3H22l-6.8 7.7L23 21h-6.1l-4.8-6.2L6.7 21H3.6l7.2-8.2L1 3h6.3l4.3 5.7L18.9 3Zm-1.1 16h1.7L6.4 4.9H4.6L17.8 19Z" />
      </svg>
    );
  }

  if (platform === "Reddit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.6 10.4a2 2 0 0 0-3.4-1.4 9.3 9.3 0 0 0-4.4-1.4l.9-4 2.8.6a1.8 1.8 0 1 0 .3-1.2L13.5 2a.7.7 0 0 0-.8.5l-1 4.8A9.2 9.2 0 0 0 7 8.8a2 2 0 1 0-1.6 3.2v.3c0 3.2 3 5.8 6.7 5.8 3.7 0 6.7-2.6 6.7-5.8v-.3a2 2 0 0 0 1.8-1.6Zm-10 3.3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm2.9 2.7c-1.2 0-2.3-.4-3-.9a.6.6 0 1 1 .8-.9c.5.4 1.3.6 2.2.6.9 0 1.7-.2 2.2-.6a.6.6 0 1 1 .8.9c-.7.5-1.8.9-3 .9Zm.3-2.7a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.3 8.8h3.6v11H6.3v-11Zm1.8-5a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2ZM12.1 8.8h3.4v1.5h.1c.5-.9 1.7-1.9 3.5-1.9 3.7 0 4.4 2.4 4.4 5.6v5.8H20v-5.1c0-1.2 0-2.8-1.7-2.8-1.7 0-2 1.3-2 2.7v5.2h-3.6v-11Z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Centipede | Cross-Post Scheduling</title>
        <meta
          name="description"
          content="Centipede helps teams schedule and process cross-platform posts for Telegram, X, Reddit, and LinkedIn."
        />
      </Head>

      <main className="lp-page">
        <header className="lp-header">
          <div className="lp-brand">Centipede</div>
          <nav className="lp-nav" aria-label="Primary">
            <a href="#">Features</a>
            <a href="#">Product</a>
            <a href="#">Pricing</a>
            <a href="#">FAQ</a>
          </nav>
          <Link className="lp-top-cta" href="/studio">
            Open MVP
          </Link>
        </header>

        <section className="lp-hero">
          <p className="lp-kicker">Cross-post scheduling, focused on execution</p>
          <h1>Plan once, adapt per platform, and process reliably.</h1>
          <p className="lp-subtitle">
            Centipede is a Next.js MVP for scheduling posts across Telegram, X, Reddit, and LinkedIn with queue-based
            processing and platform-specific variants.
          </p>
          <div className="lp-actions">
            <Link className="lp-btn-primary" href="/studio">
              Go To Studio
            </Link>
            <a className="lp-btn-secondary" href="#">
              View Demo Flow
            </a>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <h2>Featured Platforms</h2>
            <p>Built around the channels this MVP currently simulates.</p>
          </div>
          <div className="lp-platform-grid">
            {platformItems.map((platform) => (
              <article key={platform.name} className="lp-platform-card">
                <span className={`lp-platform-icon lp-platform-icon-${platform.name.toLowerCase()}`}>
                  <PlatformIcon platform={platform.name} />
                </span>
                <h3>{platform.name}</h3>
                <p>{platform.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-section-alt">
          <div className="lp-section-head">
            <h2>Current MVP Functionality</h2>
            <p>What the project supports now, without external API integrations.</p>
          </div>
          <div className="lp-feature-grid">
            {featureItems.map((item) => (
              <article key={item.title} className="lp-feature-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <p className="lp-note">
            Note: adapters are mocked and the data store is process-memory only in the current implementation.
          </p>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <h2>Pricing Layout</h2>
            <p>Placeholder structure based on your requested visual direction.</p>
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
    </>
  );
}
