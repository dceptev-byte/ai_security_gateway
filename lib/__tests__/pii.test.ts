import { detectPII, maskPII, scoreRisk } from "../pii-detector";
import type { Finding } from "@/types";

// ---------------------------------------------------------------------------
// EMAIL
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
    expect(detectPII("not-an-email@nodot").filter((f) => f.type === "EMAIL")).toHaveLength(0);
  });

  it("rejects invalid email — missing @", () => {
    expect(detectPII("justaplainword").filter((f) => f.type === "EMAIL")).toHaveLength(0);
  });

  it("detects email with subdomain", () => {
    expect(detectPII("user@mail.example.co.uk").filter((f) => f.type === "EMAIL")).toHaveLength(1);
  });

  it("returns confidence 0.95", () => {
    const findings = detectPII("a@b.com");
    expect(findings[0].confidence).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// PHONE
// ---------------------------------------------------------------------------
describe("detectPII — phone", () => {
  it("detects a bare 10-digit Indian mobile number", () => {
    const findings = detectPII("Call 9876543210 now.");
    expect(findings.filter((f) => f.type === "PHONE")).toHaveLength(1);
    expect(findings[0].value).toBe("9876543210");
  });

  it("detects +91 prefix", () => {
    expect(detectPII("+919876543210").filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("detects 0 prefix", () => {
    expect(detectPII("0 9876543210").filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("detects phone with space between prefix and number", () => {
    expect(detectPII("+91 9876543210").filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("detects phone with dash between prefix and number", () => {
    expect(detectPII("+91-9876543210").filter((f) => f.type === "PHONE")).toHaveLength(1);
  });

  it("does not detect a number starting with an invalid digit (< 6)", () => {
    expect(detectPII("1234567890").filter((f) => f.type === "PHONE")).toHaveLength(0);
  });

  it("returns confidence 0.90", () => {
    const findings = detectPII("9876543210");
    expect(findings[0].confidence).toBe(0.90);
  });
});

// ---------------------------------------------------------------------------
// CREDIT_CARD
// ---------------------------------------------------------------------------
describe("detectPII — credit card", () => {
  it("detects a valid Visa number (passes Luhn)", () => {
    const findings = detectPII("Card: 4111111111111111");
    expect(findings.filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
    expect(findings[0].value).toBe("4111111111111111");
  });

  it("rejects a 16-digit number that fails Luhn", () => {
    expect(detectPII("Card: 4111111111111112").filter((f) => f.type === "CREDIT_CARD")).toHaveLength(0);
  });

  it("detects a card with spaces (Luhn-valid)", () => {
    expect(detectPII("4111 1111 1111 1111").filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
  });

  it("detects a card with dashes (Luhn-valid)", () => {
    expect(detectPII("4111-1111-1111-1111").filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
  });

  it("detects a valid MasterCard number (passes Luhn)", () => {
    expect(detectPII("5500005555555559").filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
  });

  it("returns confidence 0.98", () => {
    const findings = detectPII("4111111111111111");
    expect(findings[0].confidence).toBe(0.98);
  });
});

// ---------------------------------------------------------------------------
// AADHAAR
// ---------------------------------------------------------------------------
describe("detectPII — aadhaar", () => {
  it("detects a spaced Aadhaar number", () => {
    const findings = detectPII("Aadhaar: 2345 6789 0123");
    expect(findings.filter((f) => f.type === "AADHAAR")).toHaveLength(1);
    expect(findings[0].value).toBe("2345 6789 0123");
  });

  it("detects an unspaced Aadhaar number", () => {
    const findings = detectPII("ID: 234567890123");
    expect(findings.filter((f) => f.type === "AADHAAR")).toHaveLength(1);
    expect(findings[0].value).toBe("234567890123");
  });

  it("does not detect a number starting with 0", () => {
    expect(detectPII("0234 5678 9012").filter((f) => f.type === "AADHAAR")).toHaveLength(0);
  });

  it("does not detect a number starting with 1", () => {
    expect(detectPII("1234 5678 9012").filter((f) => f.type === "AADHAAR")).toHaveLength(0);
  });

  it("masks as **** **** last4", () => {
    const text = "2345 6789 0123";
    const findings = detectPII(text);
    expect(maskPII(text, findings)).toBe("**** **** 0123");
  });

  it("returns confidence 0.92", () => {
    expect(detectPII("2345 6789 0123")[0].confidence).toBe(0.92);
  });
});

// ---------------------------------------------------------------------------
// PAN
// ---------------------------------------------------------------------------
describe("detectPII — PAN", () => {
  it("detects a valid PAN card number", () => {
    const findings = detectPII("PAN: ABCDE1234F");
    expect(findings.filter((f) => f.type === "PAN")).toHaveLength(1);
    expect(findings[0].value).toBe("ABCDE1234F");
  });

  it("does not detect lowercase PAN", () => {
    expect(detectPII("abcde1234f").filter((f) => f.type === "PAN")).toHaveLength(0);
  });

  it("does not detect partial match — too few letters", () => {
    expect(detectPII("ABCD1234F").filter((f) => f.type === "PAN")).toHaveLength(0);
  });

  it("masks digits only visible: ***** 1234 *", () => {
    const text = "ABCDE1234F";
    const findings = detectPII(text);
    expect(maskPII(text, findings)).toBe("***** 1234 *");
  });

  it("returns confidence 0.97", () => {
    expect(detectPII("ABCDE1234F")[0].confidence).toBe(0.97);
  });
});

// ---------------------------------------------------------------------------
// IP_ADDRESS
// ---------------------------------------------------------------------------
describe("detectPII — IP address", () => {
  it("detects a valid IPv4 address", () => {
    const findings = detectPII("Server at 192.168.1.1 is down.");
    expect(findings.filter((f) => f.type === "IP_ADDRESS")).toHaveLength(1);
    expect(findings[0].value).toBe("192.168.1.1");
  });

  it("detects a public IP", () => {
    expect(detectPII("10.0.0.1").filter((f) => f.type === "IP_ADDRESS")).toHaveLength(1);
  });

  it("detects 0.0.0.0", () => {
    expect(detectPII("0.0.0.0").filter((f) => f.type === "IP_ADDRESS")).toHaveLength(1);
  });

  it("does not detect an out-of-range octet (256)", () => {
    expect(detectPII("256.0.0.1").filter((f) => f.type === "IP_ADDRESS")).toHaveLength(0);
  });

  it("does not detect 999.999.999.999", () => {
    expect(detectPII("999.999.999.999").filter((f) => f.type === "IP_ADDRESS")).toHaveLength(0);
  });

  it("masks all octets: ***.***.***.***", () => {
    const text = "192.168.1.1";
    const findings = detectPII(text);
    expect(maskPII(text, findings)).toBe("***.***.***.***");
  });

  it("returns confidence 0.85", () => {
    expect(detectPII("192.168.1.1")[0].confidence).toBe(0.85);
  });
});

// ---------------------------------------------------------------------------
// PASSPORT
// ---------------------------------------------------------------------------
describe("detectPII — passport", () => {
  it("detects a valid passport number", () => {
    // [A-PR-WY][1-9]\d\d{4}[1-9] = A + 1 + 2 + 3456 + 1
    const findings = detectPII("Passport: A1234561");
    expect(findings.filter((f) => f.type === "PASSPORT")).toHaveLength(1);
    expect(findings[0].value).toBe("A1234561");
  });

  it("detects lowercase first letter", () => {
    expect(detectPII("b1234561").filter((f) => f.type === "PASSPORT")).toHaveLength(1);
  });

  it("does not detect a number starting with Q (excluded letter)", () => {
    expect(detectPII("Q1234561").filter((f) => f.type === "PASSPORT")).toHaveLength(0);
  });

  it("does not detect when second digit is 0", () => {
    // second char must be [1-9], not 0
    expect(detectPII("A0234561").filter((f) => f.type === "PASSPORT")).toHaveLength(0);
  });

  it("masks with full asterisks matching value length", () => {
    const text = "A1234561";
    const findings = detectPII(text);
    const result = maskPII(text, findings);
    expect(result).toBe("*".repeat("A1234561".length));
    expect(result).not.toContain("A");
  });

  it("returns confidence 0.88", () => {
    expect(detectPII("A1234561")[0].confidence).toBe(0.88);
  });
});

// ---------------------------------------------------------------------------
// BANK_ACCOUNT
// ---------------------------------------------------------------------------
describe("detectPII — bank account", () => {
  it("detects account number when 'bank' is nearby", () => {
    const findings = detectPII("My bank account number is 123456789");
    expect(findings.filter((f) => f.type === "BANK_ACCOUNT")).toHaveLength(1);
    expect(findings[0].value).toBe("123456789");
  });

  it("detects with 'account' context word", () => {
    expect(
      detectPII("account: 987654321").filter((f) => f.type === "BANK_ACCOUNT")
    ).toHaveLength(1);
  });

  it("detects with 'savings' context word", () => {
    expect(
      detectPII("savings 123456789012").filter((f) => f.type === "BANK_ACCOUNT")
    ).toHaveLength(1);
  });

  it("detects with 'current' context word", () => {
    expect(
      detectPII("current account 1234567890").filter((f) => f.type === "BANK_ACCOUNT")
    ).toHaveLength(1);
  });

  it("does NOT detect without banking context", () => {
    expect(
      detectPII("The order number is 123456789").filter((f) => f.type === "BANK_ACCOUNT")
    ).toHaveLength(0);
  });

  it("does NOT double-flag a credit card near bank context", () => {
    const text = "bank card 4111111111111111";
    const findings = detectPII(text);
    // credit card should be detected; bank account should not overlap it
    expect(findings.filter((f) => f.type === "CREDIT_CARD")).toHaveLength(1);
    expect(findings.filter((f) => f.type === "BANK_ACCOUNT")).toHaveLength(0);
  });

  it("masks last 4 digits visible", () => {
    const text = "bank 123456789012";
    const findings = detectPII(text);
    expect(maskPII(text, findings)).toBe("bank ********9012");
  });

  it("returns confidence 0.75", () => {
    expect(detectPII("bank 123456789")[0].confidence).toBe(0.75);
  });
});

// ---------------------------------------------------------------------------
// maskPII — output format (existing types)
// ---------------------------------------------------------------------------
describe("maskPII — output format", () => {
  it("masks email correctly", () => {
    const text = "alice@example.com";
    expect(maskPII(text, detectPII(text))).toBe("a***@e***.com");
  });

  it("masks phone: hides all but last 4 digits", () => {
    const text = "9876543210";
    expect(maskPII(text, detectPII(text))).toBe("******3210");
  });

  it("masks credit card: **** **** **** last4", () => {
    const text = "4111111111111111";
    expect(maskPII(text, detectPII(text))).toBe("**** **** **** 1111");
  });

  it("returns unchanged text when no findings", () => {
    expect(maskPII("Hello world", [])).toBe("Hello world");
  });

  it("replaces positions correctly (right-to-left preserves indices)", () => {
    const text = "Email: alice@example.com, also bob@test.com";
    const result = maskPII(text, detectPII(text));
    expect(result).not.toContain("alice@example.com");
    expect(result).not.toContain("bob@test.com");
    expect(result).toContain("a***@e***.com");
    expect(result).toContain("b***@t***.com");
  });
});

// ---------------------------------------------------------------------------
// scoreRisk
// ---------------------------------------------------------------------------
describe("scoreRisk", () => {
  it("returns LOW for 0 findings", () => {
    expect(scoreRisk([])).toBe("LOW");
  });

  it("returns MEDIUM for 1 finding", () => {
    const f: Finding[] = [
      { type: "EMAIL", value: "x@y.com", start: 0, end: 7, confidence: 0.95 },
    ];
    expect(scoreRisk(f)).toBe("MEDIUM");
  });

  it("returns MEDIUM for 2 findings", () => {
    const f: Finding[] = [
      { type: "EMAIL", value: "x@y.com", start: 0, end: 7, confidence: 0.95 },
      { type: "PHONE", value: "9876543210", start: 10, end: 20, confidence: 0.90 },
    ];
    expect(scoreRisk(f)).toBe("MEDIUM");
  });

  it("returns HIGH for 3 findings", () => {
    const f: Finding[] = [
      { type: "EMAIL", value: "x@y.com", start: 0, end: 7, confidence: 0.95 },
      { type: "PHONE", value: "9876543210", start: 10, end: 20, confidence: 0.90 },
      { type: "CREDIT_CARD", value: "4111111111111111", start: 25, end: 41, confidence: 0.98 },
    ];
    expect(scoreRisk(f)).toBe("HIGH");
  });

  it("returns HIGH for 4+ findings", () => {
    const f: Finding[] = Array.from({ length: 4 }, (_, i) => ({
      type: "EMAIL" as const,
      value: `u${i}@x.com`,
      start: i * 10,
      end: i * 10 + 8,
      confidence: 0.95,
    }));
    expect(scoreRisk(f)).toBe("HIGH");
  });
});

// ---------------------------------------------------------------------------
// Mixed PII
// ---------------------------------------------------------------------------
describe("detectPII — mixed text", () => {
  it("detects EMAIL, PHONE, CREDIT_CARD together", () => {
    const text = "Contact bob@test.com or call +91 9876543210. Card: 4111111111111111.";
    const types = detectPII(text).map((f) => f.type);
    expect(types).toContain("EMAIL");
    expect(types).toContain("PHONE");
    expect(types).toContain("CREDIT_CARD");
  });

  it("masks all three types in mixed text", () => {
    const text = "bob@test.com / 9876543210 / 4111111111111111";
    const result = maskPII(text, detectPII(text));
    expect(result).not.toContain("bob@test.com");
    expect(result).not.toContain("9876543210");
    expect(result).not.toContain("4111111111111111");
    expect(result).toContain("b***@t***.com");
    expect(result).toContain("******3210");
    expect(result).toContain("**** **** **** 1111");
  });

  it("detects all 8 PII types in one string", () => {
    const text = [
      "email: bob@test.com",
      "phone: 9876543210",
      "card: 4111111111111111",
      "aadhaar: 2345 6789 0123",
      "pan: ABCDE1234F",
      "ip: 192.168.1.1",
      "passport: A1234561",
      "bank account: 123456789012",
    ].join(" | ");
    const types = new Set(detectPII(text).map((f) => f.type));
    expect(types).toContain("EMAIL");
    expect(types).toContain("PHONE");
    expect(types).toContain("CREDIT_CARD");
    expect(types).toContain("AADHAAR");
    expect(types).toContain("PAN");
    expect(types).toContain("IP_ADDRESS");
    expect(types).toContain("PASSPORT");
    expect(types).toContain("BANK_ACCOUNT");
  });

  it("clean text returns empty findings and LOW risk", () => {
    const findings = detectPII("Hello, how are you today?");
    expect(findings).toHaveLength(0);
    expect(scoreRisk(findings)).toBe("LOW");
  });
});

// ---------------------------------------------------------------------------
// Anonymization modes — all three modes × all 8 PII types
// ---------------------------------------------------------------------------
describe("anonymization modes", () => {
  // Helper: detect then apply a given mode
  function apply(text: string, mode: "MASK" | "REDACT" | "REPLACE") {
    return maskPII(text, detectPII(text), mode);
  }

  // ── EMAIL ──
  describe("EMAIL", () => {
    const text = "alice@example.com";
    it("MASK  → j***@g***.com format", () => {
      expect(apply(text, "MASK")).toBe("a***@e***.com");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("");
    });
    it("REPLACE → [EMAIL] token", () => {
      expect(apply(text, "REPLACE")).toBe("[EMAIL]");
    });
  });

  // ── PHONE ──
  describe("PHONE", () => {
    const text = "9876543210";
    it("MASK  → ******last4", () => {
      expect(apply(text, "MASK")).toBe("******3210");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("");
    });
    it("REPLACE → [PHONE] token", () => {
      expect(apply(text, "REPLACE")).toBe("[PHONE]");
    });
  });

  // ── CREDIT_CARD ──
  describe("CREDIT_CARD", () => {
    const text = "4111111111111111";
    it("MASK  → **** **** **** last4", () => {
      expect(apply(text, "MASK")).toBe("**** **** **** 1111");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("");
    });
    it("REPLACE → [CREDIT_CARD] token", () => {
      expect(apply(text, "REPLACE")).toBe("[CREDIT_CARD]");
    });
  });

  // ── AADHAAR ──
  describe("AADHAAR", () => {
    const text = "2345 6789 0123";
    it("MASK  → **** **** last4", () => {
      expect(apply(text, "MASK")).toBe("**** **** 0123");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("");
    });
    it("REPLACE → [AADHAAR] token", () => {
      expect(apply(text, "REPLACE")).toBe("[AADHAAR]");
    });
  });

  // ── PAN ──
  describe("PAN", () => {
    const text = "ABCDE1234F";
    it("MASK  → ***** digits *", () => {
      expect(apply(text, "MASK")).toBe("***** 1234 *");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("");
    });
    it("REPLACE → [PAN] token", () => {
      expect(apply(text, "REPLACE")).toBe("[PAN]");
    });
  });

  // ── IP_ADDRESS ──
  describe("IP_ADDRESS", () => {
    const text = "192.168.1.1";
    it("MASK  → ***.***.***.***", () => {
      expect(apply(text, "MASK")).toBe("***.***.***.***");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("");
    });
    it("REPLACE → [IP_ADDRESS] token", () => {
      expect(apply(text, "REPLACE")).toBe("[IP_ADDRESS]");
    });
  });

  // ── PASSPORT ──
  describe("PASSPORT", () => {
    const text = "A1234561";
    it("MASK  → all stars", () => {
      expect(apply(text, "MASK")).toBe("********");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("");
    });
    it("REPLACE → [PASSPORT] token", () => {
      expect(apply(text, "REPLACE")).toBe("[PASSPORT]");
    });
  });

  // ── BANK_ACCOUNT ──
  describe("BANK_ACCOUNT", () => {
    const text = "bank 123456789012";
    it("MASK  → stars + last4", () => {
      expect(apply(text, "MASK")).toBe("bank ********9012");
    });
    it("REDACT → value removed", () => {
      expect(apply(text, "REDACT")).toBe("bank ");
    });
    it("REPLACE → [BANK_ACCOUNT] token", () => {
      expect(apply(text, "REPLACE")).toBe("bank [BANK_ACCOUNT]");
    });
  });

  // ── Mixed text — all three modes ──
  describe("mixed text", () => {
    const text = "Email bob@test.com, card 4111111111111111";
    it("MASK  replaces all with partial obscuring", () => {
      const result = apply(text, "MASK");
      expect(result).toContain("b***@t***.com");
      expect(result).toContain("**** **** **** 1111");
    });
    it("REDACT removes all PII", () => {
      const result = apply(text, "REDACT");
      expect(result).not.toContain("bob@test.com");
      expect(result).not.toContain("4111111111111111");
    });
    it("REPLACE inserts typed tokens for all PII", () => {
      const result = apply(text, "REPLACE");
      expect(result).toContain("[EMAIL]");
      expect(result).toContain("[CREDIT_CARD]");
      expect(result).not.toContain("bob@test.com");
      expect(result).not.toContain("4111111111111111");
    });
  });
});

// ---------------------------------------------------------------------------
// Tokenise pipeline (powers /api/tokenize + /api/detokenize)
// ---------------------------------------------------------------------------
describe("tokenise pipeline", () => {
  // Shared helper: replicates the tokenization logic from /api/tokenize
  function tokenize(text: string): {
    tokenizedText: string;
    tokenMap: Record<string, string>; // token → original value
    valueToToken: Map<string, string>;
  } {
    const findings = detectPII(text);
    const valueToToken = new Map<string, string>();
    let idx = 0;
    for (const f of findings) {
      if (!valueToToken.has(f.value)) {
        valueToToken.set(f.value, `[${f.type}_tk${String(idx++).padStart(4, "0")}]`);
      }
    }
    const sorted = [...findings].sort((a, b) => b.start - a.start);
    let tokenizedText = text;
    for (const f of sorted) {
      const token = valueToToken.get(f.value)!;
      tokenizedText =
        tokenizedText.slice(0, f.start) + token + tokenizedText.slice(f.end);
    }
    const tokenMap: Record<string, string> = {};
    for (const [value, token] of valueToToken) tokenMap[token] = value;
    return { tokenizedText, tokenMap, valueToToken };
  }

  it("tokenize: tokens appear in output; original PII values do not", () => {
    const text = "Email: user@example.com, PAN: ABCDE1234F";
    const { tokenizedText, valueToToken } = tokenize(text);

    // Original PII must be absent
    expect(tokenizedText).not.toContain("user@example.com");
    expect(tokenizedText).not.toContain("ABCDE1234F");

    // Typed tokens must be present
    for (const [, token] of valueToToken) {
      expect(tokenizedText).toContain(token);
    }

    // Token map is populated (equivalent to tokenMapId being returned)
    expect(valueToToken.size).toBeGreaterThanOrEqual(2);
  });

  it("tokenize: same value always maps to the same token", () => {
    const text = "Contact a@b.com or a@b.com again";
    const { tokenizedText, valueToToken } = tokenize(text);

    expect(valueToToken.size).toBe(1); // one unique value
    const token = [...valueToToken.values()][0];
    // Both occurrences replaced with the same token
    const occurrences = tokenizedText.split(token).length - 1;
    expect(occurrences).toBe(2);
  });

  it("detokenize: restores all original values in LLM output", () => {
    const original = "Contact user@example.com, PAN ABCDE1234F";
    const { tokenMap, valueToToken } = tokenize(original);

    // Simulate LLM response that references the tokens
    const emailToken = valueToToken.get("user@example.com")!;
    const panToken = valueToToken.get("ABCDE1234F")!;
    const llmOutput = `Processed request for ${emailToken}. Identity verified via PAN ${panToken}.`;

    // Detokenize (replicates /api/detokenize logic)
    let restored = llmOutput;
    for (const [token, originalValue] of Object.entries(tokenMap)) {
      restored = restored.split(token).join(originalValue);
    }

    // Original values restored
    expect(restored).toContain("user@example.com");
    expect(restored).toContain("ABCDE1234F");

    // No tokens remain
    expect(restored).not.toContain(emailToken);
    expect(restored).not.toContain(panToken);
  });

  it("detokenize: handles multiple occurrences of the same token", () => {
    const original = "Send to a@b.com and cc a@b.com";
    const { tokenMap, valueToToken } = tokenize(original);

    const token = valueToToken.get("a@b.com")!;
    const llmOutput = `Reply to ${token} and also ${token}`;

    let restored = llmOutput;
    for (const [tok, val] of Object.entries(tokenMap)) {
      restored = restored.split(tok).join(val);
    }

    expect(restored).toBe("Reply to a@b.com and also a@b.com");
    expect(restored).not.toContain(token);
  });
});
