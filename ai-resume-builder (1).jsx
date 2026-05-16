import { useState, useEffect, useRef } from "react";

const GROQ_NOTE = "// Replace with your Groq API key in the AI call below";

const COLORS = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  bg: "#0f0f13",
  surface: "#1a1a24",
  surfaceLight: "#22222f",
  border: "#2e2e3f",
  text: "#e2e8f0",
  muted: "#7c7c9a",
};

const TEMPLATES = ["Modern", "Minimal", "Corporate", "Student"];

const sampleResume = {
  name: "Ahmed Khan",
  title: "Full Stack Developer",
  email: "ahmed@email.com",
  phone: "+92-300-1234567",
  location: "Karachi, Pakistan",
  linkedin: "linkedin.com/in/ahmedkhan",
  github: "github.com/ahmedkhan",
  summary: "Passionate full stack developer with 2 years of experience building web applications using React, Node.js, and Python.",
  experience: [
    { company: "TechCorp", role: "Junior Developer", duration: "2023–Present", bullets: ["Built REST APIs using FastAPI", "Improved app performance by 40%"] }
  ],
  education: [
    { school: "FAST NUCES", degree: "BS Computer Science", year: "2020–2024", gpa: "3.5" }
  ],
  skills: ["React", "Python", "FastAPI", "Node.js", "PostgreSQL", "Docker"],
  projects: [
    { name: "AI Chatbot", tech: "Python, OpenAI", desc: "Built a customer support chatbot with 95% accuracy" }
  ],
  certifications: ["AWS Cloud Practitioner", "Meta Frontend Developer"],
};

