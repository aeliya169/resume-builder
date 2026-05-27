import { useState, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GROQ_API_KEY = "YOUR_GROQ_API_KEY"; // Replace with your key

const C = {
  bg: "#080B12",
  surface: "#0F1320",
  card: "#141826",
  border: "rgba(255,255,255,0.07)",
  accent: "#4F8EF7",
  accent2: "#7C3AED",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#E8EDFB",
  muted: "#6B7280",
  grad: "linear-gradient(135deg, #4F8EF7, #7C3AED)",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};min-height:100vh;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(79,142,247,0.3);border-radius:4px;}
  input,textarea,select{font-family:'DM Sans',sans-serif;}
  button{font-family:'DM Sans',sans-serif;}
  h1,h2,h3{font-family:'Syne',sans-serif;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  .fade-up{animation:fadeUp 0.4s ease forwards;}
  .spin{animation:spin 0.8s linear infinite;}
  @media(max-width:768px){
    .sidebar{position:fixed!important;z-index:200!important;transform:translateX(-100%);transition:transform 0.3s!important;}
    .sidebar.open{transform:translateX(0)!important;}
    .main-content{margin-left:0!important;}
    .overlay{display:block!important;}
  }
`;

const inputStyle = {
  width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`,
  borderRadius:10, padding:"10px 14px", color:C.text, fontSize:14, outline:"none",
  boxSizing:"border-box", transition:"border-color 0.2s",
};

const labelStyle = {
  fontSize:11, color:C.muted, display:"block", marginBottom:6,
  fontWeight:600, textTransform:"uppercase", letterSpacing:0.8,
};

const btnPrimary = {
  background:C.grad, border:"none", borderRadius:10, color:"#fff",
  cursor:"pointer", fontWeight:600, fontSize:14, padding:"10px 20px",
  display:"inline-flex", alignItems:"center", gap:7, transition:"opacity 0.2s",
};

const btnSecondary = {
  background:"transparent", border:`1px solid ${C.border}`, borderRadius:10,
  color:C.text, cursor:"pointer", fontWeight:500, fontSize:14, padding:"10px 20px",
  display:"inline-flex", alignItems:"center", gap:7, transition:"all 0.2s",
};

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const getUsers = () => JSON.parse(localStorage.getItem("rai_users") || "{}");
const saveUsers = (u) => localStorage.setItem("rai_users", JSON.stringify(u));
const getCurrentUser = () => JSON.parse(localStorage.getItem("rai_current") || "null");
const setCurrentUser = (u) => localStorage.setItem("rai_current", JSON.stringify(u));
const getUserData = (email) => JSON.parse(localStorage.getItem(`rai_data_${email}`) || "null");
const saveUserData = (email, data) => localStorage.setItem(`rai_data_${email}`, JSON.stringify(data));

const defaultResume = {
  name: "", title: "", email: "", phone: "", location: "",
  linkedin: "", github: "", summary: "",
  experience: [{ company: "", role: "", duration: "", bullets: [""] }],
  education: [{ school: "", degree: "", year: "", gpa: "" }],
  skills: [],
  projects: [{ name: "", tech: "", desc: "" }],
  certifications: [],
};

