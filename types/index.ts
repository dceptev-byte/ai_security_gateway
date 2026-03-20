export type PIIType = "EMAIL" | "PHONE" | "CREDIT_CARD";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Finding {
  type: PIIType;
  value: string;
  start: number;
  end: number;
}

export interface AnalyzeResult {
  riskLevel: RiskLevel;
  findings: Finding[];
  maskedText: string;
}
