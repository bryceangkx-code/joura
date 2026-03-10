"use client";

const experiences = [
  {
    title: "Senior Product Designer",
    company: "Acme Corp",
    dates: "2021 – Present",
    desc: "Led end-to-end design of the core product, increasing user engagement by 34%. Managed a team of 3 designers.",
  },
  {
    title: "UX Designer",
    company: "Startup Co",
    dates: "2019 – 2021",
    desc: "Designed mobile-first experiences for fintech app serving 200K users.",
  },
];

const skills = [
  "Figma",
  "Prototyping",
  "Design Systems",
  "User Research",
  "Framer",
  "Notion",
  "A/B Testing",
  "Stakeholder Mgmt",
];

const aiSuggestions = [
  {
    icon: "💡",
    text: "Add measurable outcomes to your Acme role — quantified achievements get 2x more responses.",
  },
  {
    icon: "🎯",
    text: "'Design Systems' is a top skill for Senior roles. Consider expanding this bullet.",
  },
];

const previewExperiences = [
  {
    title: "Senior Product Designer",
    meta: "Acme Corp · 2021 – Present",
    desc: "Led end-to-end design of the core product, increasing user engagement by 34%. Managed a team of 3 designers and collaborated closely with engineering.",
  },
  {
    title: "UX Designer",
    meta: "Startup Co · 2019 – 2021",
    desc: "Designed mobile-first experiences for a fintech app serving over 200K users. Ran weekly usability tests and shipped 2 major feature redesigns.",
  },
];

const previewSkills = [
  "Figma",
  "Prototyping",
  "Design Systems",
  "User Research",
  "Framer",
  "A/B Testing",
];

export default function ResumeEditorPage() {
  return (
    <div className="resume-layout">
      {/* Editor Panel */}
      <div className="resume-editor-panel">
        <div className="panel-toolbar">
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginRight: 8,
              fontFamily: "var(--font-outfit)",
            }}
          >
            Editor
          </span>
          <div className="toolbar-sep" />
          {["Contact", "Experience", "Education", "Skills"].map((t) => (
            <button
              key={t}
              className={`toolbar-btn ${t === "Experience" ? "active" : ""}`}
            >
              {t}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="toolbar-btn">⬇ Export PDF</button>
            <button
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: 13 }}
            >
              ✨ AI Polish
            </button>
          </div>
        </div>

        <div className="editor-sections">
          {/* Contact */}
          <div className="editor-section">
            <div className="editor-section-header">
              <span className="editor-section-title">Contact Information</span>
            </div>
            <div className="fields-row">
              <div className="editor-field">
                <div className="field-label">Full Name</div>
                <input className="field-input" defaultValue="Alex Johnson" />
              </div>
              <div className="editor-field">
                <div className="field-label">Job Title</div>
                <input
                  className="field-input"
                  defaultValue="Senior Product Designer"
                />
              </div>
            </div>
            <div className="fields-row">
              <div className="editor-field">
                <div className="field-label">Email</div>
                <input className="field-input" defaultValue="alex@email.com" />
              </div>
              <div className="editor-field">
                <div className="field-label">Phone</div>
                <input
                  className="field-input"
                  defaultValue="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="editor-field">
              <div className="field-label">LinkedIn / Portfolio</div>
              <input
                className="field-input"
                defaultValue="linkedin.com/in/alexjohnson"
              />
            </div>
          </div>

          {/* Experience */}
          <div className="editor-section">
            <div className="editor-section-header">
              <span className="editor-section-title">Experience</span>
              <button className="add-btn">+ Add Role</button>
            </div>
            {experiences.map((exp, i) => (
              <div className="exp-card" key={i}>
                <div className="exp-card-header">
                  <div>
                    <div className="exp-card-title">{exp.title}</div>
                    <div className="exp-card-subtitle">
                      {exp.company} · {exp.dates}
                    </div>
                  </div>
                  <button className="del-btn">✕</button>
                </div>
                <div className="editor-field">
                  <div className="field-label">Description</div>
                  <textarea
                    className="field-input field-textarea"
                    defaultValue={exp.desc}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="editor-section">
            <div className="editor-section-header">
              <span className="editor-section-title">Skills</span>
              <button className="add-btn">+ Add Skill</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {skills.map((s) => (
                <div
                  key={s}
                  style={{
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {s}
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="ai-panel">
          <div className="ai-panel-title">✨ AI Suggestions</div>
          <div className="ai-suggestions">
            {aiSuggestions.map((s, i) => (
              <div className="ai-suggestion" key={i}>
                <span className="ai-suggestion-icon">{s.icon}</span>
                <span className="ai-suggestion-text">{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="resume-preview">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 640,
            margin: "0 auto 20px",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Live Preview
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="toolbar-btn">Classic</button>
            <button className="toolbar-btn active">Modern</button>
            <button className="toolbar-btn">Minimal</button>
          </div>
        </div>

        <div className="preview-doc">
          <div className="preview-name">Alex Johnson</div>
          <div className="preview-title">Senior Product Designer</div>
          <div className="preview-contact">
            <span>alex@email.com</span>
            <span>+1 (555) 000-0000</span>
            <span>linkedin.com/in/alexjohnson</span>
          </div>
          <div className="preview-divider" />
          <div className="preview-section-title">Experience</div>
          {previewExperiences.map((e, i) => (
            <div className="preview-exp" key={i}>
              <div className="preview-exp-title">{e.title}</div>
              <div className="preview-exp-meta">{e.meta}</div>
              <div className="preview-exp-desc">{e.desc}</div>
            </div>
          ))}
          <div className="preview-divider" />
          <div className="preview-section-title">Skills</div>
          <div className="preview-skills">
            {previewSkills.map((s) => (
              <span className="preview-skill" key={s}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
