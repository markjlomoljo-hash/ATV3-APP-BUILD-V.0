import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

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

const baseUrl = process.env.ROUTE_SMOKE_BASE_URL ?? "http://127.0.0.1:3100";
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
    const url = new URL(baseUrl);
    const port = url.port || "3100";
    const command = process.platform === "win32" ? "cmd.exe" : process.execPath;
    const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
    const args =
      process.platform === "win32"
        ? ["/c", "npm.cmd", "start", "--", "--hostname", "127.0.0.1", "--port", port]
        : [nextCli, "start", "--hostname", "127.0.0.1", "--port", port];

    server = spawn(command, args, {
      // Inheriting output avoids a pipe backpressure deadlock and preserves the
      // server error that explains startup failures in CI.
      stdio: "inherit",
      env: { ...process.env },
    });
    await waitForServer();
  }
}

function bodyHasTitle(html) {
  return /<h1[\s>]/i.test(html) || /<title[\s>]/i.test(html);
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
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");

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