export default function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [resume, setResume] = useState(sampleResume);
  const [savedResumes, setSavedResumes] = useState([]);
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [interviewQs, setInterviewQs] = useState([]);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [template, setTemplate] = useState("Modern");
  const [jobTitle, setJobTitle] = useState("");
  const [activeTab, setActiveTab] = useState("personal");

  // Load saved resumes from localStorage on startup
  useEffect(() => {
    const stored = localStorage.getItem("resumeai_resumes");
    if (stored) {
      const list = JSON.parse(stored);
      setSavedResumes(list);
      if (list.length > 0) setResume(list[0]);
    }
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveResume = () => {
    const existing = savedResumes.findIndex(r => r.name === resume.name && r.email === resume.email);
    let updated;
    if (existing >= 0) {
      updated = [...savedResumes];
      updated[existing] = { ...resume, savedAt: new Date().toLocaleString() };
    } else {
      updated = [{ ...resume, savedAt: new Date().toLocaleString() }, ...savedResumes];
    }
    setSavedResumes(updated);
    localStorage.setItem("resumeai_resumes", JSON.stringify(updated));
    showToast("Resume saved!");
  };

  const loadResume = (r) => {
    setResume(r);
    setActiveSection("builder");
    showToast(`Loaded: ${r.name}`);
  };

  const deleteResume = (idx) => {
    const updated = savedResumes.filter((_, i) => i !== idx);
    setSavedResumes(updated);
    localStorage.setItem("resumeai_resumes", JSON.stringify(updated));
    showToast("Resume deleted", "error");
  };

  const callClaude = async (prompt) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "";
  };

  const handleImproveResume = async () => {
    setAiLoading(true);
    setActiveSection("ai");
    try {
      const prompt = `You are a professional resume writer. Improve this resume summary to be ATS-friendly, professional, and impactful. Return only the improved summary text.

Name: ${resume.name}
Current Summary: ${resume.summary}
Skills: ${resume.skills.join(", ")}
Experience: ${resume.experience.map(e => `${e.role} at ${e.company}`).join(", ")}`;
      const result = await callClaude(prompt);
      setAiOutput(result);
      showToast("Resume improved by AI!");
    } catch (e) {
      showToast("AI error. Check API connection.", "error");
    }
    setAiLoading(false);
  };

  const handleAtsCheck = async () => {
    setAiLoading(true);
    setActiveSection("ats");
    try {
      const prompt = `Analyze this resume for ATS compatibility. Return a JSON object with: score (0-100), strengths (array of 3 strings), weaknesses (array of 3 strings), suggestions (array of 3 strings). Return ONLY valid JSON, no markdown.

Resume: ${JSON.stringify(resume)}`;
      const result = await callClaude(prompt);
      const clean = result.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAtsScore(parsed);
      showToast("ATS analysis complete!");
    } catch (e) {
      setAtsScore({ score: 72, strengths: ["Good skills section", "Clear experience", "Contact info present"], weaknesses: ["Summary needs keywords", "Missing quantified achievements", "No certifications listed"], suggestions: ["Add job-specific keywords", "Quantify your impact", "Add LinkedIn URL"] });
      showToast("Using sample ATS data");
    }
    setAiLoading(false);
  };

  const handleCoverLetter = async () => {
    if (!jobTitle) { showToast("Enter a job title first", "error"); return; }
    setAiLoading(true);
    setActiveSection("cover");
    try {
      const prompt = `Write a professional cover letter for ${resume.name} applying for ${jobTitle}. Use their background: ${resume.summary}. Skills: ${resume.skills.join(", ")}. Keep it 3 paragraphs, professional tone.`;
      const result = await callClaude(prompt);
      setCoverLetter(result);
      showToast("Cover letter generated!");
    } catch (e) {
      showToast("AI error", "error");
    }
    setAiLoading(false);
  };

  const handleInterviewQs = async () => {
    setAiLoading(true);
    setActiveSection("interview");
    try {
      const prompt = `Generate 6 interview questions for a ${resume.title} role based on this resume. Return a JSON array of objects with: question (string), type ("technical" or "hr"), tip (short answer tip). Return ONLY valid JSON array, no markdown.

Skills: ${resume.skills.join(", ")}`;
      const result = await callClaude(prompt);
      const clean = result.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setInterviewQs(parsed);
      showToast("Interview questions ready!");
    } catch (e) {
      setInterviewQs([
        { question: "Tell me about your experience with React.", type: "technical", tip: "Mention specific projects and challenges solved." },
        { question: "How do you handle tight deadlines?", type: "hr", tip: "Use the STAR method with a real example." },
        { question: "Explain RESTful API design.", type: "technical", tip: "Cover HTTP methods, status codes, and best practices." },
        { question: "Where do you see yourself in 5 years?", type: "hr", tip: "Align your goals with company growth." },
        { question: "How do you debug a production issue?", type: "technical", tip: "Walk through your debugging process step by step." },
        { question: "What's your biggest professional achievement?", type: "hr", tip: "Quantify the impact with numbers." },
      ]);
      showToast("Sample questions loaded");
    }
    setAiLoading(false);
  };

  if (page === "login") return <LoginPage onLogin={(u) => { setUser(u); setPage("app"); }} onSwitch={() => setPage("signup")} />;
  if (page === "signup") return <SignupPage onSignup={(u) => { setUser(u); setPage("app"); }} onSwitch={() => setPage("login")} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <Sidebar open={sidebarOpen} active={activeSection} onNav={setActiveSection} onToggle={() => setSidebarOpen(!sidebarOpen)} user={user} onLogout={() => setPage("login")} />
      <main style={{ flex: 1, marginLeft: sidebarOpen ? 260 : 72, transition: "margin .3s", padding: "2rem", overflowY: "auto" }}>
        {activeSection === "dashboard" && <Dashboard resume={resume} onNav={setActiveSection} onImprove={handleImproveResume} onAts={handleAtsCheck} atsScore={atsScore} aiLoading={aiLoading} savedResumes={savedResumes} onLoad={loadResume} onDelete={deleteResume} />}
        {activeSection === "builder" && <ResumeBuilder resume={resume} setResume={setResume} activeTab={activeTab} setActiveTab={setActiveTab} showToast={showToast} onSave={saveResume} />}
        {activeSection === "preview" && <ResumePreview resume={resume} template={template} setTemplate={setTemplate} />}
        {activeSection === "ai" && <AiImprover aiOutput={aiOutput} aiLoading={aiLoading} resume={resume} onImprove={handleImproveResume} onApply={() => { setResume({ ...resume, summary: aiOutput }); showToast("Applied to resume!"); }} />}
        {activeSection === "ats" && <AtsChecker atsScore={atsScore} aiLoading={aiLoading} onCheck={handleAtsCheck} />}
        {activeSection === "cover" && <CoverLetterGen coverLetter={coverLetter} aiLoading={aiLoading} jobTitle={jobTitle} setJobTitle={setJobTitle} onGenerate={handleCoverLetter} />}
        {activeSection === "interview" && <InterviewPrep questions={interviewQs} aiLoading={aiLoading} onGenerate={handleInterviewQs} />}
      </main>
    </div>
  );
}

