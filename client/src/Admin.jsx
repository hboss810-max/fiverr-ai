import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "";
const ADMIN_PASSWORD = "admin2024"; // Change this!

const AGENTS = [
  { id: "copywriter", name: "Sarah Mitchell", category: "Writing & Copy", color: "#E8533A" },
  { id: "designer", name: "Marcus Chen", category: "Graphic Design", color: "#7C3AED" },
  { id: "developer", name: "Priya Nair", category: "Programming & Tech", color: "#059669" },
  { id: "marketer", name: "Jordan Williams", category: "Digital Marketing", color: "#D97706" },
  { id: "videoeditor", name: "Aaliyah Thompson", category: "Video & Animation", color: "#DB2777" },
  { id: "consultant", name: "David Okafor", category: "Business Consulting", color: "#0891B2" },
];

// Mock data — replace with real DB calls later
const MOCK_ORDERS = [
  { id: "ord_001", agent: "copywriter", gig: "Compelling Sales Page Copy", amount: 75, status: "completed", date: "2026-03-10", client: "james.wilson@gmail.com" },
  { id: "ord_002", agent: "designer", gig: "Professional Logo + Brand Kit", amount: 150, status: "completed", date: "2026-03-10", client: "sarah.tech@startup.io" },
  { id: "ord_003", agent: "developer", gig: "Python Automation Script", amount: 95, status: "pending", date: "2026-03-11", client: "mark.business@company.com" },
  { id: "ord_004", agent: "consultant", gig: "Investor-Ready Business Plan", amount: 300, status: "completed", date: "2026-03-09", client: "founder@newco.com" },
  { id: "ord_005", agent: "marketer", gig: "Complete SEO Audit + Strategy", amount: 180, status: "completed", date: "2026-03-08", client: "shop@ecommerce.store" },
  { id: "ord_006", agent: "videoeditor", gig: "Professional YouTube Video Edit", amount: 90, status: "in_progress", date: "2026-03-11", client: "creator@youtube.com" },
  { id: "ord_007", agent: "copywriter", gig: "Email Drip Sequence (5 emails)", amount: 120, status: "completed", date: "2026-03-07", client: "marketing@brand.co" },
  { id: "ord_008", agent: "designer", gig: "10 Social Media Templates", amount: 85, status: "completed", date: "2026-03-06", client: "influencer@social.me" },
];

