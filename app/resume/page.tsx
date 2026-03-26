"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

type Plan = "free" | "basic" | "premium";

type Resume = {
  id: string;
  file_name: string;
  file_url: string;
  signed_url: string | null;
  created_at: string;
};

type ParsedResume = {
  full_name: string | null;
  email: string | null;
  current_job_title: string | null;
  skills: string[];
  years_of_experience: number | null;
  previous_roles: { title: string; company: string }[];
};

type EditableResume = {
  full_name: string;
  email: string;
  current_job_title: string;
  skills: string[];
  years_of_experience: number | null;
  previous_roles: { title: string; company: string }[];
};

type PolishResult = {
  ats_score: number;
  missing_keywords: string[];
  bullet_rewrites: { original: string; rewritten: string; reason: string }[];
};

type RightView = "preview" | "parsing" | "parsed" | "polishing" | "polished" | "editing";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function scoreColor(score: number) {
  if (score >= 75) return "var(--green)";
  if (score >= 50) return "var(--amber)";
  return "var(--red)";
}

export default function ResumePage() {
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState<Plan>("free");
  const [planLoading, setPlanLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [active, setActive] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Parse state
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [parseError, setParseError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Polish state
  const [jobDescription, setJobDescription] = useState("");
  const [polishResult, setPolishResult] = useState<PolishResult | null>(null);
  const [polishError, setPolishError] = useState("");

  // Edit state
  const [editableData, setEditableData] = useState<EditableResume | null>(null);
  const [skillsInput, setSkillsInput] = useState("");
  const [editSaved, setEditSaved] = useState(false);

  // Right panel view
  const [rightView, setRightView] = useState<RightView>("preview");

  // Mobile: toggle between left (upload/edit) and right (preview) panels
  const [mobileShowPreview, setMobileShowPreview] = useState(false);

  // Pending apply — set from dashboard "Tailor Resume & Apply"
  const [pendingApply, setPendingApply] = useState<{
    id: string; title: string; company: string; apply_url: string | null; job_description: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = useCallback(async () => {
    const [resumeRes, profileRes] = await Promise.all([
      fetch("/api/resume"),
      fetch("/api/profile"),
    ]);
    if (resumeRes.ok) {
      const data: Resume[] = await resumeRes.json();
      setResumes(data);
      if (data.length > 0) setActive(data[0]);
    }
    if (profileRes.ok) {
      const profile = await profileRes.json();
      setPlan(profile?.plan ?? "free");
    }
    setPlanLoading(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && user) loadResumes();
  }, [isLoaded, user, loadResumes]);

  useEffect(() => {
    const raw = sessionStorage.getItem("joura_pending_apply");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setPendingApply(parsed);
        if (parsed.job_description) setJobDescription(parsed.job_description);
      } catch { /* ignore */ }
    }
  }, []);

  async function parseResume(resumeId: string) {
    setRightView("parsing");
    setParsedData(null);
    setParseError("");
    setSaveSuccess(false);
    const res = await fetch(`/api/resume/${resumeId}/parse`, { method: "POST" });
    if (res.ok) {
      const data: ParsedResume = await res.json();
      setParsedData(data);
      setRightView("parsed");
    } else {
      const data = await res.json();
      setParseError(data.error ?? "Failed to parse resume.");
      setRightView("preview");
    }
  }

  function startEdit(data: ParsedResume) {
    const ed: EditableResume = {
      full_name: data.full_name ?? "",
      email: data.email ?? "",
      current_job_title: data.current_job_title ?? "",
      skills: data.skills,
      years_of_experience: data.years_of_experience,
      previous_roles: data.previous_roles,
    };
    setEditableData(ed);
    setSkillsInput(data.skills.join(", "));
    setEditSaved(false);
    setRightView("editing");
  }

  async function parseAndEdit(resumeId: string) {
    setRightView("parsing");
    setParsedData(null);
    setParseError("");
    const res = await fetch(`/api/resume/${resumeId}/parse`, { method: "POST" });
    if (res.ok) {
      const data: ParsedResume = await res.json();
      setParsedData(data);
      startEdit(data);
    } else {
      const data = await res.json();
      setParseError(data.error ?? "Failed to parse resume.");
      setRightView("preview");
    }
  }

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf") { setUploadError("Only PDF files are supported."); return; }
    setUploadError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
    if (res.ok) {
      const newResume: Resume = await res.json();
      setResumes((prev) => [newResume, ...prev]);
      setActive(newResume);
      setUploading(false);
      await parseResume(newResume.id);
    } else {
      const data = await res.json();
      setUploadError(data.error ?? "Upload failed.");
      setUploading(false);
    }
  }

  async function handleConfirm() {
    if (!parsedData) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_title: parsedData.current_job_title ?? "",
        skills: parsedData.skills,
        years_experience: parsedData.years_of_experience,
        preferred_job_types: [],
        preferred_locations: [],
      }),
    });
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => { setParsedData(null); setSaveSuccess(false); setRightView("preview"); }, 2000);
    }
    setSaving(false);
  }

  async function handleSaveEdit() {
    if (!editableData) return;
    setSaving(true);
    const skills = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_title: editableData.current_job_title,
        skills,
        years_experience: editableData.years_of_experience,
        preferred_job_types: [],
        preferred_locations: [],
      }),
    });
    if (res.ok) {
      setEditableData((prev) => prev ? { ...prev, skills } : null);
      setEditSaved(true);
      setTimeout(() => setEditSaved(false), 2500);
    }
    setSaving(false);
  }

  function updateRole(index: number, field: "title" | "company", value: string) {
    setEditableData((prev) => {
      if (!prev) return null;
      const roles = prev.previous_roles.map((r, i) => i === index ? { ...r, [field]: value } : r);
      return { ...prev, previous_roles: roles };
    });
  }

  function removeRole(index: number) {
    setEditableData((prev) =>
      prev ? { ...prev, previous_roles: prev.previous_roles.filter((_, i) => i !== index) } : null
    );
  }

  function addRole() {
    setEditableData((prev) =>
      prev ? { ...prev, previous_roles: [...prev.previous_roles, { title: "", company: "" }] } : null
    );
  }

  async function handlePolish() {
    if (!active || !jobDescription.trim()) return;
    setPolishError("");
    setPolishResult(null);
    setRightView("polishing");
    const res = await fetch(`/api/resume/${active.id}/polish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_description: jobDescription }),
    });
    if (res.ok) {
      setPolishResult(await res.json());
      setRightView("polished");
    } else {
      const data = await res.json();
      setPolishError(data.error ?? "Analysis failed. Please try again.");
      setRightView("preview");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/resume/${id}`, { method: "DELETE" });
    setResumes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (active?.id === id) { setActive(next[0] ?? null); setRightView("preview"); }
      return next;
    });
    setDeletingId(null);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  const isProcessing = uploading || rightView === "parsing" || rightView === "polishing";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>

    {/* ── Pending apply banner ── */}
    {pendingApply && (
      <div style={{
        background: "rgba(201,168,76,0.08)", borderBottom: "1px solid rgba(201,168,76,0.25)",
        padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>✨</span>
        <div style={{ flex: 1, fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: "var(--gold)" }}>Applying to {pendingApply.title}</span>
          <span style={{ color: "var(--muted)" }}>
            {pendingApply.job_description
              ? ` at ${pendingApply.company} — job description pre-filled. Click Analyse & Polish when ready.`
              : ` at ${pendingApply.company} — open the job listing, copy the description, paste it below, then click Analyse & Polish.`}
          </span>
        </div>
        <a
          href={pendingApply.apply_url ?? `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${pendingApply.title} ${pendingApply.company}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{ fontSize: 12, padding: "6px 14px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          View Job →
        </a>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: "6px 10px", flexShrink: 0 }}
          onClick={() => { sessionStorage.removeItem("joura_pending_apply"); setPendingApply(null); }}
        >
          ✕
        </button>
      </div>
    )}

    <div className="resume-layout" style={{ flex: 1, minHeight: 0 }}>

      {/* ── Mobile panel toggle ── */}
      <div className="resume-mobile-toggle">
        <button
          className={`toolbar-btn${!mobileShowPreview ? " active" : ""}`}
          style={{ flex: 1 }}
          onClick={() => setMobileShowPreview(false)}
        >
          ✏️ Edit
        </button>
        <button
          className={`toolbar-btn${mobileShowPreview ? " active" : ""}`}
          style={{ flex: 1 }}
          onClick={() => setMobileShowPreview(true)}
        >
          👁 Preview
        </button>
      </div>

      {/* ── Left panel ── */}
      <div className={`resume-editor-panel${mobileShowPreview ? " resume-preview-mobile-hidden" : ""}`}>
        <div className="panel-toolbar">
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "var(--font-outfit)" }}>
            {rightView === "editing" ? "Edit Resume" : "Resumes"}
          </span>
          <div className="toolbar-sep" />
          {rightView === "editing" ? (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>live preview →</span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{resumes.length} {resumes.length === 1 ? "file" : "files"}</span>
          )}
          <div style={{ marginLeft: "auto" }}>
            {rightView === "editing" ? (
              <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13 }}
                onClick={() => { setRightView("preview"); setEditableData(null); }}>
                ← Back
              </button>
            ) : (
              <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 13 }}
                onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                {uploading ? "Uploading…" : rightView === "parsing" ? "Analysing…" : "+ Upload PDF"}
              </button>
            )}
          </div>
        </div>

        {/* ── Edit form (when editing) ── */}
        {rightView === "editing" && editableData ? (
          <div className="editor-sections">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Personal info */}
              <div>
                <div style={sectionHeading}>Personal Info</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <EditField label="Full Name" value={editableData.full_name}
                    onChange={(v) => setEditableData((p) => p ? { ...p, full_name: v } : null)} />
                  <EditField label="Email" value={editableData.email}
                    onChange={(v) => setEditableData((p) => p ? { ...p, email: v } : null)} />
                </div>
              </div>

              {/* Professional */}
              <div>
                <div style={sectionHeading}>Professional</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <EditField label="Current / Target Job Title" value={editableData.current_job_title}
                    onChange={(v) => setEditableData((p) => p ? { ...p, current_job_title: v } : null)} />
                  <div>
                    <div style={labelStyle}>Years of Experience</div>
                    <input
                      type="number" min={0} max={60}
                      value={editableData.years_of_experience ?? ""}
                      onChange={(e) => setEditableData((p) => p ? {
                        ...p,
                        years_of_experience: e.target.value ? parseInt(e.target.value, 10) : null,
                      } : null)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <div style={sectionHeading}>Skills</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>Comma-separated</div>
                <textarea
                  value={skillsInput}
                  onChange={(e) => {
                    setSkillsInput(e.target.value);
                    const skills = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                    setEditableData((p) => p ? { ...p, skills } : null);
                  }}
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                />
                {editableData.skills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                    {editableData.skills.map((s, i) => (
                      <span key={i} className="filter-pill active" style={{ cursor: "default", fontSize: 11 }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Previous roles */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={sectionHeading}>Previous Roles</div>
                  <button className="toolbar-btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={addRole}>
                    + Add
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {editableData.previous_roles.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>No roles yet — click + Add.</div>
                  )}
                  {editableData.previous_roles.map((r, i) => (
                    <div key={i} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Role {i + 1}</span>
                        <button className="del-btn" onClick={() => removeRole(i)}>✕</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input placeholder="Job title" value={r.title}
                          onChange={(e) => updateRole(i, "title", e.target.value)}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }} />
                        <input placeholder="Company" value={r.company}
                          onChange={(e) => updateRole(i, "company", e.target.value)}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                className="btn btn-primary"
                style={{ padding: "12px", marginTop: 4 }}
                onClick={handleSaveEdit}
                disabled={saving || editSaved}
              >
                {editSaved ? "✓ Saved to profile!" : saving ? "Saving…" : "Save to Profile"}
              </button>
            </div>
          </div>
        ) : (
          /* ── Normal left panel content ── */
          <div className="editor-sections">
            {/* Drop zone */}
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--gold)" : "var(--border2)"}`,
                borderRadius: 12, padding: "28px 24px", textAlign: "center",
                cursor: isProcessing ? "default" : "pointer",
                background: dragging ? "rgba(201,168,76,0.05)" : "transparent",
                transition: "all 0.15s", marginBottom: 24, opacity: isProcessing ? 0.6 : 1,
              }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {rightView === "parsing" ? "✨" : rightView === "polishing" ? "🔍" : "📄"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {uploading ? "Uploading…" : rightView === "parsing" ? "Analysing resume…" : rightView === "polishing" ? "Running AI analysis…" : "Drop your PDF here"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {isProcessing ? "This usually takes a few seconds" : "or click to browse"}
              </div>
              {uploadError && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{uploadError}</div>}
            </div>

            <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />

            {/* Resume list */}
            {loading ? (
              <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Loading…</div>
            ) : resumes.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No resumes uploaded yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 4 }}>Uploaded Files</div>
                {resumes.map((r) => (
                  <div key={r.id} onClick={() => { setActive(r); setRightView("preview"); setParsedData(null); setPolishResult(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${active?.id === r.id ? "var(--gold)" : "var(--border)"}`,
                      background: active?.id === r.id ? "rgba(201,168,76,0.06)" : "var(--bg3)",
                      transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.file_name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{formatDate(r.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <button className="toolbar-btn" style={{ fontSize: 11, padding: "3px 7px" }}
                        onClick={(e) => { e.stopPropagation(); setActive(r); parseAndEdit(r.id); }}
                        disabled={isProcessing} title="Edit resume">✏️</button>
                      <button className="toolbar-btn" style={{ fontSize: 11, padding: "3px 7px" }}
                        onClick={(e) => { e.stopPropagation(); setActive(r); parseResume(r.id); }}
                        disabled={isProcessing} title="Re-parse with AI">✨</button>
                      <button className="del-btn" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        disabled={deletingId === r.id} title="Delete">
                        {deletingId === r.id ? "…" : "✕"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── AI Polish section ── */}
            {active && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--gold)" }}>
                    ✨ AI Polish
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100,
                    background: "rgba(201,168,76,0.12)", color: "var(--gold)", letterSpacing: "0.5px",
                  }}>PREMIUM</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                  Paste a job description to get an ATS score, missing keywords, and tailored bullet rewrites.
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here…"
                  style={{
                    width: "100%", minHeight: 120, background: "var(--bg3)",
                    border: "1px solid var(--border)", borderRadius: 8,
                    padding: "10px 12px", fontSize: 13, color: "var(--text)",
                    fontFamily: "var(--font-inter), Inter, sans-serif",
                    resize: "vertical", outline: "none", boxSizing: "border-box",
                    marginBottom: 10,
                  }}
                />
                {polishError && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{polishError}</div>}
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "10px" }}
                  onClick={handlePolish}
                  disabled={isProcessing || !jobDescription.trim()}
                >
                  {rightView === "polishing" ? "Analysing…" : "Analyse & Polish"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className={`resume-preview${!mobileShowPreview ? " resume-preview-mobile-hidden" : ""}`} style={{ padding: 0, display: "flex", flexDirection: "column" }}>

        {/* Toolbar */}
        <div style={{
          padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg2)",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {rightView === "parsing" ? "Analysing with AI…"
              : rightView === "parsed" ? "AI found the following"
              : rightView === "polishing" ? "Running ATS analysis…"
              : rightView === "polished" ? "AI Polish results"
              : rightView === "editing" ? "Live preview"
              : active ? `Previewing: ${active.file_name}` : "No resume selected"}
          </span>
          {rightView === "preview" && active?.signed_url && (
            <a href={active.signed_url} target="_blank" rel="noopener noreferrer"
              className="toolbar-btn" style={{ marginLeft: "auto", textDecoration: "none" }}>
              ↗ Open in new tab
            </a>
          )}
          {(rightView === "parsed" || rightView === "polished") && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {rightView === "polished" && pendingApply?.apply_url && (
                <a
                  href={pendingApply.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: "6px 14px", textDecoration: "none" }}
                  onClick={() => { sessionStorage.removeItem("joura_pending_apply"); setPendingApply(null); }}
                >
                  Apply Now →
                </a>
              )}
              <button className="toolbar-btn"
                onClick={() => { setRightView("preview"); setParsedData(null); }}>
                ← Back to preview
              </button>
            </div>
          )}
          {rightView === "editing" && (
            <button className="toolbar-btn" style={{ marginLeft: "auto" }}
              onClick={() => { setRightView("preview"); setEditableData(null); }}>
              ← Back to PDF
            </button>
          )}
        </div>

        {/* Parsing spinner */}
        {rightView === "parsing" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--muted)" }}>
            <div style={{ fontSize: 40 }}>✨</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Analysing your resume…</div>
            <div style={{ fontSize: 13 }}>Extracting experience, skills and contact info</div>
          </div>
        )}

        {/* Polishing spinner */}
        {rightView === "polishing" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--muted)" }}>
            <div style={{ fontSize: 40 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Running ATS analysis…</div>
            <div style={{ fontSize: 13 }}>Matching your resume against the job description</div>
          </div>
        )}

        {/* Parse confirmation */}
        {rightView === "parsed" && parsedData && (
          <div style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              <div style={{
                background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: 12, padding: "14px 18px", marginBottom: 28,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>We found the following from your resume</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Review, edit, or save directly to your profile</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <InfoBlock label="Full Name" value={parsedData.full_name} />
                  <InfoBlock label="Email" value={parsedData.email} />
                </div>
                <InfoBlock label="Current / Target Job Title" value={parsedData.current_job_title} />
                <InfoBlock label="Years of Experience" value={parsedData.years_of_experience !== null ? `${parsedData.years_of_experience} years` : null} />
                <div>
                  <div style={labelStyle}>Skills</div>
                  {parsedData.skills.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {parsedData.skills.map((s) => <span key={s} className="filter-pill active" style={{ cursor: "default" }}>{s}</span>)}
                    </div>
                  ) : <div style={{ fontSize: 13, color: "var(--muted)" }}>None found</div>}
                </div>
                {parsedData.previous_roles.length > 0 && (
                  <div>
                    <div style={labelStyle}>Previous Roles</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {parsedData.previous_roles.map((r, i) => (
                        <div key={i} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.company}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {parseError && <div style={{ color: "var(--red)", fontSize: 13 }}>{parseError}</div>}
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  <button className="btn btn-primary" style={{ flex: 1, padding: "12px" }}
                    onClick={handleConfirm} disabled={saving || saveSuccess}>
                    {saveSuccess ? "✓ Profile updated!" : saving ? "Saving…" : "Confirm & save to profile"}
                  </button>
                  <button className="btn btn-outline" style={{ padding: "12px 18px" }}
                    onClick={() => startEdit(parsedData)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "12px 18px" }}
                    onClick={() => { setParsedData(null); setRightView("preview"); }}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Polish results — with premium lock overlay */}
        {rightView === "polished" && polishResult && (
          <div style={{ flex: 1, overflowY: "auto", padding: "40px", position: "relative" }}>
            {/* Results — blurred for non-premium (never blur during plan load) */}
            <div style={{
              maxWidth: 600, margin: "0 auto",
              ...(!planLoading && plan !== "premium" ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {}),
            }}>
              <PolishResults result={polishResult} />
            </div>

            {/* Lock overlay — only shown once plan is confirmed non-premium */}
            {!planLoading && plan !== "premium" && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(to bottom, rgba(10,10,11,0.2) 0%, rgba(10,10,11,0.85) 40%)",
              }}>
                <div style={{
                  background: "var(--bg2)", border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 16, padding: "36px 40px", textAlign: "center", maxWidth: 340,
                  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-outfit)", marginBottom: 8 }}>
                    Premium Feature
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
                    Unlock your ATS score, missing keywords, and tailored bullet rewrites to land more interviews.
                  </div>
                  <Link href="/pricing" className="btn btn-primary"
                    style={{ display: "block", padding: "12px", marginBottom: 12, textDecoration: "none", textAlign: "center" }}>
                    ⚡ Upgrade to Premium
                  </Link>
                  <button className="btn btn-ghost" style={{ width: "100%", fontSize: 13 }}
                    onClick={() => setRightView("preview")}>
                    Maybe later
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live resume preview (editing mode) */}
        {rightView === "editing" && editableData && (
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", background: "var(--bg)" }}>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <ResumePreviewDoc data={editableData} />
            </div>
          </div>
        )}

        {/* PDF preview */}
        {rightView === "preview" && (
          active?.signed_url ? (
            <iframe key={active.signed_url} src={active.signed_url}
              style={{ flex: 1, width: "100%", border: "none", background: "#1a1a1f" }}
              title={active.file_name} />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: 12 }}>
              <div style={{ fontSize: 48 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>No resume selected</div>
              <div style={{ fontSize: 13 }}>Upload a PDF to preview it here</div>
            </div>
          )
        )}
      </div>
    </div>
    </div>
  );
}

/* ── Resume live preview document ── */
function ResumePreviewDoc({ data }: { data: EditableResume }) {
  const hasContent = data.full_name || data.email || data.current_job_title;
  return (
    <div style={{
      background: "#fff", color: "#1a1a1a", borderRadius: 6,
      padding: "52px 60px", fontFamily: "Georgia, 'Times New Roman', serif",
      boxShadow: "0 12px 48px rgba(0,0,0,0.5)", minHeight: 680,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "2px solid #1a1a1a" }}>
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 700,
          fontFamily: "var(--font-outfit), Arial, sans-serif",
          letterSpacing: "-0.5px", color: "#1a1a1a",
        }}>
          {data.full_name || <span style={{ color: "#bbb" }}>Your Name</span>}
        </h1>
        {data.current_job_title && (
          <div style={{ fontSize: 15, color: "#444", marginTop: 5, fontFamily: "Arial, sans-serif", fontWeight: 500 }}>
            {data.current_job_title}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#777", marginTop: 7, fontFamily: "Arial, sans-serif" }}>
          {[
            data.email || null,
            data.years_of_experience !== null ? `${data.years_of_experience} yrs experience` : null,
          ].filter(Boolean).join("  ·  ")}
        </div>
      </div>

      {!hasContent && (
        <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, fontFamily: "Arial, sans-serif", paddingTop: 40 }}>
          Start filling in the form to see your resume preview
        </div>
      )}

      {/* Experience */}
      {data.previous_roles.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={docSectionHeading}>Experience</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {data.previous_roles.map((r, i) => (
              <div key={i}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", fontFamily: "Arial, sans-serif" }}>
                  {r.title || <span style={{ color: "#bbb" }}>Job Title</span>}
                </div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 2, fontFamily: "Arial, sans-serif" }}>
                  {r.company || <span style={{ color: "#bbb" }}>Company</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={docSectionHeading}>Skills</h2>
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.9, fontFamily: "Arial, sans-serif" }}>
            {data.skills.join("  ·  ")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Polish results ── */
function PolishResults({ result }: { result: PolishResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 16 }}>ATS Match Score</div>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 100, height: 100, borderRadius: "50%",
          border: `4px solid ${scoreColor(result.ats_score)}`,
          boxShadow: `0 0 24px ${scoreColor(result.ats_score)}40`,
        }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "var(--font-outfit)", color: scoreColor(result.ats_score), lineHeight: 1 }}>
              {result.ats_score}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>/ 100</div>
          </div>
        </div>
      </div>
      <div>
        <div style={labelStyle}>Top Missing Keywords</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {result.missing_keywords.map((k) => (
            <span key={k} style={{
              padding: "6px 14px", borderRadius: 100, fontSize: 13, fontWeight: 500,
              background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.25)", color: "var(--red)",
            }}>— {k}</span>
          ))}
        </div>
      </div>
      <div>
        <div style={labelStyle}>Bullet Point Rewrites</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {result.bullet_rewrites.map((b, i) => (
            <div key={i} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 6 }}>Original</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{b.original}</div>
              </div>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "rgba(76,175,130,0.04)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--green)", marginBottom: 6 }}>Rewritten</div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{b.rewritten}</div>
              </div>
              <div style={{ padding: "10px 16px" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>💡 {b.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */
function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{
        background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8,
        padding: "10px 14px", fontSize: 13, color: value ? "var(--text)" : "var(--muted)",
      }}>
        {value ?? "Not found"}
      </div>
    </div>
  );
}

/* ── Styles ── */
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 6,
};

const sectionHeading: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 10,
  paddingBottom: 6, borderBottom: "1px solid var(--border)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)",
  fontFamily: "var(--font-inter), Inter, sans-serif", outline: "none",
  boxSizing: "border-box",
};

const docSectionHeading: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px",
  color: "#666", marginBottom: 12, marginTop: 0,
  fontFamily: "Arial, sans-serif", borderBottom: "1px solid #ddd", paddingBottom: 6,
};