function LoginPage({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("demo@example.com");
  const [pass, setPass] = useState("password");
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: 400, background: COLORS.surface, borderRadius: 20, padding: "2.5rem", border: `1px solid ${COLORS.border}` }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 52, height: 52, background: COLORS.primary, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: 24 }}>✦</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: COLORS.text }}>ResumeAI</h1>
          <p style={{ margin: "8px 0 0", color: COLORS.muted, fontSize: 14 }}>Sign in to your account</p>
        </div>
        <label style={{ fontSize: 13, color: COLORS.muted, display: "block", marginBottom: 6 }}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@email.com" />
        <label style={{ fontSize: 13, color: COLORS.muted, display: "block", margin: "16px 0 6px" }}>Password</label>
        <input value={pass} onChange={e => setPass(e.target.value)} type="password" style={inputStyle} placeholder="••••••••" />
        <button onClick={() => onLogin({ name: "Ahmed Khan", email })} style={{ ...btnPrimary, width: "100%", marginTop: "1.5rem", padding: "12px", fontSize: 15 }}>Sign In</button>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: 13, color: COLORS.muted }}>
          No account? <span onClick={onSwitch} style={{ color: COLORS.primary, cursor: "pointer" }}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

function SignupPage({ onSignup, onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: 400, background: COLORS.surface, borderRadius: 20, padding: "2.5rem", border: `1px solid ${COLORS.border}` }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 52, height: 52, background: COLORS.primary, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: 24 }}>✦</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Create Account</h1>
          <p style={{ margin: "8px 0 0", color: COLORS.muted, fontSize: 14 }}>Start building your AI resume</p>
        </div>
        <label style={{ fontSize: 13, color: COLORS.muted, display: "block", marginBottom: 6 }}>Full Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Ahmed Khan" />
        <label style={{ fontSize: 13, color: COLORS.muted, display: "block", margin: "16px 0 6px" }}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@email.com" />
        <label style={{ fontSize: 13, color: COLORS.muted, display: "block", margin: "16px 0 6px" }}>Password</label>
        <input value={pass} onChange={e => setPass(e.target.value)} type="password" style={inputStyle} placeholder="••••••••" />
        <button onClick={() => onSignup({ name, email })} style={{ ...btnPrimary, width: "100%", marginTop: "1.5rem", padding: "12px", fontSize: 15 }}>Create Account</button>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: 13, color: COLORS.muted }}>
          Have account? <span onClick={onSwitch} style={{ color: COLORS.primary, cursor: "pointer" }}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

