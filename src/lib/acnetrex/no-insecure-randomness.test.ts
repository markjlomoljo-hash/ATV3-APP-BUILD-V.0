import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src", "packages", "apps/mobile/app", "apps/mobile/src", "apps/mobile/packages"];

function productionSourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...productionSourceFiles(path));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name) && !/\.test\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe("zero-fabrication randomness contract", () => {
  it("contains no Math.random calls in production application source", () => {
    const violations = ROOTS.flatMap(productionSourceFiles).filter((file) =>
      readFileSync(file, "utf8").includes("Math.random("),
    );

    expect(violations).toEqual([]);
  }, 15_000);
});
