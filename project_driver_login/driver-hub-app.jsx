import React, { useState, useMemo } from "react";
import {
  Truck, User, Building2, ShieldCheck, Search, MapPin, Clock, IndianRupee,
  FileText, Bell, CheckCircle2, XCircle, Star, LogOut, Plus, Filter, Phone,
  Mail, ChevronRight, ChevronLeft, BarChart3, Users, Briefcase, ClipboardList,
  Ban, Check, X, Upload, ArrowRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/* ---------------------------------------------------------------------
   DESIGN TOKENS
   Palette: asphalt (dark road surface), route amber (signage), signal
   green (available/success), concrete (light bg), steel (secondary text)
--------------------------------------------------------------------- */
const C = {
  asphalt: "#1B2430",
  asphalt2: "#232E3D",
  amber: "#F2A93B",
  amberDark: "#D98F1F",
  green: "#2E9E6B",
  red: "#D9483A",
  concrete: "#EEEBE4",
  card: "#FFFFFF",
  ink: "#141A22",
  steel: "#5B6B7C",
  line: "#DCD7CC",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');`;

/* ---------------------------------------------------------------------
   SEED DATA
--------------------------------------------------------------------- */
const LICENSES = ["MCWG", "LMV", "LMV-Transport", "HMV", "HMV-Transport"];

const seedJobs = [
  { id: "j1", title: "Heavy Truck Driver", company: "Bharat Logistics Pvt Ltd", employerId: "e1", category: "HMV", location: "Bengaluru", experience: "3-5 yrs", salaryMin: 22000, salaryMax: 28000, hours: "Full-time, day shift", docs: ["HMV License", "Aadhar Card", "PAN Card"], status: "active", posted: "2026-09-02" },
  { id: "j2", title: "Cab Driver (App-based)", company: "QuickRide Cabs", employerId: "e2", category: "LMV", location: "Bengaluru", experience: "1+ yr", salaryMin: 18000, salaryMax: 25000, hours: "Flexible shifts", docs: ["LMV License", "Aadhar Card"], status: "active", posted: "2026-09-05" },
  { id: "j3", title: "School Van Driver", company: "Sunrise School", employerId: "e3", category: "LMV-Transport", location: "Mysuru", experience: "2+ yrs", salaryMin: 15000, salaryMax: 18000, hours: "Part-time, morning & evening", docs: ["LMV-Transport License", "Police Verification"], status: "active", posted: "2026-09-08" },
  { id: "j4", title: "Delivery Rider (Two-wheeler)", company: "Swift Deliveries", employerId: "e2", category: "MCWG", location: "Bengaluru", experience: "0-1 yr", salaryMin: 14000, salaryMax: 17000, hours: "Full-time, rotational", docs: ["MCWG License", "Own Vehicle"], status: "active", posted: "2026-09-10" },
  { id: "j5", title: "Container Truck Driver", company: "National Freight Carriers", employerId: "e1", category: "HMV-Transport", location: "Chennai", experience: "5+ yrs", salaryMin: 30000, salaryMax: 40000, hours: "Full-time, interstate", docs: ["HMV-Transport License", "Aadhar Card", "PAN Card"], status: "active", posted: "2026-08-28" },
  { id: "j6", title: "Personal Driver", company: "Private Household", employerId: "e2", category: "LMV", location: "Bengaluru", experience: "3+ yrs", salaryMin: 20000, salaryMax: 24000, hours: "Full-time, 6 days/week", docs: ["LMV License"], status: "active", posted: "2026-09-11" },
  { id: "j7", title: "Bus Driver, Staff Transport", company: "Bharat Logistics Pvt Ltd", employerId: "e1", category: "HMV", location: "Bengaluru", experience: "4+ yrs", salaryMin: 25000, salaryMax: 30000, hours: "Full-time, split shift", docs: ["HMV License", "Aadhar Card"], status: "closed", posted: "2026-08-15" },
  { id: "j8", title: "Tempo Traveller Driver", company: "Wanderlust Tours", employerId: "e3", category: "LMV-Transport", location: "Mysuru", experience: "2+ yrs", salaryMin: 19000, salaryMax: 23000, hours: "Full-time, on-call", docs: ["LMV-Transport License"], status: "active", posted: "2026-09-12" },
];

const seedDrivers = [
  { id: "d1", name: "Ravi Kumar", location: "Bengaluru", phone: "9876500001", email: "ravi.k@example.com", license: "HMV", experience: 6, skills: ["Long haul", "GPS navigation", "Vehicle maintenance"], resume: "ravi_kumar_resume.pdf", status: "active" },
  { id: "d2", name: "Suresh M", location: "Mysuru", phone: "9876500002", email: "suresh.m@example.com", license: "LMV-Transport", experience: 3, skills: ["Defensive driving", "Customer service"], resume: "suresh_m_resume.pdf", status: "active" },
  { id: "d3", name: "Anitha P", location: "Bengaluru", phone: "9876500003", email: "anitha.p@example.com", license: "LMV", experience: 2, skills: ["City driving", "Punctuality"], resume: null, status: "active" },
  { id: "d4", name: "Manjunath R", location: "Chennai", phone: "9876500004", email: "manjunath.r@example.com", license: "HMV-Transport", experience: 8, skills: ["Interstate routes", "Documentation"], resume: "manjunath_r_resume.pdf", status: "active" },
  { id: "d5", name: "Kiran S", location: "Bengaluru", phone: "9876500005", email: "kiran.s@example.com", license: "MCWG", experience: 1, skills: ["Two-wheeler delivery", "Time management"], resume: null, status: "blocked" },
];

const seedEmployers = [
  { id: "e1", company: "Bharat Logistics Pvt Ltd", contact: "Deepa Nair", location: "Bengaluru", phone: "8022000001", email: "hr@bharatlogistics.example", sector: "Logistics & Freight", status: "active" },
  { id: "e2", company: "QuickRide Cabs", contact: "Arjun Rao", location: "Bengaluru", phone: "8022000002", email: "hiring@quickride.example", sector: "Cab Aggregator", status: "active" },
  { id: "e3", company: "Sunrise School", contact: "Meera Iyer", location: "Mysuru", phone: "8022000003", email: "admin@sunriseschool.example", sector: "Education", status: "pending" },
];

const seedApplications = [
  { id: "a1", jobId: "j1", driverId: "d1", status: "shortlisted", applied: "2026-09-03" },
  { id: "a2", jobId: "j1", driverId: "d4", status: "applied", applied: "2026-09-04" },
  { id: "a3", jobId: "j2", driverId: "d3", status: "applied", applied: "2026-09-06" },
  { id: "a4", jobId: "j3", driverId: "d2", status: "hired", applied: "2026-08-20" },
  { id: "a5", jobId: "j5", driverId: "d4", status: "rejected", applied: "2026-08-30" },
];

const uid = (p) => `${p}${Math.random().toString(36).slice(2, 8)}`;
const fmtINR = (n) => `\u20b9${n.toLocaleString("en-IN")}`;

/* ---------------------------------------------------------------------
   SMALL UI PRIMITIVES
--------------------------------------------------------------------- */
function Badge({ children, tone = "steel" }) {
  const tones = {
    steel: { bg: "#EDEFF2", fg: C.steel },
    amber: { bg: "#FCEFD8", fg: C.amberDark },
    green: { bg: "#E1F3EA", fg: C.green },
    red: { bg: "#FBE6E3", fg: C.red },
    asphalt: { bg: "#E7E9EC", fg: C.asphalt },
  };
  const t = tones[tone];
  return (
    <span style={{ background: t.bg, color: t.fg, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 4, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: ["Active", "green"], applied: ["Applied", "steel"], shortlisted: ["Shortlisted", "amber"],
    rejected: ["Rejected", "red"], hired: ["Hired", "green"], closed: ["Closed", "red"],
    blocked: ["Blocked", "red"], pending: ["Pending review", "amber"],
  };
  const [label, tone] = map[status] || [status, "steel"];
  return <Badge tone={tone}>{label}</Badge>;
}

function Btn({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled, type = "button", full }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    fontFamily: "Inter, sans-serif", fontWeight: 600, borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
    border: "1.5px solid transparent", transition: "transform .08s ease, opacity .15s ease",
    opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto",
  };
  const sizes = { sm: { padding: "6px 12px", fontSize: 13 }, md: { padding: "10px 18px", fontSize: 14 } };
  const variants = {
    primary: { background: C.amber, color: C.asphalt, borderColor: C.amber },
    dark: { background: C.asphalt, color: "#fff", borderColor: C.asphalt },
    outline: { background: "transparent", color: C.asphalt, borderColor: C.line },
    ghost: { background: "transparent", color: C.steel, borderColor: "transparent" },
    danger: { background: "#fff", color: C.red, borderColor: "#F0C9C4" },
    success: { background: "#fff", color: C.green, borderColor: "#BFE3D2" },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      style={{ ...base, ...sizes[size], ...variants[variant] }}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.steel, marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 11px", borderRadius: 6, border: `1.5px solid ${C.line}`,
  fontFamily: "Inter, sans-serif", fontSize: 14, color: C.ink, background: "#fff", boxSizing: "border-box",
};

function Input(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function Select({ children, ...props }) { return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{children}</select>; }

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: 20, ...style }}>{children}</div>;
}

function TopStrip({ title, subtitle, roleLabel, onExit }) {
  return (
    <div style={{ background: C.asphalt, color: "#fff", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 6, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Truck size={19} color={C.asphalt} />
        </div>
        <div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 19, letterSpacing: 0.3 }}>Driver Hub</div>
          <div style={{ fontSize: 11.5, color: "#9AA7B5" }}>{roleLabel}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {title && (
          <div style={{ textAlign: "right", display: "none" }} />
        )}
        <button onClick={onExit} style={{ background: "transparent", border: `1.5px solid #3A4658`, color: "#C9D2DB", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <LogOut size={14} /> Exit demo
        </button>
      </div>
    </div>
  );
}

function NavTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.line}`, padding: "0 28px", background: "#fff", overflowX: "auto" }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            background: "transparent", border: "none", cursor: "pointer", padding: "14px 14px 12px",
            fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap",
            color: active === t.key ? C.asphalt : C.steel,
            borderBottom: active === t.key ? `2.5px solid ${C.amber}` : "2.5px solid transparent",
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {t.icon && <t.icon size={15} />} {t.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: C.steel }}>
      <Icon size={30} style={{ marginBottom: 10, opacity: 0.5 }} />
      <div style={{ fontWeight: 600, color: C.ink, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13.5 }}>{hint}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   LANDING
--------------------------------------------------------------------- */
function Landing({ onPick }) {
  return (
    <div style={{ minHeight: "100vh", background: C.concrete }}>
      <div style={{ background: C.asphalt, color: "#fff", padding: "56px 28px 90px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: 30, opacity: 0.12 }}>
          <Truck size={260} />
        </div>
        <div style={{ maxWidth: 640, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{ width: 38, height: 38, borderRadius: 7, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Truck size={21} color={C.asphalt} />
            </div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 22 }}>Driver Hub</div>
          </div>
          <h1 style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, fontSize: 42, lineHeight: 1.15, margin: "0 0 16px" }}>
            Where drivers and employers find each other.
          </h1>
          <p style={{ fontSize: 16, color: "#C9D2DB", lineHeight: 1.6, maxWidth: 500, margin: "0 0 30px" }}>
            Post a vacancy, browse driver profiles, or find your next driving job — trucks, cabs, delivery and more, matched by license, route and experience.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "-56px auto 0", padding: "0 28px 60px", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
          <RoleCard icon={User} title="I'm a driver" desc="Build a profile, browse driving jobs and track your applications." action="Find driving jobs" onClick={() => onPick("driver-auth")} accent={C.amber} />
          <RoleCard icon={Building2} title="I'm an employer" desc="Post vacancies, search driver profiles and manage applicants." action="Hire drivers" onClick={() => onPick("employer-auth")} accent={C.green} />
          <RoleCard icon={ShieldCheck} title="Admin" desc="Moderate listings, manage accounts and view platform stats." action="Open admin panel" onClick={() => onPick("admin")} accent={C.steel} />
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 26, flexWrap: "wrap" }}>
          {[
            ["8", "open vacancies across Karnataka & Tamil Nadu"],
            ["5", "license categories, from MCWG to HMV-Transport"],
            ["3", "employer partners already hiring"],
          ].map(([n, l], i) => (
            <div key={i} style={{ minWidth: 180 }}>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 30, color: C.asphalt }}>{n}</div>
              <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, action, onClick, accent }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, cursor: "pointer", boxShadow: "0 10px 24px rgba(27,36,48,0.08)" }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={20} color={accent === C.amber ? C.amberDark : accent} />
      </div>
      <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, marginBottom: 6, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 13.5, color: C.steel, lineHeight: 1.5, marginBottom: 16 }}>{desc}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.asphalt, display: "flex", alignItems: "center", gap: 5 }}>
        {action} <ArrowRight size={14} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   AUTH SCREENS (mock — demo accounts or quick registration)
--------------------------------------------------------------------- */
function AuthScreen({ role, drivers, employers, onLogin, onRegisterDriver, onRegisterEmployer, onBack }) {
  const [mode, setMode] = useState("login");
  const list = role === "driver" ? drivers.filter(d => d.status !== "blocked") : employers.filter(e => e.status === "active");
  const [form, setForm] = useState(
    role === "driver"
      ? { name: "", phone: "", email: "", location: "", license: "LMV", experience: "" }
      : { company: "", contact: "", phone: "", email: "", location: "", sector: "" }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (role === "driver") {
      if (!form.name || !form.phone) return;
      onRegisterDriver({ ...form, experience: Number(form.experience) || 0, skills: [], resume: null });
    } else {
      if (!form.company || !form.contact) return;
      onRegisterEmployer(form);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.concrete, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.steel, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 16 }}>
          <ChevronLeft size={15} /> Back
        </button>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            {role === "driver" ? <User size={20} color={C.amberDark} /> : <Building2 size={20} color={C.green} />}
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 20 }}>{role === "driver" ? "Driver account" : "Employer account"}</div>
          </div>
          <div style={{ fontSize: 13, color: C.steel, marginBottom: 18 }}>Demo login — no password needed. Pick a sample account or register fresh.</div>

          <div style={{ display: "flex", gap: 6, marginBottom: 18, background: C.concrete, padding: 4, borderRadius: 7 }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "8px 0", borderRadius: 5, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 13, background: mode === m ? "#fff" : "transparent", color: mode === m ? C.ink : C.steel,
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}>{m === "login" ? "Demo login" : "Register"}</button>
            ))}
          </div>

          {mode === "login" ? (
            <div>
              {list.map((item) => (
                <button key={item.id} onClick={() => onLogin(item.id)} style={{
                  width: "100%", textAlign: "left", background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 7,
                  padding: "11px 13px", marginBottom: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{role === "driver" ? item.name : item.company}</div>
                    <div style={{ fontSize: 12, color: C.steel }}>{role === "driver" ? `${item.license} \u2022 ${item.location}` : `${item.sector} \u2022 ${item.location}`}</div>
                  </div>
                  <ChevronRight size={16} color={C.steel} />
                </button>
              ))}
            </div>
          ) : (
            <div>
              {role === "driver" ? (
                <>
                  <Field label="Full name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Deepak N" /></Field>
                  <Field label="Phone number"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit mobile number" /></Field>
                  <Field label="Email (optional)"><Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></Field>
                  <Field label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City" /></Field>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <Field label="License category">
                        <Select value={form.license} onChange={(e) => set("license", e.target.value)}>
                          {LICENSES.map((l) => <option key={l}>{l}</option>)}
                        </Select>
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field label="Years of experience"><Input type="number" min="0" value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="0" /></Field>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Field label="Company name"><Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Metro Transport Services" /></Field>
                  <Field label="Contact person"><Input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Hiring manager name" /></Field>
                  <Field label="Phone number"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Company phone" /></Field>
                  <Field label="Email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="hr@company.com" /></Field>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}><Field label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City" /></Field></div>
                    <div style={{ flex: 1 }}><Field label="Sector"><Input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. Logistics" /></Field></div>
                  </div>
                </>
              )}
              <Btn full onClick={submit}>Create account & continue</Btn>
              <div style={{ fontSize: 11.5, color: C.steel, marginTop: 8, textAlign: "center" }}>New employer accounts start as "Pending review" until an admin approves them.</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   DRIVER DASHBOARD
--------------------------------------------------------------------- */
function DriverDashboard({ me, setMe, jobs, applications, setApplications, employers, onExit }) {
  const [tab, setTab] = useState("jobs");
  const [filters, setFilters] = useState({ category: "All", location: "All", q: "" });
  const [openJob, setOpenJob] = useState(null);
  const [toast, setToast] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const activeJobs = jobs.filter((j) => j.status === "active");
  const categories = ["All", ...Array.from(new Set(activeJobs.map((j) => j.category)))];
  const locations = ["All", ...Array.from(new Set(activeJobs.map((j) => j.location)))];

  const filtered = activeJobs.filter((j) =>
    (filters.category === "All" || j.category === filters.category) &&
    (filters.location === "All" || j.location === filters.location) &&
    (filters.q === "" || j.title.toLowerCase().includes(filters.q.toLowerCase()) || j.company.toLowerCase().includes(filters.q.toLowerCase()))
  );

  const myApps = applications.filter((a) => a.driverId === me.id);
  const hasApplied = (jobId) => myApps.some((a) => a.jobId === jobId);

  const apply = (job) => {
    if (hasApplied(job.id)) return;
    setApplications((prev) => [...prev, { id: uid("a"), jobId: job.id, driverId: me.id, status: "applied", applied: new Date().toISOString().slice(0, 10) }]);
    flash(`Applied to ${job.title} at ${job.company}`);
    setOpenJob(null);
  };

  const notifications = useMemo(() => {
    const list = [];
    myApps.forEach((a) => {
      const j = jobs.find((jj) => jj.id === a.jobId);
      if (!j) return;
      if (a.status === "shortlisted") list.push(`You were shortlisted for ${j.title} at ${j.company}.`);
      if (a.status === "hired") list.push(`Congratulations — you were hired for ${j.title} at ${j.company}.`);
      if (a.status === "rejected") list.push(`Your application for ${j.title} was not selected this time.`);
    });
    activeJobs.filter((j) => j.license !== me.license).slice(0, 0);
    const matching = activeJobs.filter((j) => j.category === me.license && !hasApplied(j.id)).slice(0, 2);
    matching.forEach((j) => list.push(`New match: ${j.title} at ${j.company} fits your ${me.license} license.`));
    return list;
  }, [myApps, jobs, me]);

  return (
    <div style={{ minHeight: "100vh", background: C.concrete }}>
      <TopStrip roleLabel={`Driver account \u2022 ${me.name}`} onExit={onExit} />
      <NavTabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "jobs", label: "Find jobs", icon: Search },
          { key: "applications", label: "My applications", icon: ClipboardList },
          { key: "profile", label: "Profile", icon: User },
          { key: "notifications", label: "Notifications", icon: Bell },
        ]}
      />

      {toast && (
        <div style={{ position: "fixed", top: 18, right: 18, background: C.asphalt, color: "#fff", padding: "10px 16px", borderRadius: 7, fontSize: 13.5, fontWeight: 600, zIndex: 50, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={C.amber} /> {toast}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
        {tab === "jobs" && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              <Input placeholder="Search job title or company" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} style={{ flex: "2 1 220px" }} />
              <Select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} style={{ flex: "1 1 140px" }}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </Select>
              <Select value={filters.location} onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))} style={{ flex: "1 1 140px" }}>
                {locations.map((l) => <option key={l}>{l}</option>)}
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No jobs match those filters" hint="Try a different category or location." />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filtered.map((j) => (
                  <div key={j.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 18, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 260px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 17 }}>{j.title}</div>
                        {j.category === me.license && <Badge tone="green">Matches your license</Badge>}
                      </div>
                      <div style={{ fontSize: 13.5, color: C.steel, marginBottom: 10 }}>{j.company}</div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: C.steel }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} />{j.location}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Truck size={13} />{j.category}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} />{j.experience}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IndianRupee size={13} />{fmtINR(j.salaryMin)}\u2013{fmtINR(j.salaryMax)}/mo</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                      <Btn variant="outline" size="sm" onClick={() => setOpenJob(j)}>View details</Btn>
                      {hasApplied(j.id) ? <Badge tone="green">Applied</Badge> : <Btn size="sm" onClick={() => apply(j)}>Apply now</Btn>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "applications" && (
          myApps.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No applications yet" hint="Jobs you apply to will show up here with their status." />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {myApps.map((a) => {
                const j = jobs.find((jj) => jj.id === a.jobId);
                if (!j) return null;
                return (
                  <Card key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{j.title}</div>
                      <div style={{ fontSize: 13, color: C.steel }}>{j.company} \u2022 Applied {a.applied}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </Card>
                );
              })}
            </div>
          )
        )}

        {tab === "profile" && <DriverProfileEditor me={me} setMe={setMe} onSave={() => flash("Profile updated")} />}

        {tab === "notifications" && (
          notifications.length === 0 ? (
            <EmptyState icon={Bell} title="You're all caught up" hint="We'll let you know about status changes and new matching jobs here." />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {notifications.map((n, i) => (
                <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.amber}`, borderRadius: 6, padding: "12px 14px", fontSize: 13.5 }}>{n}</div>
              ))}
            </div>
          )
        )}
      </div>

      {openJob && <JobModal job={openJob} onClose={() => setOpenJob(null)} onApply={() => apply(openJob)} applied={hasApplied(openJob.id)} />}
    </div>
  );
}

