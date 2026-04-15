import Head from "next/head";
import Link from "next/link";

const platformItems = [
  { name: "Telegram", short: "TG", note: "Fast channel and group delivery." },
  { name: "X", short: "X", note: "Short-form, high-tempo social updates." },
  { name: "Reddit", short: "RD", note: "Community-driven threads and posts." },
  { name: "LinkedIn", short: "IN", note: "Professional audience positioning." }
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
                <span className="lp-platform-icon">{platform.short}</span>
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
