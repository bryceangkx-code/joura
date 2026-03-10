"use client";

import { useState } from "react";
import Link from "next/link";

const mockJobs = [
  { id: 1, title: "Senior Product Designer", company: "Stripe", location: "Remote", fit: 92, type: "Full-time", status: "new", posted: "2d ago" },
  { id: 2, title: "UX Designer", company: "Linear", location: "San Francisco", fit: 85, type: "Full-time", status: "saved", posted: "3d ago" },
  { id: 3, title: "Product Designer", company: "Vercel", location: "Remote", fit: 78, type: "Full-time", status: "applied", posted: "5d ago" },
  { id: 4, title: "Design Systems Lead", company: "GitHub", location: "Remote", fit: 71, type: "Full-time", status: "new", posted: "1d ago" },
  { id: 5, title: "UX Researcher", company: "Figma", location: "New York", fit: 64, type: "Contract", status: "saved", posted: "1w ago" },
  { id: 6, title: "Visual Designer", company: "Notion", location: "Remote", fit: 55, type: "Full-time", status: "new", posted: "2d ago" },
];

const statCards = [
  { label: "New Matches", value: "24", delta: "↑ 8 from yesterday" },
  { label: "Avg Fit Score", value: "79%", delta: "↑ 3% this week" },
  { label: "Applied", value: "12", delta: "3 awaiting reply" },
  { label: "Saved", value: "31", delta: "7 deadlines soon" },
];

const sidebarNav = [
  { icon: "⚡", label: "Job Feed", active: true, badge: "24" },
  { icon: "📌", label: "Saved Jobs" },
  { icon: "📤", label: "Applications" },
  { icon: "📊", label: "Analytics" },
];

const sidebarProfile = [
  { icon: "📄", label: "My Resume", href: "/resume" },
  { icon: "⚙️", label: "Preferences" },
  { icon: "👤", label: "Account" },
];

const filters = ["All", "Remote", "Full-time", "Contract", "New Today"];

function fitClass(score: number) {
  return score >= 80 ? "fit-high" : score >= 65 ? "fit-med" : "fit-low";
}

function statusClass(s: string) {
  return s === "new" ? "status-new" : s === "applied" ? "status-applied" : "status-saved";
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered =
    activeTab === "all"
      ? mockJobs
      : activeTab === "saved"
      ? mockJobs.filter((j) => j.status === "saved")
      : mockJobs.filter((j) => j.status === "applied");

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
              {item.badge && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
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
            <div
              style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}
            >
              ⚡ Upgrade to Premium
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
              Auto-apply & employer alerts
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
            <div className="page-title">Job Feed</div>
            <div className="page-sub">
              Updated 2 minutes ago · 247 new matches today
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
          <button
            className="btn btn-ghost"
            style={{ whiteSpace: "nowrap", fontSize: 13 }}
          >
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

        <div className="jobs-table">
          <div className="table-head">
            <div className="th">Position</div>
            <div className="th">Company</div>
            <div className="th">Type</div>
            <div className="th">Fit Score</div>
            <div className="th">Status</div>
          </div>
          {filtered.map((job) => (
            <div className="table-row" key={job.id}>
              <div className="td">
                <div className="td-title">{job.title}</div>
                <div className="td-sub">
                  {job.location} · {job.posted}
                </div>
              </div>
              <div className="td">{job.company}</div>
              <div className="td">
                <span style={{ fontSize: 13 }}>{job.type}</span>
              </div>
              <div className="td">
                <span className={`fit-badge ${fitClass(job.fit)}`}>
                  {job.fit}%
                </span>
              </div>
              <div className="td">
                <span className={`status-pill ${statusClass(job.status)}`}>
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
