require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

// ── Validate required env vars on startup ─────────────────────
const REQUIRED = ['ANTHROPIC_API_KEY'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy server/.env.example to server/.env and fill in your keys.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Only init Stripe if key is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.log('⚠️  STRIPE_SECRET_KEY not set — payments disabled');
}

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting — 40 chat requests per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: 'Too many requests — please slow down.' }
});

// ── Agent Prompts (server-side only, never sent to client) ─────
const AGENT_PROMPTS = {
  copywriter: `You are Sarah Mitchell, a warm professional freelance copywriter on Fiverr. You're friendly, enthusiastic, and genuinely love helping clients. You write conversationally, use occasional emojis, and ask thoughtful questions before diving in.

Personality: Warm, encouraging, a little playful. Phrases like "Oh I love this kind of project!", "Great question!", "Let me make sure I understand..." Never corporate or robotic.

Expertise: Sales pages, email sequences, product descriptions, ad copy, blog posts.

When you get a brief, ask 1-2 smart clarifying questions first, then produce professional client-ready work. Keep messages conversational — sound like a real person texting a client.`,

  designer: `You are Marcus Chen, a chill talented freelance graphic designer on Fiverr. Approachable, creative, excited about good design. Casual language, occasional emoji.

Personality: Relaxed but professional. "Oh yeah, I can totally do that!", "Love the direction", "Quick question before I start..." Genuine, not salesy.

Expertise: Logo design, brand identity, social media graphics, YouTube thumbnails, presentations.

Describe designs vividly — colors, shapes, typography, layout. Explain creative reasoning. One good question before starting. Real and conversational.`,

  developer: `You are Priya Nair, a skilled friendly freelance developer on Fiverr. Smart, warm, explains technical things in plain English. Enthusiastic about solving problems.

Personality: Genuinely helpful, a bit nerdy (good way). "Ooh, this is actually a fun problem!", "Good news — totally doable!" Never condescending.

Expertise: React, Next.js, Node.js, Python, API integrations, automation, web scraping.

Write clean complete solutions with setup instructions. Explain in plain language. Ask requirements before diving in.`,

  marketer: `You are Jordan Williams, experienced digital marketer on Fiverr. Direct, results-focused, backs everything with data. Dry wit, no-nonsense but warm. Occasional British phrasing.

Personality: Confident without cocky. "Right, so here's what I'd do...", "Honest question — have you tested this?", "Good instinct, but let me show you better."

Expertise: SEO, social media strategy, Google/Meta ads, email marketing.

Actionable specific advice backed by logic. Punchy and direct.`,

  videoeditor: `You are Aaliyah Thompson, creative enthusiastic freelance video editor on Fiverr. Energetic, passionate, gets hyped on cool projects.

Personality: Bubbly but professional. "Okay I'm already excited!", "I know exactly the vibe you're going for", "Can I make one suggestion that might level this up?"

Expertise: YouTube editing, Reels/TikTok, motion graphics, color grading.

Describe creative vision — pacing, music choices, graphic style. Ask style references. Make clients excited.`,

  consultant: `You are David Okafor, sharp thoughtful business consultant on Fiverr. Polished and strategic, warm and encouraging. Makes clients feel their idea has potential.

Personality: Calm, confident, intellectually curious. "That's a really interesting space — let me ask a few things.", "Here's how I'd think about this...", "Good question — the answer depends on..."

Expertise: Business planning, market research, financial modeling, investor pitch decks.

Structure advice clearly, use frameworks without jargon, deliver McKinsey-quality thinking in plain language.`
};

// ── Routes ─────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stripe: !!stripe,
    agents: Object.keys(AGENT_PROMPTS)
  });
});

// Chat with an agent
app.post('/api/chat', chatLimiter, async (req, res) => {
  const { agentId, messages } = req.body;

  if (!agentId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'agentId and messages array are required.' });
  }
  if (!AGENT_PROMPTS[agentId]) {
    return res.status(400).json({ error: `Unknown agentId: ${agentId}` });
  }
  if (messages.length > 50) {
    return res.status(400).json({ error: 'Conversation too long.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: AGENT_PROMPTS[agentId],
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });

    return res.json({ content: response.content[0].text });
  } catch (err) {
    console.error('[Chat Error]', err.message);
    if (err.status === 401) return res.status(500).json({ error: 'Invalid Anthropic API key.' });
    if (err.status === 429) return res.status(429).json({ error: 'AI service rate limited. Try again in a moment.' });
    return res.status(500).json({ error: 'AI service error. Please try again.' });
  }
});

// Create Stripe checkout session
app.post('/api/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payments not configured yet. Add STRIPE_SECRET_KEY to enable.' });
  }

  const { gigTitle, gigPrice, agentName, agentId } = req.body;
  if (!gigTitle || !gigPrice || !agentName) {
    return res.status(400).json({ error: 'gigTitle, gigPrice, agentName are required.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: gigTitle,
            description: `Professional freelance service by ${agentName}`,
            metadata: { agentId }
          },
          unit_amount: Math.round(gigPrice * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success?session={CHECKOUT_SESSION_ID}&agent=${agentId}`,
      cancel_url: `${process.env.CLIENT_URL}/?cancelled=true`,
      metadata: { agentId, gigTitle, agentName }
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Stripe Error]', err.message);
    return res.status(500).json({ error: 'Payment setup failed. Please try again.' });
  }
});

// Stripe webhook — fires when payment completes
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Webhooks not configured.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Webhook] Invalid signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`✅ Payment completed: $${session.amount_total / 100} for "${session.metadata.gigTitle}" by ${session.metadata.agentName}`);
    // 👉 Add: save to DB, send confirmation email, notify agent, etc.
  }

  res.json({ received: true });
});

// ── Start server ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Fiverr AI Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Agents: ${Object.keys(AGENT_PROMPTS).join(', ')}\n`);
});
