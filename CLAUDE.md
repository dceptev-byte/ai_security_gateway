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

**v1.5 — Complete ✅**
- `/api/tokenize` — replaces PII with reversible typed tokens (e.g. `[EMAIL_a1b2c3]`)
- `/api/detokenize` — restores original values from tokenized LLM output
- In-memory token store with 1-hour TTL (`lib/token-store.ts`)
- 4-stage visual Pipeline Demo tab in the web app
- Integration examples page (Python / Node.js / curl)

**v2 — Complete ✅**
- Detection engine packaged as a standalone MCP server (`ai-security-gateway-mcp`)
- Works natively in Claude Desktop, Cursor, Windsurf via `scan_prompt` tool
- Fully local — no cloud, no Vercel, no data leaves the device
- Installable via: `npm install -g ai-security-gateway-mcp`
- Config: `claude_desktop_config.json` → `mcpServers`

**Phase 2 — Complete ✅**
- Local Python spaCy NER service (`C:\Claude\ner-service\app.py`, port 5001)
- Model: `en_core_web_lg` (400.7 MB)
- Four new PII types: NAME, ADDRESS, ORG, DATE
- `/api/tokenize` calls NER service and merges findings with regex results
- Graceful fallback: if NER service offline, regex detection still works
- Pipeline Demo UI: purple 🧠 chips for NER-detected tokens; NER offline warning

**v3 — Paused ⏸️**
- Browser extension for Claude.ai, ChatGPT, Gemini
- Intercepts prompts client-side in the browser before they are sent
- Custom user-defined detection rules
- Multi-language support

**v4–v6 — Planned 📋**
- v4: Output scanning — scan LLM responses for PII before displaying to user
- v5: Prompt injection detection — flag adversarial prompt patterns
- v6: Local LLM routing — send sensitive prompts to a local model instead of cloud

### Architecture decision log
- Detection must always run locally — sending raw text to an LLM for detection defeats the purpose of the tool
- Regex chosen for v0/v1: fast, free, no external dependencies, appropriate for structured PII (email, phone, card numbers, IDs)
- NER via local Python service (Phase 2): spaCy `en_core_web_lg` runs on the user's machine; API call is localhost-only
- MCP chosen over browser extension for v2: serves developer audience first, works across all LLM providers via IDE/Desktop
- Browser extension deferred to v3: consumer LLM web apps are secondary audience

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
│   ├── layout.tsx                          # Root layout
│   ├── page.tsx                            # Home page (scanner + pipeline tabs)
│   ├── pipeline-demo/
│   │   └── integration-example/
│   │       └── page.tsx                    # Integration examples (Python/Node/curl)
│   └── api/
│       ├── analyze/
│       │   └── route.ts                    # POST /api/analyze
│       ├── send/
│       │   └── route.ts                    # POST /api/send
│       ├── tokenize/
│       │   └── route.ts                    # POST /api/tokenize  (v1.5 + Phase 2)
│       └── detokenize/
│           └── route.ts                    # POST /api/detokenize (v1.5)
├── lib/
│   ├── pii-detector.ts                     # detectPII, maskPII, scoreRisk (12 types)
│   └── token-store.ts                      # In-memory token map, 1-hour TTL
├── hooks/
│   └── useAuditLog.ts                      # Session audit log hook
├── components/
│   ├── RiskBadge.tsx
│   ├── FindingsList.tsx
│   ├── ToggleSwitch.tsx
│   ├── AuditLog.tsx
│   └── PipelineDemoTab.tsx                 # 4-stage pipeline demo UI
├── types/
│   └── index.ts                            # Shared TypeScript types
├── lib/
│   └── __tests__/
│       └── pii.test.ts                     # Unit tests (97 passing)
├── CLAUDE.md
├── .env.local.example
└── .env.local                              # gitignored
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

### POST /api/tokenize *(v1.5 + Phase 2)*

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
  "tokenCount": 2,
  "nerServiceAvailable": true,
  "detectionBreakdown": { "regexCount": 8, "nerCount": 3 }
}
```

**Logic:** Run `detectPII` (regex, 8 types) on text. Also call the local NER service at `http://localhost:5001/ner` for NAME/ADDRESS/ORG/DATE detection. Merge both finding sets, deduplicate by value (keep highest confidence). For each unique PII value, generate a `[TYPE_xxxxxx]` token (6 random alphanumeric chars). Same value always gets the same token within a call. Replace right-to-left to preserve indices. Store `token → originalValue` map in `lib/token-store.ts` under a UUID (`tokenMapId`). If NER service is unreachable, set `nerServiceAvailable: false` and proceed with regex findings only.

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
  | "AADHAAR" | "PAN" | "IP_ADDRESS" | "PASSPORT" | "BANK_ACCOUNT"
  | "NAME" | "ADDRESS" | "ORG" | "DATE";   // Phase 2 — NER-detected types

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

## Detection Rules

### Regex-Based (lib/pii-detector.ts)

All regex detection runs server-side. Raw text is never sent to any external service.

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

### NER-Based (Phase 2 — local Python service)

NER detection runs via a local Flask + spaCy service on `localhost:5001`. The `/api/tokenize` route calls it and merges results with regex findings. Falls back gracefully to regex-only if the service is offline.

| Type      | spaCy Label  | Confidence | Notes                                       |
|-----------|--------------|------------|---------------------------------------------|
| `NAME`    | `PERSON`     | 0.85       | Person names e.g. "Rahul Sharma"            |
| `ADDRESS` | `GPE`, `LOC` | 0.80       | Locations e.g. "Mumbai", "New Delhi"        |
| `ORG`     | `ORG`        | 0.82       | Organisations e.g. "City Hospital"          |
| `DATE`    | `DATE`       | 0.78       | Dates e.g. "12th March", "March 2024"       |

## NER Service

- **Location:** `C:\Claude\ner-service\app.py`
- **Model:** `en_core_web_lg` (400.7 MB, loaded once on startup)
- **Endpoint:** `POST http://localhost:5001/ner`
- **Start:** `python app.py` from the `ner-service` folder
- **Fallback:** if the service is offline, `/api/tokenize` sets `nerServiceAvailable: false` and continues with regex findings — no crash, no error to the user
- **CORS:** enabled for `localhost:3000` (Next.js dev) and the Vercel production URL

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
| `NAME`         | `R*** S****` (first letter of each word + asterisks) |
| `ADDRESS`      | `Mumbai ***` (first word + asterisks)                |
| `ORG`          | `Cit***` (first 3 chars + asterisks)                 |
| `DATE`         | `*** March ***` (month preserved, rest masked)        |

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
