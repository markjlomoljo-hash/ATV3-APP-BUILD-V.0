import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile EAS release configuration", () => {
  it("defines a production-environment APK and iOS internal distribution profile", () => {
    const eas = JSON.parse(
      readFileSync(join(process.cwd(), "apps", "mobile", "eas.json"), "utf8"),
    ) as {
      build: Record<string, {
        distribution?: string;
        environment?: string;
        autoIncrement?: boolean;
        android?: { buildType?: string };
      }>;
    };

    expect(eas.build["production-apk"]).toMatchObject({
      distribution: "internal",
      environment: "production",
      autoIncrement: true,
      android: { buildType: "apk" },
    });
    expect(eas.build["ios-internal"]).toMatchObject({
      distribution: "internal",
      environment: "production",
      autoIncrement: true,
    });
  });
});
