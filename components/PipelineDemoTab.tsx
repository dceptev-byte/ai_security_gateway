"use client";

import { useState } from "react";
import type { Finding, RiskLevel } from "@/types";

// ─── types ───────────────────────────────────────────────────────────────────

interface TokenizeResponse {
  tokenizedText: string;
  tokenMapId: string;
  findings: Finding[];
  riskLevel: RiskLevel;
  tokenCount: number;
}

interface TokenChip {
  token: string;
  type: string;
  originalValue: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const SAMPLE_DOC = `Insurance Claim Form
Claimant: Rahul Sharma
Email: rahul.sharma@gmail.com
Phone: +91 9876543210
Aadhaar: 2345 6789 0123
PAN: ABCDE1234F
Claim amount: ₹45,000
Bank account: 123456789012
Description: Patient was admitted on 12th March for surgery.`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildTokenChips(
  tokenizedText: string,
  findings: Finding[]
): TokenChip[] {
  const tokenRegex = /\[([A-Z_]+)_[a-z0-9]{6}\]/g;
  const seenTokens = new Set<string>();
  const orderedTokens: Array<{ token: string; type: string }> = [];

  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(tokenizedText)) !== null) {
    const token = m[0];
    if (!seenTokens.has(token)) {
      seenTokens.add(token);
      orderedTokens.push({ token, type: m[1] });
    }
  }

  // Build per-type finding list (deduplicated by value)
  const findingsByType = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!findingsByType.has(f.type)) findingsByType.set(f.type, []);
    const arr = findingsByType.get(f.type)!;
    if (!arr.some((e) => e.value === f.value)) arr.push(f);
  }

  const typeIndex = new Map<string, number>();
  return orderedTokens.map(({ token, type }) => {
    const idx = typeIndex.get(type) ?? 0;
    typeIndex.set(type, idx + 1);
    const typFindings = findingsByType.get(type) ?? [];
    return { token, type, originalValue: typFindings[idx]?.value ?? "???" };
  });
}

function buildMockLLMResponse(
  tokenizedText: string,
  findings: Finding[]
): string {
  const chips = buildTokenChips(tokenizedText, findings);
  const get = (type: string) =>
    chips.find((c) => c.type === type)?.token ?? `[${type}]`;

  return [
    `I have processed the insurance claim for ${get("EMAIL")}.`,
    "",
    `The claimant with Aadhaar ${get("AADHAAR")} has submitted a claim for ₹45,000.`,
    `Bank account ${get("BANK_ACCOUNT")} has been noted for disbursement.`,
    "",
    `Please verify the claimant's identity using PAN ${get("PAN")} before processing payment.`,
    "",
    "All sensitive identifiers have been preserved as tokens and will be restored in your secure system.",
  ].join("\n");
}

// ─── small UI atoms ───────────────────────────────────────────────────────────

function CodeBlock({ text }: { text: string }) {
  return (
    <pre className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
      {text}
    </pre>
  );
}