// ─── AI CALL ─────────────────────────────────────────────────────────────────
async function callGroq(prompt, systemPrompt = "") {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_API_KEY}`},
    body:JSON.stringify({
      model:"llama-3.3-70b-versatile",
      max_tokens:1500,
      messages:[
        ...(systemPrompt ? [{role:"system",content:systemPrompt}] : []),
        {role:"user",content:prompt}
      ]
    })
  });
  const d = await res.json();
  if(d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || "";
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t);},[]);
  const bg = type==="error"?C.danger:type==="warn"?C.warning:C.success;
  return(
    <div style={{position:"fixed",top:20,right:20,background:bg,color:"#fff",padding:"12px 20px",borderRadius:12,zIndex:9999,fontSize:14,fontWeight:500,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",animation:"fadeUp 0.3s ease",maxWidth:320}}>
      {type==="error"?"❌ ":type==="warn"?"⚠️ ":"✅ "}{msg}
    </div>
  );
}

// ─── LOGIN PAGE ──────────────────────────────────────────────────────────────
function AuthPage({onAuth}){
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const handle=()=>{
    setErr("");
    if(!email||!pass){setErr("Please fill all fields");return;}
    if(mode==="signup"&&!name){setErr("Enter your name");return;}
    if(pass.length<6){setErr("Password must be 6+ characters");return;}

    setLoading(true);
    setTimeout(()=>{
      const users=getUsers();
      if(mode==="login"){
        if(!users[email]){setErr("Account not found");setLoading(false);return;}
        if(users[email].pass!==pass){setErr("Wrong password");setLoading(false);return;}
        const u={name:users[email].name,email};
        setCurrentUser(u);
        onAuth(u);
      } else {
        if(users[email]){setErr("Email already registered");setLoading(false);return;}
        users[email]={name,pass};
        saveUsers(users);
        const u={name,email};
        setCurrentUser(u);
        onAuth(u);
      }
      setLoading(false);
    },600);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{css}</style>

      {/* Background decoration */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-20%",right:"-10%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,142,247,0.08),transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:"-20%",left:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.08),transparent 70%)"}}/>
      </div>

      <div className="fade-up" style={{width:"100%",maxWidth:420,background:C.surface,borderRadius:24,padding:"2.5rem",border:`1px solid ${C.border}`,position:"relative"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{width:56,height:56,background:C.grad,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",fontSize:24,boxShadow:"0 8px 24px rgba(79,142,247,0.3)"}}>✦</div>
          <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>ResumeAI</h1>
          <p style={{color:C.muted,fontSize:14}}>{mode==="login"?"Welcome back! Sign in to continue":"Create your account to get started"}</p>
        </div>

        {/* Toggle */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4,marginBottom:"1.5rem"}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{flex:1,padding:"8px",borderRadius:9,border:"none",background:mode===m?"rgba(79,142,247,0.2)":"transparent",color:mode===m?C.accent:C.muted,cursor:"pointer",fontWeight:600,fontSize:13,textTransform:"capitalize",transition:"all 0.2s"}}>
              {m==="login"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>

        {mode==="signup"&&(
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} placeholder="Ahmed Khan" onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Email Address</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} placeholder="you@email.com" type="email" onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>

        <div style={{marginBottom:20}}>
          <label style={labelStyle}>Password</label>
          <input value={pass} onChange={e=>setPass(e.target.value)} style={inputStyle} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&handle()} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>

        {err&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.danger,marginBottom:16}}>❌ {err}</div>}

        <button onClick={handle} disabled={loading} style={{...btnPrimary,width:"100%",justifyContent:"center",padding:"12px",fontSize:15,opacity:loading?0.7:1}}>
          {loading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid white",borderRadius:"50%"}} className="spin"/>Processing...</>:mode==="login"?"Sign In →":"Create Account →"}
        </button>

        <p style={{textAlign:"center",marginTop:"1rem",fontSize:13,color:C.muted}}>
          {mode==="login"?"Don't have an account? ":"Already have an account? "}
          <span onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>
            {mode==="login"?"Sign Up":"Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({open,active,onNav,onToggle,user,onLogout}){
  const nav=[
    {id:"dashboard",icon:"⊞",label:"Dashboard"},
    {id:"builder",icon:"✏",label:"Resume Builder"},
    {id:"preview",icon:"◻",label:"Preview & Export"},
    {id:"ai",icon:"✦",label:"AI Improver"},
    {id:"ats",icon:"◎",label:"ATS Checker"},
    {id:"cover",icon:"✉",label:"Cover Letter"},
    {id:"interview",icon:"◈",label:"Interview Prep"},
  ];
  return(
    <div className={`sidebar${open?" open":""}`} style={{position:"fixed",top:0,left:0,height:"100vh",width:open?260:72,background:C.surface,borderRight:`1px solid ${C.border}`,transition:"width 0.3s",zIndex:100,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:open?"1.5rem 1.25rem":"1.5rem 0.875rem",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{width:36,height:36,background:C.grad,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✦</div>
        {open&&<span style={{fontWeight:800,fontSize:17,fontFamily:"Syne,sans-serif",letterSpacing:-0.3}}>ResumeAI</span>}
        <div onClick={onToggle} style={{marginLeft:"auto",cursor:"pointer",color:C.muted,fontSize:18,flexShrink:0}}>☰</div>
      </div>

      <nav style={{flex:1,padding:"0.75rem",display:"flex",flexDirection:"column",gap:3,overflowY:"auto"}}>
        {nav.map(item=>(
          <div key={item.id} onClick={()=>onNav(item.id)} style={{display:"flex",alignItems:"center",gap:12,padding:open?"10px 12px":"10px 0",justifyContent:open?"flex-start":"center",borderRadius:10,cursor:"pointer",background:active===item.id?"rgba(79,142,247,0.12)":"transparent",color:active===item.id?C.accent:C.muted,transition:"all 0.2s",fontSize:14,fontWeight:active===item.id?600:400,border:active===item.id?`1px solid rgba(79,142,247,0.2)`:"1px solid transparent"}}>
            <span style={{fontSize:17,flexShrink:0,width:20,textAlign:"center"}}>{item.icon}</span>
            {open&&<span style={{whiteSpace:"nowrap"}}>{item.label}</span>}
          </div>
        ))}
      </nav>

      {user&&(
        <div style={{padding:"0.75rem",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px",borderRadius:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:C.grad,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>
              {user.name?.charAt(0)?.toUpperCase()||"U"}
            </div>
            {open&&(
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div>
                <div onClick={onLogout} style={{fontSize:11,color:C.muted,cursor:"pointer",marginTop:1}}>Sign out →</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({resume,onNav,user,atsScore}){
  const completeness = [
    resume.name,resume.title,resume.email,resume.summary,
    resume.skills.length>0,resume.experience[0]?.company,
    resume.education[0]?.school
  ].filter(Boolean).length;
  const pct = Math.round((completeness/7)*100);

  const actions=[
    {label:"Edit Resume",icon:"✏",color:C.accent,id:"builder",desc:"Fill in your details"},
    {label:"AI Improve",icon:"✦",color:"#7C3AED",id:"ai",desc:"Rewrite with AI"},
    {label:"ATS Check",icon:"◎",color:C.success,id:"ats",desc:"Score your resume"},
    {label:"Cover Letter",icon:"✉",color:C.warning,id:"cover",desc:"Generate instantly"},
    {label:"Interview Prep",icon:"◈",color:"#EC4899",id:"interview",desc:"Practice questions"},
    {label:"Preview",icon:"◻",color:C.muted,id:"preview",desc:"Download PDF"},
  ];

  return(
    <div className="fade-up">
      <div style={{marginBottom:"2rem"}}>
        <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p style={{color:C.muted,fontSize:14}}>Your AI-powered resume dashboard</p>
      </div>

      {/* Profile completion */}
      <div style={{background:C.card,borderRadius:16,padding:"1.5rem",border:`1px solid ${C.border}`,marginBottom:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:600,fontSize:15}}>Resume Completion</span>
          <span style={{fontWeight:700,fontSize:18,color:pct>=80?C.success:pct>=50?C.warning:C.danger}}>{pct}%</span>
        </div>
        <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:8,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct>=80?C.success:pct>=50?C.warning:C.grad,borderRadius:8,transition:"width 1s ease"}}/>
        </div>
        {pct<100&&<p style={{fontSize:12,color:C.muted,marginTop:8}}>Complete your profile to increase your chances of getting hired!</p>}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:"1.5rem"}}>
        {[
          {label:"ATS Score",value:atsScore?`${atsScore.score}%`:"--",color:C.success,icon:"◎"},
          {label:"Skills Added",value:resume.skills.length,color:C.accent,icon:"★"},
          {label:"Experience",value:resume.experience.filter(e=>e.company).length,color:"#7C3AED",icon:"◈"},
          {label:"Projects",value:resume.projects.filter(p=>p.name).length,color:C.warning,icon:"◻"},
        ].map(s=>(
          <div key={s.label} style={{background:C.card,borderRadius:14,padding:"1.25rem",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:20,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.color,fontFamily:"Syne,sans-serif"}}>{s.value}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:"1rem",fontFamily:"Syne,sans-serif"}}>Quick Actions</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        {actions.map(a=>(
          <button key={a.id} onClick={()=>onNav(a.id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.25rem",cursor:"pointer",textAlign:"left",transition:"all 0.2s",color:C.text}}>
            <div style={{fontSize:22,color:a.color,marginBottom:8}}>{a.icon}</div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{a.label}</div>
            <div style={{fontSize:11,color:C.muted}}>{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── RESUME BUILDER ──────────────────────────────────────────────────────────
function ResumeBuilder({resume,setResume,showToast}){
  const [tab,setTab]=useState("personal");
  const tabs=["personal","experience","education","skills","projects"];
  const upd=(f,v)=>setResume(r=>({...r,[f]:v}));

  return(
    <div className="fade-up">
      <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>Resume Builder</h1>
      <p style={{color:C.muted,fontSize:14,marginBottom:"1.5rem"}}>Fill in your details — auto-saved to your account</p>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:"1.5rem",flexWrap:"wrap"}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 16px",borderRadius:20,border:`1px solid ${tab===t?C.accent:C.border}`,background:tab===t?"rgba(79,142,247,0.12)":"transparent",color:tab===t?C.accent:C.muted,cursor:"pointer",fontSize:13,fontWeight:tab===t?600:400,textTransform:"capitalize",transition:"all 0.2s"}}>
            {t}
          </button>
        ))}
      </div>

      <div style={{background:C.card,borderRadius:16,padding:"1.5rem",border:`1px solid ${C.border}`}}>

        {tab==="personal"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[["Full Name","name"],["Job Title","title"],["Email","email"],["Phone","phone"],["Location","location"],["LinkedIn","linkedin"],["GitHub","github"]].map(([l,f])=>(
              <div key={f}>
                <label style={labelStyle}>{l}</label>
                <input value={resume[f]||""} onChange={e=>upd(f,e.target.value)} style={inputStyle} placeholder={l} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
            ))}
            <div style={{gridColumn:"1/-1"}}>
              <label style={labelStyle}>Professional Summary</label>
              <textarea value={resume.summary} onChange={e=>upd("summary",e.target.value)} style={{...inputStyle,height:100,resize:"vertical"}} placeholder="Write a compelling summary..." onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
          </div>
        )}

        {tab==="experience"&&(
          <div>
            {resume.experience.map((exp,i)=>(
              <div key={i} style={{background:C.surface,borderRadius:12,padding:"1.25rem",marginBottom:12,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:600,fontSize:14}}>Experience #{i+1}</span>
                  {resume.experience.length>1&&<button onClick={()=>setResume(r=>({...r,experience:r.experience.filter((_,j)=>j!==i)}))} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,color:C.danger,cursor:"pointer",padding:"4px 10px",fontSize:12}}>Remove</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[["Company","company"],["Role","role"],["Duration","duration"]].map(([l,f])=>(
                    <div key={f}>
                      <label style={labelStyle}>{l}</label>
                      <input value={exp[f]} onChange={e=>{const ex=[...resume.experience];ex[i]={...ex[i],[f]:e.target.value};setResume(r=>({...r,experience:ex}));}} style={inputStyle} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                    </div>
                  ))}
                </div>
                <label style={{...labelStyle,marginTop:12}}>Key Achievements (one per line)</label>
                <textarea value={exp.bullets.join("\n")} onChange={e=>{const ex=[...resume.experience];ex[i]={...ex[i],bullets:e.target.value.split("\n")};setResume(r=>({...r,experience:ex}));}} style={{...inputStyle,height:80,resize:"vertical"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
            ))}
            <button onClick={()=>setResume(r=>({...r,experience:[...r.experience,{company:"",role:"",duration:"",bullets:[""]}]}))} style={{...btnSecondary,fontSize:13}}>+ Add Experience</button>
          </div>
        )}

        {tab==="education"&&(
          <div>
            {resume.education.map((edu,i)=>(
              <div key={i} style={{background:C.surface,borderRadius:12,padding:"1.25rem",marginBottom:12,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:600,fontSize:14}}>Education #{i+1}</span>
                  {resume.education.length>1&&<button onClick={()=>setResume(r=>({...r,education:r.education.filter((_,j)=>j!==i)}))} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,color:C.danger,cursor:"pointer",padding:"4px 10px",fontSize:12}}>Remove</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[["School","school"],["Degree","degree"],["Year","year"],["GPA","gpa"]].map(([l,f])=>(
                    <div key={f}>
                      <label style={labelStyle}>{l}</label>
                      <input value={edu[f]} onChange={e=>{const ed=[...resume.education];ed[i]={...ed[i],[f]:e.target.value};setResume(r=>({...r,education:ed}));}} style={inputStyle} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={()=>setResume(r=>({...r,education:[...r.education,{school:"",degree:"",year:"",gpa:""}]}))} style={{...btnSecondary,fontSize:13}}>+ Add Education</button>
          </div>
        )}

        {tab==="skills"&&(
          <div>
            <label style={labelStyle}>Skills (comma separated)</label>
            <input value={resume.skills.join(", ")} onChange={e=>upd("skills",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} style={inputStyle} placeholder="React, Python, Node.js, Docker..." onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>
              {resume.skills.map((s,i)=>(
                <span key={i} style={{background:"rgba(79,142,247,0.12)",color:C.accent,padding:"5px 14px",borderRadius:20,fontSize:13,fontWeight:500,border:"1px solid rgba(79,142,247,0.2)",display:"flex",alignItems:"center",gap:6}}>
                  {s}
                  <span onClick={()=>upd("skills",resume.skills.filter((_,j)=>j!==i))} style={{cursor:"pointer",opacity:0.6,fontSize:11}}>✕</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {tab==="projects"&&(
          <div>
            {resume.projects.map((p,i)=>(
              <div key={i} style={{background:C.surface,borderRadius:12,padding:"1.25rem",marginBottom:12,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:600,fontSize:14}}>Project #{i+1}</span>
                  {resume.projects.length>1&&<button onClick={()=>setResume(r=>({...r,projects:r.projects.filter((_,j)=>j!==i)}))} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,color:C.danger,cursor:"pointer",padding:"4px 10px",fontSize:12}}>Remove</button>}
                </div>
                {[["Project Name","name"],["Tech Stack","tech"],["Description","desc"]].map(([l,f])=>(
                  <div key={f} style={{marginBottom:10}}>
                    <label style={labelStyle}>{l}</label>
                    <input value={p[f]} onChange={e=>{const pr=[...resume.projects];pr[i]={...pr[i],[f]:e.target.value};setResume(r=>({...r,projects:pr}));}} style={inputStyle} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                ))}
              </div>
            ))}
            <button onClick={()=>setResume(r=>({...r,projects:[...r.projects,{name:"",tech:"",desc:""}]}))} style={{...btnSecondary,fontSize:13}}>+ Add Project</button>
          </div>
        )}

        <div style={{marginTop:"1.5rem",display:"flex",gap:10}}>
          <button onClick={()=>showToast("Resume saved to your account!")} style={btnPrimary}>💾 Save Resume</button>
        </div>
      </div>
    </div>
  );
}

// ─── PREVIEW ─────────────────────────────────────────────────────────────────
function ResumePreview({resume}){
  const [tpl,setTpl]=useState("Modern");
  const accent = tpl==="Modern"?C.accent:tpl==="Corporate"?"#1a1a2e":tpl==="Student"?"#7C3AED":"#333";

  return(
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>Preview & Export</h1>
          <p style={{color:C.muted,fontSize:14}}>Choose a template and download your resume</p>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["Modern","Minimal","Corporate","Student"].map(t=>(
            <button key={t} onClick={()=>setTpl(t)} style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${tpl===t?C.accent:C.border}`,background:tpl===t?C.accent:"transparent",color:tpl===t?"#fff":C.muted,cursor:"pointer",fontSize:12,fontWeight:tpl===t?600:400,transition:"all 0.2s"}}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:16,padding:"2.5rem",color:"#1a1a2e",maxWidth:700,margin:"0 auto",boxShadow:"0 0 60px rgba(0,0,0,0.5)"}}>
        <div style={{borderBottom:`3px solid ${accent}`,paddingBottom:"1rem",marginBottom:"1.25rem"}}>
          <h1 style={{margin:0,fontSize:26,fontWeight:700,color:accent,fontFamily:"Syne,sans-serif"}}>{resume.name||"Your Name"}</h1>
          <p style={{margin:"4px 0",fontSize:14,color:"#555"}}>{resume.title||"Your Title"}</p>
          <p style={{margin:"4px 0",fontSize:12,color:"#777"}}>
            {[resume.email,resume.phone,resume.location,resume.linkedin].filter(Boolean).join(" · ")}
          </p>
        </div>
        {resume.summary&&<div style={{marginBottom:"1.25rem"}}><h2 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:accent,marginBottom:6}}>Summary</h2><p style={{margin:0,fontSize:13,lineHeight:1.7,color:"#333"}}>{resume.summary}</p></div>}
        {resume.experience.filter(e=>e.company).length>0&&<div style={{marginBottom:"1.25rem"}}><h2 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:accent,marginBottom:8}}>Experience</h2>{resume.experience.filter(e=>e.company).map((e,i)=><div key={i} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={{fontSize:13}}>{e.role}</strong><span style={{fontSize:12,color:"#777"}}>{e.duration}</span></div><div style={{fontSize:12,color:"#555",marginBottom:4}}>{e.company}</div>{e.bullets.filter(b=>b).map((b,j)=><div key={j} style={{fontSize:12,color:"#444",paddingLeft:12}}>• {b}</div>)}</div>)}</div>}
        {resume.education.filter(e=>e.school).length>0&&<div style={{marginBottom:"1.25rem"}}><h2 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:accent,marginBottom:8}}>Education</h2>{resume.education.filter(e=>e.school).map((e,i)=><div key={i} style={{marginBottom:8,display:"flex",justifyContent:"space-between"}}><div><strong style={{fontSize:13}}>{e.degree}</strong><div style={{fontSize:12,color:"#555"}}>{e.school}{e.gpa?` — GPA: ${e.gpa}`:""}</div></div><span style={{fontSize:12,color:"#777"}}>{e.year}</span></div>)}</div>}
        {resume.skills.length>0&&<div style={{marginBottom:"1.25rem"}}><h2 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:accent,marginBottom:8}}>Skills</h2><p style={{margin:0,fontSize:13,color:"#333",lineHeight:1.8}}>{resume.skills.join(" · ")}</p></div>}
        {resume.projects.filter(p=>p.name).length>0&&<div><h2 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:accent,marginBottom:8}}>Projects</h2>{resume.projects.filter(p=>p.name).map((p,i)=><div key={i} style={{marginBottom:10}}><strong style={{fontSize:13}}>{p.name}</strong>{p.tech&&<span style={{fontSize:12,color:"#777"}}> · {p.tech}</span>}<div style={{fontSize:12,color:"#444",marginTop:2}}>{p.desc}</div></div>)}</div>}
      </div>

      <div style={{textAlign:"center",marginTop:"1.5rem"}}>
        <button onClick={()=>window.print()} style={btnPrimary}>⬇ Download PDF</button>
      </div>
    </div>
  );
}

