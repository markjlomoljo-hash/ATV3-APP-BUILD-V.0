# AcneTrex V3 Deployment Guide

Complete deployment instructions for Vercel (frontend), Supabase (database), and Cloud Run (ML backend).

---

## PHASE 1: Local Build & Test

Before deploying, verify the build passes locally.

### Prerequisites
- Node.js 18+ (or use `bun`)
- `git` with authentication configured
- `npm` or `bun` installed

### Commands

```bash
# Install dependencies
npm install
# or: bun install

# Run type check (catch TypeScript errors early)
npm run typecheck

# Build the app
npm run build

# Run linter
npm run lint
```

**If any step fails, stop and fix errors before proceeding.**

---

## PHASE 2: Vercel Deployment (Frontend + Next.js API Routes)

### Prerequisites
- Vercel account
- `vercel` CLI installed: `npm i -g vercel`
- GitHub credentials (already authenticated)

### Environment Setup

In Vercel dashboard or via CLI, set these Production variables:

```bash
# Database
DATABASE_URL=postgresql://...  # Supabase pooled connection URL
NEXT_PUBLIC_SUPABASE_URL=https://alobmstvqutteypusmuo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2az_6ia5xm-1meOvew-jauw_Q_YM1bDj

# ML API (Cloud Run)
ACNETREX_ML_API_URL=https://mlatv-pudz4xjzxa-ew.a.run.app
ACNETREX_ML_API_URL=https://acnetrex-ml-api-production.up.railway.app

# Vertex AI
VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad
VERTEX_AI_ENDPOINT_ID=5976620302904328192
```

### Deploy Command

```bash
# From repository root (feat/phase7-profile-reports branch)

# First time only: link to Vercel project
vercel link --project atv-3-app-build-v-0

# Deploy to production
vercel --prod

# Alternative: with logs
vercel --prod --logs
```

### Verification

```bash
# Check deployment
curl -I https://atv-3-app-build-v-0.vercel.app

# Test API health
curl https://atv-3-app-build-v-0.vercel.app/api/health

# Expected response:
# {
#   "ok": true,
#   "database": "connected" | "error: DATABASE_URL not configured"
# }
```

---

## PHASE 3: Supabase Database Setup

### Prerequisites
- Supabase account (project: `alobmstvqutteypusmuo`)
- `supabase` CLI installed: `npm i -g supabase`
- GCP credentials (if using Cloud SQL)

### Get Database Credentials

From Supabase dashboard:

1. Go to **Project Settings** → **Database**
2. Copy **Connection String** (Transaction Pooler recommended for Vercel):
   ```
   postgresql://postgres:[password]@[host]:6543/postgres?schema=public
   ```
3. Use this as `DATABASE_URL` in Vercel and local `.env.local`

### Run Migrations

```bash
# Authenticate with Supabase
supabase login

# Link to project
supabase link --project-ref alobmstvqutteypusmuo

# Test migrations (dry-run)
supabase db push --dry-run

# Apply migrations
supabase db push

# Verify tables created
supabase db list
```

**Expected tables:**
- `users`
- `consent_settings`
- `profile_sections`
- `profile_version_history`
- `daily_logs`
- `face_atlas_scans`
- `treatment_plans`
- `treatment_checkins`
- `trigger_hypotheses`
- `forecast_summaries`
- `report_requests`
- `report_files`
- `report_jobs`
- `report_consent_snapshots`
- `export_requests`
- `export_files`
- `deletion_requests`
- `deletion_audit_events`
- `profile_audit_events`
- `weather_snapshots`
- `badges`
- `tasks`
- `streak_state`

### Verify Connection from App

```bash
# From Vercel > Settings > Environment Variables, test:
curl -X GET https://atv-3-app-build-v-0.vercel.app/api/health
```

Should return:
```json
{
  "ok": true,
  "database": "connected"
}
```

---

## PHASE 4: Cloud Run ML Service Deployment

### Prerequisites
- Google Cloud SDK (`gcloud`) installed
- Active GCP project: `project-09bedce3-3c99-4a2b-aad`
- Vertex AI endpoint deployed: `5976620302904328192`
- Docker daemon running (for local builds)

### Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Set Application Default Credentials (for local development)
gcloud auth application-default login

# Set project
gcloud config set project project-09bedce3-3c99-4a2b-aad
```

### Deploy ML Service

From the repository root:

```bash
# Navigate to ML service
cd ml-service

# Deploy to Cloud Run
gcloud run deploy mlatv \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars \
    VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad,\
    VERTEX_AI_LOCATION=us-central1,\
    VERTEX_AI_ENDPOINT_ID=5976620302904328192,\
    CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app,\
    CORS_ORIGIN_REGEX=https://.*\.vercel\.app

# Expected output:
# Service URL: https://mlatv-pudz4xjzxa-ew.a.run.app
```

### Verification

```bash
# Test root endpoint
curl -i https://mlatv-pudz4xjzxa-ew.a.run.app/

# Expected: 200 OK, JSON response with service metadata

# Test health endpoint
curl -i https://mlatv-pudz4xjzxa-ew.a.run.app/health

# Expected: 200 OK, includes Vertex AI endpoint status