function Sidebar({ open, active, onNav, onToggle, user, onLogout }) {
  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "builder", icon: "✏", label: "Resume Builder" },
    { id: "preview", icon: "◻", label: "Preview & Export" },
    { id: "ai", icon: "✦", label: "AI Improver" },
    { id: "ats", icon: "◎", label: "ATS Checker" },
    { id: "cover", icon: "✉", label: "Cover Letter" },
    { id: "interview", icon: "◈", label: "Interview Prep" },
  ];
  return (
    <div style={{ position: "fixed", top: 0, left: 0, height: "100vh", width: open ? 260 : 72, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, transition: "width .3s", zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: open ? "1.5rem 1.25rem" : "1.5rem 0.75rem", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ width: 36, height: 36, background: COLORS.primary, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✦</div>
        {open && <span style={{ fontWeight: 700, fontSize: 16, color: COLORS.text }}>ResumeAI</span>}
        <div onClick={onToggle} style={{ marginLeft: "auto", cursor: "pointer", color: COLORS.muted, fontSize: 18 }}>☰</div>
      </div>
      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map(item => (
          <div key={item.id} onClick={() => onNav(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: open ? "10px 12px" : "10px 0", justifyContent: open ? "flex-start" : "center", borderRadius: 10, cursor: "pointer", background: active === item.id ? COLORS.primaryDark + "33" : "transparent", color: active === item.id ? COLORS.primary : COLORS.muted, transition: "all .2s", fontSize: 14, fontWeight: active === item.id ? 600 : 400 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
            {open && <span>{item.label}</span>}
          </div>
        ))}
      </nav>
      {user && (
        <div style={{ padding: "1rem 0.75rem", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {user.name?.charAt(0) || "U"}
            </div>
            {open && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                <div onClick={onLogout} style={{ fontSize: 11, color: COLORS.muted, cursor: "pointer" }}>Sign out</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ resume, onNav, onImprove, onAts, atsScore, aiLoading, savedResumes, onLoad, onDelete }) {
  const stats = [
    { label: "Resumes Created", value: "3", icon: "◻", color: COLORS.primary },
    { label: "ATS Score", value: atsScore ? `${atsScore.score}%` : "--", icon: "◎", color: COLORS.success },
    { label: "AI Improvements", value: "12", icon: "✦", color: COLORS.warning },
    { label: "Cover Letters", value: "2", icon: "✉", color: "#8b5cf6" },
  ];
  const quickActions = [
    { label: "Improve with AI", icon: "✦", color: COLORS.primary, action: onImprove },
    { label: "Check ATS Score", icon: "◎", color: COLORS.success, action: onAts },
    { label: "Edit Resume", icon: "✏", color: COLORS.warning, action: () => onNav("builder") },
    { label: "Generate Cover Letter", icon: "✉", color: "#8b5cf6", action: () => onNav("cover") },
    { label: "Interview Prep", icon: "◈", color: "#ec4899", action: () => onNav("interview") },
    { label: "Preview Resume", icon: "◻", color: COLORS.muted, action: () => onNav("preview") },
  ];
  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: 26, fontWeight: 700 }}>Dashboard</h1>
      <p style={{ margin: "0 0 2rem", color: COLORS.muted, fontSize: 14 }}>Welcome back, {resume.name} 👋</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: "2rem" }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: COLORS.surface, borderRadius: 14, padding: "1.25rem", border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: "1rem" }}>Quick Actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: "2rem" }}>
        {quickActions.map(a => (
          <button key={a.label} onClick={a.action} disabled={aiLoading} style={{ background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "1rem", cursor: "pointer", textAlign: "left", transition: "all .2s", color: COLORS.text }}>
            <div style={{ fontSize: 22, color: a.color, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
          </button>
        ))}
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: "1rem" }}>Current Resume</h2>
      <div style={{ background: COLORS.surface, borderRadius: 14, padding: "1.5rem", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 48, height: 56, background: COLORS.primaryDark + "44", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>◻</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{resume.name} — {resume.title}</div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{resume.email} · {resume.skills.length} skills · {resume.experience.length} experience</div>
        </div>
        <button onClick={() => onNav("builder")} style={{ ...btnPrimary, padding: "8px 16px", fontSize: 13 }}>Edit</button>
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 600, margin: "2rem 0 1rem" }}>Saved Resumes</h2>
      {savedResumes.length === 0 ? (
        <div style={{ background: COLORS.surface, borderRadius: 14, padding: "2rem", textAlign: "center", border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
          Koi saved resume nahi — Resume Builder mein jao aur Save karo!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {savedResumes.map((r, i) => (
            <div key={i} style={{ background: COLORS.surface, borderRadius: 14, padding: "1.25rem 1.5rem", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 42, height: 48, background: COLORS.primary + "33", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>◻</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.text }}>{r.name}</div>
                <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{r.title} · {r.email}</div>
                {r.savedAt && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>Saved: {r.savedAt}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => onLoad(r)} style={{ ...btnPrimary, padding: "7px 14px", fontSize: 12 }}>Load</button>
                <button onClick={() => onDelete(i)} style={{ background: "transparent", border: `1px solid ${COLORS.danger}44`, borderRadius: 8, color: COLORS.danger, padding: "7px 12px", cursor: "pointer", fontSize: 12 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeBuilder({ resume, setResume, activeTab, setActiveTab, showToast, onSave }) {
  const tabs = ["personal", "experience", "education", "skills", "projects"];
  const update = (field, val) => setResume({ ...resume, [field]: val });

  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: 26, fontWeight: 700 }}>Resume Builder</h1>
      <p style={{ margin: "0 0 1.5rem", color: COLORS.muted, fontSize: 14 }}>Fill in your details section by section</p>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${activeTab === t ? COLORS.primary : COLORS.border}`, background: activeTab === t ? COLORS.primary + "22" : "transparent", color: activeTab === t ? COLORS.primary : COLORS.muted, cursor: "pointer", fontSize: 13, fontWeight: activeTab === t ? 600 : 400, textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>
      <div style={{ background: COLORS.surface, borderRadius: 16, padding: "1.5rem", border: `1px solid ${COLORS.border}` }}>
        {activeTab === "personal" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[["Full Name", "name"], ["Job Title", "title"], ["Email", "email"], ["Phone", "phone"], ["Location", "location"], ["LinkedIn", "linkedin"], ["GitHub", "github"]].map(([label, field]) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input value={resume[field] || ""} onChange={e => update(field, e.target.value)} style={inputStyle} placeholder={label} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Professional Summary</label>
              <textarea value={resume.summary} onChange={e => update("summary", e.target.value)} style={{ ...inputStyle, height: 100, resize: "vertical" }} />
            </div>
          </div>
        )}
        {activeTab === "experience" && (
          <div>
            {resume.experience.map((exp, i) => (
              <div key={i} style={{ background: COLORS.surfaceLight, borderRadius: 12, padding: "1.25rem", marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[["Company", "company"], ["Role", "role"], ["Duration", "duration"]].map(([l, f]) => (
                    <div key={f}>
                      <label style={labelStyle}>{l}</label>
                      <input value={exp[f]} onChange={e => { const ex = [...resume.experience]; ex[i][f] = e.target.value; setResume({ ...resume, experience: ex }); }} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <label style={{ ...labelStyle, marginTop: 12 }}>Key Achievements (one per line)</label>
                <textarea value={exp.bullets.join("\n")} onChange={e => { const ex = [...resume.experience]; ex[i].bullets = e.target.value.split("\n"); setResume({ ...resume, experience: ex }); }} style={{ ...inputStyle, height: 80 }} />
              </div>
            ))}
            <button onClick={() => setResume({ ...resume, experience: [...resume.experience, { company: "", role: "", duration: "", bullets: [""] }] })} style={{ ...btnSecondary, fontSize: 13 }}>+ Add Experience</button>
          </div>
        )}
        {activeTab === "education" && (
          <div>
            {resume.education.map((edu, i) => (
              <div key={i} style={{ background: COLORS.surfaceLight, borderRadius: 12, padding: "1.25rem", marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[["School", "school"], ["Degree", "degree"], ["Year", "year"], ["GPA", "gpa"]].map(([l, f]) => (
                    <div key={f}>
                      <label style={labelStyle}>{l}</label>
                      <input value={edu[f]} onChange={e => { const ed = [...resume.education]; ed[i][f] = e.target.value; setResume({ ...resume, education: ed }); }} style={inputStyle} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setResume({ ...resume, education: [...resume.education, { school: "", degree: "", year: "", gpa: "" }] })} style={{ ...btnSecondary, fontSize: 13 }}>+ Add Education</button>
          </div>
        )}
        {activeTab === "skills" && (
          <div>
            <label style={labelStyle}>Skills (comma separated)</label>
            <input value={resume.skills.join(", ")} onChange={e => update("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} style={inputStyle} placeholder="React, Python, Node.js" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {resume.skills.map((s, i) => (
                <span key={i} style={{ background: COLORS.primary + "22", color: COLORS.primary, padding: "5px 12px", borderRadius: 20, fontSize: 13, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {activeTab === "projects" && (
          <div>
            {resume.projects.map((p, i) => (
              <div key={i} style={{ background: COLORS.surfaceLight, borderRadius: 12, padding: "1.25rem", marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
                {[["Project Name", "name"], ["Tech Stack", "tech"], ["Description", "desc"]].map(([l, f]) => (
                  <div key={f} style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>{l}</label>
                    <input value={p[f]} onChange={e => { const pr = [...resume.projects]; pr[i][f] = e.target.value; setResume({ ...resume, projects: pr }); }} style={inputStyle} />
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => setResume({ ...resume, projects: [...resume.projects, { name: "", tech: "", desc: "" }] })} style={{ ...btnSecondary, fontSize: 13 }}>+ Add Project</button>
          </div>
        )}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: 12 }}>
          <button onClick={onSave} style={{ ...btnPrimary, padding: "10px 24px" }}>Save Resume</button>
        </div>
      </div>
    </div>
  );
}

function ResumePreview({ resume, template, setTemplate }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: 26, fontWeight: 700 }}>Preview & Export</h1>
          <p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>See how your resume looks</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {TEMPLATES.map(t => (
            <button key={t} onClick={() => setTemplate(t)} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${template === t ? COLORS.primary : COLORS.border}`, background: template === t ? COLORS.primary : "transparent", color: template === t ? "#fff" : COLORS.muted, cursor: "pointer", fontSize: 12 }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, padding: "2.5rem", color: "#1a1a2e", maxWidth: 700, margin: "0 auto", boxShadow: "0 0 40px rgba(0,0,0,.4)" }}>
        <div style={{ borderBottom: template === "Modern" ? `3px solid ${COLORS.primary}` : "2px solid #1a1a2e", paddingBottom: "1rem", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: template === "Modern" ? COLORS.primary : "#1a1a2e" }}>{resume.name}</h1>
          <p style={{ margin: "4px 0", fontSize: 14, color: "#555" }}>{resume.title}</p>
          <p style={{ margin: "4px 0", fontSize: 12, color: "#777" }}>{resume.email} · {resume.phone} · {resume.location}</p>
        </div>
        {resume.summary && <div style={{ marginBottom: "1.25rem" }}><h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: template === "Modern" ? COLORS.primary : "#1a1a2e", marginBottom: 6 }}>Summary</h2><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#333" }}>{resume.summary}</p></div>}
        {resume.experience.length > 0 && <div style={{ marginBottom: "1.25rem" }}><h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: template === "Modern" ? COLORS.primary : "#1a1a2e", marginBottom: 8 }}>Experience</h2>{resume.experience.map((e, i) => (<div key={i} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: 13 }}>{e.role}</strong><span style={{ fontSize: 12, color: "#777" }}>{e.duration}</span></div><div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{e.company}</div>{e.bullets.map((b, j) => b && <div key={j} style={{ fontSize: 12, color: "#444", paddingLeft: 12 }}>• {b}</div>)}</div>))}</div>}
        {resume.education.length > 0 && <div style={{ marginBottom: "1.25rem" }}><h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: template === "Modern" ? COLORS.primary : "#1a1a2e", marginBottom: 8 }}>Education</h2>{resume.education.map((e, i) => (<div key={i} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}><div><strong style={{ fontSize: 13 }}>{e.degree}</strong><div style={{ fontSize: 12, color: "#555" }}>{e.school}</div></div><span style={{ fontSize: 12, color: "#777" }}>{e.year}</span></div>))}</div>}
        {resume.skills.length > 0 && <div style={{ marginBottom: "1.25rem" }}><h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: template === "Modern" ? COLORS.primary : "#1a1a2e", marginBottom: 8 }}>Skills</h2><p style={{ margin: 0, fontSize: 13, color: "#333" }}>{resume.skills.join(" · ")}</p></div>}
        {resume.projects.length > 0 && <div><h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: template === "Modern" ? COLORS.primary : "#1a1a2e", marginBottom: 8 }}>Projects</h2>{resume.projects.map((p, i) => (<div key={i} style={{ marginBottom: 10 }}><strong style={{ fontSize: 13 }}>{p.name}</strong><span style={{ fontSize: 12, color: "#777" }}> · {p.tech}</span><div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{p.desc}</div></div>))}</div>}
      </div>
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button onClick={() => window.print()} style={{ ...btnPrimary, padding: "10px 28px" }}>⬇ Download PDF</button>
      </div>
    </div>
  );
}

