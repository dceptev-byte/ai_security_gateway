import type { Finding, PIIType, RiskLevel } from "@/types";

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /((\+91|0)[\s-]?)?[6-9]\d{9}/g;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]?){13,16}\b/g;
const AADHAAR_REGEX = /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/g;
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
const IP_ADDRESS_REGEX =
  /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
const PASSPORT_REGEX = /\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b/g;
const BANK_ACCOUNT_REGEX = /\b[0-9]{9,18}\b/g;

const BANKING_CONTEXT_RE = /\b(account|acc|bank|savings|current)\b/i;

// ---------------------------------------------------------------------------
// Confidence scores
// ---------------------------------------------------------------------------
const CONFIDENCE: Record<PIIType, number> = {
  EMAIL: 0.95,
  PHONE: 0.90,
  CREDIT_CARD: 0.98,
  AADHAAR: 0.92,
  PAN: 0.97,
  IP_ADDRESS: 0.85,
  PASSPORT: 0.88,
  BANK_ACCOUNT: 0.75,
};

// ---------------------------------------------------------------------------
// Luhn algorithm
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
// Context & overlap helpers
// ---------------------------------------------------------------------------
function hasBankingContext(
  text: string,
  start: number,
  end: number
): boolean {
  const window = 60;
  const before = text.slice(Math.max(0, start - window), start);
  const after = text.slice(end, Math.min(text.length, end + window));
  return BANKING_CONTEXT_RE.test(before) || BANKING_CONTEXT_RE.test(after);
}

function overlapsExisting(
  findings: Finding[],
  start: number,
  end: number
): boolean {
  return findings.some((f) => start < f.end && end > f.start);
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
  return `******${core.slice(-4)}`;
}

function maskCreditCard(card: string): string {
  const digits = card.replace(/[\s-]/g, "");
  return `**** **** **** ${digits.slice(-4)}`;
}

function maskAadhaar(value: string): string {
  const digits = value.replace(/\D/g, "");
  return `**** **** ${digits.slice(-4)}`;
}

function maskPan(value: string): string {
  // ABCDE1234F → ***** 1234 *  (digits portion only visible)
  return `***** ${value.slice(5, 9)} *`;
}

function maskIpAddress(): string {
  return "***.***.***.***";
}

function maskPassport(value: string): string {
  return "*".repeat(value.replace(/\s/g, "").length);
}

function maskBankAccount(value: string): string {
  const digits = value.replace(/\D/g, "");
  return "*".repeat(digits.length - 4) + digits.slice(-4);
}

const MASK_FN: Record<PIIType, (value: string) => string> = {
  EMAIL: maskEmail,
  PHONE: maskPhone,
  CREDIT_CARD: maskCreditCard,
  AADHAAR: maskAadhaar,
  PAN: maskPan,
  IP_ADDRESS: () => maskIpAddress(),
  PASSPORT: maskPassport,
  BANK_ACCOUNT: maskBankAccount,
};

// ---------------------------------------------------------------------------
// detectPII
// ---------------------------------------------------------------------------
export function detectPII(text: string): Finding[] {
  const findings: Finding[] = [];

  const run = (
    regex: RegExp,
    type: PIIType,
    validate?: (value: string, start: number, end: number) => boolean
  ) => {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      if (validate && !validate(value, start, end)) continue;
      findings.push({ type, value, start, end, confidence: CONFIDENCE[type] });
    }
  };

  run(EMAIL_REGEX, "EMAIL");
  run(PHONE_REGEX, "PHONE");
  run(CREDIT_CARD_REGEX, "CREDIT_CARD", (v) => luhn(v));
  run(AADHAAR_REGEX, "AADHAAR");
  run(PAN_REGEX, "PAN");
  run(IP_ADDRESS_REGEX, "IP_ADDRESS");
  run(PASSPORT_REGEX, "PASSPORT");
  // BANK_ACCOUNT: require banking context and no overlap with already-found PII
  run(
    BANK_ACCOUNT_REGEX,
    "BANK_ACCOUNT",
    (_v, start, end) =>
      hasBankingContext(text, start, end) &&
      !overlapsExisting(findings, start, end)
  );

  return findings;
}

// ---------------------------------------------------------------------------
// maskPII — right-to-left replacement to preserve indices
// ---------------------------------------------------------------------------
export function maskPII(text: string, findings: Finding[]): string {
  const sorted = [...findings].sort((a, b) => b.start - a.start);
  let result = text;
  for (const f of sorted) {
    result =
      result.slice(0, f.start) + MASK_FN[f.type](f.value) + result.slice(f.end);
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
