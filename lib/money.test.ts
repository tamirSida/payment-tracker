import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./money";

describe("parseMoney", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    [".5", 50],
    ["12,50", 1250],
    ["12,5", 1250],
    ["1,200", 120000],
    ["1,200.50", 120050],
    ["1,234,567", 123456700],
    [" 7 ", 700],
  ])("parses %j -> %d cents", (input, cents) => {
    expect(parseMoney(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1.234", "1,2,3", "12,", "1,23,4", "1e3", "100000000000"])(
    "rejects %j",
    (input) => expect(parseMoney(input)).toBeNull(),
  );

  it("parses 0 (callers reject non-positive amounts)", () => {
    expect(parseMoney("0")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("drops decimals for whole amounts and uses a minus sign", () => {
    expect(formatMoney(120000, "USD")).toBe("$1,200");
    expect(formatMoney(1250, "EUR")).toBe("€12.50");
    expect(formatMoney(-500, "ILS")).toBe("−₪5");
  });
});
