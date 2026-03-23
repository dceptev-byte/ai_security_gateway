export type AnonymizationMode = "MASK" | "REDACT" | "REPLACE";

export type PIIType =
  | "EMAIL"
  | "PHONE"
  | "CREDIT_CARD"
  | "AADHAAR"
  | "PAN"
  | "IP_ADDRESS"
  | "PASSPORT"
  | "BANK_ACCOUNT";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Finding {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AnalyzeResult {
  riskLevel: RiskLevel;
  findings: Finding[];
  maskedText: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  originalLength: number;
  findings: Finding[];
  riskLevel: RiskLevel;
  mode: AnonymizationMode;
  wasSent: boolean;
}
