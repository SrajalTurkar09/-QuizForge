
// QuizForge — Complete Frontend Dashboard
// Full production UI with: Home, Test Generator, Live Test, Results, Analytics Dashboard
// Uses Claude API directly for demo — swap to backend in production

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// ── DESIGN TOKENS ─────────────────────────────────────────────
const T = {
  bg: "#07070E",
  bg2: "#0D0D1C",
  bg3: "#13132A",
  card: "#0F0F22",
  cardHover: "#141430",
  border: "rgba(120,120,255,0.1)",
  border2: "rgba(120,120,255,0.2)",
  accent: "#7C6FFF",
  accent2: "#A99FFF",
  accentGlow: "rgba(124,111,255,0.25)",
  cyan: "#00D4FF",
  green: "#00E096",
  amber: "#FFB547",
  red: "#FF5C5C",
  pink: "#FF6EE7",
  text: "#EEEEFF",
  text2: "#8888BB",
  text3: "#444466",
  mono: "'JetBrains Mono', 'Courier New', monospace",
  sans: "'DM Sans', system-ui, sans-serif",
};

// ── GLOBAL STYLES ─────────────────────────────────────────────
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(120,120,255,0.2);border-radius:2px}
body{background:${T.bg};color:${T.text};font-family:${T.sans};line-height:1.6}
input,select,textarea,button{font-family:${T.sans}}
a{color:inherit;text-decoration:none}

/* Animations */
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px ${T.accentGlow}}50%{box-shadow:0 0 40px ${T.accentGlow}}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes countUp{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes barFill{from{width:0}to{width:var(--w)}}

.anim-fade-up{animation:fadeUp 0.35s ease both}
.anim-fade{animation:fadeIn 0.3s ease both}

/* Skeleton loader */
.skeleton{
  background:linear-gradient(90deg,${T.bg3} 25%,${T.card} 50%,${T.bg3} 75%);
  background-size:200% 100%;
  animation:shimmer 1.5s infinite;
  border-radius:6px;
}

/* Chart bars */
.chart-bar{
  background:linear-gradient(to top,${T.accent},${T.cyan});
  border-radius:4px 4px 0 0;
  transition:height 0.6s cubic-bezier(.22,.68,0,1.2);
}
.chart-bar:hover{filter:brightness(1.2)}

/* Tabs */
.tab-active{
  background:linear-gradient(135deg,${T.accent}22,${T.cyan}11);
  border-color:${T.accent};
  color:${T.accent2};
}
`;

// ── HELPERS ───────────────────────────────────────────────────
const fmt = (n, dec = 0) => typeof n === "number" ? n.toFixed(dec) : "0";
const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const grade = p => p>=90?"A+":p>=80?"A":p>=70?"B":p>=60?"C":p>=50?"D":"F";
const gradeColor = g => g.startsWith("A")?T.green:g.startsWith("B")?T.cyan:g.startsWith("C")?T.amber:T.red;
const diffColor = d => d==="Easy"?T.green:d==="Hard"?T.red:T.amber;

// Mock history data
const MOCK_HISTORY = [
  {id:1,topic:"Newton's Laws of Motion",exam:"JEE",score:88,total:25,date:"Mar 12",time:1340,grade:"A"},
  {id:2,topic:"Integration Techniques",exam:"JEE",score:76,total:20,date:"Mar 11",time:1020,grade:"B"},
  {id:3,topic:"Organic Chemistry",exam:"NEET",score:64,total:30,date:"Mar 10",time:1680,grade:"C"},
  {id:4,topic:"Indian Polity",exam:"UPSC",score:92,total:40,date:"Mar 09",time:2100,grade:"A+"},
  {id:5,topic:"Data Structures",exam:"DSA",score:84,total:15,date:"Mar 08",time:840,grade:"A"},
];

const MOCK_MASTERY = [
  {topic:"Mathematics",pct:84,color:T.accent},
  {topic:"Physics",pct:71,color:T.cyan},
  {topic:"Chemistry",pct:62,color:T.green},
  {topic:"History",pct:58,color:T.amber},
  {topic:"Current Affairs",pct:43,color:T.pink},
  {topic:"Computer Science",pct:79,color:"#A78BFA"},
];

const MOCK_TREND = [
  {d:"Mar 8",s:72},{d:"Mar 9",s:85},{d:"Mar 10",s:61},{d:"Mar 11",s:78},
  {d:"Mar 12",s:82},{d:"Mar 13",s:88},{d:"Mar 14",s:76},
];

const LEADERBOARD = [
  {rank:1,name:"Arjun Sharma",xp:14200,streak:22,badge:"🏆",color:"#FFB547"},
  {rank:2,name:"Priya Nair",xp:12800,streak:18,badge:"🥈",color:T.text2},
  {rank:3,name:"Rohan Mehta",xp:11500,streak:14,badge:"🥉",color:"#CD7F32"},
  {rank:4,name:"You",xp:9240,streak:7,badge:"",color:T.accent,isMe:true},
  {rank:5,name:"Sneha Gupta",xp:8900,streak:5,badge:"",color:T.text2},
];

const EXAMS = [
  {id:"jee",name:"JEE",icon:"⚛️",color:"#60A5FA"},
  {id:"neet",name:"NEET",icon:"🧬",color:"#34D399"},
  {id:"upsc",name:"UPSC",icon:"🏛️",color:"#A78BFA"},
  {id:"gate",name:"GATE",icon:"⚙️",color:"#FCD34D"},
  {id:"gre",name:"GRE",icon:"📚",color:"#F87171"},
  {id:"dsa",name:"DSA",icon:"💻",color:"#2DD4BF"},
  {id:"sat",name:"SAT",icon:"🎓",color:"#FB923C"},
  {id:"custom",name:"Custom",icon:"✨",color:"#E879F9"},
];

// ── COMPONENTS ────────────────────────────────────────────────

function Card({ children, style, onClick, hover = true }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && onClick ? T.cardHover : T.card,
        border: `1px solid ${hovered ? T.border2 : T.border}`,
        borderRadius: 16,
        padding: 20,
        transition: "all 0.2s",
        cursor: onClick ? "pointer" : "default",
        transform: hovered && onClick ? "translateY(-2px)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Badge({ text, color = T.accent }) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 8px", borderRadius:4,
      fontSize:10, fontWeight:600, letterSpacing:"0.6px", textTransform:"uppercase",
      background:`${color}22`, color, border:`1px solid ${color}44`,
    }}>{text}</span>
  );
}

function Spinner({ size = 32, color = T.accent }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2.5px solid ${color}33`, borderTopColor: color,
      animation: "spin 0.7s linear infinite",
    }}/>
  );
}

