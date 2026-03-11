"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Remote"];

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [jobTitle, setJobTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Pre-fill form if profile already exists
  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setJobTitle(data.job_title ?? "");
          setSkills((data.skills ?? []).join(", "));
          setYearsExp(String(data.years_experience ?? ""));
          setJobTypes(data.preferred_job_types ?? []);
          setLocations((data.preferred_locations ?? []).join(", "));
        }
        setLoadingProfile(false);
      });
  }, [isLoaded, user]);

  function toggleJobType(type: string) {
    setJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_title: jobTitle.trim(),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        years_experience: yearsExp ? parseInt(yearsExp) : null,
        preferred_job_types: jobTypes,
        preferred_locations: locations.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save profile. Please try again.");
      setSaving(false);
    }
  }

  if (!isLoaded || loadingProfile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <div className="page-title" style={{ marginBottom: 8 }}>Set up your profile</div>
        <div className="page-sub">
          Joura uses your profile to score job matches and personalise your feed.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Job Title */}
        <div>
          <label style={labelStyle}>Current or target job title</label>
          <input
            style={inputStyle}
            placeholder="e.g. Operations & Partnerships Manager"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
          />
        </div>

        {/* Skills */}
        <div>
          <label style={labelStyle}>Skills <span style={{ color: "var(--muted)", fontWeight: 400 }}>(comma-separated)</span></label>
          <input
            style={inputStyle}
            placeholder="e.g. Operations, Partnerships, Analytics, Stakeholder Management"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            required
          />
        </div>

        {/* Years Experience */}
        <div>
          <label style={labelStyle}>Years of experience</label>
          <input
            style={{ ...inputStyle, width: 120 }}
            type="number"
            min={0}
            max={50}
            placeholder="4"
            value={yearsExp}
            onChange={(e) => setYearsExp(e.target.value)}
          />
        </div>

        {/* Preferred Job Types */}
        <div>
          <label style={labelStyle}>Preferred job types</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {JOB_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleJobType(type)}
                className={`filter-pill ${jobTypes.includes(type) ? "active" : ""}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Locations */}
        <div>
          <label style={labelStyle}>Preferred locations <span style={{ color: "var(--muted)", fontWeight: 400 }}>(comma-separated)</span></label>
          <input
            style={inputStyle}
            placeholder="e.g. Singapore, Remote"
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ marginTop: 8, padding: "12px" }}
        >
          {saving ? "Saving…" : "Save profile & go to dashboard"}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--fg)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--fg)",
  boxSizing: "border-box",
};
