"use client";

import { useState } from "react";
import type { AuditLogEntry, RiskLevel, AnonymizationMode } from "@/types";
import type { AuditStats } from "@/hooks/useAuditLog";
import FindingsList from "./FindingsList";

// ---------------------------------------------------------------------------
// Small inline badges used only inside this component
// ---------------------------------------------------------------------------
const RISK_STYLE: Record<RiskLevel, string> = {
  LOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  HIGH: "bg-red-500/15 text-red-400 border-red-500/30",
};

const MODE_STYLE: Record<AnonymizationMode, string> = {
  MASK: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  REDACT: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  REPLACE: "bg-purple-500/10 text-purple-300 border-purple-500/20",
};

function SmallBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${className}`}
    >
      {label}
    </span>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AuditLogProps {
  entries: AuditLogEntry[];
  stats: AuditStats;
  onClear: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AuditLog({ entries, stats, onClear }: AuditLogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls="audit-log-body"
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <span
            aria-hidden="true"
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
            Session Audit Log
          </span>
          <span className="text-xs text-slate-500">
            {stats.totalScanned} prompt{stats.totalScanned !== 1 ? "s" : ""} scanned
            {" "}·{" "}
            {stats.totalPIIFound} PII item{stats.totalPIIFound !== 1 ? "s" : ""} caught
          </span>
        </button>

        {entries.length > 0 && (
          <button
            onClick={onClear}
            aria-label="Clear audit log"
            className="text-xs text-slate-500 hover:text-red-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-2 py-1"
          >
            Clear log
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {isOpen && (
        <div id="audit-log-body">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span aria-hidden="true" className="text-3xl opacity-30">📋</span>
              <p className="text-slate-500 text-sm">
                No prompts scanned yet in this session
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-left w-6">{/* expand */}</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Risk</th>
                    <th className="px-4 py-3 text-left">PII Found</th>
                    <th className="px-4 py-3 text-left">Mode</th>
                    <th className="px-4 py-3 text-left">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <>
                      <tr
                        key={entry.id}
                        onClick={() => toggleRow(entry.id)}
                        aria-expanded={expandedId === entry.id}
                        className="animate-slide-in border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 text-slate-500 text-xs select-none">
                          {expandedId === entry.id ? "▼" : "▶"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {formatTime(entry.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          <SmallBadge
                            label={entry.riskLevel}
                            className={RISK_STYLE[entry.riskLevel]}
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.findings.length > 0 ? (
                            <span>
                              {entry.findings.length} item{entry.findings.length !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-slate-600">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <SmallBadge
                            label={entry.mode}
                            className={MODE_STYLE[entry.mode]}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {entry.wasSent ? (
                            <span aria-label="Sent" className="text-emerald-400 text-base">✓</span>
                          ) : (
                            <span aria-label="Not sent" className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded findings row */}
                      {expandedId === entry.id && (
                        <tr key={`${entry.id}-expanded`} className="bg-slate-900/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                Prompt length: {entry.originalLength} chars
                              </p>
                              <FindingsList findings={entry.findings} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