const STATUS_COLORS = {
  completed: { bg: "#D1FAE5", text: "#065F46" },
  pending: { bg: "#FEF3C7", text: "#92400E" },
  in_progress: { bg: "#DBEAFE", text: "#1E40AF" },
};

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [tab, setTab] = useState("overview");
  const [orders] = useState(MOCK_ORDERS);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwErr(false); }
    else { setPwErr(true); }
  };

  const totalRevenue = orders.filter(o => o.status === "completed").reduce((s, o) => s + o.amount, 0);
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "completed").length;
  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "in_progress").length;
  const conversionRate = Math.round((completedOrders / totalOrders) * 100);

  const agentStats = AGENTS.map(a => ({
    ...a,
    orders: orders.filter(o => o.agent === a.id).length,
    revenue: orders.filter(o => o.agent === a.id && o.status === "completed").reduce((s, o) => s + o.amount, 0),
  })).sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = Math.max(...agentStats.map(a => a.revenue));

  if (!authed) return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#0F0F0F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 20, padding: "48px 40px", width: 360, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, background: "#1DBF73", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24, fontWeight: 900, color: "#fff" }}>f</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Admin Dashboard</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 28 }}>Enter your password to continue</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
          placeholder="Password" style={{ width: "100%", background: "#252525", border: `1px solid ${pwErr ? "#EF4444" : "#333"}`, borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
        {pwErr && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>Incorrect password</div>}
        <button onClick={login} style={{ width: "100%", background: "#1DBF73", border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Sign In →
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: "#444" }}>Default password: admin2024</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#0F0F0F", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .card { animation: fadeUp .3s ease both; }
        .tab-btn:hover { background: #252525 !important; }
        .row:hover { background: #1A1A1A !important; }
      `}</style>

      {/* Sidebar */}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 220, background: "#141414", borderRight: "1px solid #222", padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36, paddingLeft: 8 }}>
          <div style={{ width: 32, height: 32, background: "#1DBF73", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>f</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Fiverr AI</div>
            <div style={{ fontSize: 11, color: "#555" }}>Admin Panel</div>
          </div>
        </div>

        {[["overview", "📊", "Overview"], ["orders", "📋", "Orders"], ["agents", "🤖", "Agents"], ["seo", "🔍", "SEO & Growth"]].map(([id, icon, label]) => (
          <button key={id} className="tab-btn" onClick={() => setTab(id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: tab === id ? "#1DBF7320" : "transparent", color: tab === id ? "#1DBF73" : "#666", cursor: "pointer", fontSize: 14, fontWeight: tab === id ? 600 : 400, marginBottom: 4, width: "100%", textAlign: "left" }}>
            <span>{icon}</span>{label}
          </button>
        ))}

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #222" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, color: "#555", fontSize: 13, textDecoration: "none" }}>
            ← Back to Site
          </a>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 220, padding: "32px 36px" }}>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Dashboard Overview</div>
            <div style={{ color: "#555", fontSize: 14 }}>Your business at a glance</div>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, sub: "All time", color: "#1DBF73", icon: "💰" },
              { label: "Total Orders", value: totalOrders, sub: `${completedOrders} completed`, color: "#6366F1", icon: "📋" },
              { label: "Pending", value: pendingOrders, sub: "Need attention", color: "#F59E0B", icon: "⏳" },
              { label: "Completion Rate", value: `${conversionRate}%`, sub: "Orders fulfilled", color: "#0891B2", icon: "✅" },
            ].map((s, i) => (
              <div key={i} className="card" style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: 16, padding: "22px 20px", animationDelay: `${i * .07}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#444" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Recent orders */}
          <div className="card" style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: 16, overflow: "hidden", animationDelay: ".28s" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Recent Orders</div>
              <button onClick={() => setTab("orders")} style={{ background: "transparent", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>View All</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  {["Order", "Agent", "Service", "Amount", "Status", "Date"].map(h => (
                    <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o, i) => {
                  const agent = AGENTS.find(a => a.id === o.agent);
                  const sc = STATUS_COLORS[o.status];
                  return (
                    <tr key={i} className="row" style={{ borderBottom: "1px solid #1E1E1E", transition: "background .15s" }}>
                      <td style={{ padding: "14px 24px", fontSize: 12, color: "#555", fontFamily: "'DM Mono', monospace" }}>{o.id}</td>
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: agent?.color }}>{agent?.name}</span>
                      </td>
                      <td style={{ padding: "14px 24px", fontSize: 13, color: "#aaa", maxWidth: 200 }}>{o.gig}</td>
                      <td style={{ padding: "14px 24px", fontSize: 14, fontWeight: 700, color: "#1DBF73" }}>${o.amount}</td>
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{ background: sc.bg, color: sc.text, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{o.status.replace("_", " ")}</span>
                      </td>
                      <td style={{ padding: "14px 24px", fontSize: 12, color: "#555" }}>{o.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {/* ── ORDERS ── */}
        {tab === "orders" && <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>All Orders</div>
            <div style={{ color: "#555", fontSize: 14 }}>{orders.length} total orders</div>
          </div>
          <div className="card" style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: 16, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  {["Order ID", "Client", "Agent", "Service", "Amount", "Status", "Date"].map(h => (
                    <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const agent = AGENTS.find(a => a.id === o.agent);
                  const sc = STATUS_COLORS[o.status];
                  return (
                    <tr key={i} className="row" style={{ borderBottom: "1px solid #1E1E1E", transition: "background .15s" }}>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "#555", fontFamily: "'DM Mono', monospace" }}>{o.id}</td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#aaa" }}>{o.client}</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ fontSize: 13, fontWeight: 600, color: agent?.color }}>{agent?.name}</span></td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#aaa" }}>{o.gig}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#1DBF73" }}>${o.amount}</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: sc.bg, color: sc.text, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{o.status.replace("_", " ")}</span></td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "#555" }}>{o.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {/* ── AGENTS ── */}
        {tab === "agents" && <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Agent Performance</div>
            <div style={{ color: "#555", fontSize: 14 }}>Revenue and orders by freelancer</div>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {agentStats.map((a, i) => (
              <div key={i} className="card" style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: 14, padding: "20px 24px", animationDelay: `${i * .06}s` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${a.color}20`, border: `2px solid ${a.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {["✍️","🎨","💻","📈","🎬","🧠"][i]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{a.category}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: a.color }}>${a.revenue}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{a.orders} orders</div>
                  </div>
                </div>
                <div style={{ height: 6, background: "#252525", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${maxRevenue > 0 ? (a.revenue / maxRevenue) * 100 : 0}%`, background: `linear-gradient(90deg, ${a.color}, ${a.color}99)`, borderRadius: 4, transition: "width 1s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ── SEO & GROWTH ── */}
        {tab === "seo" && <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>SEO & Growth Playbook</div>
            <div style={{ color: "#555", fontSize: 14 }}>Your roadmap to free traffic and social growth</div>
          </div>

          {/* Quick wins */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              { title: "🔍 SEO Quick Wins", color: "#6366F1", items: ["Add your site to Google Search Console", "Submit sitemap to Google & Bing", "Target keywords like 'AI freelancer', 'affordable copywriter'", "Write blog posts about your services", "Get listed on Product Hunt"] },
              { title: "📱 Social Media", color: "#DB2777", items: ["Create TikTok showing AI agents in action", "Post before/after examples on Instagram", "Join Reddit communities (r/entrepreneur, r/smallbusiness)", "Share client success stories on LinkedIn", "Create YouTube demos of each agent"] },
              { title: "💡 Content Ideas", color: "#D97706", items: ["'I replaced my freelancer with AI — here's what happened'", "'How I get professional copy for $75'", "'6 AI experts available 24/7 for your business'", "'Fiverr vs AI freelancers comparison'", "Behind the scenes of AI writing copy"] },
              { title: "🚀 Growth Tactics", color: "#059669", items: ["Offer first gig 50% off to get reviews", "Create affiliate program (20% commission)", "Partner with startup communities", "List on AppSumo for viral exposure", "Cold email small businesses in your area"] },
            ].map((s, i) => (
              <div key={i} className="card" style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: 16, padding: "22px 24px", animationDelay: `${i * .08}s` }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: s.color }}>{s.title}</div>
                {s.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, marginTop: 6, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5 }}>{item}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Live Stripe switch */}
          <div className="card" style={{ background: "linear-gradient(135deg, #1DBF7315, #059669010)", border: "1px solid #1DBF7330", borderRadius: 16, padding: "24px", animationDelay: ".32s" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#1DBF73" }}>💳 Switch to Live Payments</div>
            <div style={{ color: "#888", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              You're currently in test mode. To accept real money, update your Stripe key in Railway.
            </div>
            <div style={{ background: "#0F0F0F", borderRadius: 10, padding: "16px 20px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#1DBF73" }}>
              1. Go to dashboard.stripe.com → API Keys<br/>
              2. Copy your <span style={{ color: "#F59E0B" }}>Live Secret Key</span> (sk_live_...)<br/>
              3. Go to Railway → Variables → Update STRIPE_SECRET_KEY<br/>
              4. Redeploy → You're accepting real payments! 🎉
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
