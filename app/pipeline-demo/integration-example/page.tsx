"use client";

import { useState } from "react";
import Link from "next/link";

// ─── code examples ────────────────────────────────────────────────────────────

const PYTHON_EXAMPLE = `import requests

GATEWAY_URL = "https://your-gateway.vercel.app"

def process_document_safely(extracted_text: str) -> str:
    # Step 1: Tokenize before sending to Claude
    response = requests.post(
        f"{GATEWAY_URL}/api/tokenize",
        json={"text": extracted_text}
    )
    result = response.json()
    tokenized_text = result["tokenizedText"]
    token_map_id   = result["tokenMapId"]

    print(f"Tokenized {result['tokenCount']} PII item(s) — risk: {result['riskLevel']}")

    # Step 2: Send tokenized text to Claude (your existing code)
    claude_output = call_claude(tokenized_text)

    # Step 3: Restore real values
    response = requests.post(
        f"{GATEWAY_URL}/api/detokenize",
        json={"text": claude_output, "tokenMapId": token_map_id}
    )
    restored = response.json()
    print(f"Restored {restored['tokensRestored']} token(s)")
    return restored["restoredText"]`;

const NODE_EXAMPLE = `const GATEWAY_URL = "https://your-gateway.vercel.app";

async function processDocumentSafely(extractedText) {
  // Step 1: Tokenize before sending to Claude
  const tokenizeRes = await fetch(\`\${GATEWAY_URL}/api/tokenize\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: extractedText }),
  });
  const { tokenizedText, tokenMapId, tokenCount, riskLevel } =
    await tokenizeRes.json();

  console.log(\`Tokenized \${tokenCount} PII item(s) — risk: \${riskLevel}\`);

  // Step 2: Send tokenized text to Claude (your existing code)
  const claudeOutput = await callClaude(tokenizedText);

  // Step 3: Restore real values
  const detokenizeRes = await fetch(\`\${GATEWAY_URL}/api/detokenize\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: claudeOutput, tokenMapId }),
  });
  const { restoredText, tokensRestored } = await detokenizeRes.json();

  console.log(\`Restored \${tokensRestored} token(s)\`);
  return restoredText;
}`;

const CURL_EXAMPLE = `# Step 1: Tokenize your document
curl -s -X POST https://your-gateway.vercel.app/api/tokenize \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Claim for rahul.sharma@gmail.com, Aadhaar: 2345 6789 0123"}' \\
  | tee /tmp/tokenize_result.json

# The response contains tokenizedText and tokenMapId:
# {
#   "tokenizedText": "Claim for [EMAIL_a1b2c3], Aadhaar: [AADHAAR_d4e5f6]",
#   "tokenMapId": "550e8400-e29b-41d4-a716-446655440000",
#   "tokenCount": 2,
#   "riskLevel": "MEDIUM",
#   ...
# }

# Step 2: Send tokenized text to your LLM (example omitted)

# Step 3: Detokenize the LLM output
curl -s -X POST https://your-gateway.vercel.app/api/detokenize \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Processed claim for [EMAIL_a1b2c3]. Aadhaar [AADHAAR_d4e5f6] verified.",
    "tokenMapId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Restored output:
# {
#   "restoredText": "Processed claim for rahul.sharma@gmail.com. Aadhaar 2345 6789 0123 verified.",
#   "tokensRestored": 2,
#   "originalTokenMapId": "550e8400-e29b-41d4-a716-446655440000"
# }`;

// ─── token type table data ────────────────────────────────────────────────────

const TOKEN_TYPES = [
  { type: "EMAIL", example: "rahul.sharma@gmail.com", token: "[EMAIL_a1b2c3]", confidence: "0.95" },
  { type: "PHONE", example: "+91 9876543210", token: "[PHONE_d4e5f6]", confidence: "0.90" },
  { type: "CREDIT_CARD", example: "4532 1234 5678 9012", token: "[CREDIT_CARD_g7h8i9]", confidence: "0.98" },
  { type: "AADHAAR", example: "2345 6789 0123", token: "[AADHAAR_j1k2l3]", confidence: "0.92" },
  { type: "PAN", example: "ABCDE1234F", token: "[PAN_m4n5o6]", confidence: "0.97" },
  { type: "IP_ADDRESS", example: "192.168.1.105", token: "[IP_ADDRESS_p7q8r9]", confidence: "0.85" },
  { type: "PASSPORT", example: "A1234567", token: "[PASSPORT_s1t2u3]", confidence: "0.88" },
  { type: "BANK_ACCOUNT", example: "123456789012", token: "[BANK_ACCOUNT_v4w5x6]", confidence: "0.75" },
];

type Lang = "python" | "nodejs" | "curl";

