"use client";

import { useRouter } from "next/navigation";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  job_url: string | null;
  job_description: string | null;
  job_type: string;
};

type Props = {
  job: Job;
  plan: "free" | "basic" | "premium";
  userSkills: string[];
  onClose: () => void;
  onApplied: (jobId: string) => void;
};

function clean(val: string) {
  return val?.replace(/^=+/, "").trim() ?? "";
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  // Strip HTML tags if any
  const plain = text.replace(/<[^>]+>/g, " ").toLowerCase();
  // Extract meaningful phrases: 2–4 word sequences that look like skills/requirements
  const stopWords = new Set([
    "the","and","or","for","with","that","this","have","will","you","are","our",
    "from","your","we","a","an","in","of","to","is","be","as","at","by","on",
    "we're","you'll","must","can","may","all","also","more","than","well",
    "about","what","how","into","not","but","its","their","they","been","has",
    "was","were","it","if","do","so","up","who","get","use","any","other",
    "through","over","work","team","role","company","job","position","candidate",
    "experience","years","year","minimum","strong","excellent","ability","skills",
    "required","preferred","responsible","working","opportunities","environment"
  ]);

  const words = plain.match(/\b[a-z][a-z\+\#\.]{2,}\b/g) ?? [];
  const meaningful = words.filter(w => !stopWords.has(w) && w.length > 3);

  // Count frequency
  const freq: Record<string, number> = {};
  for (const w of meaningful) freq[w] = (freq[w] ?? 0) + 1;

  // Return top keywords sorted by frequency
  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function getKeywordGap(jdKeywords: string[], userSkills: string[]): string[] {
  const skillsLower = userSkills.map(s => s.toLowerCase());
  return jdKeywords.filter(kw => !skillsLower.some(s => s.includes(kw) || kw.includes(s)));
}

function getMatchedKeywords(jdKeywords: string[], userSkills: string[]): string[] {
  const skillsLower = userSkills.map(s => s.toLowerCase());
  return jdKeywords.filter(kw => skillsLower.some(s => s.includes(kw) || kw.includes(s)));
}

export default function ApplicationKit({ job, plan, userSkills, onClose, onApplied }: Props) {
  const router = useRouter();

  const jdKeywords = extractKeywords(job.job_description ?? "");
  const matched = getMatchedKeywords(jdKeywords, userSkills);
  const gaps = getKeywordGap(jdKeywords.slice(0, 12), userSkills).slice(0, 6);
  const total = Math.min(jdKeywords.length, 12);
  const matchPct = total > 0 ? Math.round((matched.length / total) * 100) : null;

  const applyUrl = job.job_url
    ? job.job_url
    : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${clean(job.title)} ${clean(job.company)}`)}`;

  async function handleApply() {
    window.open(applyUrl, "_blank", "noopener,noreferrer");
    await fetch(`/api/jobs/${job.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    onApplied(job.id);
    onClose();
  }

  function handleTailorResume() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("joura_pending_apply", JSON.stringify({
        id: job.id,
        title: clean(job.title),
        company: clean(job.company),
        apply_url: job.job_url,
        job_description: job.job_description ?? null,
      }));
    }
    onClose();
    router.push("/resume");
  }

  const barWidth = matchPct !== null ? `${matchPct}%` : "0%";
  const barColor = matchPct !== null && matchPct >= 70 ? "var(--green)" : matchPct !== null && matchPct >= 40 ? "var(--gold)" : "#e05c5c";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg2)", border: "1px solid var(--border2)",
          borderRadius: 18, padding: 0, maxWidth: 480, width: "100%",
          boxShadow: "0 28px 72px rgba(0,0,0,0.6)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 6 }}>
            Application Kit
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "var(--font-outfit)", marginBottom: 4 }}>
            {clean(job.title)}
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            {clean(job.company)} · {clean(job.location)}
          </div>
        </div>

        {/* Resume readiness */}
        {total > 0 && (
          <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Resume readiness</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: barColor }}>
                {matchPct !== null ? `${matchPct}%` : "—"}
              </div>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ height: "100%", width: barWidth, background: barColor, borderRadius: 99, transition: "width 0.4s" }} />
            </div>

            {gaps.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  Keywords missing from your profile:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {gaps.map(kw => (
                    <span key={kw} style={{
                      fontSize: 11, padding: "3px 9px", borderRadius: 99,
                      background: "rgba(224,92,92,0.1)", color: "#e05c5c",
                      border: "1px solid rgba(224,92,92,0.25)", fontWeight: 500,
                    }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {gaps.length === 0 && matched.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--green)" }}>
                ✓ Your profile covers the key requirements well
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Tailor resume */}
          <button
            onClick={handleTailorResume}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderRadius: 12, cursor: "pointer",
              background: "var(--bg3)", border: "1px solid var(--border)",
              textAlign: "left", width: "100%",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
                ✨ Tailor resume
                {plan !== "premium" && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100,
                    background: "rgba(201,168,76,0.12)", color: "var(--gold)", letterSpacing: "0.5px",
                  }}>PREMIUM</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                AI-polishes your resume against this JD
              </div>
            </div>
            <span style={{ color: "var(--muted)", fontSize: 16 }}>→</span>
          </button>

          {/* Apply now */}
          <button
            onClick={handleApply}
            style={{
              padding: "14px 18px", borderRadius: 12, cursor: "pointer",
              background: "var(--accent)", color: "#fff",
              border: "none", fontSize: 15, fontWeight: 700,
              fontFamily: "var(--font-outfit)",
            }}
          >
            Apply on {job.job_url ? clean(job.company) + "'s site" : "LinkedIn"} →
          </button>

          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
            Opens in a new tab · Job will be marked as Applied
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "14px", background: "transparent",
            border: "none", borderTop: "1px solid var(--border)",
            color: "var(--muted)", fontSize: 13, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
