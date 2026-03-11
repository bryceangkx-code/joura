"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  fit_score: number;
  job_type: string;
  status: "new" | "saved" | "applied";
  posted_date: string;
};

type Stats = {
  jobsToday: number;
  avgFit: number;
  appliedCount: number;
  savedCount: number;
};

const sidebarNav = [
  { icon: "⚡", label: "Job Feed", active: true },
  { icon: "📌", label: "Saved Jobs" },
  { icon: "📤", label: "Applications" },
  { icon: "📊", label: "Analytics" },
];

const sidebarProfile = [
  { icon: "📄", label: "My Resume", href: "/resume" },
  { icon: "👤", label: "My Profile", href: "/profile" },
  { icon: "⚙️", label: "Preferences" },
];

const filters = ["All", "Remote", "Full-time", "Contract", "New Today"];

function fitClass(score: number) {
  return score >= 80 ? "fit-high" : score >= 65 ? "fit-med" : "fit-low";
}

function statusClass(s: string) {
  return s === "new" ? "status-new" : s === "applied" ? "status-applied" : "status-saved";
}

function clean(val: string) {
  return val?.replace(/^=+/, "").trim() ?? "";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "saved" | "applied">("all");
  const [activeFilter, setActiveFilter] = useState("All");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const firstName = user?.firstName ?? user?.username ?? "there";

  const loadData = useCallback(async () => {
    const [profileRes, jobsRes, statsRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/jobs"),
      fetch("/api/dashboard/stats"),
    ]);
    // Redirect new users to profile setup
    if (profileRes.status === 404) {
      router.push("/profile");
      return;
    }
    if (jobsRes.ok) setJobs(await jobsRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (isLoaded && user) loadData();
  }, [isLoaded, user, loadData]);

  async function handleSave(jobId: string) {
    setActionLoading(jobId);
    const res = await fetch(`/api/jobs/${jobId}/save`, { method: "POST" });
    if (res.ok) {
      const { status } = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
      const statsRes = await fetch("/api/dashboard/stats");
      if (statsRes.ok) setStats(await statsRes.json());
    }
    setActionLoading(null);
  }

  async function handleApply(jobId: string) {
    setActionLoading(jobId);
    const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
    if (res.ok) {
      const { status } = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
      const statsRes = await fetch("/api/dashboard/stats");
      if (statsRes.ok) setStats(await statsRes.json());
    }
    setActionLoading(null);
  }

  const filtered =
    activeTab === "all" ? jobs : jobs.filter((j) => j.status === activeTab);

  const statCards = stats
    ? [
        { label: "New Matches", value: String(stats.jobsToday), delta: "jobs added today" },
        { label: "Avg Fit Score", value: `${stats.avgFit}%`, delta: "across all listings" },
        { label: "Applied", value: String(stats.appliedCount), delta: "total applications" },
        { label: "Saved", value: String(stats.savedCount), delta: "jobs bookmarked" },
      ]
    : [
        { label: "New Matches", value: "—", delta: "" },
        { label: "Avg Fit Score", value: "—", delta: "" },
        { label: "Applied", value: "—", delta: "" },
        { label: "Saved", value: "—", delta: "" },
      ];

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {sidebarNav.map((item) => (
            <button
              key={item.label}
              className={`sidebar-item ${item.active ? "active" : ""}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Profile</div>
          {sidebarProfile.map((item) =>
            item.href ? (
              <Link key={item.label} href={item.href} className="sidebar-item">
                <span className="icon">{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <button key={item.label} className="sidebar-item">
                <span className="icon">{item.icon}</span>
                {item.label}
              </button>
            )
          )}
        </div>
        <div style={{ marginTop: "auto", padding: "12px" }}>
          <div
            style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 10,
              padding: "14px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>
              ⚡ Upgrade to Premium
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
              Auto-apply &amp; employer alerts
            </div>
            <Link
              href="/pricing"
              className="btn btn-primary"
              style={{ width: "100%", fontSize: 12, padding: "8px", display: "block", textAlign: "center" }}
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">Welcome back, {firstName}</div>
            <div className="page-sub">
              {loading ? "Loading your job feed…" : `${jobs.length} jobs in your feed`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-outline">⚙️ Preferences</button>
            <button className="btn btn-primary">✨ AI Refine</button>
          </div>
        </div>

        <div className="stats-row">
          {statCards.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-delta">{s.delta}</div>
            </div>
          ))}
        </div>

        <div className="tab-bar">
          {(
            [
              ["all", "All Jobs"],
              ["saved", "Saved"],
              ["applied", "Applied"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              className={`tab ${activeTab === v ? "active" : ""}`}
              onClick={() => setActiveTab(v)}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="search-bar">
          <span style={{ color: "var(--muted)" }}>🔍</span>
          <input placeholder="Search job title, company, or skill..." />
          <button className="btn btn-ghost" style={{ whiteSpace: "nowrap", fontSize: 13 }}>
            Filters ▾
          </button>
        </div>

        <div className="filters">
          {filters.map((f) => (
            <button
              key={f}
              className={`filter-pill ${activeFilter === f ? "active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Loading jobs…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            No jobs found.
          </div>
        ) : (
          <div className="jobs-table">
            <div className="table-head">
              <div className="th">Position</div>
              <div className="th">Company</div>
              <div className="th">Type</div>
              <div className="th">Fit Score</div>
              <div className="th">Status</div>
              <div className="th">Actions</div>
            </div>
            {filtered.map((job) => (
              <div className="table-row" key={job.id}>
                <div className="td">
                  <div className="td-title">{clean(job.title)}</div>
                  <div className="td-sub">
                    {clean(job.location)} · {timeAgo(job.posted_date)}
                  </div>
                </div>
                <div className="td">{clean(job.company)}</div>
                <div className="td">
                  <span style={{ fontSize: 13 }}>{clean(job.job_type)}</span>
                </div>
                <div className="td">
                  <span className={`fit-badge ${fitClass(job.fit_score)}`}>
                    {job.fit_score}%
                  </span>
                </div>
                <div className="td">
                  <span className={`status-pill ${statusClass(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <div className="td" style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    disabled={actionLoading === job.id || job.status === "applied"}
                    onClick={() => handleSave(job.id)}
                    title={job.status === "saved" ? "Unsave" : "Save"}
                  >
                    {job.status === "saved" ? "★ Saved" : "☆ Save"}
                  </button>
                  <button
                    className={`btn ${job.status === "applied" ? "btn-outline" : "btn-primary"}`}
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    disabled={actionLoading === job.id || job.status === "applied"}
                    onClick={() => handleApply(job.id)}
                  >
                    {job.status === "applied" ? "✓ Applied" : "Apply"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
