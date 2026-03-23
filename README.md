# 🛡️ AI Security Gateway

A Next.js middleware UI that detects, masks, and risk-scores Personally Identifiable Information (PII) in user prompts before forwarding them to an LLM.

---

## Getting Started

```bash
git clone <your-repo-url>
cd ai_security_gateway
npm install
cp .env.local.example .env.local   # add your OpenAI key when ready
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

1. **Paste** a prompt into the textarea (sample PII is pre-filled for demo — covers all 8 detection types)
2. **Choose mode** — Mask, Redact, or Replace (see below)
3. **Analyze** — the app scans locally for PII and returns a risk score with confidence values per finding
4. **Review** — toggle between the original and anonymized text; findings are listed as labelled chips
5. **Send** — the safe prompt is forwarded to the LLM and the response is displayed
6. **Audit** — the session audit log below the main UI records every analysis

---

## Detection Types

All detection runs **locally** in the API route — raw text is never sent to a third party for analysis.

| Type           | Description                                    | Confidence |
|----------------|------------------------------------------------|------------|
| `EMAIL`        | Standard email addresses                       | 0.95       |
| `PHONE`        | India-friendly phone numbers (+91, 10-digit)   | 0.90       |
| `CREDIT_CARD`  | Major card formats; Luhn-validated             | 0.98       |
| `AADHAAR`      | 12-digit Indian national ID                    | 0.92       |
| `PAN`          | Indian tax ID (5 letters + 4 digits + 1 letter)| 0.97       |
| `IP_ADDRESS`   | IPv4 addresses (octet-validated)               | 0.85       |
| `PASSPORT`     | Indian passport format                         | 0.88       |
| `BANK_ACCOUNT` | Indian bank account numbers (9–18 digits)      | 0.75       |

---

## Anonymization Modes

| Mode        | Behaviour                                          | Example                   |
|-------------|----------------------------------------------------|---------------------------|
| **Mask**    | Partially obscure the value                        | `r***@g***.com`           |
| **Redact**  | Remove the value entirely                          | *(empty)*                 |
| **Replace** | Substitute with a typed token (best for LLMs)      | `[EMAIL]`                 |

---

## Session Audit Log

Every analysis is recorded in an in-memory session log (resets on page refresh). The log shows:
- Timestamp, risk level, number of PII items found, anonymization mode used, and whether the prompt was sent
- Expandable rows showing the full findings list for each entry
- A "Clear log" button to reset the session

---

## Deployment (Vercel)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. Vercel auto-detects Next.js — no build config needed
4. Add environment variable in the Vercel dashboard:

   | Key | Value |
   |---|---|
   | `OPENAI_API_KEY` | `sk-...` |

5. Click **Deploy**

> The mock LLM in `app/api/send/route.ts` is ready to be replaced with a real OpenAI call once `OPENAI_API_KEY` is set.

---

## API Reference

### `POST /api/analyze`

Scans text for PII and returns findings with a risk score.

**Request**
```json
{ "text": "string", "mode": "MASK" | "REDACT" | "REPLACE" }
```
`mode` is optional — defaults to `"MASK"`.

**Response**
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

**Risk thresholds:** 0 findings → `LOW` · 1–2 → `MEDIUM` · 3+ → `HIGH`

**Errors:** `400` for missing/empty text · `500` for unexpected errors

---

### `POST /api/send`

Forwards a (masked) prompt to the LLM and returns the response.

**Request**
```json
{ "text": "string" }
```

**Response**
```json
{ "response": "string" }
```

**Errors:** `400` for missing/empty text · `500` for unexpected errors

---

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [TypeScript](https://www.typescriptlang.org) (strict mode)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Vercel](https://vercel.com) for deployment

## Scripts

```bash
npm run dev    # start dev server
npm run build  # production build
npm run lint   # ESLint
npm test       # Jest unit tests
```

---

## Roadmap

**v0 — Complete ✅**
Web app on Vercel with regex-based PII detection (email, phone, credit card), risk scoring, masked/original toggle, and a demo-ready dark UI. No API key required.

**v1 — Complete ✅**
Expanded detection to 8 PII types: adds Aadhaar, PAN, IP address, passport, and Indian bank account numbers. Confidence scores per finding. Three anonymization modes (Mask / Redact / Replace). Real OpenAI integration ready (mock by default). Session audit log.

**v2 — MCP server** *(planned)*
Detection engine packaged as a local MCP server — works natively inside Claude Desktop, Cursor, and Windsurf. Fully local, no cloud, no data leaves the device. Installable via `npm install -g ai-security-gateway-mcp`.

**v3 — Smarter detection + browser extension** *(planned)*
NER model (spaCy) for unstructured PII like names and addresses — runs locally. Browser extension for ChatGPT.com and Gemini.google.com. Custom user-defined detection rules. Multi-language support.
