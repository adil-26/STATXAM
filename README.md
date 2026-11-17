# StatXam ⚡

> **Pan-India 28-State Board Exam Archive, CBT Simulation Arena & Neural AI Doubt Solver**

StatXam is a high-performance, mobile-first academic platform built for Indian state board candidates (PSEB, CBSE, UPMSP, RBSE, BSEB, etc.), JEE Main/Advanced, and NEET-UG aspirants. Engineered with Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL, and Capacitor for Android native APK distribution.

---

## 🌟 Key Features

1. **20-Year Solved Archive (2005–2024)**: Complete repository covering 28 Indian States & Central Councils with authentic Google Drive PDF scans and official step marking schemes.
2. **AI Neural Doubt Solver (Clara)**: Multilingual academic tutor with live KaTeX mathematical function rendering, progressive typewriter streaming (~22ms pace), code block windows, and examiner tips.
3. **Dedicated Mobile UI (Single Tab Architecture)**: Clean segmented switcher (`💬 Doubt Chat` & `📐 Scanner & Formulas`) optimized for phone screens without nested layout stacking.
4. **Interactive CBT Simulator**: Timed exam practice arena with real-time scorecards, negative marking calculation, and performance telemetry.
5. **Student Bounty Rewards (+150 Coins)**: Students can search the archive and upload missing past board papers (via Local File Drag-Drop or Google Drive links) for admin review and coin rewards.
6. **Telegram Phone-OTP Recovery (`@statxambot`)**: Secure password-reset verification via official Telegram Bot with native deep linking (`tg://resolve?domain=statxambot&start=sess_<id>`), web mirrors (`https://telegram.me/...`), webhook support (`POST /api/auth/tg/webhook/`), and local long-polling.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) & React 18
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS & Material Design 3 Desert Palette (`#faf5ee`, `#c2652a`)
- **Mathematical Typography**: KaTeX 0.19 (Display & Inline Math)
- **Database & Auth**: Supabase PostgreSQL (`@supabase/supabase-js`)
- **AI Engine**: Groq Cloud AI (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`)
- **Mobile Native Shell**: Capacitor 6 (`@capacitor/camera`, `@capacitor/haptics`, `@capacitor/share`, `@capacitor/status-bar`)
- **Telegram Bot**: Telegram Bot API (`@statxambot`, Webhook + Long-Polling)

---

## 🚀 Getting Started

### 1. Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

Fill in your `.env.local` keys (`NEXT_PUBLIC_SUPABASE_URL`, `TELEGRAM_BOT_TOKEN`, `GROQ_API_KEY`, etc.).

### 2. Development

```bash
# Start Next.js development server
npm run dev

# (Optional) Run Telegram bot local long-polling
npm run telegram:polling
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Deployment

```bash
# Standard dynamic build (for Vercel deployment)
npm run build

# Register Telegram webhook on production domain (auto-appends trailing slash for Next.js trailingSlash: true)
npm run telegram:webhook -- https://statxam.vercel.app

# Check webhook status
npm run telegram:webhook -- status
```

### 4. Capacitor Android APK Export

```bash
# Export static web assets to out/ and sync to Android project
STATIC_EXPORT=true npm run build
npm run cap:sync

# Open Android Studio to build APK
npm run cap:open
```

---

## 🔒 Telegram Webhook CLI Commands

```bash
# Set webhook for production
npm run telegram:webhook -- https://your-domain.com

# Check active webhook configuration
npm run telegram:webhook -- status

# Delete webhook (enables local long-polling)
npm run telegram:webhook -- delete

# Start local long-polling
npm run telegram:polling
```

---

## 📄 License

StatXam Academic Suite — All Rights Reserved.
