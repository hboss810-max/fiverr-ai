import { useState, useEffect, useRef } from "react";
import { AGENTS } from "./agents.js";

const API = import.meta.env.VITE_API_URL || "";
const DELAY = () => 3000 + Math.random() * 5000;

const C = {
  bg: "#F5F4F0", surface: "#FFF", alt: "#EEECEA",
  border: "#E2DDD8", text: "#1C1917", muted: "#78716C", subtle: "#C4BDB7",
};

// ── Small reusable components ──────────────────────────────────

function Stars({ rating, color }) {
  return (
    <span>
      <span style={{ color: color || "#F59E0B", fontSize: 13 }}>{"★".repeat(Math.floor(rating))}</span>
      <span style={{ color: "#DDD5CC", fontSize: 13 }}>{"★".repeat(5 - Math.floor(rating))}</span>
      <span style={{ color: C.muted, marginLeft: 4, fontSize: 12 }}>{rating}</span>
    </span>
  );
}

function Avatar({ agent, size, errors, onErr }) {
  const initials = agent.name.split(" ").map(n => n[0]).join("");
  const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0, objectFit: "cover" };
  return !errors[agent.id]
    ? <img src={agent.photo} alt={agent.name} onError={() => onErr(agent.id)} style={s} />
    : <div style={{ ...s, background: `linear-gradient(135deg,${agent.color},${agent.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.33, fontFamily: "sans-serif" }}>{initials}</div>;
}

function TypingBubble({ agent, errors, onErr }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
      <Avatar agent={agent} size={32} errors={errors} onErr={onErr} />
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "4px 18px 18px 18px", padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, .2, .4].map((d, i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.muted, animation: "bounce 1.2s infinite", animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
      <span style={{ fontSize: 11, color: C.muted }}>{agent.name.split(" ")[0]} is typing...</span>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [agent, setAgent] = useState(null);
  const [tab, setTab] = useState("overview");
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [errors, setErrors] = useState({});
  const [paying, setPaying] = useState(null);
  const [toast, setToast] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  // Show toast on successful return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled")) showToast("Order cancelled — no charge was made.", "info");
    if (params.get("session")) showToast("🎉 Payment successful! Your freelancer will be in touch soon.", "success");
    window.history.replaceState({}, "", "/");
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const onErr = (id) => setErrors(e => ({ ...e, [id]: true }));
  const fmt = (d) => d?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "";

  const openAgent = (a) => {
    setAgent(a); setTab("overview"); setHistory([]);
    setMsgs([{ role: "assistant", content: `Hey there! 👋 I'm ${a.name.split(" ")[0]}. ${a.bio.split(".")[0]}.\n\nFeel free to browse my gigs, or just tell me what you need and I'll get right to it!`, time: new Date() }]);
  };

  const send = async (override) => {
    const text = (override || input).trim();
    if (!text || loading || !agent) return;
    const userMsg = { role: "user", content: text, time: new Date() };
    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs); setInput(""); setLoading(true);
    const nextH = [...history, { role: "user", content: text }];

    await new Promise(r => setTimeout(r, DELAY()));

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, messages: nextH })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      const reply = { role: "assistant", content: data.content, time: new Date() };
      setMsgs([...nextMsgs, reply]);
      setHistory([...nextH, { role: "assistant", content: data.content }]);
    } catch (e) {
      setMsgs([...nextMsgs, { role: "assistant", content: "Ugh, connection hiccup on my end 😅 Mind sending that again?", time: new Date() }]);
    } finally { setLoading(false); }
  };

  const checkout = async (gig) => {
    setPaying(gig.title);
    try {
      const res = await fetch(`${API}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigTitle: gig.title, gigPrice: gig.price, agentName: agent.name, agentId: agent.id })
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { showToast(data.error || "Checkout failed", "error"); }
    } catch { showToast("Checkout failed — please try again.", "error"); }
    finally { setPaying(null); }
  };

  const startGig = (gig) => {
    setTab("chat");
    setTimeout(() => send(`Hi! I'd like to order your "${gig.title}" gig ($${gig.price}). What do you need from me to get started?`), 100);
  };

  const md = (t) => t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Georgia, serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateY(-60px);opacity:0} to{transform:translateY(0);opacity:1} }
        .card { cursor:pointer; transition:all .22s ease; box-shadow:0 2px 12px rgba(0,0,0,.05); }
        .card:hover { transform:translateY(-4px)!important; box-shadow:0 12px 36px rgba(0,0,0,.11)!important; }
        .msg { animation:fadeUp .28s ease both; }
        .btn { transition:all .15s ease; }
        .btn:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); }
        input:focus { outline:none; border-color:#999!important; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${C.subtle};border-radius:4px}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.type === "success" ? "#1DBF73" : toast.type === "error" ? "#EF4444" : "#3B82F6", color: "#fff", padding: "12px 24px", borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, animation: "slideIn .3s ease", boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "13px 28px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 200, boxShadow: "0 1px 6px rgba(0,0,0,.05)" }}>
        <div style={{ width: 34, height: 34, background: "#1DBF73", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 19, fontFamily: "'DM Sans',sans-serif" }}>f</span>
        </div>
        <div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 16 }}>Fiverr <span style={{ color: "#1DBF73" }}>Pro</span> Freelancers</div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Sans',sans-serif" }}>6 verified experts · Top Rated Sellers</div>
        </div>
        {agent && (
          <button className="btn" onClick={() => setAgent(null)} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
            ← All Freelancers
          </button>
        )}
      </header>

      {/* ── AGENT GRID ── */}
      {!agent && (
        <main style={{ padding: "36px 28px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 33, fontWeight: 700, marginBottom: 6 }}>Meet Your Expert Team</div>
            <div style={{ color: C.muted, fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>Hand-picked specialists ready to work on your business today.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
            {AGENTS.map((a, i) => (
              <div key={a.id} className="card" onClick={() => openAgent(a)}
                style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, animation: `fadeUp .4s ease both`, animationDelay: `${i * .06}s` }}>
                <div style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                  <div style={{ position: "relative" }}>
                    <Avatar agent={a} size={66} errors={errors} onErr={onErr} />
                    <div style={{ position: "absolute", bottom: 3, right: 3, width: 13, height: 13, background: "#1DBF73", borderRadius: "50%", border: "2px solid #fff" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{a.name}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: a.color, fontWeight: 600, marginBottom: 5 }}>{a.category}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Stars rating={a.rating} color={a.color} />
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.muted }}>({a.reviews})</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.muted }}>FROM</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, color: a.color, fontSize: 20 }}>${Math.min(...a.gigs.map(g => g.price))}</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.muted, marginBottom: 14, fontStyle: "italic" }}>"{a.tagline}"</div>
                <div style={{ display: "flex", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 14 }}>
                  {[["Orders", a.completedOrders.toLocaleString()], ["Response", a.responseTime], ["From", a.location.split(",")[0]]].map(([k, v], idx) => (
                    <div key={k} style={{ flex: 1, padding: "10px 0", textAlign: "center", borderRight: idx < 2 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14 }}>{v}</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: C.muted, textTransform: "uppercase" }}>{k}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.muted }}>Since {a.memberSince}</div>
                  <div style={{ background: a.color, color: "#fff", borderRadius: 9, padding: "7px 18px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600 }}>View Profile →</div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ── AGENT WORKSPACE ── */}
      {agent && (
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "0 16px", display: "flex", flexDirection: "column", height: "calc(100vh - 62px)" }}>

          {/* Profile bar */}
          <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 0 12px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
              <div style={{ position: "relative" }}>
                <Avatar agent={agent} size={54} errors={errors} onErr={onErr} />
                <div style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, background: "#1DBF73", borderRadius: "50%", border: "2px solid #fff" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 17 }}>{agent.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Stars rating={agent.rating} color={agent.color} />
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.muted }}>({agent.reviews}) · {agent.location}</span>
                </div>
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#1DBF73", fontWeight: 600, background: "#1DBF7318", padding: "5px 12px", borderRadius: 20, flexShrink: 0 }}>
                🟢 Online
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["overview","👤 Profile"],["gigs","📋 Gigs"],["chat","💬 Chat"]].map(([id, label]) => (
                <button key={id} className="btn" onClick={() => setTab(id)}
                  style={{ background: tab === id ? C.alt : "transparent", border: `1px solid ${tab === id ? C.border : "transparent"}`, color: tab === id ? C.text : C.muted, borderRadius: 8, padding: "7px 15px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: tab === id ? 600 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>

            {/* OVERVIEW */}
            {tab === "overview" && <>
              <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, marginBottom: 10 }}>About {agent.name.split(" ")[0]}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, lineHeight: 1.75, color: "#333" }}>{agent.bio}</div>
                <div style={{ marginTop: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {[["Languages", agent.languages.join(", ")],["Avg Response", agent.responseTime],["Member Since", agent.memberSince]].map(([k,v]) => (
                    <div key={k}><span style={{ color: C.muted, fontSize: 12 }}>{k}: </span><span style={{ fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>{v}</span></div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, marginBottom: 12 }}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {agent.skills.map(s => <span key={s} style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}30`, color: agent.color, borderRadius: 20, padding: "5px 14px", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{s}</span>)}
                </div>
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Popular Gigs</div>
              {agent.gigs.map((gig, i) => (
                <div key={i} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 13, padding: 18, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: 4 }}>{gig.title}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.muted, marginBottom: 8 }}>{gig.description}</div>
                    <span style={{ color: agent.color, fontWeight: 800, fontSize: 18, fontFamily: "'DM Sans',sans-serif" }}>${gig.price}</span>
                    <span style={{ color: C.muted, fontSize: 12, marginLeft: 12, fontFamily: "'DM Sans',sans-serif" }}>⏱ {gig.delivery}</span>
                  </div>
                  <button className="btn" onClick={() => startGig(gig)} style={{ background: agent.color, border: "none", color: "#fff", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                    Order →
                  </button>
                </div>
              ))}
            </>}

            {/* GIGS */}
            {tab === "gigs" && agent.gigs.map((gig, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{gig.title}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>{gig.description}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 24 }}>
                    <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontFamily: "'DM Sans',sans-serif" }}>Starting at</div><div style={{ fontWeight: 800, color: agent.color, fontSize: 22, fontFamily: "'DM Sans',sans-serif" }}>${gig.price}</div></div>
                    <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontFamily: "'DM Sans',sans-serif" }}>Delivery</div><div style={{ fontWeight: 600, fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>{gig.delivery}</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn" onClick={() => setTab("chat")} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 9, padding: "9px 16px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>Ask a Question</button>
                    <button className="btn" onClick={() => checkout(gig)} disabled={!!paying}
                      style={{ background: paying ? C.subtle : "#1DBF73", border: "none", color: "#fff", borderRadius: 9, padding: "9px 20px", cursor: paying ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14 }}>
                      {paying === gig.title ? "Loading…" : `Pay $${gig.price} →`}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* CHAT */}
            {tab === "chat" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {msgs.map((m, i) => (
                  <div key={i} className="msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-end" }}>
                    {m.role === "assistant" && <Avatar agent={agent} size={32} errors={errors} onErr={onErr} />}
                    <div style={{ maxWidth: "72%" }}>
                      {m.role === "assistant" && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.muted, marginBottom: 4, paddingLeft: 4 }}>{agent.name.split(" ")[0]} · {fmt(m.time)}</div>}
                      <div style={{ background: m.role === "user" ? agent.color : "#fff", color: m.role === "user" ? "#fff" : C.text, border: m.role === "user" ? "none" : `1px solid ${C.border}`, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px", padding: "12px 16px", fontSize: 14, lineHeight: 1.65, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
                        dangerouslySetInnerHTML={{ __html: md(m.content) }} />
                      {m.role === "user" && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.muted, marginTop: 4, textAlign: "right" }}>You · {fmt(m.time)}</div>}
                    </div>
                  </div>
                ))}
                {loading && <TypingBubble agent={agent} errors={errors} onErr={onErr} />}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* Chat input */}
          {tab === "chat" && (
            <div style={{ background: "#fff", borderTop: `1px solid ${C.border}`, padding: "14px 0 18px" }}>
              {msgs.length <= 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
                  {agent.chatStarters.map(s => (
                    <button key={s} className="btn" onClick={() => send(s)} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{s}</button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder={`Message ${agent.name.split(" ")[0]}…`} disabled={loading}
                  style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 14, fontFamily: "'DM Sans',sans-serif" }} />
                <button className="btn" onClick={() => send()} disabled={loading || !input.trim()}
                  style={{ background: loading || !input.trim() ? C.subtle : agent.color, border: "none", borderRadius: 12, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: loading || !input.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                </button>
              </div>
              <div style={{ marginTop: 7, fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.muted, textAlign: "center" }}>
                {loading ? `${agent.name.split(" ")[0]} is writing a reply…` : `Typically responds ${agent.responseTime}`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