# Test CORS preflight
curl -i -X OPTIONS https://mlatv-pudz4xjzxa-ew.a.run.app/predict \
  -H "Origin: https://atv-3-app-build-v-0.vercel.app" \
  -H "Access-Control-Request-Method: POST"

# Expected: 200 OK, includes CORS headers

# Test prediction (if Vertex AI model is deployed)
curl -X POST https://mlatv-pudz4xjzxa-ew.a.run.app/predict \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Expected:
# - If Vertex AI deployed: 200 OK with predictions
# - If Vertex AI not available: 503 with error message
```

### View Logs

```bash
gcloud run logs read mlatv --region europe-west1 --limit 50
```

---

## PHASE 5: Full Integration Test

Once all three services are deployed:

### 1. Test Frontend → Supabase

```bash
# From browser, logged into app
# Perform action that writes to database (e.g., profile update)
# In Supabase dashboard, verify data in tables
```

### 2. Test Frontend → ML API

```bash
# From browser console
fetch('/api/ml/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: 'data' })
})
.then(r => r.json())
.then(console.log)

# Expected response:
# {
#   "ok": true,
#   "predictions": [...],
#   "model_version": "..."
# }
# or
# {
#   "ok": false,
#   "error": "vertex_endpoint_unavailable"
# }
```

### 3. Check Vercel Deployment Status

```bash
# Dashboard: https://vercel.com/dashboard
# Confirm: feat/phase7-profile-reports branch deployed
# Confirm: All env vars set
# Confirm: Build successful
```

---

## Common Issues & Troubleshooting

### Vercel Build Fails: TypeScript Errors

```
Error: 'db' is possibly 'undefined'
```

**Solution:** Ensure `src/lib/deletion/service.ts` uses `getDb()`:
```bash
git log --oneline | grep "fix(deletion)"
# Should show: c9e806f fix(deletion): use getDb for deletion workflow database access
```

### 503 ML API Error: Vertex AI Not Available

**Cause:** Vertex AI endpoint not deployed or unreachable.

**Check:**
```bash
# Verify endpoint exists
gcloud ai endpoints list --region=us-central1

# Should show endpoint ID: 5976620302904328192
```

**Solution:** Deploy Vertex AI model in Google Cloud Console, or update `VERTEX_AI_ENDPOINT_ID` in Cloud Run env vars.

### CORS Error: ML API Blocked

**Cause:** Frontend origin not in CORS whitelist.

**Check:**
```bash
# Verify Vercel URL matches CORS_ORIGINS
echo $CORS_ORIGINS  # Should include: https://atv-3-app-build-v-0.vercel.app
```

**Solution:** Update Cloud Run env var:
```bash
gcloud run services update mlatv \
  --region europe-west1 \
  --update-env-vars CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app
```

### Database Connection Timeout

**Cause:** `DATABASE_URL` not set or incorrect.

**Check:**
```bash
# In Vercel dashboard, verify DATABASE_URL is set
# Test connection:
node -e "require('pg').Pool({ connectionString: process.env.DATABASE_URL })"
```

**Solution:**
1. Get correct pooler URL from Supabase
2. Set `DATABASE_URL` in Vercel
3. Redeploy

---

## Rollback Instructions

If deployment fails:

### Revert Code

```bash
# See previous commits
git log --oneline | head -10

# Revert to known good commit
git revert <bad-commit-hash>
git push origin feat/phase7-profile-reports
```

### Vercel Rollback

```bash
# In Vercel dashboard:
# 1. Go to Deployments
# 2. Find last successful deployment
# 3. Click "Promote to Production"
```

### Cloud Run Rollback

```bash
# List revisions
gcloud run revisions list --service=mlatv --region=europe-west1

# Promote previous revision
gcloud run services update-traffic mlatv --to-revisions REVISION_NAME=100 --region=europe-west1
```

---

## Post-Deployment Checklist

- [ ] Local build passes: `npm run build`
- [ ] Vercel deployment green: `vercel --prod`
- [ ] Vercel env vars set (DATABASE_URL, ML URLs)
- [ ] Supabase migrations applied: `supabase db push`
- [ ] Supabase tables exist: `supabase db list`
- [ ] Cloud Run deployed: `gcloud run services list --region=europe-west1`
- [ ] Cloud Run health check passes: `/health` endpoint returns 200
- [ ] Frontend→Database integration works (test in app)
- [ ] Frontend→ML API integration works (test in browser console)
- [ ] Production URL responsive: `curl -I https://atv-3-app-build-v-0.vercel.app`
- [ ] Monitoring enabled (Vercel, Supabase, Cloud Run dashboards)

---

## Support & Logs

### View Production Logs

**Vercel:**
```bash
vercel logs --prod
# or via dashboard: https://vercel.com/dashboard
```

**Supabase:**
- Dashboard: https://supabase.com/dashboard → Logs
- Query: `SELECT * FROM pg_stat_statements;`

**Cloud Run:**
```bash
gcloud run logs read mlatv --region=europe-west1 --limit=100
```

---

## Next Steps

1. **Monitor:** Watch deployment logs for 24 hours
2. **Test:** Run full user journey in production
3. **Optimize:** Monitor performance metrics in each platform
4. **Document:** Update PRD with actual deployment parameters