function AiImprover({ aiOutput, aiLoading, resume, onImprove, onApply }) {
  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: 26, fontWeight: 700 }}>AI Resume Improver</h1>
      <p style={{ margin: "0 0 1.5rem", color: COLORS.muted, fontSize: 14 }}>Let AI rewrite your resume to be more professional and ATS-friendly</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: COLORS.surface, borderRadius: 16, padding: "1.5rem", border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 14, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>Original Summary</h3>
          <p style={{ color: COLORS.text, lineHeight: 1.7, fontSize: 14 }}>{resume.summary}</p>
        </div>
        <div style={{ background: COLORS.surface, borderRadius: 16, padding: "1.5rem", border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 14, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>AI Improved</h3>
          {aiLoading ? <Spinner /> : aiOutput ? <p style={{ color: COLORS.text, lineHeight: 1.7, fontSize: 14 }}>{aiOutput}</p> : <p style={{ color: COLORS.muted, fontSize: 14 }}>Click "Improve with AI" to see the magic ✦</p>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: "1.5rem" }}>
        <button onClick={onImprove} disabled={aiLoading} style={{ ...btnPrimary, padding: "10px 24px" }}>✦ Improve with AI</button>
        {aiOutput && <button onClick={onApply} style={{ ...btnSecondary, padding: "10px 24px" }}>Apply to Resume</button>}
      </div>
    </div>
  );
}

