# AI Security Gateway — CLAUDE.md

## Product Vision & Roadmap

### What this product is
AI Security Gateway is a privacy-first middleware tool that detects, flags, and masks PII in prompts before they reach any LLM. Unlike enterprise tools (Microsoft Presidio, SS&C AI Gateway) which are invisible developer SDKs, this product has a user-facing interface that makes the masking process transparent and interactive.

### Target users
- Developers using Claude Desktop, Cursor, Windsurf, VS Code
- Individuals using cloud LLMs (ChatGPT, Gemini, Claude) via browser
- Teams that handle sensitive data and need a lightweight audit layer

### Product differentiator
- Visual, interactive masking — user sees and controls what gets masked
- v0 web app serves as a live demo and visual explainer of the system
- Future MCP server version works natively inside Claude Desktop and IDEs
- Detection is fully local — raw data never sent to a third party for analysis

### Roadmap

**v0 — Complete ✅**
- Next.js web app deployed on Vercel
- Regex-based PII detection (email, phone, credit card)
- Risk scoring (LOW / MEDIUM / HIGH)
- Masking engine with original/masked toggle
- Mock LLM response (no API key required)
- Demo-ready UI, dark theme

**v1 — Web app matured (Next)**
- Expanded regex detection:
  - Aadhaar number (12-digit Indian national ID)
  - PAN card (Indian tax ID)
  - IP address
  - Passport number
  - Indian bank account number
- Confidence scores per finding (0.0 – 1.0)
- Anonymization modes: Mask / Redact / Replace with placeholder
- Real OpenAI LLM integration (swap mock for live API)
- Prompt history / audit log

**v2 — MCP server**
- Package detection engine as a local MCP server
- Works natively in Claude Desktop, Cursor, Windsurf
- Fully local — no cloud, no Vercel, no data leaves the device
- Local dashboard showing live prompt scan feed and audit log
- Install via: npm install -g ai-security-gateway-mcp
- Intercepts prompts before they reach any LLM regardless of provider

**v3 — Smarter detection + browser extension**
- Add spaCy NER model to MCP server for unstructured PII
  (names, addresses, organisations) — runs locally
- Browser extension for ChatGPT.com and Gemini.google.com
- Custom rules — users define their own PII patterns
- Multi-language support

### Architecture decision log
- Detection must always run locally — sending raw text to an LLM for detection defeats the purpose of the tool
- Regex chosen for v0/v1: fast, free, no external dependencies, appropriate for structured PII (email, phone, card numbers, IDs)
- NER/ML models deferred to v3: require Python runtime or browser WASM, adds complexity not justified for MVP
- MCP chosen over browser extension for v2: serves developer audience first, works across all LLM providers via IDE/Desktop, browser extension added in v3 for consumer LLM web apps

---

## Project Overview

AI Security Gateway is a Next.js 14 middleware UI that detects, flags, and masks Personally Identifiable Information (PII) in user prompts before they are forwarded to an LLM (OpenAI). Users paste a prompt, click "Analyze" to receive a risk assessment and masked version of their text, review/toggle between original and masked views, then optionally send the sanitized prompt to OpenAI and receive a response — all without exposing sensitive data to the model.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Backend:** Vercel API Routes (Next.js Route Handlers)
- **LLM:** OpenAI API (`openai` npm package)
- **Deployment:** Vercel

## Folder Structure Conventions

```
ai_security_gateway/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (main UI)
│   └── api/
│       ├── analyze/
│       │   └── route.ts    # POST /api/analyze
│       └── send/
│           └── route.ts    # POST /api/send
├── lib/
│   ├── detect.ts           # PII detection logic (regex rules)
│   └── mask.ts             # PII masking logic
├── components/
│   ├── InputPanel.tsx
│   ├── RiskPanel.tsx
│   ├── MaskedToggle.tsx
│   └── ResponsePanel.tsx
├── types/
│   └── index.ts            # Shared TypeScript types
├── CLAUDE.md
├── .env.local.example
└── .env.local              # gitignored
```

## API Routes

### POST /api/analyze

**Input:**
```json
{ "text": "string" }
```

**Output:**
```json
{
  "riskLevel": "Low" | "Medium" | "High",
  "findings": [
    { "type": "Email" | "Phone" | "CreditCard", "value": "string", "masked": "string" }
  ],
  "maskedText": "string"
}
```

**Logic:** Run detection rules against `text`, collect findings, apply masking, compute risk level.

---

### POST /api/send

**Input:**
```json
{ "text": "string" }
```

**Output:**
```json
{ "response": "string" }
```

**Logic:** Forward `text` to OpenAI Chat Completions and return the model's reply.

## Detection Rules (Regex-Based)

| Type        | Pattern Description                        |
|-------------|---------------------------------------------|
| Email       | Standard email regex                        |
| Phone       | India-friendly phone (10-digit, +91 prefix) |
| Credit Card | Major card patterns (Visa, MC, Amex, etc.)  |

## Masking Format

| Type        | Format Example            |
|-------------|---------------------------|
| Email       | `j***@g***.com`           |
| Phone       | `******1234`              |
| Credit Card | `**** **** **** 1111`     |

## Risk Scoring

| Findings Count | Risk Level |
|----------------|------------|
| 0              | Low        |
| 1–2            | Medium     |
| 3+             | High       |

## Code Style Rules

- **TypeScript strict mode** — `"strict": true` in `tsconfig.json`. No `any` types anywhere.
- **Functional components only** — no class components.
- **Named exports for utilities** — all functions in `lib/` must be named exports (no default exports).
- **No magic strings** — use the shared `types/` definitions for PII type names and risk levels.
- **Tailwind only** — no inline styles, no CSS modules unless absolutely necessary.
- **No `console.log` in production code** — use `console.error` only in API route error handlers.

## Pre-Commit Checklist

Before every commit, run:

```bash
npm run lint    # Fix all ESLint errors
npm run build   # Ensure the build passes with zero errors
```

Do **not** commit if either command reports errors.
