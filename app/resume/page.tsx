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
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = useCallback(async () => {
    const res = await fetch("/api/resume");
    if (res.ok) {
      const data: Resume[] = await res.json();
      setResumes(data);
      if (data.length > 0 && !active) setActive(data[0]);
    }
    setLoading(false);
  }, [active]);

  useEffect(() => {
    if (isLoaded && user) loadResumes();
  }, [isLoaded, user, loadResumes]);

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
    if (res.ok) {
      const newResume: Resume = await res.json();
      setResumes((prev) => [newResume, ...prev]);
      setActive(newResume);
    } else {
      const data = await res.json();
      setError(data.error ?? "Upload failed. Please try again.");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/resume/${id}`, { method: "DELETE" });
    setResumes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (active?.id === id) setActive(next[0] ?? null);
      return next;
    });
    setDeletingId(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="resume-layout">
      {/* Left panel — upload + history */}
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
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "+ Upload PDF"}
            </button>
          </div>
        </div>

        <div className="editor-sections">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--gold)" : "var(--border2)"}`,
              borderRadius: 12,
              padding: "32px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "rgba(201,168,76,0.05)" : "transparent",
              transition: "all 0.15s",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              {uploading ? "Uploading…" : "Drop your PDF here"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              or click to browse
            </div>
            {error && (
              <div style={{ color: "var(--red)", fontSize: 12, marginTop: 10 }}>
                {error}
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
                  onClick={() => setActive(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
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
                  <button
                    className="del-btn"
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                    disabled={deletingId === r.id}
                    style={{ flexShrink: 0 }}
                    title="Delete"
                  >
                    {deletingId === r.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — PDF preview */}
      <div className="resume-preview" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg2)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {active ? `Previewing: ${active.file_name}` : "No resume selected"}
          </span>
          {active?.signed_url && (
            <a
              href={active.signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="toolbar-btn"
              style={{ marginLeft: "auto", textDecoration: "none" }}
            >
              ↗ Open in new tab
            </a>
          )}
        </div>

        {active?.signed_url ? (
          <iframe
            key={active.signed_url}
            src={active.signed_url}
            style={{ flex: 1, width: "100%", border: "none", background: "#1a1a1f" }}
            title={active.file_name}
          />
        ) : (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            gap: 12,
          }}>
            <div style={{ fontSize: 48 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No resume selected</div>
            <div style={{ fontSize: 13 }}>Upload a PDF to preview it here</div>
          </div>
        )}
      </div>
    </div>
  );
}