function AtsChecker({ atsScore, aiLoading, onCheck }) {
  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: 26, fontWeight: 700 }}>ATS Score Checker</h1>
      <p style={{ margin: "0 0 1.5rem", color: COLORS.muted, fontSize: 14 }}>See how well your resume performs with Applicant Tracking Systems</p>
      {aiLoading ? <Spinner /> : atsScore ? (
        <div>
          <div style={{ background: COLORS.surface, borderRadius: 16, padding: "2rem", border: `1px solid ${COLORS.border}`, textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: atsScore.score >= 75 ? COLORS.success : atsScore.score >= 50 ? COLORS.warning : COLORS.danger }}>{atsScore.score}</div>
            <div style={{ fontSize: 18, color: COLORS.muted }}>ATS Score</div>
            <div style={{ height: 10, background: COLORS.surfaceLight, borderRadius: 10, margin: "1.5rem auto", maxWidth: 300, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${atsScore.score}%`, background: atsScore.score >= 75 ? COLORS.success : COLORS.warning, borderRadius: 10, transition: "width 1s" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[["✅ Strengths", atsScore.strengths, COLORS.success], ["⚠ Weaknesses", atsScore.weaknesses, COLORS.warning], ["💡 Suggestions", atsScore.suggestions, COLORS.primary]].map(([title, items, color]) => (
              <div key={title} style={{ background: COLORS.surface, borderRadius: 14, padding: "1.25rem", border: `1px solid ${COLORS.border}` }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 13, color }}>{title}</h3>
                {items.map((item, i) => <div key={i} style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8, lineHeight: 1.5 }}>• {item}</div>)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 16, padding: "3rem", textAlign: "center", border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 48, marginBottom: "1rem" }}>◎</div>
          <p style={{ color: COLORS.muted, marginBottom: "1.5rem" }}>Run an ATS analysis on your resume</p>
          <button onClick={onCheck} style={{ ...btnPrimary, padding: "12px 28px" }}>Analyze Now</button>
        </div>
      )}
      {atsScore && <button onClick={onCheck} style={{ ...btnSecondary, marginTop: "1.5rem", padding: "10px 24px" }}>Re-analyze</button>}
    </div>
  );
}

function CoverLetterGen({ coverLetter, aiLoading, jobTitle, setJobTitle, onGenerate }) {
  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: 26, fontWeight: 700 }}>Cover Letter Generator</h1>
      <p style={{ margin: "0 0 1.5rem", color: COLORS.muted, fontSize: 14 }}>Generate a personalized cover letter using AI</p>
      <div style={{ background: COLORS.surface, borderRadius: 16, padding: "1.5rem", border: `1px solid ${COLORS.border}`, marginBottom: "1.5rem" }}>
        <label style={labelStyle}>Job Title you're applying for</label>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="e.g. Software Engineer at Google" />
          <button onClick={onGenerate} disabled={aiLoading} style={{ ...btnPrimary, padding: "10px 20px", whiteSpace: "nowrap" }}>Generate</button>
        </div>
      </div>
      {aiLoading ? <Spinner /> : coverLetter ? (
        <div style={{ background: COLORS.surface, borderRadius: 16, padding: "2rem", border: `1px solid ${COLORS.border}` }}>
          <pre style={{ fontFamily: "inherit", whiteSpace: "pre-wrap", lineHeight: 1.8, color: COLORS.text, fontSize: 14, margin: 0 }}>{coverLetter}</pre>
          <div style={{ display: "flex", gap: 12, marginTop: "1.5rem" }}>
            <button onClick={() => navigator.clipboard.writeText(coverLetter)} style={{ ...btnSecondary, padding: "8px 20px" }}>Copy</button>
          </div>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 16, padding: "3rem", textAlign: "center", border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 48, marginBottom: "1rem" }}>✉</div>
          <p style={{ color: COLORS.muted }}>Enter a job title and generate your cover letter</p>
        </div>
      )}
    </div>
  );
}

function InterviewPrep({ questions, aiLoading, onGenerate }) {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: 26, fontWeight: 700 }}>Interview Prep</h1>
      <p style={{ margin: "0 0 1.5rem", color: COLORS.muted, fontSize: 14 }}>AI-generated interview questions based on your resume</p>
      {questions.length === 0 && !aiLoading && (
        <div style={{ background: COLORS.surface, borderRadius: 16, padding: "3rem", textAlign: "center", border: `1px solid ${COLORS.border}`, marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 48, marginBottom: "1rem" }}>◈</div>
          <p style={{ color: COLORS.muted, marginBottom: "1.5rem" }}>Generate interview questions tailored to your resume</p>
          <button onClick={onGenerate} style={{ ...btnPrimary, padding: "12px 28px" }}>Generate Questions</button>
        </div>
      )}
      {aiLoading && <Spinner />}
      {questions.length > 0 && (
        <div>
          {questions.map((q, i) => (
            <div key={i} style={{ background: COLORS.surface, borderRadius: 12, marginBottom: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
              <div onClick={() => setOpen(open === i ? null : i)} style={{ padding: "1rem 1.25rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: q.type === "technical" ? COLORS.primary + "33" : COLORS.success + "33", color: q.type === "technical" ? COLORS.primary : COLORS.success }}>{q.type}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{q.question}</span>
                </div>
                <span style={{ color: COLORS.muted }}>{open === i ? "▲" : "▼"}</span>
              </div>
              {open === i && <div style={{ padding: "0 1.25rem 1rem", borderTop: `1px solid ${COLORS.border}` }}><p style={{ margin: "1rem 0 0", fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>💡 {q.tip}</p></div>}
            </div>
          ))}
          <button onClick={onGenerate} style={{ ...btnSecondary, marginTop: "1rem", padding: "10px 24px" }}>Regenerate</button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: 12, color: COLORS.muted }}>
      <div style={{ width: 22, height: 22, border: `2px solid ${COLORS.border}`, borderTop: `2px solid ${COLORS.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      AI is thinking...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Toast({ msg, type }) {
  const bg = type === "error" ? COLORS.danger : COLORS.success;
  return (
    <div style={{ position: "fixed", top: 20, right: 20, background: bg, color: "#fff", padding: "12px 20px", borderRadius: 12, zIndex: 9999, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", animation: "fadeIn 0.3s ease" }}>
      {msg}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

const inputStyle = { width: "100%", background: "#16162055", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const labelStyle = { fontSize: 12, color: COLORS.muted, display: "block", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 };
const btnPrimary = { background: COLORS.primary, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", transition: "all .2s" };
const btnSecondary = { background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text, cursor: "pointer", fontWeight: 500, fontFamily: "inherit", transition: "all .2s" };
