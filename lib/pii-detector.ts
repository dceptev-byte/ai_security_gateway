import type { Finding, PIIType, RiskLevel } from "@/types";

// ---------------------------------------------------------------------------
// Regex patterns (exactly as specified)
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /((\+91|0)[\s-]?)?[6-9]\d{9}/g;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]?){13,16}\b/g;

// ---------------------------------------------------------------------------
// Luhn algorithm — reduces false positives for credit card detection
// ---------------------------------------------------------------------------
function luhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// ---------------------------------------------------------------------------
// Masking helpers
// ---------------------------------------------------------------------------
function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex < 0) return email;
  const local = email.slice(0, atIndex);
  const rest = email.slice(atIndex + 1);
  const dotIndex = rest.lastIndexOf(".");
  const domain = dotIndex >= 0 ? rest.slice(0, dotIndex) : rest;
  const tld = dotIndex >= 0 ? rest.slice(dotIndex) : "";
  const maskedLocal = local.length > 0 ? local[0] + "***" : "***";
  const maskedDomain = domain.length > 0 ? domain[0] + "***" : "***";
  return `${maskedLocal}@${maskedDomain}${tld}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const core = digits.length > 10 ? digits.slice(-10) : digits;
  const visible = core.slice(-4);
  return `******${visible}`;
}

function maskCreditCard(card: string): string {
  const digits = card.replace(/[\s-]/g, "");
  const last4 = digits.slice(-4);
  return `**** **** **** ${last4}`;
}

const MASK_FN: Record<PIIType, (value: string) => string> = {
  EMAIL: maskEmail,
  PHONE: maskPhone,
  CREDIT_CARD: maskCreditCard,
};

// ---------------------------------------------------------------------------
// detectPII
// ---------------------------------------------------------------------------
export function detectPII(text: string): Finding[] {
  const findings: Finding[] = [];

  const runPattern = (regex: RegExp, type: PIIType, validate?: (v: string) => boolean) => {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      if (validate && !validate(value)) continue;
      findings.push({
        type,
        value,
        start: match.index,
        end: match.index + value.length,
      });
    }
  };

  runPattern(EMAIL_REGEX, "EMAIL");
  runPattern(PHONE_REGEX, "PHONE");
  runPattern(CREDIT_CARD_REGEX, "CREDIT_CARD", luhn);

  return findings;
}

// ---------------------------------------------------------------------------
// maskPII — replaces right-to-left to preserve indices
// ---------------------------------------------------------------------------
export function maskPII(text: string, findings: Finding[]): string {
  const sorted = [...findings].sort((a, b) => b.start - a.start);
  let result = text;
  for (const f of sorted) {
    const masked = MASK_FN[f.type](f.value);
    result = result.slice(0, f.start) + masked + result.slice(f.end);
  }
  return result;
}

// ---------------------------------------------------------------------------
// scoreRisk
// ---------------------------------------------------------------------------
export function scoreRisk(findings: Finding[]): RiskLevel {
  const count = findings.length;
  if (count === 0) return "LOW";
  if (count <= 2) return "MEDIUM";
  return "HIGH";
}
