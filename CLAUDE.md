# AI Security Gateway — CLAUDE.md

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
