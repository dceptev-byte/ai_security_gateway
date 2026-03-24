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

**v1 — Complete ✅**
- Expanded regex detection: Aadhaar, PAN, IP address, passport, Indian bank account
- Confidence scores per finding (0.0 – 1.0)
- Anonymization modes: Mask / Redact / Replace with placeholder
- Real OpenAI LLM integration (mock by default; swap with live key via OPENAI_API_KEY)
- Session audit log (in-memory, resets on page refresh)

**v2 — MCP server** *(planned)*
- Package detection engine as a local MCP server
- Works natively in Claude Desktop, Cursor, Windsurf
- Fully local — no cloud, no Vercel, no data leaves the device
- Local dashboard showing live prompt scan feed and audit log
- Install via: npm install -g ai-security-gateway-mcp
- Intercepts prompts before they reach any LLM regardless of provider

**v3 — Smarter detection + browser extension** *(planned)*
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

AI Security Gateway is a Next.js 16 middleware UI that detects, flags, and masks Personally Identifiable Information (PII) in user prompts before they are forwarded to an LLM. Users paste a prompt, choose an anonymization mode, click "Analyze" to receive a risk assessment and anonymized version of their text, review/toggle between original and anonymized views, then optionally send the sanitized prompt to the LLM and receive a response — all without exposing sensitive data to the model. Every analysis is recorded in a session audit log.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Backend:** Vercel API Routes (Next.js Route Handlers)
- **LLM:** Mock by default; real OpenAI API ready via `OPENAI_API_KEY`
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
│   └── pii-detector.ts     # detectPII, maskPII, scoreRisk
├── hooks/
│   └── useAuditLog.ts      # Session audit log hook
├── components/
│   ├── RiskBadge.tsx
│   ├── FindingsList.tsx
│   ├── ToggleSwitch.tsx
│   └── AuditLog.tsx
├── types/
│   └── index.ts            # Shared TypeScript types
├── __tests__/
│   └── pii-detector.test.ts
├── CLAUDE.md
├── .env.local.example
└── .env.local              # gitignored
```

## API Routes

### POST /api/analyze

**Input:**
```json
{ "text": "string", "mode": "MASK" | "REDACT" | "REPLACE" }
```
`mode` is optional — defaults to `"MASK"`.

**Output:**
```json
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "findings": [
    {
      "type": "EMAIL" | "PHONE" | "CREDIT_CARD" | "AADHAAR" | "PAN" | "IP_ADDRESS" | "PASSPORT" | "BANK_ACCOUNT",
      "value": "string",
      "start": 0,
      "end": 17,
      "confidence": 0.95
    }
  ],
  "maskedText": "string"
}
```

**Logic:** Run detection rules against `text`, collect findings with confidence scores, apply the chosen anonymization mode, compute risk level.

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

**Logic:** Forward `text` to LLM (mock by default; real OpenAI when `OPENAI_API_KEY` is set) and return the model's reply.

---

### POST /api/tokenize *(v1.5 — Pipeline Demo)*

**Input:**
```json
{ "text": "string" }
```

**Output:**
```json
{
  "tokenizedText": "string",
  "tokenMapId": "string (UUID)",
  "findings": [...],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "tokenCount": 2
}
```

**Logic:** Run `detectPII` on text. For each unique PII value, generate a `[TYPE_xxxxxx]` token (6 random alphanumeric chars). Same value always gets the same token within a call. Replace right-to-left to preserve indices. Store `token → originalValue` map in `lib/token-store.ts` under a UUID (`tokenMapId`). Return tokenized text, UUID, findings, risk level, and token count.

---

### POST /api/detokenize *(v1.5 — Pipeline Demo)*

**Input:**
```json
{ "text": "string", "tokenMapId": "string" }
```

**Output:**
```json
{
  "restoredText": "string",
  "tokensRestored": 2,
  "originalTokenMapId": "string"
}
```

**Logic:** Look up `tokenMapId` in `lib/token-store.ts`. Replace all token occurrences in `text` with original values (handles multiple occurrences via split/join). Returns 404 if map not found or expired.

---

### Token Store — `lib/token-store.ts`

Module-level `Map<string, TokenMap>` singleton shared by both pipeline routes. Entries expire after **1 hour** (TTL enforced via `purgeExpired()` called on every request).

> **Demo only.** The in-memory store resets on every server restart. For production pipelines, replace `lib/token-store.ts` with a persistent backend such as **Redis** or **DynamoDB** with a TTL index.

## Shared TypeScript Types

```typescript
// types/index.ts