const LANG_CONFIG: Record<Lang, { label: string; example: string }> = {
  python: { label: "Python", example: PYTHON_EXAMPLE },
  nodejs: { label: "Node.js", example: NODE_EXAMPLE },
  curl: { label: "curl", example: CURL_EXAMPLE },
};

const LANGS: Lang[] = ["python", "nodejs", "curl"];

// ─── component ────────────────────────────────────────────────────────────────

export default function IntegrationExamplePage() {
  const [activeLang, setActiveLang] = useState<Lang>("python");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <span aria-hidden="true" className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              AI Security Gateway
            </h1>
            <p className="text-xs text-slate-500">Integration Examples</p>
          </div>
          <Link
            href="/"
            className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200 flex items-center gap-1"
          >
            ← Back to Pipeline Demo
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-10">

        {/* Intro */}
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold text-slate-100">
            Integrating the Tokenisation API
          </h2>
          <p className="text-slate-400 leading-relaxed max-w-2xl">
            Add PII protection to any existing LLM pipeline in three steps:
            tokenize the input, send the safe version to your model, then
            restore the real values from the model&apos;s output. No changes to
            your LLM code needed.
          </p>

          {/* Steps */}
          <ol className="flex flex-col sm:flex-row gap-4 mt-2">
            {[
              { n: "1", icon: "🔐", title: "Tokenize", desc: "POST /api/tokenize — replaces PII with typed tokens" },
              { n: "2", icon: "🤖", title: "Call LLM", desc: "Send tokenized text to Claude, GPT-4, or any model" },
              { n: "3", icon: "🔓", title: "Detokenize", desc: "POST /api/detokenize — restores real values" },
            ].map(({ n, icon, title, desc }) => (
              <li
                key={n}
                className="flex-1 flex gap-3 items-start bg-slate-800 border border-slate-700 rounded-xl p-4"
              >
                <span className="flex-none w-7 h-7 rounded-full bg-blue-500/20 border-2 border-blue-500 text-blue-400 flex items-center justify-center text-xs font-bold">
                  {n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {icon} {title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Code examples */}
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Code Examples
          </h3>

          {/* Language tabs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div
              role="tablist"
              aria-label="Programming language"
              className="flex border-b border-slate-700"
            >
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  role="tab"
                  type="button"
                  aria-selected={activeLang === lang}
                  onClick={() => setActiveLang(lang)}
                  className={[
                    "px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    activeLang === lang
                      ? "border-blue-500 text-blue-400 bg-slate-800"
                      : "border-transparent text-slate-500 hover:text-slate-300 bg-slate-900",
                  ].join(" ")}
                >
                  {LANG_CONFIG[lang].label}
                </button>
              ))}
            </div>

            <pre className="px-6 py-5 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
              {LANG_CONFIG[activeLang].example}
            </pre>
          </div>
        </section>

        {/* Token types table */}
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Supported Token Types
          </h3>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Example value</th>
                  <th className="px-5 py-3 text-left">Token format</th>
                  <th className="px-5 py-3 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {TOKEN_TYPES.map(({ type, example, token, confidence }, i) => (
                  <tr
                    key={type}
                    className={`border-b border-slate-700/50 ${i % 2 === 0 ? "" : "bg-slate-700/10"}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-violet-400 font-semibold">
                      {type}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">
                      {example}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">
                      {token}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {confidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Notes */}
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Production Notes
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">

            <div className="bg-slate-800 border border-amber-500/20 rounded-xl p-5 flex flex-col gap-2">
              <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <span aria-hidden="true">⏱</span> Token map expiry
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Token maps are stored in memory and expire after{" "}
                <span className="text-slate-300 font-medium">1 hour</span>.
                Tokenize and detokenize within the same request cycle, or
                store the <code className="text-xs bg-slate-700 rounded px-1 py-0.5">tokenMapId</code> and
                complete the pipeline before expiry.
              </p>
            </div>

            <div className="bg-slate-800 border border-blue-500/20 rounded-xl p-5 flex flex-col gap-2">
              <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                <span aria-hidden="true">🗄</span> Persistent storage for production
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                The in-memory store resets on every server restart. For
                long-running or high-throughput pipelines, replace{" "}
                <code className="text-xs bg-slate-700 rounded px-1 py-0.5">lib/token-store.ts</code>{" "}
                with a persistent backend such as{" "}
                <span className="text-slate-300 font-medium">Redis</span> or{" "}
                <span className="text-slate-300 font-medium">DynamoDB</span>{" "}
                with a TTL index.
              </p>
            </div>

          </div>
        </section>

        {/* Back link */}
        <div className="pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            ← Back to Pipeline Demo
          </Link>
        </div>

      </main>
    </div>
  );
}