function ScoreArc({ pct, size = 110 }) {
  const r = 44; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const col = pct >= 75 ? T.green : pct >= 50 ? T.amber : T.red;
  return (
    <div style={{ position:"relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={`${col}22`} strokeWidth="7"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.8s ease" }}/>
      </svg>
      <div style={{
        position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center"
      }}>
        <span style={{ fontSize: 22, fontWeight:700, fontFamily:T.mono, color:col }}>{pct}%</span>
        <span style={{ fontSize: 9, color: T.text3, letterSpacing:"0.5px", textTransform:"uppercase" }}>Score</span>
      </div>
    </div>
  );
}

function MiniBar({ value, color = T.accent, height = 6 }) {
  return (
    <div style={{ width:"100%", height, background:T.bg3, borderRadius:height/2, overflow:"hidden" }}>
      <div style={{
        height:"100%", borderRadius:height/2, background:color,
        width:`${value}%`, transition:"width 0.6s ease",
      }}/>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, trend }) {
  return (
    <Card style={{ padding: "18px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:11, color:T.text3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
            {label}
          </div>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:T.mono, color: color || T.text, lineHeight:1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize:12, color:T.text3, marginTop:4 }}>{sub}</div>}
          {trend && <div style={{ fontSize:12, color: trend > 0 ? T.green : T.red, marginTop:4 }}>
            {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last week
          </div>}
        </div>
        {icon && <div style={{ fontSize:28, opacity:0.7 }}>{icon}</div>}
      </div>
    </Card>
  );
}

function TrendChart({ data, height = 140 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.s), 0);
  const min = Math.min(...data.map(d => d.s), 100) * 0.9;
  const norm = v => ((v - min) / (max - min + 1)) * 0.85;

  const w = 440, h = height;
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * (w - 40) + 20,
    h - 20 - norm(d.s) * (h - 40),
  ]);
  const path = `M${pts.map(p => p.join(",")).join(" L")}`;
  const fill = `M${pts[0][0]},${h-10} L${pts.map(p => p.join(",")).join(" L")} L${pts[pts.length-1][0]},${h-10} Z`;

  return (
    <div style={{ width:"100%", overflowX:"auto" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width:"100%", height }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.accent} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={T.accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[25, 50, 75].map(y => (
          <line key={y} x1="20" y1={h - 20 - norm(y) * (h - 40)} x2={w - 20} y2={h - 20 - norm(y) * (h - 40)}
            stroke={T.border} strokeWidth="1" strokeDasharray="4 4"/>
        ))}
        {/* Area fill */}
        <path d={fill} fill="url(#chartGrad)"/>
        {/* Line */}
        <path d={path} fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={T.accent} stroke={T.bg} strokeWidth="2"/>
        ))}
        {/* Labels */}
        {data.map((d, i) => (
          <text key={i} x={pts[i][0]} y={h - 3} textAnchor="middle" fontSize="10" fill={T.text3}>{d.d}</text>
        ))}
      </svg>
    </div>
  );
}

// ── QUESTION CARD (test engine) ────────────────────────────────

