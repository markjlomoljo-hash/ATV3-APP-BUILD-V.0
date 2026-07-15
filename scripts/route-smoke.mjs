import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const routes = [
  "/",
  "/auth",
  "/onboarding",
  "/profile",
  "/settings",
  "/privacy",
  "/readiness",
  "/log/sleep",
  "/log/food",
  "/log/stress",
  "/log/activity",
  "/log/hydration",
  "/log/cycle",
  "/log/contact",
  "/log/routine",
  "/log/treatment",
  "/log/skin-state",
  "/face-atlas",
  "/face-atlas/capture",
  "/face-atlas/annotations",
  "/face-atlas/history",
  "/skin-twin",
  "/skin-twin/scenarios",
  "/skin-twin/history",
  "/ai",
  "/cutisai",
  "/intelligence",
  "/triggers",
  "/forecast",
  "/barrier",
  "/products",
  "/formula-lens",
  "/climate",
  "/reports",
  "/reports/history",
  "/reports/export",
  "/treatments",
  "/treatments/checkins",
  "/tasks",
  "/gamification",
  "/research",
  "/export",
  "/delete-account",
  "/oauth/consent",
  "/sign-in",
  "/sign-up",
  "/admin",
  "/admin/users",
  "/admin/roles",
  "/admin/analytics",
  "/admin/system",
  "/admin/database",
  "/admin/deployments",
  "/admin/ml",
  "/admin/models",
  "/admin/jobs",
  "/admin/reports",
  "/admin/privacy",
  "/admin/research",
  "/admin/notifications",
  "/admin/feature-flags",
  "/admin/security",
  "/admin/audit",
  "/admin/support",
  "/admin/moderation",
  "/admin/clinical",
];

export function normalizeSmokeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_route_smoke_base_url");
  }
  const validProtocol = url.protocol === "http:" || url.protocol === "https:";
  const validPort = url.port === "" || (/^\d{1,5}$/.test(url.port) && Number(url.port) >= 1 && Number(url.port) <= 65_535);
  if (!validProtocol || !validPort || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("invalid_route_smoke_base_url");
  }
  return url;
}

const configuredBaseUrl = normalizeSmokeBaseUrl(process.env.ROUTE_SMOKE_BASE_URL ?? "http://127.0.0.1:3100");
const baseUrl = configuredBaseUrl.origin;
let server;

async function fetchWithTimeout(url, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 45_000) {
    try {
      const response = await fetchWithTimeout(baseUrl, 2_000);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw new Error(`Route smoke server did not become ready at ${baseUrl}`);
}

async function ensureServer() {
  try {
    const response = await fetchWithTimeout(baseUrl, 2_000);
    if (response.ok) {
      return;
    }
  } catch {
    if (!new Set(["127.0.0.1", "localhost", "::1"]).has(configuredBaseUrl.hostname)) {
      throw new Error(`Route smoke target is unavailable at ${baseUrl}`);
    }
    const port = configuredBaseUrl.port || "3100";
    const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
    const args = [nextCli, "start", "--hostname", "127.0.0.1", "--port", port];

    server = spawn(process.execPath, args, {
      // Inheriting output avoids a pipe backpressure deadlock and preserves the
      // server error that explains startup failures in CI.
      stdio: "inherit",
      env: { ...process.env },
    });
    await waitForServer();
  }
}

function hasOpeningTag(html, tagName) {
  const lower = html.toLowerCase();
  const needle = `<${tagName}`;
  let index = lower.indexOf(needle);
  while (index !== -1) {
    const boundary = lower[index + needle.length];
    if (boundary === ">" || boundary === "/" || boundary === " " || boundary === "\t" || boundary === "\r" || boundary === "\n") {
      return true;
    }
    index = lower.indexOf(needle, index + needle.length);
  }
  return false;
}

function tagEnd(html, start) {
  let quote = null;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return html.length - 1;
}

function startsTag(tagSource, tagName) {
  if (!tagSource.startsWith(tagName)) return false;
  const boundary = tagSource[tagName.length];
  return boundary === undefined || boundary === ">" || boundary === "/" || boundary === " " || boundary === "\t" || boundary === "\r" || boundary === "\n";
}

export function visibleTextFromHtml(html) {
  const lower = html.toLowerCase();
  const visible = [];
  let index = 0;
  while (index < html.length) {
    if (html[index] !== "<") {
      visible.push(html[index]);
      index += 1;
      continue;
    }
    if (lower.startsWith("<!--", index)) {
      const commentEnd = lower.indexOf("-->", index + 4);
      index = commentEnd === -1 ? html.length : commentEnd + 3;
      continue;
    }
    const end = tagEnd(html, index + 1);
    const source = lower.slice(index + 1, end).trimStart();
    const hiddenTag = startsTag(source, "script") ? "script" : startsTag(source, "style") ? "style" : null;
    if (!hiddenTag) {
      visible.push(" ");
      index = end + 1;
      continue;
    }
    const closing = lower.indexOf(`</${hiddenTag}`, end + 1);
    if (closing === -1) {
      index = html.length;
      continue;
    }
    index = tagEnd(html, closing + 2 + hiddenTag.length) + 1;
  }
  return visible.join("");
}

function bodyHasTitle(html) {
  return hasOpeningTag(html, "h1") || hasOpeningTag(html, "title");
}

async function run() {
  await ensureServer();
  const failures = [];

  for (const route of routes) {
    let response;
    try {
      response = await fetchWithTimeout(`${baseUrl}${route}`);
    } catch (error) {
      failures.push(`${route}: request failed (${error instanceof Error ? error.name : "unknown_error"})`);
      continue;
    }
    const html = await response.text();
    const text = visibleTextFromHtml(html);

    if (!response.ok) {
      failures.push(`${route}: HTTP ${response.status}`);
      continue;
    }

    if (!bodyHasTitle(html)) {
      failures.push(`${route}: missing h1/title`);
    }

    if (/\bundefined\b|\bnull\b/i.test(text)) {
      failures.push(`${route}: rendered undefined/null text`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Route smoke passed for ${routes.length} routes at ${baseUrl}`);
  }
}

async function main() {
  try {
    await run();
  } finally {
    if (server) {
      if (process.platform === "win32" && server.pid) {
        spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        server.kill();
        await Promise.race([
          new Promise((resolve) => server.once("exit", resolve)),
          new Promise((resolve) => setTimeout(resolve, 5_000)),
        ]);
      }
    }
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) await main();
