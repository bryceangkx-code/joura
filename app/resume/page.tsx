"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ResumePage() {
  const { user, isLoaded } = useUser();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [active, setActive] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Parsing state
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [parseError, setParseError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = useCallback(async () => {
    const res = await fetch("/api/resume");
    if (res.ok) {
      const data: Resume[] = await res.json();
      setResumes(data);
      if (data.length > 0) setActive(data[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && user) loadResumes();
  }, [isLoaded, user, loadResumes]);

  async function parseResume(resumeId: string) {
    setParsing(true);
    setParsedData(null);
    setParseError("");
    setSaveSuccess(false);
    const res = await fetch(`/api/resume/${resumeId}/parse`, { method: "POST" });
    if (res.ok) {
      setParsedData(await res.json());
    } else {
      const data = await res.json();
      setParseError(data.error ?? "Failed to parse resume. Please try again.");
    }
    setParsing(false);
  }

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are supported.");
      return;
    }
    setUploadError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
    if (res.ok) {
      const newResume: Resume = await res.json();
      setResumes((prev) => [newResume, ...prev]);
      setActive(newResume);
      // Auto-trigger parsing after upload
      await parseResume(newResume.id);
    } else {
      const data = await res.json();
      setUploadError(data.error ?? "Upload failed. Please try again.");
    }
    setUploading(false);
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
      setTimeout(() => {
        setParsedData(null);
        setSaveSuccess(false);
      }, 2000);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/resume/${id}`, { method: "DELETE" });
    setResumes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (active?.id === id) setActive(next[0] ?? null);
      return next;
    });
    if (parsedData && active?.id === id) setParsedData(null);
    setDeletingId(null);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  const isProcessing = uploading || parsing;

  return (
    <div className="resume-layout">
      {/* ── Left panel — upload + history ── */}
      <div className="resume-editor-panel">
        <div className="panel-toolbar">
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "var(--font-outfit)" }}>
            Resumes
          </span>
          <div className="toolbar-sep" />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {resumes.length} {resumes.length === 1 ? "file" : "files"}
          </span>
          <div style={{ marginLeft: "auto" }}>
            <button
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: 13 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {uploading ? "Uploading…" : parsing ? "Analysing…" : "+ Upload PDF"}
            </button>
          </div>
        </div>

        <div className="editor-sections">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--gold)" : "var(--border2)"}`,
              borderRadius: 12,
              padding: "32px 24px",
              textAlign: "center",
              cursor: isProcessing ? "default" : "pointer",
              background: dragging ? "rgba(201,168,76,0.05)" : "transparent",
              transition: "all 0.15s",
              marginBottom: 24,
              opacity: isProcessing ? 0.6 : 1,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>
              {parsing ? "✨" : "📄"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              {uploading ? "Uploading…" : parsing ? "Analysing resume with AI…" : "Drop your PDF here"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {isProcessing ? "This usually takes a few seconds" : "or click to browse"}
            </div>
            {uploadError && (
              <div style={{ color: "var(--red)", fontSize: 12, marginTop: 10 }}>
                {uploadError}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />

          {/* Resume list */}
          {loading ? (
            <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Loading…
            </div>
          ) : resumes.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              No resumes uploaded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 4 }}>
                Uploaded Files
              </div>
              {resumes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => { setActive(r); setParsedData(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${active?.id === r.id ? "var(--gold)" : "var(--border)"}`,
                    background: active?.id === r.id ? "rgba(201,168,76,0.06)" : "var(--bg3)",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.file_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      {formatDate(r.created_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="toolbar-btn"
                      style={{ fontSize: 11, padding: "4px 8px" }}
                      onClick={(e) => { e.stopPropagation(); setActive(r); parseResume(r.id); }}
                      disabled={isProcessing}
                      title="Re-parse with AI"
                    >
                      ✨
                    </button>
                    <button
                      className="del-btn"
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      disabled={deletingId === r.id}
                      title="Delete"
                    >
                      {deletingId === r.id ? "…" : "✕"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="resume-preview" style={{ padding: 0, display: "flex", flexDirection: "column" }}>

        {/* Toolbar */}
        <div style={{
          padding: "14px 24px", borderBottom: "1px solid var(--border)",
          background: "var(--bg2)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {parsing ? "Analysing with AI…" : parsedData ? "AI found the following" : active ? `Previewing: ${active.file_name}` : "No resume selected"}
          </span>
          {!parsing && !parsedData && active?.signed_url && (
            <a href={active.signed_url} target="_blank" rel="noopener noreferrer"
              className="toolbar-btn" style={{ marginLeft: "auto", textDecoration: "none" }}>
              ↗ Open in new tab
            </a>
          )}
          {parsedData && (
            <button className="toolbar-btn" style={{ marginLeft: "auto" }}
              onClick={() => setParsedData(null)}>
              ← Back to preview
            </button>
          )}
        </div>

        {/* Parsing spinner */}
        {parsing && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--muted)" }}>
            <div style={{ fontSize: 40 }}>✨</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Analysing your resume…</div>
            <div style={{ fontSize: 13 }}>Extracting your experience, skills and contact info</div>
          </div>
        )}

        {/* Confirmation screen */}
        {!parsing && parsedData && (
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
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Review and confirm to update your profile</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Name + email */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <InfoBlock label="Full Name" value={parsedData.full_name} />
                  <InfoBlock label="Email" value={parsedData.email} />
                </div>

                {/* Job title */}
                <InfoBlock label="Current / Target Job Title" value={parsedData.current_job_title} />

                {/* Years of experience */}
                <InfoBlock
                  label="Years of Experience"
                  value={parsedData.years_of_experience !== null ? `${parsedData.years_of_experience} years` : null}
                />

                {/* Skills */}
                <div>
                  <div style={sectionLabel}>Skills</div>
                  {parsedData.skills.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {parsedData.skills.map((s) => (
                        <span key={s} className="filter-pill active" style={{ cursor: "default" }}>{s}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>None found</div>
                  )}
                </div>

                {/* Previous roles */}
                {parsedData.previous_roles.length > 0 && (
                  <div>
                    <div style={sectionLabel}>Previous Roles</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {parsedData.previous_roles.map((r, i) => (
                        <div key={i} style={{
                          background: "var(--bg3)", border: "1px solid var(--border)",
                          borderRadius: 8, padding: "10px 14px",
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.company}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parseError && (
                  <div style={{ color: "var(--red)", fontSize: 13 }}>{parseError}</div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "12px" }}
                    onClick={handleConfirm}
                    disabled={saving || saveSuccess}
                  >
                    {saveSuccess ? "✓ Profile updated!" : saving ? "Saving…" : "Confirm & save to profile"}
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: "12px 20px" }}
                    onClick={() => setParsedData(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF preview */}
        {!parsing && !parsedData && (
          active?.signed_url ? (
            <iframe
              key={active.signed_url}
              src={active.signed_url}
              style={{ flex: 1, width: "100%", border: "none", background: "#1a1a1f" }}
              title={active.file_name}
            />
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
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={sectionLabel}>{label}</div>
      <div style={{
        background: "var(--bg3)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "10px 14px", fontSize: 13,
        color: value ? "var(--text)" : "var(--muted)",
      }}>
        {value ?? "Not found"}
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "0.5px", color: "var(--muted)", marginBottom: 8,
};
