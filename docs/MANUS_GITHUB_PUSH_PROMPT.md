# Manus AI GitHub Push Prompt — AcneTrex Phase Backend Files

You are Manus AI acting as a senior release engineer. Your job is to push the provided AcneTrex backend files into the GitHub repository using a safe branching workflow.

Repository:
https://github.com/markjlomoljo-hash/ATV3-APP-BUILD-V.0.git

Upload/commit ONLY these paths from the provided package:
- docs/
- src/
- supabase/
- .env
- .env.example
- bun.lock
- package.json

Branching rules:
1. Never commit directly to main.
2. Ensure these long-lived branches exist:
   - main = production-ready branch only
   - staging = release-candidate validation branch
   - dev = integration branch
3. Create a working branch from dev:
   feat/phase3-skin-twin-backend-docs-src-supabase
4. Commit the selected files only to that feature branch.
5. Open a pull request into dev, not main.
6. After review/testing, promote by PR only:
   feat/... → dev → staging → main
7. Do not push secrets. The .env file must contain placeholders only. Use .env.example for environment variable documentation.

Required commands:

```bash
git clone https://github.com/markjlomoljo-hash/ATV3-APP-BUILD-V.0.git
cd ATV3-APP-BUILD-V.0

git checkout main
git pull origin main

git show-ref --verify --quiet refs/heads/staging || git checkout -b staging main
git push -u origin staging || true

git checkout main
git show-ref --verify --quiet refs/heads/dev || git checkout -b dev main
git push -u origin dev || true

git checkout dev
git pull origin dev
git checkout -b feat/phase3-skin-twin-backend-docs-src-supabase

# Copy ONLY these from the provided extracted package root into the repo root:
# docs/ src/ supabase/ .env .env.example bun.lock package.json

git add docs src supabase .env .env.example bun.lock package.json
git status
git commit -m "feat: add phase backend docs src supabase assets"
git push -u origin feat/phase3-skin-twin-backend-docs-src-supabase
```

Then open a PR:
Base: dev
Compare: feat/phase3-skin-twin-backend-docs-src-supabase

PR title:
feat: add phase backend docs src supabase assets

PR body:
This PR adds the selected AcneTrex backend implementation files from the provided package:
- docs/
- src/
- supabase/
- .env placeholder file
- .env.example
- bun.lock
- package.json

Security note:
The .env file has been sanitized and must not contain real keys, service-role keys, credentials, tokens, or private secrets.

Acceptance:
- Selected files only are committed.
- No direct commit to main.
- PR targets dev.
- No secret values are present.
```
