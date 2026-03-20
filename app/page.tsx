"use client";

import { useState } from "react";
import type { Finding, RiskLevel } from "@/types";
import RiskBadge from "@/components/RiskBadge";
import FindingsList from "@/components/FindingsList";
import ToggleSwitch from "@/components/ToggleSwitch";

const SAMPLE_PROMPT = `Hi, I need help reviewing my account details.

My name is John Smith and my email is john.smith@acmecorp.com.
You can also reach me at +91 9876543210.

I noticed an unexpected charge on my Visa card 4111 1111 1111 1111.
Could you help me understand this transaction and dispute it if necessary?`;

interface AnalyzeResult {
  riskLevel: RiskLevel;
  findings: Finding[];
  maskedText: string;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-700/60 ${className}`}
    />
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showMasked, setShowMasked] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [llmResponse, setLlmResponse] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setResult(null);
    setLlmResponse(null);
    setSendError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as Record<string, unknown>).error === "string"
            ? (data as Record<string, string>).error
            : "Analysis failed.";
        setAnalyzeError(msg);
        return;
      }
      setResult(data as AnalyzeResult);
      setShowMasked(true);
    } catch {
      setAnalyzeError("Network error — could not reach the server.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSend() {
    if (!result) return;
    setIsSending(true);
    setSendError(null);
    setLlmResponse(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.maskedText }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as Record<string, unknown>).error === "string"
            ? (data as Record<string, string>).error
            : "Send failed.";
        setSendError(msg);
        return;
      }
      const resp =
        typeof data === "object" &&
        data !== null &&
        "response" in data &&
        typeof (data as Record<string, unknown>).response === "string"
          ? (data as Record<string, string>).response
          : "No response.";
      setLlmResponse(resp);
    } catch {
      setSendError("Network error — could not reach the server.");
    } finally {
      setIsSending(false);
    }
  }

  const displayText =
    result && showMasked ? result.maskedText : prompt;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              AI Security Gateway
            </h1>
          </div>
          <p className="sm:ml-4 text-sm text-slate-400 sm:border-l sm:border-slate-700 sm:pl-4">
            Detect and mask sensitive data before it reaches the LLM
          </p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 grid lg:grid-cols-2 gap-6 items-start">

        {/* ── LEFT: Input ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Your Prompt
            </h2>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              className="w-full resize-y rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 font-mono leading-relaxed
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 disabled:opacity-50"
              placeholder="Paste your prompt here…"
              disabled={isAnalyzing}
            />

            {analyzeError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                <span>⚠️</span>
                <span>{analyzeError}</span>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || prompt.trim() === ""}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                         px-6 py-3 text-sm font-semibold text-white
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                         shadow-lg shadow-blue-900/30"
            >
              {isAnalyzing ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Scanning…
                </>
              ) : (
                <>🔍 Analyze Prompt</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="flex flex-col gap-4">

          {/* Loading skeleton */}
          {isAnalyzing && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col gap-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-10 w-48" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-8 w-28" />
                <SkeletonBlock className="h-8 w-28" />
              </div>
              <SkeletonBlock className="h-px w-full" />
              <SkeletonBlock className="h-28 w-full" />
            </div>
          )}

          {/* Empty state */}
          {!isAnalyzing && !result && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-10 flex flex-col items-center justify-center gap-4 text-center min-h-[240px]">
              <span className="text-5xl opacity-40">🔎</span>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Paste a prompt and click{" "}
                <span className="text-slate-300 font-medium">Analyze</span> to
                scan for sensitive data
              </p>
            </div>
          )}

          {/* Results panel */}
          {!isAnalyzing && result && (
            <div className="animate-fade-in bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col gap-6">

              {/* Risk level */}
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Risk Level
                </h2>
                <RiskBadge riskLevel={result.riskLevel} />
              </div>

              <div className="border-t border-slate-700" />

              {/* Findings */}
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Findings{" "}
                  <span className="normal-case font-normal text-slate-500">
                    ({result.findings.length} detected)
                  </span>
                </h2>
                <FindingsList findings={result.findings} />
              </div>

              <div className="border-t border-slate-700" />

              {/* Toggle + text display */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Prompt Preview
                  </h2>
                  <ToggleSwitch
                    checked={showMasked}
                    onChange={setShowMasked}
                    labelLeft="Original"
                    labelRight="Masked"
                  />
                </div>

                <pre className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
                  {displayText}
                </pre>
              </div>

              {/* Send button */}
              {sendError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  <span>⚠️</span>
                  <span>{sendError}</span>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                           px-6 py-3 text-sm font-semibold text-white
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                           shadow-lg shadow-emerald-900/30"
              >
                {isSending ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>🚀 Send Safe Prompt</>
                )}
              </button>
            </div>
          )}

          {/* LLM Response */}
          {llmResponse && (
            <div className="animate-fade-in bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                LLM Response
              </h2>
              <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-4 text-sm text-slate-300 leading-relaxed">
                {llmResponse}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
