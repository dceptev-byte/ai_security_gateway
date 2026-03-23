"use client";

import { useState } from "react";
import type { AuditLogEntry } from "@/types";

export interface AuditStats {
  totalScanned: number;
  totalPIIFound: number;
  totalSent: number;
}

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  function addEntry(entry: AuditLogEntry) {
    setEntries((prev) => [entry, ...prev]);
  }

  function markSent(id: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, wasSent: true } : e))
    );
  }

  function clearLog() {
    setEntries([]);
  }

  const stats: AuditStats = {
    totalScanned: entries.length,
    totalPIIFound: entries.reduce((sum, e) => sum + e.findings.length, 0),
    totalSent: entries.filter((e) => e.wasSent).length,
  };

  return { entries, addEntry, markSent, clearLog, stats };
}
