import { describe, expect, it } from "vitest";
import { readJsonBodyLimited } from "./read-json-body";

describe("readJsonBodyLimited", () => {
  it("parses a JSON body within the byte limit", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ engine: "faceatlas" }),
    });

    await expect(readJsonBodyLimited(request, 64)).resolves.toEqual({
      ok: true,
      value: { engine: "faceatlas" },
    });
  });

  it("rejects an advertised oversized body without reading it", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-length": "1000" },
      body: "{}",
    });

    await expect(readJsonBodyLimited(request, 64)).resolves.toEqual({
      ok: false,
      error: "payload_too_large",
    });
  });

  it("enforces actual UTF-8 bytes when content-length is absent", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify("é"),
    });

    await expect(readJsonBodyLimited(request, 3)).resolves.toEqual({
      ok: false,
      error: "payload_too_large",
    });
  });

  it("fails closed on malformed JSON", async () => {
    const request = new Request("https://example.test", { method: "POST", body: "{" });
    await expect(readJsonBodyLimited(request, 64)).resolves.toEqual({
      ok: false,
      error: "invalid_json_body",
    });
  });
});
