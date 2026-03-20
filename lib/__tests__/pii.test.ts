import { detectPII, maskPII, scoreRisk } from "../pii-detector";
import type { Finding } from "@/types";

// ---------------------------------------------------------------------------
// Email detection
// ---------------------------------------------------------------------------
describe("detectPII — email", () => {
  it("detects a standard email", () => {
    const findings = detectPII("Contact alice@example.com please.");
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("EMAIL");
    expect(findings[0].value).toBe("alice@example.com");
  });

  it("captures correct start/end positions", () => {
    const text = "Email: bob@test.com here";
    const findings = detectPII(text);
    expect(findings[0].start).toBe(7);
    expect(findings[0].end).toBe(19);
    expect(text.slice(findings[0].start, findings[0].end)).toBe("bob@test.com");
  });

  it("detects multiple emails", () => {
    const findings = detectPII("a@b.com and c@d.org");
    expect(findings.filter((f) => f.type === "EMAIL")).toHaveLength(2);
  });

  it("rejects invalid email — missing TLD", () => {
    const findings = detectPII("not-an-email@nodot");
    expect(findings.filter((f) => f.type === "EMAIL")).toHaveLength(0);
  });

  it("rejects invalid email — missing @", () => {
    const findings = detectPII("justaplainword");
    expect(findings.filter((f) => f.type === "EMAIL")).toHaveLength(0);
  });

  it("detects email with subdomain", () => {
    const findings = detectPII("user@mail.example.co.uk");
    expect(findings.filter((f) => f.type === "EMAIL")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Phone detection
// ---------------------------------------------------------------------------
describe("detectPII — phone", () => {
  it("detects a bare 10-digit Indian mobile number", () => {
    const findings = detectPII("Call 9876543210 now.");
    expect(findings.filter((f) => f.type === "PHONE")).toHaveLength(1);
    expect(findings[0].value).toBe("9876543210");
  });

  it("detects +91 prefix", () => {
    const findings = detectPII("+919876543210");
    expect(findings.filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("detects 0 prefix", () => {
    const findings = detectPII("0 9876543210");
    expect(findings.filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("detects phone with space between prefix and number", () => {
    const findings = detectPII("+91 9876543210");
    expect(findings.filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("detects phone with dash between prefix and number", () => {
    const findings = detectPII("+91-9876543210");
    expect(findings.filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("does not detect a number starting with an invalid digit (< 6)", () => {
    const findings = detectPII("1234567890");
    expect(findings.filter((f) => f.type === "PHONE")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Credit card detection (with Luhn check)
// ---------------------------------------------------------------------------
describe("detectPII — credit card", () => {
  it("detects a valid Visa number (passes Luhn)", () => {
    // 4111111111111111 is the canonical Luhn-valid test card
    const findings = detectPII("Card: 4111111111111111");
    expect(findings.filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
    expect(findings[0].value).toBe("4111111111111111");
  });

  it("rejects a 16-digit number that fails Luhn", () => {
    // 4111111111111112 — one digit off, fails Luhn
    const findings = detectPII("Card: 4111111111111112");
    expect(findings.filter((f) => f.type === "CREDIT_CARD")).toHaveLength(0);
  });

  it("detects a card with spaces (Luhn-valid)", () => {
    const findings = detectPII("4111 1111 1111 1111");
    expect(findings.filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
  });

  it("detects a card with dashes (Luhn-valid)", () => {
    const findings = detectPII("4111-1111-1111-1111");
    expect(findings.filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
  });

  it("detects a valid MasterCard number (passes Luhn)", () => {
    // 5500005555555559 — canonical Luhn-valid MasterCard test number
    const findings = detectPII("5500005555555559");
    expect(findings.filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Masking output format
// ---------------------------------------------------------------------------
describe("maskPII — output format", () => {
  it("masks email: keeps first char of local, first char of domain, full TLD", () => {
    const text = "alice@example.com";
    const findings = detectPII(text);
    expect(maskPII(text, findings)).toBe("a***@e***.com");
  });

  it("masks phone: hides all but last 4 digits", () => {
    const text = "9876543210";
    const findings = detectPII(text);
    expect(maskPII(text, findings)).toBe("******3210");
  });

  it("masks credit card: **** **** **** last4", () => {
    const text = "4111111111111111";
    const findings = detectPII(text);
    expect(maskPII(text, findings)).toBe("**** **** **** 1111");
  });

  it("returns unchanged text when no findings", () => {
    expect(maskPII("Hello world", [])).toBe("Hello world");
  });

  it("replaces positions correctly (right-to-left preserves indices)", () => {
    const text = "Email: alice@example.com, also bob@test.com";
    const findings = detectPII(text);
    const result = maskPII(text, findings);
    expect(result).not.toContain("alice@example.com");
    expect(result).not.toContain("bob@test.com");
    expect(result).toContain("a***@e***.com");
    expect(result).toContain("b***@t***.com");
  });
});

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------
describe("scoreRisk", () => {
  it("returns LOW for 0 findings", () => {
    expect(scoreRisk([])).toBe("LOW");
  });

  it("returns MEDIUM for 1 finding", () => {
    const f: Finding[] = [{ type: "EMAIL", value: "x@y.com", start: 0, end: 7 }];
    expect(scoreRisk(f)).toBe("MEDIUM");
  });

  it("returns MEDIUM for 2 findings", () => {
    const f: Finding[] = [
      { type: "EMAIL", value: "x@y.com", start: 0, end: 7 },
      { type: "PHONE", value: "9876543210", start: 10, end: 20 },
    ];
    expect(scoreRisk(f)).toBe("MEDIUM");
  });

  it("returns HIGH for 3 findings", () => {
    const f: Finding[] = [
      { type: "EMAIL", value: "x@y.com", start: 0, end: 7 },
      { type: "PHONE", value: "9876543210", start: 10, end: 20 },
      { type: "CREDIT_CARD", value: "4111111111111111", start: 25, end: 41 },
    ];
    expect(scoreRisk(f)).toBe("HIGH");
  });

  it("returns HIGH for 4+ findings", () => {
    const f: Finding[] = Array.from({ length: 4 }, (_, i) => ({
      type: "EMAIL" as const,
      value: `u${i}@x.com`,
      start: i * 10,
      end: i * 10 + 8,
    }));
    expect(scoreRisk(f)).toBe("HIGH");
  });
});

// ---------------------------------------------------------------------------
// Mixed PII in a single string
// ---------------------------------------------------------------------------
describe("detectPII — mixed text", () => {
  it("detects all PII types in one string", () => {
    const text =
      "Contact bob@test.com or call +91 9876543210. Card: 4111111111111111.";
    const findings = detectPII(text);
    const types = findings.map((f) => f.type);
    expect(types).toContain("EMAIL");
    expect(types).toContain("PHONE");
    expect(types).toContain("CREDIT_CARD");
  });

  it("masks all PII types correctly in mixed text", () => {
    const text = "bob@test.com / 9876543210 / 4111111111111111";
    const findings = detectPII(text);
    const result = maskPII(text, findings);
    expect(result).not.toContain("bob@test.com");
    expect(result).not.toContain("9876543210");
    expect(result).not.toContain("4111111111111111");
    expect(result).toContain("b***@t***.com");
    expect(result).toContain("******3210");
    expect(result).toContain("**** **** **** 1111");
  });

  it("clean text returns empty findings and LOW risk", () => {
    const findings = detectPII("Hello, how are you today?");
    expect(findings).toHaveLength(0);
    expect(scoreRisk(findings)).toBe("LOW");
  });
});
