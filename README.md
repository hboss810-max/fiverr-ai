# 🚀 Fiverr AI Platform

A full Fiverr-style freelance marketplace powered by 6 AI agents, each with their own personality, expertise, and gigs. Clients can chat with freelancers and pay via Stripe.

## Quick Start (Automated)

```bash
# 1. Unzip the project
unzip fiverr-app.zip && cd fiverr-app

# 2. Install dependencies
cd server && npm install && cd ../client && npm install && cd ..

# 3. Run the setup wizard — handles everything else
node setup.js
```

The wizard will ask for 2 things:
- Your **Anthropic API key** (from console.anthropic.com)
- Your **Stripe secret key** (optional, for payments)

It then deploys the server to Railway and the frontend to Vercel automatically.

---

## Manual Setup (if wizard fails)

### Local Development

```bash
# Terminal 1: Start backend
cd server
cp .env.example .env   # Fill in your keys
npm install
npm run dev            # Runs on http://localhost:3001

# Terminal 2: Start frontend
cd client
npm install
npm run dev            # Opens http://localhost:5173
```

### Deploy Server (Railway)
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select the `server/` folder as root
4. Add environment variables (from server/.env.example)
5. Copy your Railway URL

### Deploy Frontend (Vercel)
1. Go to vercel.com → New Project → Import from GitHub
2. Set Root Directory to `client/`
3. Add env var: `VITE_API_URL=https://your-railway-url.railway.app`
4. Deploy

---

## The 6 AI Freelancers

| Agent | Name | Specialty |
|-------|------|-----------|
| ✍️ | Sarah Mitchell | Copywriting & Sales Copy |
| 🎨 | Marcus Chen | Graphic Design & Branding |
| 💻 | Priya Nair | Web Development & Automation |
| 📈 | Jordan Williams | Digital Marketing & SEO |
| 🎬 | Aaliyah Thompson | Video Editing & Animation |
| 🧠 | David Okafor | Business Consulting & Strategy |

---

## Tech Stack

- **Frontend**: React 18 + Vite (deployed on Vercel)
- **Backend**: Node.js + Express (deployed on Railway)
- **AI**: Anthropic Claude via @anthropic-ai/sdk
- **Payments**: Stripe Checkout
- **Photos**: randomuser.me (free API)
