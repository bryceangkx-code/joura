"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  fit_score: number | null;
  fit_reason: string | null;
  job_url: string | null;
  job_description: string | null;
  job_type: string;
  status: "new" | "saved" | "applied";
  posted_date: string;
};

type Plan = "free" | "basic" | "premium";

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

function applyUrl(job: Job) {
  if (job.job_url) return job.job_url;
  const q = encodeURIComponent(`${clean(job.title)} ${clean(job.company)}`);
  return `https://www.linkedin.com/jobs/search/?keywords=${q}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// useSearchParams must be inside a Suspense boundary for Next.js static builds
export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"all" | "saved" | "applied" | "cover_letters">("all");
  const [coverLetters, setCoverLetters] = useState<Array<{id: string, content: string, job_id: string, created_at: string}>>([])
  const [coverLettersLoaded, setCoverLettersLoaded] = useState(false)
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [plan, setPlan] = useState<Plan>("free");
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [upgradedBanner, setUpgradedBanner] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [applyModal, setApplyModal] = useState<Job | null>(null);
  const [hideWeakFit, setHideWeakFit] = useState(false);
  const [expandedJd, setExpandedJd] = useState<string | null>(null);

  const firstName = user?.firstName ?? user?.username ?? "there";

  const loadData = useCallback(async () => {
    const [profileRes, jobsRes, statsRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/jobs"),
      fetch("/api/dashboard/stats"),
    ]);
    if (profileRes.status === 404) {
      router.push("/profile");
      return;
    }
    if (jobsRes.ok) {
      const data = await jobsRes.json();
      setJobs(data.jobs ?? []);
      setPlan(data.plan ?? "free");
      setTotalCount(data.totalCount ?? 0);
    }
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (isLoaded && user) loadData();
  }, [isLoaded, user, loadData]);

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") setUpgradedBanner(true);
  }, [searchParams]);

  useEffect(() => {
    if (!upgradedBanner) return;
    const t = setTimeout(() => setUpgradedBanner(false), 6000);
    return () => clearTimeout(t);
  }, [upgradedBanner]);

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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function doQuickApply(job: Job) {
    window.open(applyUrl(job), "_blank", "noopener,noreferrer");
    setActionLoading(job.id);
    const res = await fetch(`/api/jobs/${job.id}/apply`, { method: "POST" });
    if (res.ok) {
      const { status } = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status } : j)));
      const statsRes = await fetch("/api/dashboard/stats");
      if (statsRes.ok) setStats(await statsRes.json());
      showToast("Good luck! Job marked as applied ✓");
    }
    setActionLoading(null);
    setApplyModal(null);
  }

  function triggerApply(job: Job) {
    if (plan === "premium") {
      setApplyModal(job);
    } else {
      doQuickApply(job);
    }
  }

  function handleTailorAndApply(job: Job) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("joura_pending_apply", JSON.stringify({
        id: job.id,
        title: clean(job.title),
        company: clean(job.company),
        apply_url: job.job_url,
        job_description: job.job_description ?? null,
      }));
    }
    setApplyModal(null);
    router.push("/resume");
  }

  async function handleAiScore(jobId: string) {
    setScoringId(jobId);
    const res = await fetch(`/api/jobs/${jobId}/score`, { method: "POST" });
    if (res.ok) {
      const { fit_score, fit_reason } = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, fit_score, fit_reason } : j)));
    }
    setScoringId(null);
  }

  const filtered = jobs.filter((j) => {
    if (activeTab !== "all" && j.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!clean(j.title).toLowerCase().includes(q) && !clean(j.company).toLowerCase().includes(q)) return false;
    }
    if (activeFilter === "Remote") {
      if (!clean(j.location).toLowerCase().includes("remote") && !clean(j.job_type).toLowerCase().includes("remote")) return false;
    } else if (activeFilter === "Full-time") {
      if (!clean(j.job_type).toLowerCase().includes("full")) return false;
    } else if (activeFilter === "Contract") {
      if (!clean(j.job_type).toLowerCase().includes("contract")) return false;
    } else if (activeFilter === "New Today") {
      const today = new Date().toDateString();
      if (new Date(j.posted_date).toDateString() !== today) return false;
    }
    if (hideWeakFit && (j.fit_score === null || j.fit_score <= 50)) return false;
    return true;
  });

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

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <>
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {sidebarNav.map((item) => (
            <button key={item.label} className={`sidebar-item ${item.active ? "active" : ""}`}>
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

        {plan !== "premium" && (
          <div style={{ marginTop: "auto", padding: "12px" }}>
            <div style={{
              background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 10, padding: "14px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>
                {plan === "free" ? "⚡ Upgrade to Basic" : "⚡ Upgrade to Premium"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                {plan === "free"
                  ? "Unlock full job feed & fit scoring"
                  : "Unlock AI Polish & AI fit scoring"}
              </div>
              <Link href="/pricing" className="btn btn-primary"
                style={{ width: "100%", fontSize: 12, padding: "8px", display: "block", textAlign: "center" }}>
                Upgrade Now
              </Link>
            </div>
          </div>
        )}
      </aside>

      <div className="main-content">
        {upgradedBanner && (
          <div style={{
            background: "rgba(76,175,130,0.12)", border: "1px solid rgba(76,175,130,0.3)",
            borderRadius: 10, padding: "14px 18px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>
                {"Welcome to " + planLabel + "!"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Your plan is now active. Enjoy your new features.
              </div>
            </div>
            <button className="btn btn-ghost" style={{ marginLeft: "auto", fontSize: 12 }}
              onClick={() => setUpgradedBanner(false)}>
              ✕
            </button>
          </div>
        )}

        <div className="page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="page-title">{"Welcome back, " + firstName}</div>
              {!loading && (
                plan === "premium" ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                    background: "rgba(201,168,76,0.15)", color: "var(--gold)",
                    letterSpacing: "0.5px", border: "1px solid rgba(201,168,76,0.3)",
                  }}>⚡ PREMIUM</span>
                ) : plan === "basic" ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                    background: "rgba(107,107,126,0.12)", color: "var(--muted)",
                    letterSpacing: "0.5px", border: "1px solid var(--border)",
                  }}>BASIC</span>
                ) : (
                  <Link href="/pricing" style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                    background: "rgba(107,107,126,0.08)", color: "var(--muted)",
                    letterSpacing: "0.5px", border: "1px solid var(--border)",
                    textDecoration: "none", transition: "all 0.15s",
                  }}>FREE → Upgrade</Link>
                )
              )}
            </div>
            <div className="page-sub">
              {loading
                ? "Loading your job feed…"
                : plan === "free"
                  ? `Showing 3 of ${totalCount} jobs · Free plan`
                  : `${jobs.length} jobs in your feed`}
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

        {plan === "free" && totalCount > 3 && !loading && (
          <div style={{
            background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 10, padding: "14px 20px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>
                {"🔒 Showing 3 of " + totalCount + " jobs"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Upgrade to Basic or Premium to see your full job feed and fit scores.
              </div>
            </div>
            <Link href="/pricing" className="btn btn-primary"
              style={{ fontSize: 13, padding: "8px 20px", whiteSpace: "nowrap", textDecoration: "none" }}>
              Upgrade →
            </Link>
          </div>
        )}

        <div className="tab-bar">
          {([["all", "All Jobs"], ["saved", "Saved"], ["applied", "Applied"]] as const).map(([v, l]) => (
            <button key={v} className={`tab ${activeTab === v ? "active" : ""}`} onClick={() => setActiveTab(v)}>
              {l}
            </button>
          ))}
          <button
            className={`tab ${activeTab === "cover_letters" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("cover_letters")
              if (!coverLettersLoaded) {
                fetch('/api/cover-letters')
                  .then(r => r.json())
                  .then(d => { setCoverLetters(d.coverLetters ?? []); setCoverLettersLoaded(true) })
              }
            }}
          >
            Cover Letters
          </button>
        </div>

        <div className="search-bar">
          <span style={{ color: "var(--muted)" }}>🔍</span>
          <input
            placeholder="Search job title, company, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn btn-ghost" style={{ whiteSpace: "nowrap", fontSize: 13 }}>
            Filters ▾
          </button>
        </div>

        <div className="filters">
          {filters.map((f) => (
            <button key={f} className={`filter-pill ${activeFilter === f ? "active" : ""}`}
              onClick={() => setActiveFilter(f)}>
              {f}
            </button>
          ))}
          {plan === "premium" && (
            <button
              className={`filter-pill ${hideWeakFit ? "active" : ""}`}
              onClick={() => setHideWeakFit((v) => !v)}
              style={hideWeakFit ? { background: "rgba(201,168,76,0.15)", borderColor: "rgba(201,168,76,0.4)", color: "var(--gold)" } : {}}
            >
              ⚡ High Fit Only
            </button>
          )}
        </div>

        {activeTab === 'cover_letters' ? (
          <div className="space-y-4 mt-4">
            {coverLetters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">★</p>
                <p className="font-medium">No cover letters yet</p>
                <p className="text-sm mt-1">Superlike a job in the swipe view to generate one</p>
                <a href="/swipe" className="mt-4 inline-block px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium">
                  Open Swipe View →
                </a>
              </div>
            ) : (
              coverLetters.map((cl) => (
                <div key={cl.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">{new Date(cl.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(cl.content)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{cl.content}</p>
                </div>
              ))
            )}
          </div>
        ) : loading ? (
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
              <div key={job.id}>
              <div className="table-row">
                <div className="td">
                  <div className="td-title">{clean(job.title)}</div>
                  <div className="td-sub">{clean(job.location)} · {timeAgo(job.posted_date)}</div>
                  {job.job_description && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: "2px 8px", marginTop: 4 }}
                      onClick={() => setExpandedJd(expandedJd === job.id ? null : job.id)}
                    >
                      {expandedJd === job.id ? "▲ Hide JD" : "▼ View JD"}
                    </button>
                  )}
                </div>
                <div className="td">{clean(job.company)}</div>
                <div className="td">
                  <span style={{ fontSize: 13 }}>{clean(job.job_type)}</span>
                </div>
                <div className="td">
                  {job.fit_score !== null ? (
                    <div>
                      <span className={`fit-badge ${fitClass(job.fit_score)}`}>{job.fit_score}%</span>
                      {job.fit_reason && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, maxWidth: 220, lineHeight: 1.4 }}>
                          {job.fit_reason}
                        </div>
                      )}
                    </div>
                  ) : plan === "free" ? (
                    <span className="fit-badge fit-med"
                      style={{ filter: "blur(3px)", userSelect: "none", cursor: "default" }}
                      title="Upgrade to see fit scores">
                      75%
                    </span>
                  ) : plan === "premium" ? (
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={() => handleAiScore(job.id)} disabled={scoringId === job.id}
                      title="AI Score this job">
                      {scoringId === job.id ? "…" : "⚡ Score"}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                  )}
                </div>
                <div className="td">
                  <span className={`status-pill ${statusClass(job.status)}`}>{job.status}</span>
                </div>
                <div className="td" style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }}
                    disabled={actionLoading === job.id || job.status === "applied"}
                    onClick={() => handleSave(job.id)}
                    title={job.status === "saved" ? "Unsave" : "Save"}>
                    {job.status === "saved" ? "★ Saved" : "☆ Save"}
                  </button>
                  <button
                    className={`btn ${job.status === "applied" ? "btn-outline" : "btn-primary"}`}
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    disabled={actionLoading === job.id || job.status === "applied"}
                    onClick={() => triggerApply(job)}>
                    {job.status === "applied" ? "✓ Applied" : "Apply"}
                  </button>
                </div>
              </div>
              {expandedJd === job.id && job.job_description && (
                <div style={{
                  padding: "16px 20px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--bg2)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--muted)",
                  whiteSpace: "pre-wrap",
                  maxHeight: 300,
                  overflowY: "auto",
                }}>
                  {job.job_description?.replace(/^=+/, "").trim()}
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* ── Apply modal (premium) ── */}
    {applyModal && (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}
        onClick={() => setApplyModal(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--bg2)", border: "1px solid var(--border2)",
            borderRadius: 16, padding: "32px", maxWidth: 440, width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 6 }}>
              Apply to
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-outfit)" }}>
              {clean(applyModal.title)}
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
              {clean(applyModal.company)}
            </div>
          </div>


          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Quick Apply */}
            <div style={{
              background: "var(--bg3)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "18px 20px",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>⚡ Quick Apply</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                {applyModal.job_url ? "Opens the application page and marks as applied." : "Opens a LinkedIn search for this role and marks as applied."}
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px" }}
                onClick={() => doQuickApply(applyModal)}
                disabled={actionLoading === applyModal.id}
              >
                {actionLoading === applyModal.id ? "Applying…" : "Quick Apply →"}
              </button>
            </div>

            {/* Tailor Resume */}
            <div style={{
              background: "var(--bg3)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "18px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>✨ Tailor Resume & Apply</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100,
                  background: "rgba(201,168,76,0.12)", color: "var(--gold)", letterSpacing: "0.5px",
                }}>PREMIUM</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                AI-polish your resume against the job description, then apply.
              </div>
              <button
                className="btn btn-outline"
                style={{ width: "100%", padding: "10px" }}
                onClick={() => handleTailorAndApply(applyModal)}
              >
                Tailor Resume →
              </button>
            </div>
          </div>

          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 16, fontSize: 13 }}
            onClick={() => setApplyModal(null)}
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* ── Toast notification ── */}
    {toast && (
      <div style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 300,
        background: "rgba(76,175,130,0.15)", border: "1px solid rgba(76,175,130,0.35)",
        borderRadius: 10, padding: "12px 20px", fontSize: 14, color: "var(--green)",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        pointerEvents: "none",
      }}>
        ✓ {toast}
      </div>
    )}
    </>
  );
}