function DriverProfileEditor({ me, setMe, onSave }) {
  const [form, setForm] = useState(me);
  const [skillInput, setSkillInput] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addSkill = () => {
    if (!skillInput.trim()) return;
    set("skills", [...form.skills, skillInput.trim()]);
    setSkillInput("");
  };
  const removeSkill = (s) => set("skills", form.skills.filter((x) => x !== s));

  return (
    <Card style={{ maxWidth: 640 }}>
      <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, marginBottom: 4 }}>Your profile</div>
      <div style={{ fontSize: 13, color: C.steel, marginBottom: 18 }}>Employers see this when reviewing applications or searching driver profiles.</div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><Field label="Full name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="License category">
            <Select value={form.license} onChange={(e) => set("license", e.target.value)}>
              {LICENSES.map((l) => <option key={l}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ flex: 1 }}><Field label="Years of experience"><Input type="number" value={form.experience} onChange={(e) => set("experience", Number(e.target.value))} /></Field></div>
      </div>

      <Field label="Driving skills">
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="e.g. Night driving" onKeyDown={(e) => e.key === "Enter" && addSkill()} />
          <Btn variant="outline" size="sm" onClick={addSkill} icon={Plus}>Add</Btn>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {form.skills.map((s) => (
            <span key={s} style={{ background: C.concrete, borderRadius: 5, padding: "4px 9px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
              {s} <X size={12} style={{ cursor: "pointer" }} onClick={() => removeSkill(s)} />
            </span>
          ))}
        </div>
      </Field>

      <Field label="Resume / documents">
        <label style={{ border: `1.5px dashed ${C.line}`, borderRadius: 7, padding: "16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: C.concrete }}>
          <Upload size={16} color={C.steel} />
          <div style={{ fontSize: 13, color: C.steel }}>
            {form.resume ? <b style={{ color: C.ink }}>{form.resume}</b> : "Click to upload resume (PDF)"}
          </div>
          <input type="file" style={{ display: "none" }} onChange={(e) => e.target.files[0] && set("resume", e.target.files[0].name)} />
        </label>
      </Field>

      <Btn onClick={() => { setMe(form); onSave(); }}>Save profile</Btn>
    </Card>
  );
}

function JobModal({ job, onClose, onApply, applied }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,26,34,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, maxWidth: 480, width: "100%", padding: 26 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 21 }}>{job.title}</div>
            <div style={{ fontSize: 13.5, color: C.steel, marginTop: 2 }}>{job.company}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={C.steel} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "18px 0" }}>
          {[["Location", job.location], ["License category", job.category], ["Experience", job.experience], ["Working hours", job.hours], ["Salary", `${fmtINR(job.salaryMin)}\u2013${fmtINR(job.salaryMax)}/mo`], ["Posted", job.posted]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: C.steel, fontWeight: 600 }}>{l}</div>
              <div style={{ fontSize: 13.5 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: C.steel, fontWeight: 600, marginBottom: 6 }}>Required documents</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {job.docs.map((d) => <Badge key={d}>{d}</Badge>)}
        </div>

        {applied ? <Btn full variant="outline" disabled>Already applied</Btn> : <Btn full onClick={onApply}>Apply for this job</Btn>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   EMPLOYER DASHBOARD
--------------------------------------------------------------------- */
function EmployerDashboard({ me, setMe, jobs, setJobs, applications, setApplications, drivers, onExit }) {
  const [tab, setTab] = useState("postings");
  const [posting, setPosting] = useState(false);
  const [viewingApplicants, setViewingApplicants] = useState(null);
  const [toast, setToast] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const myJobs = jobs.filter((j) => j.employerId === me.id);

  const addJob = (job) => {
    setJobs((prev) => [{ ...job, id: uid("j"), employerId: me.id, company: me.company, posted: new Date().toISOString().slice(0, 10), status: "active" }, ...prev]);
    setPosting(false);
    flash("Vacancy posted");
  };

  const toggleJobStatus = (id) => setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: j.status === "active" ? "closed" : "active" } : j));

  const updateAppStatus = (appId, status) => {
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
    flash(`Application ${status}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.concrete }}>
      <TopStrip roleLabel={`Employer account \u2022 ${me.company}`} onExit={onExit} />
      <NavTabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "postings", label: "My postings", icon: Briefcase },
          { key: "applicants", label: "Applicants", icon: ClipboardList },
          { key: "search", label: "Find drivers", icon: Search },
          { key: "company", label: "Company profile", icon: Building2 },
        ]}
      />

      {toast && (
        <div style={{ position: "fixed", top: 18, right: 18, background: C.asphalt, color: "#fff", padding: "10px 16px", borderRadius: 7, fontSize: 13.5, fontWeight: 600, zIndex: 50, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={C.amber} /> {toast}
        </div>
      )}

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "24px 24px 60px" }}>
        {me.status === "pending" && (
          <div style={{ background: "#FCEFD8", border: "1px solid #F2D6A0", borderRadius: 7, padding: "11px 15px", fontSize: 13, color: C.amberDark, marginBottom: 18, fontWeight: 600 }}>
            Your company profile is pending admin approval. Postings won't be visible to drivers until approved.
          </div>
        )}

        {tab === "postings" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 19 }}>Your vacancies ({myJobs.length})</div>
              <Btn icon={Plus} onClick={() => setPosting(true)}>Post a job</Btn>
            </div>
            {myJobs.length === 0 ? (
              <EmptyState icon={Briefcase} title="No vacancies posted yet" hint="Post your first driver vacancy to start receiving applications." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {myJobs.map((j) => {
                  const apps = applications.filter((a) => a.jobId === j.id);
                  return (
                    <Card key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{j.title}</div>
                          <StatusBadge status={j.status} />
                        </div>
                        <div style={{ fontSize: 12.5, color: C.steel, marginTop: 3 }}>{j.category} \u2022 {j.location} \u2022 {fmtINR(j.salaryMin)}\u2013{fmtINR(j.salaryMax)}/mo \u2022 {apps.length} applicant{apps.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn size="sm" variant="outline" onClick={() => { setViewingApplicants(j.id); setTab("applicants"); }}>View applicants</Btn>
                        <Btn size="sm" variant={j.status === "active" ? "danger" : "success"} onClick={() => toggleJobStatus(j.id)}>{j.status === "active" ? "Close" : "Reopen"}</Btn>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "applicants" && (
          <ApplicantsPanel myJobs={myJobs} applications={applications} drivers={drivers} focusJobId={viewingApplicants} updateAppStatus={updateAppStatus} />
        )}

        {tab === "search" && <DriverSearchPanel drivers={drivers} />}

        {tab === "company" && <CompanyProfileEditor me={me} setMe={setMe} onSave={() => flash("Company profile updated")} />}
      </div>

      {posting && <JobPostModal onClose={() => setPosting(false)} onSubmit={addJob} />}
    </div>
  );
}

function ApplicantsPanel({ myJobs, applications, drivers, focusJobId, updateAppStatus }) {
  const [jobFilter, setJobFilter] = useState(focusJobId || "All");
  const rows = applications
    .filter((a) => myJobs.some((j) => j.id === a.jobId))
    .filter((a) => jobFilter === "All" || a.jobId === jobFilter);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} style={{ maxWidth: 280 }}>
          <option value="All">All postings</option>
          {myJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No applicants yet" hint="Applicants for your postings will appear here." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((a) => {
            const d = drivers.find((dd) => dd.id === a.driverId);
            const j = myJobs.find((jj) => jj.id === a.jobId);
            if (!d || !j) return null;
            return (
              <Card key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{d.name}</div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div style={{ fontSize: 12.5, color: C.steel, margin: "3px 0 8px" }}>Applied for {j.title} \u2022 {d.license} \u2022 {d.experience} yrs experience \u2022 {d.location}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{d.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                    {(a.status === "shortlisted" || a.status === "hired") && (
                      <div style={{ marginTop: 10, fontSize: 12.5, color: C.ink, display: "flex", gap: 14 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={12} />{d.phone}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={12} />{d.email}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 140 }}>
                    {a.status === "applied" && (
                      <>
                        <Btn size="sm" variant="success" icon={Check} onClick={() => updateAppStatus(a.id, "shortlisted")}>Shortlist</Btn>
                        <Btn size="sm" variant="danger" icon={X} onClick={() => updateAppStatus(a.id, "rejected")}>Reject</Btn>
                      </>
                    )}
                    {a.status === "shortlisted" && (
                      <Btn size="sm" variant="dark" onClick={() => updateAppStatus(a.id, "hired")}>Mark as hired</Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DriverSearchPanel({ drivers }) {
  const [q, setQ] = useState("");
  const [license, setLicense] = useState("All");
  const list = drivers.filter((d) => d.status === "active" &&
    (license === "All" || d.license === license) &&
    (q === "" || d.name.toLowerCase().includes(q.toLowerCase()) || d.location.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Input placeholder="Search by name or location" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "2 1 220px" }} />
        <Select value={license} onChange={(e) => setLicense(e.target.value)} style={{ flex: "1 1 160px" }}>
          <option>All</option>
          {LICENSES.map((l) => <option key={l}>{l}</option>)}
        </Select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {list.map((d) => (
          <Card key={d.id}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{d.name}</div>
            <div style={{ fontSize: 12.5, color: C.steel, margin: "3px 0 10px" }}>{d.location} \u2022 {d.experience} yrs experience</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <Badge tone="amber">{d.license}</Badge>
              {d.resume && <Badge tone="green">Resume on file</Badge>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{d.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          </Card>
        ))}
      </div>
      {list.length === 0 && <EmptyState icon={Users} title="No drivers match" hint="Try a different license category or search term." />}
    </div>
  );
}

function CompanyProfileEditor({ me, setMe, onSave }) {
  const [form, setForm] = useState(me);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Card style={{ maxWidth: 560 }}>
      <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, marginBottom: 18 }}>Company profile</div>
      <Field label="Company name"><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
      <Field label="Contact person"><Input value={form.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><Field label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Sector"><Input value={form.sector} onChange={(e) => set("sector", e.target.value)} /></Field></div>
      </div>
      <Btn onClick={() => { setMe(form); onSave(); }}>Save changes</Btn>
    </Card>
  );
}

function JobPostModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: "", category: "LMV", location: "", experience: "", salaryMin: "", salaryMax: "", hours: "", docs: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.title || !form.location) return;
    onSubmit({
      title: form.title, category: form.category, location: form.location, experience: form.experience,
      salaryMin: Number(form.salaryMin) || 0, salaryMax: Number(form.salaryMax) || 0, hours: form.hours,
      docs: form.docs.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,26,34,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, maxWidth: 520, width: "100%", padding: 26, maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 20 }}>Post a driver vacancy</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={C.steel} /></button>
        </div>
        <Field label="Job title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Heavy Truck Driver" /></Field>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="License category required">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>{LICENSES.map((l) => <option key={l}>{l}</option>)}</Select>
            </Field>
          </div>
          <div style={{ flex: 1 }}><Field label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City" /></Field></div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Field label="Experience required"><Input value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 2+ yrs" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Working hours"><Input value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="e.g. Full-time, day shift" /></Field></div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Field label="Salary min (\u20b9/mo)"><Input type="number" value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Salary max (\u20b9/mo)"><Input type="number" value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} /></Field></div>
        </div>
        <Field label="Required documents (comma separated)"><Input value={form.docs} onChange={(e) => set("docs", e.target.value)} placeholder="e.g. HMV License, Aadhar Card" /></Field>
        <Btn full onClick={submit}>Publish vacancy</Btn>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   ADMIN DASHBOARD
--------------------------------------------------------------------- */
function AdminDashboard({ drivers, setDrivers, employers, setEmployers, jobs, setJobs, applications, onExit }) {
  const [tab, setTab] = useState("dashboard");

  const toggleDriver = (id) => setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, status: d.status === "active" ? "blocked" : "active" } : d));
  const toggleEmployer = (id) => setEmployers((prev) => prev.map((e) => e.id === id ? { ...e, status: e.status === "active" ? "blocked" : "active" } : e));
  const approveEmployer = (id) => setEmployers((prev) => prev.map((e) => e.id === id ? { ...e, status: "active" } : e));
  const toggleJob = (id) => setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: j.status === "active" ? "closed" : "active" } : j));

  const statusCounts = applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const pieData = Object.entries(statusCounts).map(([k, v]) => ({ name: k, value: v }));
  const pieColors = { applied: C.steel, shortlisted: C.amber, rejected: C.red, hired: C.green };

  const jobsByCategory = LICENSES.map((l) => ({ category: l, jobs: jobs.filter((j) => j.category === l).length }));

  return (
    <div style={{ minHeight: "100vh", background: C.concrete }}>
      <TopStrip roleLabel="Admin panel" onExit={onExit} />
      <NavTabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "dashboard", label: "Dashboard", icon: BarChart3 },
          { key: "drivers", label: "Drivers", icon: User },
          { key: "employers", label: "Employers", icon: Building2 },
          { key: "jobs", label: "Job postings", icon: Briefcase },
        ]}
      />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 24px 60px" }}>
        {tab === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                ["Drivers", drivers.length, User, C.amberDark],
                ["Employers", employers.length, Building2, C.green],
                ["Job postings", jobs.length, Briefcase, C.steel],
                ["Applications", applications.length, ClipboardList, C.asphalt],
              ].map(([label, val, Icon, color]) => (
                <Card key={label}>
                  <Icon size={17} color={color} />
                  <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 26, marginTop: 8 }}>{val}</div>
                  <div style={{ fontSize: 12.5, color: C.steel }}>{label}</div>
                </Card>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Open vacancies by license category</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobsByCategory}>
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="jobs" fill={C.amber} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Application status</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                        {pieData.map((d, i) => <Cell key={i} fill={pieColors[d.name] || C.steel} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        )}

        {tab === "drivers" && (
          <div style={{ display: "grid", gap: 10 }}>
            {drivers.map((d) => (
              <Card key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{d.name}</div>
                    <StatusBadge status={d.status} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.steel, marginTop: 3 }}>{d.license} \u2022 {d.location} \u2022 {d.experience} yrs \u2022 {d.phone}</div>
                </div>
                <Btn size="sm" variant={d.status === "active" ? "danger" : "success"} icon={d.status === "active" ? Ban : Check} onClick={() => toggleDriver(d.id)}>
                  {d.status === "active" ? "Block" : "Unblock"}
                </Btn>
              </Card>
            ))}
          </div>
        )}

        {tab === "employers" && (
          <div style={{ display: "grid", gap: 10 }}>
            {employers.map((e) => (
              <Card key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{e.company}</div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.steel, marginTop: 3 }}>{e.sector} \u2022 {e.location} \u2022 {e.contact} \u2022 {e.phone}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {e.status === "pending" && <Btn size="sm" variant="success" icon={Check} onClick={() => approveEmployer(e.id)}>Approve</Btn>}
                  {e.status !== "pending" && (
                    <Btn size="sm" variant={e.status === "active" ? "danger" : "success"} icon={e.status === "active" ? Ban : Check} onClick={() => toggleEmployer(e.id)}>
                      {e.status === "active" ? "Block" : "Unblock"}
                    </Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "jobs" && (
          <div style={{ display: "grid", gap: 10 }}>
            {jobs.map((j) => (
              <Card key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{j.title}</div>
                    <StatusBadge status={j.status} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.steel, marginTop: 3 }}>{j.company} \u2022 {j.category} \u2022 {j.location}</div>
                </div>
                <Btn size="sm" variant={j.status === "active" ? "danger" : "success"} onClick={() => toggleJob(j.id)}>
                  {j.status === "active" ? "Remove listing" : "Restore listing"}
                </Btn>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   ROOT APP
--------------------------------------------------------------------- */
export default function App() {
  const [screen, setScreen] = useState("landing"); // landing, driver-auth, employer-auth, driver, employer, admin
  const [jobs, setJobs] = useState(seedJobs);
  const [drivers, setDrivers] = useState(seedDrivers);
  const [employers, setEmployers] = useState(seedEmployers);
  const [applications, setApplications] = useState(seedApplications);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [currentEmployer, setCurrentEmployer] = useState(null);

  const goLanding = () => { setScreen("landing"); setCurrentDriver(null); setCurrentEmployer(null); };

  const setMeDriver = (updated) => { setCurrentDriver(updated); setDrivers((prev) => prev.map((d) => d.id === updated.id ? updated : d)); };
  const setMeEmployer = (updated) => { setCurrentEmployer(updated); setEmployers((prev) => prev.map((e) => e.id === updated.id ? updated : e)); };

  const registerDriver = (form) => {
    const rec = { ...form, id: uid("d"), status: "active" };
    setDrivers((prev) => [...prev, rec]);
    setCurrentDriver(rec);
    setScreen("driver");
  };
  const registerEmployer = (form) => {
    const rec = { ...form, id: uid("e"), status: "pending" };
    setEmployers((prev) => [...prev, rec]);
    setCurrentEmployer(rec);
    setScreen("employer");
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: C.ink, WebkitFontSmoothing: "antialiased" }}>
      <style>{`${FONT_IMPORT} * { box-sizing: border-box; } body { margin:0; } ::selection { background: ${C.amber}55; }`}</style>

      {screen === "landing" && <Landing onPick={setScreen} />}

      {screen === "driver-auth" && (
        <AuthScreen
          role="driver" drivers={drivers} employers={employers}
          onLogin={(id) => { setCurrentDriver(drivers.find((d) => d.id === id)); setScreen("driver"); }}
          onRegisterDriver={registerDriver}
          onBack={goLanding}
        />
      )}

      {screen === "employer-auth" && (
        <AuthScreen
          role="employer" drivers={drivers} employers={employers}
          onLogin={(id) => { setCurrentEmployer(employers.find((e) => e.id === id)); setScreen("employer"); }}
          onRegisterEmployer={registerEmployer}
          onBack={goLanding}
        />
      )}

      {screen === "driver" && currentDriver && (
        <DriverDashboard me={currentDriver} setMe={setMeDriver} jobs={jobs} applications={applications} setApplications={setApplications} employers={employers} onExit={goLanding} />
      )}

      {screen === "employer" && currentEmployer && (
        <EmployerDashboard me={currentEmployer} setMe={setMeEmployer} jobs={jobs} setJobs={setJobs} applications={applications} setApplications={setApplications} drivers={drivers} onExit={goLanding} />
      )}

      {screen === "admin" && (
        <AdminDashboard drivers={drivers} setDrivers={setDrivers} employers={employers} setEmployers={setEmployers} jobs={jobs} setJobs={setJobs} applications={applications} onExit={goLanding} />
      )}
    </div>
  );
}
