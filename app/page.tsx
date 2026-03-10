import Link from "next/link";
import Footer from "@/components/Footer";

const mockJobs = [
  { id: 1, title: "Senior Product Designer", company: "Stripe", location: "Remote", fit: 92 },
  { id: 2, title: "UX Designer", company: "Linear", location: "San Francisco", fit: 85 },
  { id: 3, title: "Product Designer", company: "Vercel", location: "Remote", fit: 78 },
  { id: 4, title: "Design Systems Lead", company: "GitHub", location: "Remote", fit: 71 },
  { id: 5, title: "UX Researcher", company: "Figma", location: "New York", fit: 64 },
];

const features = [
  { icon: "🎯", title: "AI Fit Scoring", desc: "Every job is rated against your skills, experience, and preferences. Stop wasting time on roles you won't get." },
  { icon: "📡", title: "Job Aggregation", desc: "We pull from 200+ sources in real-time. LinkedIn, Greenhouse, Lever, company sites — all in one feed." },
  { icon: "✍️", title: "Resume Tailoring", desc: "Premium AI automatically rewrites your resume for each role, optimizing for ATS and human reviewers alike." },
  { icon: "📬", title: "Auto Apply", desc: "Premium tier sends tailored applications on your behalf, including personalized cover letters." },
  { icon: "🔔", title: "Reply Alerts", desc: "Get notified the moment an employer opens, responds to, or forwards your application." },
  { icon: "📊", title: "Search Analytics", desc: "Track your application funnel, response rates, and optimize your strategy with data." },
];

const stats = [
  { number: "50K+", label: "Jobs aggregated daily" },
  { number: "94%", label: "Fit rating accuracy" },
  { number: "3.2x", label: "More interviews landed" },
  { number: "12min", label: "Avg. time to first match" },
];

function fitClass(score: number) {
  return score >= 80 ? "fit-high" : score >= 65 ? "fit-med" : "fit-low";
}

export default function LandingPage() {
  return (
    <div className="landing">
      <section className="hero">
        <div>
          <div className="hero-eyebrow">AI-Powered Job Search</div>
          <h1>
            Find jobs that actually <em>fit</em> you.
          </h1>
          <p className="hero-sub">
            Joura aggregates thousands of opportunities, scores them against
            your profile, and automates the grind — so you focus on interviews,
            not spreadsheets.
          </p>
          <div className="hero-cta">
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Get Started Free
            </Link>
            <Link href="/pricing" className="btn btn-ghost btn-lg">
              See Plans →
            </Link>
          </div>
          <p className="hero-note" style={{ marginTop: 16 }}>
            No credit card required · Free tier available
          </p>
        </div>

        <div className="hero-card">
          <div className="hero-card-header">
            <span className="hero-card-title">Today&apos;s Matches</span>
            <span style={{ fontSize: 12, color: "var(--green)" }}>● Live</span>
          </div>
          <div className="job-list">
            {mockJobs.map((job) => (
              <div className="job-item" key={job.id}>
                <div className="job-info">
                  <span className="job-title">{job.title}</span>
                  <span className="job-company">
                    {job.company} · {job.location}
                  </span>
                </div>
                <span className={`fit-badge ${fitClass(job.fit)}`}>
                  {job.fit}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="stats-inner">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="stat-number">{s.number}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="features">
        <div className="section-label">Why Joura</div>
        <h2>
          Your unfair advantage
          <br />
          in the job market.
        </h2>
        <p className="features-sub">
          We&apos;ve automated the boring parts of job searching so you can
          focus on what matters: landing the role.
        </p>
        <div className="features-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
