import { randomBytes, randomUUID } from "node:crypto";

const baseUrl = (process.env.E2E_BASE_URL ?? "https://atv-3-app-build-v-0.vercel.app").replace(/\/+$/, "");
const supabaseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const timeoutMs = Number(process.env.E2E_TIMEOUT_MS ?? 180_000);

if (!supabaseUrl || !anonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required; values are never printed");
}

function password() {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: response.status, headers: response.headers, body };
}

async function signup(label) {
  const email = `acnetrex.codex.${Date.now()}.${label}@example.com`;
  const result = await jsonRequest(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey },
    body: JSON.stringify({ email, password: password() }),
  });
  const userId = result.body?.user?.id;
  const accessToken = result.body?.access_token;
  if (result.status !== 200 || typeof userId !== "string" || typeof accessToken !== "string") {
    throw new Error(`signup_failed:${label}:${result.status}`);
  }
  return { userId, accessToken };
}

async function patchConsent(accessToken) {
  const key = `e2e-consent-${randomUUID()}`;
  const result = await jsonRequest(`${baseUrl}/api/consents`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}`, "idempotency-key": key },
    body: JSON.stringify({ personalProcessing: true }),
  });
  if (result.status !== 200 || result.body?.ok !== true || result.body?.consent?.personalProcessing !== true) {
    throw new Error(`consent_failed:${result.status}:${typeof result.body?.error === "string" ? result.body.error : "unknown"}`);
  }
  return key;
}

function jobPayload() {
  return {
    engine: "sleepderm",
    operation: "readiness",
    inputRecordRefs: [],
    features: {},
    metadata: { featureSchemaVersion: "1.0.0", appVersion: "e2e-live-flow" },
  };
}

async function submit(accessToken, idempotencyKey, payload) {
  return jsonRequest(`${baseUrl}/api/ml/jobs`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "idempotency-key": idempotencyKey, "x-request-id": randomUUID() },
    body: JSON.stringify(payload),
  });
}

async function getJob(accessToken, jobId) {
  return jsonRequest(`${baseUrl}/api/ml/jobs/${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

async function waitForTerminal(accessToken, jobId) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const result = await getJob(accessToken, jobId);
    last = result;
    const status = result.body?.job?.status ?? result.body?.status ?? result.body?.data?.status;
    if (["completed", "insufficient_data", "not_configured", "failed"].includes(status)) return result;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`job_timeout:${jobId}:${last?.body?.job?.status ?? last?.status}`);
}

const owner = await signup("owner");
const other = await signup("other");
const payload = jobPayload();
const idempotencyKey = `e2e-job-${randomUUID()}`;
const changedPayload = { ...payload, metadata: { ...payload.metadata, appVersion: "e2e-live-flow-changed" } };
const evidence = {
  temporaryUserIds: [owner.userId, other.userId],
  ownerIdPrefix: owner.userId.slice(0, 8),
  otherIdPrefix: other.userId.slice(0, 8),
  checks: {},
};

try {
  const directAuth = await jsonRequest(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${owner.accessToken}` },
  });
  evidence.directAuthStatus = directAuth.status;
  if (directAuth.status !== 200) throw new Error(`direct_auth_failed:${directAuth.status}`);
  evidence.checks.consent = (await patchConsent(owner.accessToken)) !== null;
  const first = await submit(owner.accessToken, idempotencyKey, payload);
  const jobId = first.body?.jobId;
  if (first.status !== 202 || typeof jobId !== "string") throw new Error(`submit_failed:${first.status}:${typeof first.body?.error === "string" ? first.body.error : "unknown"}`);
  evidence.jobId = jobId;
  evidence.checks.queued = first.body?.status === "queued_for_cloud";

  const replay = await submit(owner.accessToken, idempotencyKey, payload);
  evidence.checks.replay = replay.status === 200 && replay.body?.replayed === true && replay.body?.jobId === jobId;

  const changed = await submit(owner.accessToken, idempotencyKey, changedPayload);
  evidence.checks.payloadConflict = changed.status === 409;

  const denied = await getJob(other.accessToken, jobId);
  evidence.checks.crossUserDenied = denied.status === 404;

  const terminal = await waitForTerminal(owner.accessToken, jobId);
  evidence.finalStatus = terminal.body?.job?.status ?? terminal.body?.status ?? terminal.body?.data?.status ?? null;
  evidence.resultReadiness = terminal.body?.job?.analysis?.readinessState ?? terminal.body?.analysis?.readinessState ?? null;
  evidence.checks.persistedResult = ["completed", "insufficient_data", "not_configured", "failed"].includes(evidence.finalStatus);
  evidence.allChecks = Object.values(evidence.checks).every(Boolean);
  console.log(JSON.stringify(evidence));
} finally {
  // The caller must delete temporaryUserIds with a privileged, audited cleanup
  // query. The IDs are safe cleanup handles; this script never prints credentials.
}