function QuestionCard({ q, ans, onAnswer, revealed, onReveal, qNum, total }) {
  const [fillVal, setFillVal] = useState(ans || "");

  const isCorrect = (letter) => {
    if (Array.isArray(q.correct)) return q.correct.includes(letter);
    return q.correct === letter;
  };
  const isSelected = (letter) => {
    if (Array.isArray(ans)) return ans.includes(letter);
    return ans === letter;
  };

  const handleMulti = (letter) => {
    if (revealed) return;
    const prev = Array.isArray(ans) ? ans : [];
    const next = prev.includes(letter) ? prev.filter(a => a !== letter) : [...prev, letter];
    onAnswer(q.id, next);
  };

  const optStyle = (letter) => {
    const base = {
      display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px",
      background:T.bg3, border:`1px solid ${T.border}`, borderRadius:10,
      cursor: revealed ? "default" : "pointer",
      transition:"all 0.15s",
    };
    if (revealed) {
      if (isCorrect(letter)) return { ...base, background:`${T.green}15`, borderColor:T.green };
      if (isSelected(letter) && !isCorrect(letter)) return { ...base, background:`${T.red}10`, borderColor:T.red };
    } else if (isSelected(letter)) {
      return { ...base, background:`${T.accent}15`, borderColor:T.accent };
    }
    return base;
  };

  return (
    <div style={{ animation:"fadeUp 0.25s ease" }}>
      {/* Q Meta */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:11, color:T.text3, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>
          Question {qNum} of {total}
        </span>
        <Badge text={q.difficulty || "Medium"} color={diffColor(q.difficulty)}/>
        <Badge text={q.type} color={T.accent}/>
      </div>

      {/* Question text */}
      <div style={{ fontSize:16, lineHeight:1.75, marginBottom:20, fontWeight:400 }}>{q.question}</div>

      {/* Code block */}
      {q.code && (
        <pre style={{
          background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10,
          padding:"14px 16px", fontFamily:T.mono, fontSize:13, lineHeight:1.6,
          color:T.accent2, overflowX:"auto", marginBottom:20,
        }}>{q.code}</pre>
      )}

      {/* Options */}
      {(q.type === "MCQ" || q.type === "true-false" || q.type === "multi-select") && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(q.options || []).map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const sel = isSelected(letter);
            const cor = revealed && isCorrect(letter);
            return (
              <div key={i} style={optStyle(letter)}
                onClick={() => {
                  if (revealed) return;
                  if (q.type === "multi-select") handleMulti(letter);
                  else onAnswer(q.id, letter);
                }}>
                <div style={{
                  width:24, height:24, flexShrink:0, borderRadius:6,
                  background: cor ? T.green : sel ? T.accent : T.border2,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700, fontFamily:T.mono, color:"#fff",
                }}>{letter}</div>
                <div style={{ fontSize:14, lineHeight:1.5, paddingTop:3 }}>{opt}</div>
              </div>
            );
          })}
          {q.type === "multi-select" && !revealed && (
            <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>Select all that apply</div>
          )}
        </div>
      )}

      {q.type === "fill-blank" && (
        <input
          value={fillVal}
          onChange={e => { setFillVal(e.target.value); onAnswer(q.id, e.target.value); }}
          disabled={revealed}
          placeholder="Type your answer..."
          style={{
            width:"100%", padding:"12px 16px", background:T.bg2,
            border:`1px solid ${revealed ? T.border : T.accent}`,
            borderRadius:10, color:T.text, fontSize:14, outline:"none",
          }}
        />
      )}

      {/* Explanation */}
      {revealed && q.explanation && (
        <div style={{
          marginTop:16, padding:"14px 16px",
          background:`${T.accent}08`, border:`1px solid ${T.accent}33`,
          borderRadius:10, animation:"fadeIn 0.3s ease",
        }}>
          <div style={{ fontSize:10, fontWeight:600, color:T.accent2, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
            Explanation
          </div>
          <div style={{ fontSize:13, lineHeight:1.7, color:T.text2 }}>{q.explanation}</div>
        </div>
      )}

      {/* Check button */}
      {!revealed && (
        <button
          onClick={onReveal}
          style={{
            marginTop:16, padding:"8px 18px", background:"transparent",
            border:`1px solid ${T.border2}`, borderRadius:8, color:T.text2,
            fontSize:13, cursor:"pointer", transition:"all 0.15s",
          }}
          onMouseEnter={e => { e.target.style.borderColor = T.accent; e.target.style.color = T.accent2; }}
          onMouseLeave={e => { e.target.style.borderColor = T.border2; e.target.style.color = T.text2; }}
        >
          Check Answer
        </button>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("home"); // home|generate|test|results|dashboard
  const [selectedExam, setSelectedExam] = useState(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Mixed");
  const [qCount, setQCount] = useState(10);
  const [qTypes, setQTypes] = useState(["MCQ"]);
  const [negMark, setNegMark] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [revealed, setRevealed] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testMeta, setTestMeta] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [dashTab, setDashTab] = useState("overview");

  const timerRef = useRef(null);

  const showToast = useCallback((msg, color = T.accent2) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── GENERATE TEST ─────────────────────────────────────────

  const handleGenerate = async () => {
    if (!selectedExam) { showToast("Select an exam type first", T.amber); return; }
    const examName = EXAMS.find(e => e.id === selectedExam)?.name || "General";
    const topicStr = topic || examName;

    setLoading(true);
    setLoadStep(0);

    const steps = ["Searching internet knowledge...", "Extracting content...", "Building question set...", "Adding explanations..."];
    for (let i = 0; i < steps.length; i++) {
      setLoadStep(i);
      await new Promise(r => setTimeout(r, 500));
    }

    try {
      const typeStr = qTypes.join(", ");
      const diffStr = difficulty === "Mixed" ? "a mix of Easy (30%), Medium (45%), Hard (25%)" : difficulty;

      const prompt = `Generate exactly ${qCount} exam questions about: "${topicStr}"
Exam: ${examName}
Difficulty: ${diffStr}
Types: ${typeStr}

RULES:
- Return ONLY a valid JSON array, starting with [
- Each question: {id,type,difficulty,question,code,options,correct,explanation,topic}
- MCQ: options=4 strings, correct="A"/"B"/"C"/"D"
- multi-select: options=4-5 strings, correct=["A","C"] array
- true-false: options=["True","False"], correct="True" or "False"  
- fill-blank: options=null, question has ___ blank, correct=answer string
- explanation: 2-3 sentences educational, explains why correct and why others wrong
- Make questions test real understanding, not just recall
- For coding topics, add code snippets in "code" field
- Vary subtopics to cover breadth of "${topicStr}"

Start with [ immediately:`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 8000,
          system: "You are an expert exam question generator. Return ONLY valid JSON arrays. No markdown, no explanation, no preamble.",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const raw = data.content.map(b => b.text || "").join("");
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      const qs = JSON.parse(cleaned.slice(start, end + 1));

      const final = qs.filter(q => q.question && q.explanation).map((q, i) => ({
        ...q,
        id: `q${i + 1}`,
        options: q.options || (q.type === "true-false" ? ["True", "False"] : null),
      }));

      if (final.length === 0) throw new Error("No valid questions generated");

      setQuestions(final);
      setCurrentQ(0);
      setAnswers({});
      setFlagged(new Set());
      setRevealed({});
      setTestMeta({ topic: topicStr, exam: examName, count: final.length, startedAt: Date.now() });

      const totalSecs = final.length * 90;
      setTimeLeft(totalSecs);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
      }, 1000);

      setPage("test");
    } catch (e) {
      showToast(`Generation failed: ${e.message}`, T.red);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qId, ans) => { setAnswers(p => ({ ...p, [qId]: ans })); };
  const toggleFlag = (qId) => setFlagged(p => { const n = new Set(p); n.has(qId) ? n.delete(qId) : n.add(qId); return n; });
  const handleReveal = (qId) => setRevealed(p => ({ ...p, [qId]: true }));

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const elapsed = testMeta ? Math.round((Date.now() - testMeta.startedAt) / 1000) : 0;
    let correct = 0, wrong = 0, skipped = 0;

    const review = questions.map(q => {
      const ans = answers[q.id];
      let isCorrect = false;
      if (!ans) { skipped++; }
      else {
        if (q.type === "multi-select") {
          const ca = Array.isArray(q.correct) ? [...q.correct].sort() : [q.correct];
          const ua = Array.isArray(ans) ? [...ans].sort() : [ans];
          isCorrect = JSON.stringify(ca) === JSON.stringify(ua);
        } else if (q.type === "fill-blank") {
          isCorrect = String(ans).trim().toLowerCase() === String(q.correct).trim().toLowerCase();
        } else {
          isCorrect = ans === q.correct;
        }
        isCorrect ? correct++ : wrong++;
      }
      return { ...q, userAnswer: ans, isCorrect };
    });

    const pct = Math.round((correct / questions.length) * 100);
    const g = grade(pct);
    const res = { correct, wrong, skipped, pct, elapsed, grade: g, review, topic: testMeta?.topic, exam: testMeta?.exam };
    setResults(res);
    setHistory(h => [{
      id: Date.now(), topic: testMeta?.topic, exam: testMeta?.exam,
      score: pct, total: questions.length,
      date: new Date().toLocaleDateString("en", { month:"short", day:"numeric" }),
      time: elapsed, grade: g,
    }, ...h].slice(0, 20));
    setPage("results");
  };

  // ── PAGES ──────────────────────────────────────────────────

  const renderHome = () => (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      {/* Hero */}
      <div style={{ textAlign:"center", marginBottom:40, animation:"fadeUp 0.4s ease" }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"4px 14px", borderRadius:20, marginBottom:16,
          background:`${T.accent}18`, border:`1px solid ${T.accent}44`,
          fontSize:11, fontWeight:600, color:T.accent2, textTransform:"uppercase", letterSpacing:"0.8px",
        }}>⚡ AI-Powered · Internet-Sourced · Real-time</div>
        <h1 style={{ fontSize:48, fontWeight:700, letterSpacing:-2, lineHeight:1.05, marginBottom:14 }}>
          Generate Any Exam,<br/>
          <span style={{ background:`linear-gradient(135deg, ${T.accent}, ${T.cyan})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            For Any Subject
          </span>
        </h1>
        <p style={{ fontSize:16, color:T.text2, maxWidth:520, margin:"0 auto 28px", lineHeight:1.7 }}>
          AI fetches real knowledge from the internet, processes it, and generates exam-quality questions — no pre-built database needed.
        </p>

        <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap", marginBottom:36 }}>
          {[["1000+","Questions per test"],["8","Exam types"],["6","Question formats"],["Real-time","Generation"]].map(([v,l]) => (
            <div key={l} style={{
              display:"flex", alignItems:"center", gap:6, padding:"6px 14px",
              background:T.card, border:`1px solid ${T.border}`, borderRadius:20,
              fontSize:12, color:T.text2,
            }}><b style={{ color:T.text }}>{v}</b>{l}</div>
          ))}
        </div>
      </div>

      {/* Exam selector */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:14 }}>
          Select Exam Type
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
          {EXAMS.map(e => (
            <div key={e.id}
              onClick={() => setSelectedExam(e.id)}
              style={{
                background: selectedExam === e.id ? `${e.color}18` : T.card,
                border: `1px solid ${selectedExam === e.id ? e.color : T.border}`,
                borderRadius:12, padding:"16px 14px", cursor:"pointer",
                transition:"all 0.2s",
              }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{e.icon}</div>
              <div style={{ fontSize:14, fontWeight:600, color: selectedExam === e.id ? e.color : T.text }}>{e.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Config */}
      <Card style={{ marginBottom:20, padding:24 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
          {/* Topic */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              Topic / Subject
            </label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder={selectedExam ? `e.g. ${EXAMS.find(e=>e.id===selectedExam)?.name} specific...` : "Enter topic..."}
              style={{
                width:"100%", padding:"9px 12px", background:T.bg3,
                border:`1px solid ${T.border}`, borderRadius:8, color:T.text, fontSize:13, outline:"none",
              }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              Difficulty
            </label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["Easy","Medium","Hard","Mixed"].map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  style={{
                    padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer",
                    border:`1px solid ${difficulty===d ? diffColor(d) : T.border}`,
                    background: difficulty===d ? `${diffColor(d)}15` : "transparent",
                    color: difficulty===d ? diffColor(d) : T.text2, transition:"all 0.15s",
                  }}>{d}</button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              Questions
            </label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[10,25,50].map(c => (
                <button key={c} onClick={() => setQCount(c)}
                  style={{
                    padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer",
                    border:`1px solid ${qCount===c ? T.accent : T.border}`,
                    background: qCount===c ? `${T.accent}15` : "transparent",
                    color: qCount===c ? T.accent2 : T.text2, transition:"all 0.15s",
                  }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Types */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              Question Types
            </label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["MCQ","multi-select","true-false","fill-blank"].map(t => {
                const label = t === "multi-select" ? "Multi" : t === "true-false" ? "T/F" : t === "fill-blank" ? "Fill" : "MCQ";
                const on = qTypes.includes(t);
                return (
                  <button key={t} onClick={() => setQTypes(p => on ? p.filter(x=>x!==t) : [...p,t])}
                    style={{
                      padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer",
                      border:`1px solid ${on ? T.cyan : T.border}`,
                      background: on ? `${T.cyan}15` : "transparent",
                      color: on ? T.cyan : T.text2, transition:"all 0.15s",
                    }}>{label}</button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              Options
            </label>
            <button onClick={() => setNegMark(p => !p)}
              style={{
                padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer",
                border:`1px solid ${negMark ? T.red : T.border}`,
                background: negMark ? `${T.red}12` : "transparent",
                color: negMark ? T.red : T.text2, transition:"all 0.15s",
              }}>
              {negMark ? "✓" : ""} Negative Marking
            </button>
          </div>
        </div>
      </Card>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width:"100%", padding:16, borderRadius:12, border:"none", cursor: loading ? "not-allowed" : "pointer",
          background: loading ? T.bg3 : `linear-gradient(135deg, ${T.accent}, ${T.cyan})`,
          color:"#fff", fontSize:15, fontWeight:600, letterSpacing:"-0.2px",
          transition:"all 0.2s", opacity: loading ? 0.5 : 1,
          boxShadow: loading ? "none" : `0 8px 32px ${T.accentGlow}`,
        }}>
        {loading ? (
          <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <Spinner size={18} color="#fff"/>
            {["Searching...", "Extracting...", "Generating...", "Finalizing..."][loadStep] || "Generating..."}
          </span>
        ) : `⚡ Generate ${qCount} Questions with AI`}
      </button>
    </div>
  );

  const renderTest = () => {
    if (!questions.length) return null;
    const q = questions[currentQ];
    const answeredCount = Object.keys(answers).length;
    const timerWarning = timeLeft < 120;
    const timerDanger = timeLeft < 60;

    return (
      <div style={{ display:"flex", gap:20, maxWidth:1100, margin:"0 auto", padding:"24px 20px" }}>
        {/* Main */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Header */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
            padding:"14px 20px", marginBottom:14,
          }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600 }}>{testMeta?.topic}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{testMeta?.exam} · {questions.length} Questions</div>
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{
                display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
                background:T.bg3, border:`1px solid ${timerDanger ? T.red : timerWarning ? T.amber : T.border}`,
                borderRadius:8, fontFamily:T.mono, fontSize:18, fontWeight:600,
                color: timerDanger ? T.red : timerWarning ? T.amber : T.text,
                animation: timerDanger ? "pulse 1s ease-in-out infinite" : "none",
              }}>⏱ {fmtTime(timeLeft)}</div>
              <button onClick={() => { if (confirm("Submit test?")) handleSubmit(); }}
                style={{
                  padding:"8px 16px", background:`${T.red}18`, border:`1px solid ${T.red}44`,
                  borderRadius:8, color:T.red, fontSize:13, cursor:"pointer",
                }}>Submit</button>
            </div>
          </div>

          {/* Progress */}
          <div style={{ height:3, background:T.border, borderRadius:2, marginBottom:18, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:2,
              background:`linear-gradient(90deg, ${T.accent}, ${T.cyan})`,
              width:`${((currentQ + 1) / questions.length) * 100}%`, transition:"width 0.3s",
            }}/>
          </div>

          {/* Question */}
          <Card style={{ marginBottom:14 }}>
            <QuestionCard
              q={q} ans={answers[q.id]}
              onAnswer={handleAnswer} revealed={!!revealed[q.id]}
              onReveal={() => handleReveal(q.id)}
              qNum={currentQ + 1} total={questions.length}
            />
          </Card>

          {/* Nav */}
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <button onClick={() => toggleFlag(q.id)}
              style={{
                padding:"8px 16px", background:"transparent",
                border:`1px solid ${flagged.has(q.id) ? T.amber : T.border}`,
                borderRadius:8, color: flagged.has(q.id) ? T.amber : T.text2, fontSize:13, cursor:"pointer",
              }}>{flagged.has(q.id) ? "🚩 Flagged" : "⚑ Flag"}</button>
            <div style={{ display:"flex", gap:8 }}>
              <button disabled={currentQ === 0} onClick={() => setCurrentQ(c => c - 1)}
                style={{
                  padding:"8px 16px", background:"transparent",
                  border:`1px solid ${T.border}`, borderRadius:8,
                  color: currentQ === 0 ? T.text3 : T.text2, fontSize:13, cursor: currentQ === 0 ? "not-allowed" : "pointer",
                }}>← Prev</button>
              {currentQ < questions.length - 1
                ? <button onClick={() => setCurrentQ(c => c + 1)}
                    style={{ padding:"8px 20px", background:T.accent, border:"none", borderRadius:8, color:"#fff", fontSize:13, cursor:"pointer" }}>
                    Next →
                  </button>
                : <button onClick={handleSubmit}
                    style={{ padding:"8px 20px", background:T.green, border:"none", borderRadius:8, color:T.bg, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    Finish ✓
                  </button>
              }
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width:240, flexShrink:0 }}>
          {/* Score ring */}
          <Card style={{ marginBottom:12, textAlign:"center" }}>
            <div style={{ fontSize:11, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>Progress</div>
            <ScoreArc pct={Math.round(answeredCount / questions.length * 100)} size={100}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:12 }}>
              {[["Answered", answeredCount, T.green], ["Remaining", questions.length - answeredCount, T.text3]].map(([l,v,c]) => (
                <div key={l} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:700, fontFamily:T.mono, color:c }}>{v}</div>
                  <div style={{ fontSize:10, color:T.text3 }}>{l}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Q grid */}
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>
              Questions
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:3 }}>
              {questions.map((q2, i) => {
                const isCur = i === currentQ;
                const isAns = !!answers[q2.id];
                const isFlg = flagged.has(q2.id);
                const bg = isCur ? T.accent : isFlg ? `${T.amber}22` : isAns ? `${T.green}22` : T.bg3;
                const bc = isCur ? T.accent : isFlg ? `${T.amber}66` : isAns ? `${T.green}55` : T.border;
                const tc = isCur ? "#fff" : isFlg ? T.amber : isAns ? T.green : T.text3;
                return (
                  <div key={i} onClick={() => setCurrentQ(i)}
                    style={{
                      aspectRatio:"1", borderRadius:4, background:bg, border:`1px solid ${bc}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, cursor:"pointer", color:tc, fontFamily:T.mono, transition:"all 0.1s",
                    }}>{i + 1}</div>
                );
              })}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
              {[[T.accent,"Current"],[T.green,"Done"],[T.amber,"Flagged"]].map(([c,l]) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:c }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
                  {l}
                </div>
              ))}
            </div>
          </Card>

          {/* Flagged list */}
          {flagged.size > 0 && (
            <Card>
              <div style={{ fontSize:11, color:T.amber, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
                🚩 Flagged ({flagged.size})
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {[...flagged].map(id => {
                  const idx = questions.findIndex(q => q.id === id);
                  return (
                    <div key={id} onClick={() => setCurrentQ(idx)}
                      style={{
                        padding:"2px 8px", borderRadius:4, fontSize:11,
                        background:`${T.amber}18`, border:`1px solid ${T.amber}44`,
                        color:T.amber, cursor:"pointer",
                      }}>Q{idx + 1}</div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;
    const g = results.grade;
    const gc = gradeColor(g);

    return (
      <div style={{ maxWidth:720, margin:"0 auto", padding:"32px 20px" }}>
        {/* Hero result card */}
        <Card style={{ textAlign:"center", marginBottom:20, padding:"36px 32px", position:"relative", overflow:"hidden" }}>
          <div style={{
            position:"absolute", inset:0, pointerEvents:"none",
            background:`radial-gradient(ellipse at 50% 0%, ${gc}18 0%, transparent 65%)`,
          }}/>
          <div style={{ fontSize:64, fontWeight:800, color:gc, lineHeight:1, marginBottom:8, animation:"countUp 0.5s ease" }}>
            {g}
          </div>
          <div style={{ fontSize:24, fontWeight:600, marginBottom:6 }}>
            {results.correct}/{results.questions?.length || questions.length} Correct · {results.pct}%
          </div>
          <div style={{ fontSize:14, color:T.text2, marginBottom:28 }}>
            {results.pct>=90?"Outstanding mastery!":results.pct>=75?"Great job, nearly there!":results.pct>=60?"Good effort, keep practicing.":"Review the material and try again."}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[[results.correct, "Correct", T.green],
              [results.wrong, "Wrong", T.red],
              [results.skipped, "Skipped", T.text3],
              [fmtTime(results.elapsed), "Time", T.accent]
            ].map(([v,l,c]) => (
              <div key={l} style={{ background:T.bg3, borderRadius:10, padding:"14px 8px" }}>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:T.mono, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          <button onClick={() => setPage("home")}
            style={{ flex:1, padding:"10px 0", background:T.accent, border:"none", borderRadius:8, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            New Test
          </button>
          <button onClick={() => setPage("dashboard")}
            style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${T.border2}`, borderRadius:8, color:T.text2, fontSize:14, cursor:"pointer" }}>
            View Dashboard
          </button>
        </div>

        {/* Review */}
        <Card style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:13, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", color:T.text3, marginBottom:16 }}>
            Full Review
          </div>
          {results.review.map((q, i) => (
            <div key={i} style={{ paddingBottom:16, marginBottom:16, borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:11, color:T.text3 }}>Q{i + 1}</span>
                <span style={{ fontSize:11, color: q.isCorrect ? T.green : T.red }}>
                  {q.isCorrect ? "✓ Correct" : "✗ Wrong"}
                </span>
                <Badge text={q.difficulty || "Medium"} color={diffColor(q.difficulty)}/>
                {q.topic && <Badge text={q.topic.slice(0,20)} color={T.text3}/>}
              </div>
              <div style={{ fontSize:14, lineHeight:1.6, marginBottom:10 }}>{q.question}</div>
              {q.code && <pre style={{ background:T.bg2, borderRadius:8, padding:10, fontFamily:T.mono, fontSize:12, color:T.accent2, marginBottom:10, overflowX:"auto" }}>{q.code}</pre>}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {q.userAnswer && (
                  <div style={{ fontSize:13, padding:"5px 10px", borderRadius:6, background: q.isCorrect ? `${T.green}12` : `${T.red}10`, color: q.isCorrect ? T.green : T.red }}>
                    {q.isCorrect ? "✓" : "✗"} Your answer: {Array.isArray(q.userAnswer) ? q.userAnswer.join(", ") : q.userAnswer}
                  </div>
                )}
                {!q.isCorrect && (
                  <div style={{ fontSize:13, padding:"5px 10px", borderRadius:6, background:`${T.green}12`, color:T.green }}>
                    ✓ Correct: {Array.isArray(q.correct) ? q.correct.join(", ") : q.correct}
                  </div>
                )}
              </div>
              {q.explanation && (
                <div style={{ fontSize:12, color:T.text2, marginTop:8, padding:"8px 10px", background:T.bg3, borderRadius:6, lineHeight:1.6 }}>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    );
  };

  const renderDashboard = () => {
    const totalTests = history.length;
    const avgScore = totalTests ? Math.round(history.reduce((a, b) => a + b.score, 0) / totalTests) : 0;
    const bestScore = totalTests ? Math.max(...history.map(h => h.score)) : 0;
    const totalQs = history.reduce((a, b) => a + (b.total || 0), 0);

    return (
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <div>
            <h2 style={{ fontSize:26, fontWeight:700, letterSpacing:-0.8 }}>Analytics Dashboard</h2>
            <div style={{ fontSize:13, color:T.text2, marginTop:3 }}>Your learning performance at a glance</div>
          </div>
          <button onClick={() => setPage("home")}
            style={{ padding:"9px 18px", background:T.accent, border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            + New Test
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:24, borderBottom:`1px solid ${T.border}`, paddingBottom:1 }}>
          {["overview","mastery","history","leaderboard"].map(tab => (
            <button key={tab} onClick={() => setDashTab(tab)}
              style={{
                padding:"8px 16px", borderRadius:"8px 8px 0 0", border:`1px solid ${dashTab===tab ? T.border2 : "transparent"}`,
                background: dashTab===tab ? `${T.accent}18` : "transparent",
                color: dashTab===tab ? T.accent2 : T.text3, fontSize:13, cursor:"pointer",
                borderBottom: dashTab===tab ? `2px solid ${T.accent}` : "1px solid transparent",
                transition:"all 0.15s", textTransform:"capitalize",
              }}>{tab}</button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {dashTab === "overview" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
              <StatCard label="Tests Taken" value={totalTests} sub="All time" icon="📋"/>
              <StatCard label="Avg Score" value={`${avgScore}%`} color={avgScore>=75?T.green:T.amber} trend={4} icon="📈"/>
              <StatCard label="Best Score" value={`${bestScore}%`} color={T.cyan} sub="Personal best" icon="🏆"/>
              <StatCard label="Questions" value={totalQs.toLocaleString()} sub="Practiced" icon="🧠"/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:16, marginBottom:16 }}>
              <Card>
                <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>
                  Score Trend (Last 7 tests)
                </div>
                <TrendChart data={MOCK_TREND}/>
              </Card>
              <Card>
                <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>
                  Quick Stats
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {[
                    { label:"Streak", value:"7 days 🔥", color:T.amber },
                    { label:"XP Points", value:"9,240 ⚡", color:T.accent2 },
                    { label:"Best Subject", value:"Mathematics", color:T.green },
                    { label:"Tests This Week", value:"4", color:T.cyan },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, color:T.text2 }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:600, color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Difficulty breakdown */}
            <Card>
              <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:16 }}>
                Performance by Difficulty
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                {[["Easy",82,T.green],["Medium",71,T.amber],["Hard",54,T.red]].map(([d,pct,col]) => (
                  <div key={d} style={{ background:T.bg3, borderRadius:10, padding:16, textAlign:"center" }}>
                    <Badge text={d} color={col}/>
                    <div style={{ fontSize:28, fontWeight:700, fontFamily:T.mono, color:col, marginTop:10 }}>{pct}%</div>
                    <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>Accuracy</div>
                    <div style={{ marginTop:10 }}><MiniBar value={pct} color={col}/></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* MASTERY TAB */}
        {dashTab === "mastery" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <Card>
                <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:16 }}>
                  Topic Mastery
                </div>
                {MOCK_MASTERY.map((m, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{
                      width:32, height:32, borderRadius:8, flexShrink:0,
                      background:`${m.color}22`, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:16,
                    }}>
                      {["📐","⚛️","🧪","📜","🌐","💻"][i]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:5 }}>{m.topic}</div>
                      <MiniBar value={m.pct} color={m.color}/>
                    </div>
                    <div style={{ fontSize:13, fontFamily:T.mono, color:m.color, minWidth:36, textAlign:"right" }}>
                      {m.pct}%
                    </div>
                  </div>
                ))}
              </Card>

              <Card>
                <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:16 }}>
                  Mastery Radar
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                  {MOCK_MASTERY.map((m, i) => (
                    <div key={i} style={{ background:T.bg3, borderRadius:10, padding:"12px", textAlign:"center" }}>
                      <ScoreArc pct={m.pct} size={80}/>
                      <div style={{ fontSize:11, color:T.text2, marginTop:6 }}>{m.topic}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {dashTab === "history" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <Card style={{ padding:0, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                    {["Subject","Exam","Score","Questions","Time","Date"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom:`1px solid ${T.border}`, transition:"background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.cardHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding:"14px 16px", fontSize:13 }}>{t.topic}</td>
                      <td style={{ padding:"14px 16px" }}><Badge text={t.exam} color={T.accent}/></td>
                      <td style={{ padding:"14px 16px" }}>
                        <span style={{
                          display:"inline-block", padding:"2px 9px", borderRadius:4,
                          fontSize:12, fontWeight:600, fontFamily:T.mono,
                          background: t.score>=75?`${T.green}18`:t.score>=50?`${T.amber}18`:`${T.red}15`,
                          color: t.score>=75?T.green:t.score>=50?T.amber:T.red,
                        }}>{t.score}%</span>
                      </td>
                      <td style={{ padding:"14px 16px", fontSize:13, fontFamily:T.mono, color:T.text2 }}>{t.total}</td>
                      <td style={{ padding:"14px 16px", fontSize:13, color:T.text2 }}>{fmtTime(t.time || 0)}</td>
                      <td style={{ padding:"14px 16px", fontSize:12, color:T.text3 }}>{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px", color:T.text3 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
                  No tests taken yet. Start your first test!
                </div>
              )}
            </Card>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {dashTab === "leaderboard" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <Card>
                <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:16 }}>
                  Global Leaderboard
                </div>
                {LEADERBOARD.map((p, i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                    background: p.isMe ? `${T.accent}12` : T.bg3,
                    border: `1px solid ${p.isMe ? T.accent : "transparent"}`,
                    borderRadius:10, marginBottom:6,
                    animation:`fadeUp ${0.1 * i + 0.1}s ease both`,
                  }}>
                    <div style={{ fontSize:15, fontWeight:700, minWidth:28, fontFamily:T.mono, color: i<3 ? T.amber : T.text3 }}>
                      #{p.rank}
                    </div>
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      background:`${p.color}22`, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:14, fontWeight:600, color:p.color,
                    }}>{p.name[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight: p.isMe ? 600 : 400, color: p.isMe ? T.accent2 : T.text }}>
                        {p.name} {p.isMe && <span style={{ fontSize:10, color:T.accent }}>(You)</span>}
                      </div>
                      <div style={{ fontSize:11, color:T.text3 }}>🔥 {p.streak} day streak</div>
                    </div>
                    <div style={{ fontFamily:T.mono, fontSize:14, color:T.accent2, fontWeight:600 }}>{p.xp.toLocaleString()}</div>
                    {p.badge && <div style={{ fontSize:20 }}>{p.badge}</div>}
                  </div>
                ))}
              </Card>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <Card>
                  <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>
                    Your Achievements
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {[
                      ["🎯","Perfect Score","92% on UPSC"],
                      ["🔥","Week Streak","7 days in a row"],
                      ["⚡","Speed Demon","Under 60s avg"],
                      ["🧠","100 Questions","Milestone"],
                      ["📚","Multi-topic","5 subjects"],
                      ["🌟","Rising Star","Top 10"],
                    ].map(([icon,title,sub]) => (
                      <div key={title} style={{ background:T.bg3, borderRadius:10, padding:"12px", textAlign:"center" }}>
                        <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                        <div style={{ fontSize:12, fontWeight:600 }}>{title}</div>
                        <div style={{ fontSize:10, color:T.text3 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>
                    Daily Challenge
                  </div>
                  <div style={{ background:T.bg3, borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:13, color:T.text2, marginBottom:10 }}>
                      📅 Today: <b style={{ color:T.amber }}>UPSC — Indian Constitution</b>
                    </div>
                    <div style={{ fontSize:12, color:T.text3, marginBottom:12 }}>10 questions · 15 minutes · ×2 XP</div>
                    <button onClick={() => { setSelectedExam("upsc"); setTopic("Indian Constitution"); setQCount(10); setPage("home"); }}
                      style={{ width:"100%", padding:"8px", background:`linear-gradient(135deg, ${T.amber}, ${T.red})`, border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      Accept Challenge ⚡
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── NAV ────────────────────────────────────────────────────

  return (
    <>
      <style>{STYLE}</style>
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        {/* Nav */}
        <nav style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 24px", height:58,
          background:"rgba(7,7,14,0.9)", backdropFilter:"blur(16px)",
          borderBottom:`1px solid ${T.border}`, position:"sticky", top:0, zIndex:100,
        }}>
          <div onClick={() => setPage("home")} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background:`linear-gradient(135deg, ${T.accent}, ${T.cyan})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:15, fontWeight:700, color:"#fff",
            }}>Q</div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:-0.5 }}>
              Quiz<span style={{ color:T.accent2 }}>Forge</span>
            </div>
          </div>

          <div style={{ display:"flex", gap:4 }}>
            {[["home","Home"],["dashboard","Dashboard"]].map(([id, label]) => (
              <button key={id} onClick={() => setPage(id)}
                style={{
                  padding:"6px 14px", borderRadius:7, border:`1px solid ${page===id ? T.border2 : "transparent"}`,
                  background: page===id ? `${T.accent}15` : "transparent",
                  color: page===id ? T.accent2 : T.text2,
                  fontSize:13, cursor:"pointer", transition:"all 0.15s",
                }}>{label}</button>
            ))}
          </div>

          <div style={{
            width:32, height:32, borderRadius:50, cursor:"pointer",
            background:`linear-gradient(135deg, ${T.accent}, #A78BFA)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:600, color:"#fff",
          }}>U</div>
        </nav>

        {/* Page */}
        <div style={{ flex:1 }}>
          {page === "home" && renderHome()}
          {page === "test" && renderTest()}
          {page === "results" && renderResults()}
          {page === "dashboard" && renderDashboard()}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position:"fixed", bottom:24, right:24, zIndex:999,
            background:T.card, border:`1px solid ${T.border2}`,
            borderRadius:10, padding:"11px 16px", fontSize:13,
            display:"flex", alignItems:"center", gap:8, color:toast.color,
            boxShadow:"0 8px 32px rgba(0,0,0,0.5)", animation:"slideIn 0.2s ease",
          }}>{toast.msg}</div>
        )}
      </div>
    </>
  );
}
