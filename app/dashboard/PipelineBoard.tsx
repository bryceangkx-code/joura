"use client";

import { useState } from "react";
import ApplicationKit from "./ApplicationKit";

type JobStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  fit_score: number | null;
  job_url: string | null;
  job_description: string | null;
  job_type: string;
  status: string;
  posted_date: string;
};

type Props = {
  jobs: Job[];
  plan: "free" | "basic" | "premium";
  userSkills: string[];
  onStatusChange: (jobId: string, status: JobStatus) => void;
};

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

const STAGES: { key: JobStatus; label: string; color: string; bg: string; nextLabel?: string; next?: JobStatus }[] = [
  { key: "saved",       label: "Saved",        color: "#6b6b7e", bg: "rgba(107,107,126,0.08)", nextLabel: "Mark Applied →",      next: "applied" },
  { key: "applied",     label: "Applied",       color: "#4fa3e0", bg: "rgba(79,163,224,0.08)",  nextLabel: "Got Interview →",     next: "interviewing" },
  { key: "interviewing",label: "Interviewing",  color: "var(--gold)", bg: "rgba(201,168,76,0.08)", nextLabel: "Got Offer →",      next: "offer" },
  { key: "offer",       label: "Offer",         color: "var(--green)", bg: "rgba(76,175,130,0.1)", nextLabel: undefined,          next: undefined },
];

export default function PipelineBoard({ jobs, plan, userSkills, onStatusChange }: Props) {
  const [kitJob, setKitJob] = useState<Job | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const pipelineJobs = jobs.filter(j =>
    ["saved", "applied", "interviewing", "offer"].includes(j.status)
  );

  async function moveStatus(job: Job, newStatus: JobStatus) {
    setMovingId(job.id);
    const res = await fetch(`/api/jobs/${job.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) onStatusChange(job.id, newStatus);
    setMovingId(null);
  }

  async function handleApplied(jobId: string) {
    onStatusChange(jobId, "applied");
  }

  if (pipelineJobs.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No applications yet</div>
        <div style={{ fontSize: 14 }}>
          Save jobs from your feed or swipe view — they'll appear here when you're ready to apply.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Summary strip */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap",
      }}>
        {STAGES.map(stage => {
          const count = pipelineJobs.filter(j => j.status === stage.key).length;
          return (
            <div key={stage.key} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 99,
              background: count > 0 ? stage.bg : "transparent",
              border: `1px solid ${count > 0 ? stage.color + "44" : "var(--border)"}`,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? stage.color : "var(--muted)" }}>
                {count}
              </span>
              <span style={{ fontSize: 13, color: count > 0 ? stage.color : "var(--muted)", fontWeight: count > 0 ? 600 : 400 }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        alignItems: "start",
      }}>
        {STAGES.map(stage => {
          const stageJobs = pipelineJobs.filter(j => j.status === stage.key);
          return (
            <div key={stage.key}>
              {/* Column header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 12, paddingBottom: 10,
                borderBottom: `2px solid ${stage.color}44`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: stage.color }}>
                  {stage.label}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, width: 22, height: 22,
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: stageJobs.length > 0 ? stage.bg : "transparent",
                  color: stageJobs.length > 0 ? stage.color : "var(--muted)",
                  border: `1px solid ${stageJobs.length > 0 ? stage.color + "55" : "var(--border)"}`,
                }}>
                  {stageJobs.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stageJobs.length === 0 && (
                  <div style={{
                    padding: "24px 16px", borderRadius: 12, textAlign: "center",
                    border: "1px dashed var(--border)", color: "var(--muted)", fontSize: 12,
                  }}>
                    None yet
                  </div>
                )}
                {stageJobs.map(job => (
                  <div key={job.id} style={{
                    background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: "14px 16px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.35 }}>
                      {clean(job.title)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
                      {clean(job.company)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
                      {clean(job.location)} · {timeAgo(job.posted_date)}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {/* Apply Kit button for saved jobs */}
                      {stage.key === "saved" && (
                        <button
                          onClick={() => setKitJob(job)}
                          style={{
                            padding: "7px 12px", borderRadius: 8, fontSize: 12,
                            fontWeight: 600, cursor: "pointer", width: "100%",
                            background: "var(--accent)", color: "#fff", border: "none",
                          }}
                        >
                          Prepare & Apply →
                        </button>
                      )}

                      {/* Advance stage button */}
                      {stage.next && (
                        <button
                          onClick={() => moveStatus(job, stage.next!)}
                          disabled={movingId === job.id}
                          style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 12,
                            fontWeight: 500, cursor: "pointer", width: "100%",
                            background: "transparent", color: stage.color,
                            border: `1px solid ${stage.color}44`,
                          }}
                        >
                          {movingId === job.id ? "…" : stage.nextLabel}
                        </button>
                      )}

                      {/* Remove / reject */}
                      <button
                        onClick={() => moveStatus(job, "rejected")}
                        disabled={movingId === job.id}
                        style={{
                          padding: "5px 12px", borderRadius: 8, fontSize: 11,
                          fontWeight: 400, cursor: "pointer", width: "100%",
                          background: "transparent", color: "var(--muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {kitJob && (
        <ApplicationKit
          job={kitJob}
          plan={plan}
          userSkills={userSkills}
          onClose={() => setKitJob(null)}
          onApplied={handleApplied}
        />
      )}
    </>
  );
}