type AnonymizationMode = "MASK" | "REDACT" | "REPLACE";

type PIIType =
  | "EMAIL" | "PHONE" | "CREDIT_CARD"
  | "AADHAAR" | "PAN" | "IP_ADDRESS" | "PASSPORT" | "BANK_ACCOUNT";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface Finding {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  confidence: number;  // 0.0 – 1.0
}

interface AnalyzeResult {
  riskLevel: RiskLevel;
  findings: Finding[];
  maskedText: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  originalLength: number;
  findings: Finding[];
  riskLevel: RiskLevel;
  mode: AnonymizationMode;
  wasSent: boolean;
}
```

## Detection Rules (Regex-Based)

All detection runs server-side in `lib/pii-detector.ts`. Raw text is never sent to an external service for analysis.

| Type           | Regex Pattern                                                                 | Confidence | Notes                                      |
|----------------|-------------------------------------------------------------------------------|------------|--------------------------------------------|
| `EMAIL`        | `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`                         | 0.95       |                                            |
| `PHONE`        | `/((\+91\|0)?[\s-]?)?[6-9]\d{9}/g`                                           | 0.90       | India-friendly; matches +91, spaces, dashes|
| `CREDIT_CARD`  | `/\b(?:\d[ -]?){13,16}\b/g`                                                   | 0.98       | Luhn check applied to reduce false positives|
| `AADHAAR`      | `/\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/g`                             | 0.92       | Starts with 2–9; groups of 4 with optional spaces|
| `PAN`          | `/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g`                                            | 0.97       | 5 uppercase + 4 digits + 1 uppercase       |
| `IP_ADDRESS`   | `/\b(?:(?:25[0-5]\|2[0-4][0-9]\|[01]?[0-9][0-9]?)\.){3}(...)\b/g`           | 0.85       | Each octet validated 0–255                 |
| `PASSPORT`     | `/\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b/g`                               | 0.88       | Indian passport format                     |
| `BANK_ACCOUNT` | `/\b[0-9]{9,18}\b/g` (context-gated)                                          | 0.75       | Only flagged near banking context words    |

## Masking Format (MASK mode)

| Type           | Format Example              |
|----------------|-----------------------------|
| `EMAIL`        | `r***@g***.com`             |
| `PHONE`        | `******3210`                |
| `CREDIT_CARD`  | `**** **** **** 9012`       |
| `AADHAAR`      | `**** **** 0123`            |
| `PAN`          | `***** 1234 F`              |
| `IP_ADDRESS`   | `***.***.***.***`            |
| `PASSPORT`     | `*******`                   |
| `BANK_ACCOUNT` | `**********9012`            |

## Anonymization Modes

| Mode      | Behaviour                                              | Example output      |
|-----------|--------------------------------------------------------|---------------------|
| `MASK`    | Partially obscure — keep only identifying suffix/chars | `r***@g***.com`     |
| `REDACT`  | Remove value entirely                                  | *(empty string)*    |
| `REPLACE` | Substitute with typed placeholder token                | `[EMAIL]`           |

## Risk Scoring

| Findings Count | Risk Level |
|----------------|------------|
| 0              | `LOW`      |
| 1–2            | `MEDIUM`   |
| 3+             | `HIGH`     |

## Session Audit Log

Implemented in `hooks/useAuditLog.ts` + `components/AuditLog.tsx`.

- In-memory only — no database, resets on page refresh
- `useAuditLog` hook exposes: `addEntry`, `markSent`, `clearLog`, `entries`, `stats`
- `stats` derives `totalScanned`, `totalPIIFound`, `totalSent` on every render
- `AuditLog` component: collapsible table, expandable rows, slide-in animation on new entries

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
npm test        # All unit tests must pass
```

Do **not** commit if any command reports errors.