// ─── AI IMPROVER ─────────────────────────────────────────────────────────────
function AiImprover({resume,setResume,showToast}){
  const [result,setResult]=useState("");
  const [loading,setLoading]=useState(false);

  const improve=async()=>{
    setLoading(true);
    try{
      const r=await callGroq(
        `Improve this resume summary to be ATS-friendly, professional, and impactful. Return ONLY the improved summary text, nothing else.\n\nName: ${resume.name}\nTitle: ${resume.title}\nCurrent Summary: ${resume.summary}\nSkills: ${resume.skills.join(", ")}\nExperience: ${resume.experience.map(e=>`${e.role} at ${e.company}`).join(", ")}`,
        "You are a professional resume writer and career coach."
      );
      setResult(r);
      showToast("Resume improved by AI!");
    }catch(e){showToast("AI error: "+e.message,"error");}
    setLoading(false);
  };

  return(
    <div className="fade-up">
      <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>AI Resume Improver</h1>
      <p style={{color:C.muted,fontSize:14,marginBottom:"1.5rem"}}>Let AI rewrite your resume to be more professional and ATS-friendly</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:"1.5rem"}}>
        <div style={{background:C.card,borderRadius:16,padding:"1.5rem",border:`1px solid ${C.border}`}}>
          <h3 style={{fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:"1rem"}}>Original Summary</h3>
          <p style={{color:C.text,lineHeight:1.7,fontSize:14}}>{resume.summary||"No summary yet. Add one in Resume Builder."}</p>
        </div>
        <div style={{background:C.card,borderRadius:16,padding:"1.5rem",border:`1px solid rgba(79,142,247,0.2)`}}>
          <h3 style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:1,marginBottom:"1rem"}}>✦ AI Improved</h3>
          {loading?<div style={{display:"flex",gap:10,alignItems:"center",color:C.muted,fontSize:14}}><div style={{width:16,height:16,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%"}} className="spin"/>Improving...</div>:result?<p style={{color:C.text,lineHeight:1.7,fontSize:14}}>{result}</p>:<p style={{color:C.muted,fontSize:14}}>Click "Improve with AI" to see the magic ✦</p>}
        </div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button onClick={improve} disabled={loading} style={{...btnPrimary,opacity:loading?0.6:1}}>✦ Improve with AI</button>
        {result&&<button onClick={()=>{setResume(r=>({...r,summary:result}));showToast("Applied to resume!");}} style={btnSecondary}>✅ Apply to Resume</button>}
      </div>
    </div>
  );
}

// ─── ATS CHECKER ─────────────────────────────────────────────────────────────
function AtsChecker({resume,atsScore,setAtsScore,showToast}){
  const [loading,setLoading]=useState(false);

  const check=async()=>{
    setLoading(true);
    try{
      const r=await callGroq(
        `Analyze this resume for ATS compatibility. Return ONLY a JSON object with: score (0-100 number), strengths (array of 3 strings), weaknesses (array of 3 strings), suggestions (array of 3 strings). No markdown, pure JSON.\n\nResume: ${JSON.stringify(resume)}`,
        "You are an ATS expert and resume analyst."
      );
      const clean=r.replace(/```json|```/g,"").trim();
      const start=clean.indexOf("{");const end=clean.lastIndexOf("}");
      setAtsScore(JSON.parse(clean.slice(start,end+1)));
      showToast("ATS analysis complete!");
    }catch(e){
      setAtsScore({score:72,strengths:["Good skills section","Clear experience","Contact info present"],weaknesses:["Summary needs keywords","Missing quantified achievements","No certifications"],suggestions:["Add job-specific keywords","Quantify your impact","Add LinkedIn URL"]});
      showToast("Sample ATS data loaded","warn");
    }
    setLoading(false);
  };

  return(
    <div className="fade-up">
      <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>ATS Score Checker</h1>
      <p style={{color:C.muted,fontSize:14,marginBottom:"1.5rem"}}>See how well your resume performs with Applicant Tracking Systems</p>
      {loading?<div style={{display:"flex",gap:10,alignItems:"center",padding:"3rem",color:C.muted,fontSize:14}}><div style={{width:20,height:20,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%"}} className="spin"/>Analyzing your resume...</div>
      :atsScore?(
        <div>
          <div style={{background:C.card,borderRadius:16,padding:"2rem",border:`1px solid ${C.border}`,textAlign:"center",marginBottom:"1.5rem"}}>
            <div style={{fontSize:72,fontWeight:800,fontFamily:"Syne,sans-serif",color:atsScore.score>=75?C.success:atsScore.score>=50?C.warning:C.danger}}>{atsScore.score}</div>
            <div style={{fontSize:16,color:C.muted,marginBottom:"1.5rem"}}>ATS Compatibility Score</div>
            <div style={{height:10,background:"rgba(255,255,255,0.06)",borderRadius:10,maxWidth:300,margin:"0 auto",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${atsScore.score}%`,background:atsScore.score>=75?C.success:C.warning,borderRadius:10,transition:"width 1.5s ease"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
            {[["✅ Strengths",atsScore.strengths,C.success],["⚠️ Weaknesses",atsScore.weaknesses,C.warning],["💡 Suggestions",atsScore.suggestions,C.accent]].map(([title,items,color])=>(
              <div key={title} style={{background:C.card,borderRadius:14,padding:"1.25rem",border:`1px solid ${C.border}`}}>
                <h3 style={{margin:"0 0 12px",fontSize:13,color,fontFamily:"Syne,sans-serif"}}>{title}</h3>
                {items.map((item,i)=><div key={i} style={{fontSize:13,color:C.muted,marginBottom:8,lineHeight:1.5}}>• {item}</div>)}
              </div>
            ))}
          </div>
          <button onClick={check} style={{...btnSecondary,marginTop:"1.5rem"}}>🔄 Re-analyze</button>
        </div>
      ):(
        <div style={{background:C.card,borderRadius:16,padding:"3rem",textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:48,marginBottom:"1rem"}}>◎</div>
          <p style={{color:C.muted,marginBottom:"1.5rem",fontSize:14}}>Analyze your resume against ATS systems</p>
          <button onClick={check} style={btnPrimary}>Analyze Now</button>
        </div>
      )}
    </div>
  );
}

// ─── COVER LETTER ─────────────────────────────────────────────────────────────
function CoverLetter({resume,showToast}){
  const [jobTitle,setJobTitle]=useState("");
  const [letter,setLetter]=useState("");
  const [loading,setLoading]=useState(false);

  const generate=async()=>{
    if(!jobTitle){showToast("Enter a job title first","error");return;}
    setLoading(true);
    try{
      const r=await callGroq(
        `Write a professional, personalized cover letter for ${resume.name||"the applicant"} applying for "${jobTitle}". Background: ${resume.summary}. Skills: ${resume.skills.join(", ")}. Experience: ${resume.experience.filter(e=>e.company).map(e=>`${e.role} at ${e.company}`).join(", ")}. Write 3 strong paragraphs. Professional but warm tone.`,
        "You are an expert career coach and professional writer."
      );
      setLetter(r);showToast("Cover letter generated!");
    }catch(e){showToast("AI error: "+e.message,"error");}
    setLoading(false);
  };

  return(
    <div className="fade-up">
      <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>Cover Letter Generator</h1>
      <p style={{color:C.muted,fontSize:14,marginBottom:"1.5rem"}}>Generate a personalized cover letter using AI</p>
      <div style={{background:C.card,borderRadius:16,padding:"1.5rem",border:`1px solid ${C.border}`,marginBottom:"1.5rem"}}>
        <label style={labelStyle}>Job Title & Company</label>
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} style={{...inputStyle,flex:1}} placeholder="e.g. Software Engineer at Google" onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} onKeyDown={e=>e.key==="Enter"&&generate()}/>
          <button onClick={generate} disabled={loading} style={{...btnPrimary,whiteSpace:"nowrap",opacity:loading?0.6:1}}>
            {loading?"Generating...":"✉ Generate"}
          </button>
        </div>
      </div>
      {loading&&<div style={{display:"flex",gap:10,alignItems:"center",padding:"2rem",color:C.muted,fontSize:14}}><div style={{width:18,height:18,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%"}} className="spin"/>Writing your cover letter...</div>}
      {letter&&!loading&&(
        <div style={{background:C.card,borderRadius:16,padding:"2rem",border:`1px solid ${C.border}`}}>
          <pre style={{fontFamily:"'DM Sans',sans-serif",whiteSpace:"pre-wrap",lineHeight:1.8,color:C.text,fontSize:14,margin:0}}>{letter}</pre>
          <div style={{display:"flex",gap:10,marginTop:"1.5rem"}}>
            <button onClick={()=>navigator.clipboard.writeText(letter).then(()=>showToast("Copied!"))} style={btnSecondary}>📋 Copy</button>
            <button onClick={generate} style={btnSecondary}>🔄 Regenerate</button>
          </div>
        </div>
      )}
      {!letter&&!loading&&<div style={{background:C.card,borderRadius:16,padding:"3rem",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:48,marginBottom:"1rem"}}>✉</div><p style={{color:C.muted,fontSize:14}}>Enter a job title and generate your cover letter</p></div>}
    </div>
  );
}

// ─── INTERVIEW PREP ───────────────────────────────────────────────────────────
function InterviewPrep({resume,showToast}){
  const [questions,setQuestions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState(null);

  const generate=async()=>{
    setLoading(true);
    try{
      const r=await callGroq(
        `Generate 6 interview questions for a ${resume.title||"professional"} role. Return ONLY a JSON array with objects: {question, type ("technical" or "hr"), tip}. No markdown.\n\nSkills: ${resume.skills.join(", ")}`,
        "You are an expert interview coach."
      );
      const clean=r.replace(/```json|```/g,"").trim();
      const start=clean.indexOf("[");const end=clean.lastIndexOf("]");
      setQuestions(JSON.parse(clean.slice(start,end+1)));
      showToast("Interview questions ready!");
    }catch(e){
      setQuestions([
        {question:"Tell me about your experience with your primary tech stack.",type:"technical",tip:"Mention specific projects and measurable outcomes."},
        {question:"How do you handle tight deadlines and pressure?",type:"hr",tip:"Use the STAR method with a real example."},
        {question:"Explain a complex technical concept you recently learned.",type:"technical",tip:"Show your learning ability and communication skills."},
        {question:"Where do you see yourself in 5 years?",type:"hr",tip:"Align your goals with the company's growth."},
        {question:"Describe your debugging process for a production issue.",type:"technical",tip:"Walk through your systematic approach step by step."},
        {question:"What's your biggest professional achievement?",type:"hr",tip:"Quantify the impact with specific numbers."},
      ]);
      showToast("Sample questions loaded","warn");
    }
    setLoading(false);
  };

  return(
    <div className="fade-up">
      <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>Interview Prep</h1>
      <p style={{color:C.muted,fontSize:14,marginBottom:"1.5rem"}}>AI-generated interview questions based on your resume</p>
      {questions.length===0&&!loading&&(
        <div style={{background:C.card,borderRadius:16,padding:"3rem",textAlign:"center",border:`1px solid ${C.border}`,marginBottom:"1.5rem"}}>
          <div style={{fontSize:48,marginBottom:"1rem"}}>◈</div>
          <p style={{color:C.muted,marginBottom:"1.5rem",fontSize:14}}>Generate questions tailored to your resume and role</p>
          <button onClick={generate} style={btnPrimary}>Generate Questions</button>
        </div>
      )}
      {loading&&<div style={{display:"flex",gap:10,alignItems:"center",padding:"3rem",color:C.muted,fontSize:14}}><div style={{width:18,height:18,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%"}} className="spin"/>Generating questions...</div>}
      {questions.length>0&&(
        <div>
          {questions.map((q,i)=>(
            <div key={i} style={{background:C.card,borderRadius:12,marginBottom:10,border:`1px solid ${C.border}`,overflow:"hidden",transition:"all 0.2s"}}>
              <div onClick={()=>setOpen(open===i?null:i)} style={{padding:"1rem 1.25rem",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:q.type==="technical"?"rgba(79,142,247,0.15)":"rgba(16,185,129,0.15)",color:q.type==="technical"?C.accent:C.success,flexShrink:0}}>{q.type}</span>
                  <span style={{fontSize:14,fontWeight:500}}>{q.question}</span>
                </div>
                <span style={{color:C.muted,flexShrink:0,fontSize:12}}>{open===i?"▲":"▼"}</span>
              </div>
              {open===i&&<div style={{padding:"0 1.25rem 1rem",borderTop:`1px solid ${C.border}`}}><div style={{background:"rgba(79,142,247,0.06)",borderRadius:8,padding:"10px 14px",marginTop:10}}><p style={{margin:0,fontSize:13,color:C.muted,lineHeight:1.7}}>💡 <strong style={{color:C.accent}}>Tip:</strong> {q.tip}</p></div></div>}
            </div>
          ))}
          <button onClick={generate} style={{...btnSecondary,marginTop:"1rem"}}>🔄 Regenerate</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(()=>getCurrentUser());
  const [section,setSection]=useState("dashboard");
  const [sidebarOpen,setSidebarOpen]=useState(window.innerWidth>768);
  const [resume,setResume]=useState(()=>{
    const u=getCurrentUser();
    return u?getUserData(u.email)||defaultResume:defaultResume;
  });
  const [atsScore,setAtsScore]=useState(null);
  const [toast,setToast]=useState(null);

  // Auto-save resume when it changes
  useEffect(()=>{
    if(user) saveUserData(user.email,resume);
  },[resume,user]);

  // Close sidebar on mobile when navigating
  const navigate=(s)=>{
    setSection(s);
    if(window.innerWidth<=768) setSidebarOpen(false);
  };

  const showToast=(msg,type="success")=>setToast({msg,type});

  const handleLogout=()=>{
    localStorage.removeItem("rai_current");
    setUser(null);
    setResume(defaultResume);
  };

  const handleAuth=(u)=>{
    setUser(u);
    const saved=getUserData(u.email);
    if(saved) setResume(saved);
    else setResume(defaultResume);
  };

  if(!user) return(
    <>
      <style>{css}</style>
      <AuthPage onAuth={handleAuth}/>
    </>
  );

  return(
    <>
      <style>{css}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Mobile overlay */}
      {sidebarOpen&&window.innerWidth<=768&&(
        <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199,backdropFilter:"blur(2px)"}}/>
      )}

      <div style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar open={sidebarOpen} active={section} onNav={navigate} onToggle={()=>setSidebarOpen(v=>!v)} user={user} onLogout={handleLogout}/>

        <main className="main-content" style={{flex:1,marginLeft:sidebarOpen?260:72,transition:"margin 0.3s",padding:"2rem",overflowY:"auto",minHeight:"100vh"}}>
          {section==="dashboard"&&<Dashboard resume={resume} onNav={navigate} user={user} atsScore={atsScore}/>}
          {section==="builder"&&<ResumeBuilder resume={resume} setResume={setResume} showToast={showToast}/>}
          {section==="preview"&&<ResumePreview resume={resume}/>}
          {section==="ai"&&<AiImprover resume={resume} setResume={setResume} showToast={showToast}/>}
          {section==="ats"&&<AtsChecker resume={resume} atsScore={atsScore} setAtsScore={setAtsScore} showToast={showToast}/>}
          {section==="cover"&&<CoverLetter resume={resume} showToast={showToast}/>}
          {section==="interview"&&<InterviewPrep resume={resume} showToast={showToast}/>}
        </main>
      </div>
    </>
  );
}