function PipelineButton({
  onClick,
  loading,
  disabled = false,
  color,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  color: "blue" | "purple" | "green";
  children: React.ReactNode;
}) {
  const colorClasses = {
    blue: "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 focus-visible:ring-blue-500 shadow-blue-900/30",
    purple:
      "bg-violet-600 hover:bg-violet-500 active:bg-violet-700 focus-visible:ring-violet-500 shadow-violet-900/30",
    green:
      "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 focus-visible:ring-emerald-500 shadow-emerald-900/30",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 shadow-lg ${colorClasses[color]}`}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
          />
          Processing…
        </>
      ) : (
        children
      )}
    </button>
  );
}

function StageConnector({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center">
      {active ? (
        <div className="w-0.5 h-8 bg-emerald-500" />
      ) : (
        <div className="h-8 w-0 border-l-2 border-dashed border-slate-600" />
      )}
    </div>
  );
}

function StageCard({
  number,
  label,
  complete,
  children,
}: {
  number: number;
  label: string;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-slide-in bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
      <div
        className={`flex items-center gap-3 px-6 py-4 border-b border-slate-700 ${complete ? "bg-emerald-500/5" : ""}`}
      >
        <span
          className={`flex-none w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
            complete
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
              : "bg-slate-700 border-slate-600 text-slate-400"
          }`}
        >
          {complete ? "✓" : number}
        </span>
        <span className="text-sm font-semibold text-slate-200">{label}</span>
      </div>
      <div className="p-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function PipelineDemoTab() {
  const [docText, setDocText] = useState(SAMPLE_DOC);

  const [isTokenizing, setIsTokenizing] = useState(false);
  const [tokenizeResult, setTokenizeResult] = useState<TokenizeResponse | null>(
    null
  );

  const [isSending, setIsSending] = useState(false);
  const [llmOutput, setLlmOutput] = useState<string | null>(null);

  const [isDetokenizing, setIsDetokenizing] = useState(false);
  const [restoredText, setRestoredText] = useState<string | null>(null);
  const [tokensRestored, setTokensRestored] = useState(0);

  const [error, setError] = useState<string | null>(null);

  function resetPipeline() {
    setTokenizeResult(null);
    setLlmOutput(null);
    setRestoredText(null);
    setTokensRestored(0);
    setError(null);
  }

  function handleDocChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDocText(e.target.value);
    resetPipeline();
  }

  async function handleTokenize() {
    resetPipeline();
    setIsTokenizing(true);
    try {
      const res = await fetch("/api/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: docText }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Tokenization failed.";
        setError(msg);
        return;
      }
      setTokenizeResult(data as TokenizeResponse);
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setIsTokenizing(false);
    }
  }

  async function handleSendToLLM() {
    if (!tokenizeResult) return;
    setIsSending(true);
    setLlmOutput(null);
    try {
      // Brief artificial delay so the demo step feels real
      await new Promise<void>((r) => setTimeout(r, 800));
      setLlmOutput(
        buildMockLLMResponse(
          tokenizeResult.tokenizedText,
          tokenizeResult.findings
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleDetokenize() {
    if (!llmOutput || !tokenizeResult) return;
    setIsDetokenizing(true);
    setRestoredText(null);
    try {
      const res = await fetch("/api/detokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: llmOutput,
          tokenMapId: tokenizeResult.tokenMapId,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Detokenization failed.";
        setError(msg);
        return;
      }
      const result = data as { restoredText: string; tokensRestored: number };
      setRestoredText(result.restoredText);
      setTokensRestored(result.tokensRestored);
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setIsDetokenizing(false);
    }
  }

  const tokenChips = tokenizeResult
    ? buildTokenChips(tokenizeResult.tokenizedText, tokenizeResult.findings)
    : [];

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-0">
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Stage 1: Input ── */}
      <StageCard
        number={1}
        label="📄 Raw Document (from email attachment)"
        complete={!!tokenizeResult}
      >
        <label htmlFor="pipeline-doc" className="sr-only">
          Raw document text
        </label>
        <textarea
          id="pipeline-doc"
          value={docText}
          onChange={handleDocChange}
          rows={10}
          disabled={isTokenizing}
          className="w-full resize-y rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-sm text-slate-100 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
        />
        <PipelineButton
          onClick={handleTokenize}
          loading={isTokenizing}
          color="blue"
        >
          <span aria-hidden="true">🔐</span>
          Tokenize
        </PipelineButton>
      </StageCard>

      <StageConnector active={!!tokenizeResult} />

      {/* ── Stage 2: Tokenized ── */}
      {tokenizeResult && (
        <StageCard
          number={2}
          label="🔒 Tokenized Text (safe to send to LLM)"
          complete={!!llmOutput}
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {tokenizeResult.tokenCount} token
              {tokenizeResult.tokenCount !== 1 ? "s" : ""} created · Risk:{" "}
              <span
                className={
                  tokenizeResult.riskLevel === "HIGH"
                    ? "text-red-400"
                    : tokenizeResult.riskLevel === "MEDIUM"
                      ? "text-amber-400"
                      : "text-emerald-400"
                }
              >
                {tokenizeResult.riskLevel}
              </span>
            </p>
            <CodeBlock text={tokenizeResult.tokenizedText} />
          </div>

          {/* Token map chips */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Token Map
            </p>
            <div className="flex flex-wrap gap-2">
              {tokenChips.map(({ token, originalValue }) => (
                <div
                  key={token}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-xs font-mono"
                >
                  <span className="text-violet-400">{token}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-300">{originalValue}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600 font-mono">
            Token map ID: {tokenizeResult.tokenMapId}
          </p>

          <PipelineButton
            onClick={handleSendToLLM}
            loading={isSending}
            color="purple"
          >
            <span aria-hidden="true">🤖</span>
            Send to Claude (simulated)
          </PipelineButton>
        </StageCard>
      )}

      {tokenizeResult && <StageConnector active={!!llmOutput} />}

      {/* ── Stage 3: LLM Output ── */}
      {llmOutput && (
        <StageCard
          number={3}
          label="🤖 Claude's Response (tokens preserved)"
          complete={!!restoredText}
        >
          <CodeBlock text={llmOutput} />
          <PipelineButton
            onClick={handleDetokenize}
            loading={isDetokenizing}
            color="green"
          >
            <span aria-hidden="true">🔓</span>
            Detokenize
          </PipelineButton>
        </StageCard>
      )}

      {llmOutput && <StageConnector active={!!restoredText} />}

      {/* ── Stage 4: Restored ── */}
      {restoredText && (
        <StageCard
          number={4}
          label="✅ Restored Output (real values back)"
          complete={true}
        >
          <CodeBlock text={restoredText} />
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
            <span aria-hidden="true">✅</span>
            <span>
              {tokensRestored} token{tokensRestored !== 1 ? "s" : ""} restored
              — real values never left your system
            </span>
          </div>
        </StageCard>
      )}
    </div>
  );
}
