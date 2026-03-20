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

1. **Paste** a prompt into the textarea (sample PII is pre-filled for demo)
2. **Analyze** — the app scans for emails, phone numbers, and credit card numbers and returns a risk score
3. **Review** — toggle between the original and masked text; findings are listed as labelled chips
4. **Send** — the masked (safe) prompt is forwarded to the LLM and the response is displayed

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
{ "text": "string" }
```

**Response**
```json
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "findings": [
    { "type": "EMAIL" | "PHONE" | "CREDIT_CARD", "value": "string", "start": 0, "end": 17 }
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
