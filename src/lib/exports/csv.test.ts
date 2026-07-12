import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("escapes quotes, commas, and newlines", () => {
    const csv = toCsv([{ note: 'a,"b"\nline' }]);
    expect(csv).toBe('note\n"a,""b""\nline"');
  });

  it.each(["=1+1", "+SUM(A1:A2)", "-2+3", "@cmd", "  =HYPERLINK(\"x\")"])(
    "neutralizes spreadsheet formula input %s",
    (value) => {
      const csv = toCsv([{ value }]);
      expect(csv.split("\n")[1]).toContain("'");
      expect(csv.split("\n")[1]).not.toMatch(/^\s*[=+\-@]/);
    },
  );

  it("serializes null values as empty cells", () => {
    expect(toCsv([{ a: null, b: "ok" }])).toBe("a,b\n,ok");
  });
});
