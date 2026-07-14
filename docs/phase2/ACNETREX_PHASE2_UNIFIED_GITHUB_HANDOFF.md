# AcneTrex Phase 2 Unified GitHub Handoff

Generated: 2026-06-30 08:21:35

This single markdown file compiles the uploaded AcneTrex Phase 2 materials into one labeled handoff document, then includes a ready-to-copy Manus AI prompt for committing/pushing the handoff into the chosen GitHub repository using the proper branch flow.

Repository target provided by user:

`https://github.com/markjlomoljo-hash/ATV3-APP-BUILD-V.0.git`

---

## Table of Contents

1. [Manus AI GitHub Push/Commit Prompt](#1-manus-ai-github-pushcommit-prompt)
2. [Source File Manifest](#2-source-file-manifest)
3. [Phase 2 Documentation](#3-phase-2-documentation)
4. [PRD Reference](#4-prd-reference)
5. [Phase 2 ZIP Expanded Source Manifest](#5-phase-2-zip-expanded-source-manifest)
6. [Phase 2 ZIP Expanded Source Files](#6-phase-2-zip-expanded-source-files)

---

## 1. Manus AI GitHub Push/Commit Prompt

Copy and paste this prompt into Manus AI when you want Manus to push this unified file into your GitHub repository.

````text
You are Manus AI acting as a senior release engineer, GitHub operator, repo custodian, and strict implementation handoff agent.

MISSION
Push and commit the provided AcneTrex Phase 2 unified handoff file into the GitHub repository selected by the user:

Repository URL:
https://github.com/markjlomoljo-hash/ATV3-APP-BUILD-V.0.git

Repository full name:
markjlomoljo-hash/ATV3-APP-BUILD-V.0

SOURCE FILE TO COMMIT
Commit the unified markdown file exactly as provided by the user. Do not rewrite, summarize, delete, or silently alter its content.

Target path inside the repository:
docs/phase2/ACNETREX_PHASE2_UNIFIED_GITHUB_HANDOFF.md

OPTIONAL SUPPORTING ARTIFACTS
If the original source artifacts are also provided separately, commit them under these exact paths:
- artifacts/phase2/acnetrex-phase2.zip
- docs/phase2/PHASE2_DOCUMENTATION.md
- docs/prd/acnetrex-v3-mobile-prd-v1.5-interface-sleep-food-skin-twin-integrated.md

If only the unified markdown file is provided, commit only that file and do not fabricate missing files.

BRANCHING MODEL — STRICT
Use the safe branching flow below:

1. `main`
   - Production-ready baseline only.
   - Do not commit directly to `main`.
   - Do not push unfinished work to `main`.

2. `staging`
   - Release-candidate branch.
   - Must be created from `main` if missing.
   - Used only after `dev` is validated.

3. `dev`
   - Integration branch.
   - Must be created from `main` if missing.
   - Feature/fix branches merge into `dev` first.

4. `feat/phase2-unified-handoff`
   - Create this branch from the latest `dev`.
   - Commit the provided file(s) here.
   - Open a pull request from this branch into `dev`.

REQUIRED EXECUTION STEPS
1. Clone the repository.
2. Inspect current branches:
   - `git branch -a`
   - Confirm whether `main`, `staging`, and `dev` exist.
3. If the repository is empty:
   - Initialize `main` with a minimal `README.md`.
   - Push `main`.
4. Ensure `staging` exists:
   - If missing, create it from `main`.
5. Ensure `dev` exists:
   - If missing, create it from `main`.
6. Create and switch to:
   - `feat/phase2-unified-handoff`
   - Base it on latest `dev`.
7. Create target directories:
   - `docs/phase2/`
   - `docs/prd/`
   - `artifacts/phase2/` if supporting artifacts are provided.
8. Copy the provided unified markdown file to:
   - `docs/phase2/ACNETREX_PHASE2_UNIFIED_GITHUB_HANDOFF.md`
9. Run safety checks before commit:
   - Confirm no `.env`, tokens, API keys, passwords, private credentials, or local secret files are being committed.
   - Confirm no accidental OS junk files are included.
   - Confirm `git status` only shows intended files.
10. Commit with this message:
   - `docs: add AcneTrex Phase 2 unified GitHub handoff`
11. Push the feature branch.
12. Open a pull request:
   - Base: `dev`
   - Head: `feat/phase2-unified-handoff`
   - Title: `docs: add AcneTrex Phase 2 unified handoff`
   - Body must summarize:
     - Added unified Phase 2 handoff file.
     - Included Phase 2 documentation, PRD reference, expanded ZIP contents, and GitHub branching instructions.
     - Followed safe branch flow: `feat/phase2-unified-handoff` → `dev`.
     - No secrets or credentials committed.
13. Do not merge into `main` directly.
14. If the user explicitly approves the PR:
   - Merge PR into `dev`.
   - Validate repository state.
   - Then create PR `dev` → `staging`.
   - Only after staging validation and explicit approval, create PR `staging` → `main`.

GIT COMMAND REFERENCE
Use equivalent commands, adjusting only if the repository state requires it:

```bash
git clone https://github.com/markjlomoljo-hash/ATV3-APP-BUILD-V.0.git
cd ATV3-APP-BUILD-V.0

git fetch --all --prune
git branch -a

# If repo is empty, initialize main first.
# Otherwise, make sure local main tracks origin/main.
git checkout main || git checkout -b main
git pull origin main || true

# Create staging if missing.
if ! git ls-remote --exit-code --heads origin staging; then
  git checkout main
  git checkout -b staging
  git push -u origin staging
fi

# Create dev if missing.
if ! git ls-remote --exit-code --heads origin dev; then
  git checkout main
  git checkout -b dev
  git push -u origin dev
fi

git checkout dev
git pull origin dev
git checkout -b feat/phase2-unified-handoff

mkdir -p docs/phase2 docs/prd artifacts/phase2

# Copy the provided unified file into:
# docs/phase2/ACNETREX_PHASE2_UNIFIED_GITHUB_HANDOFF.md

git status
git diff --stat

# Safety check: do not commit secrets or unintended files.
git add docs/phase2/ACNETREX_PHASE2_UNIFIED_GITHUB_HANDOFF.md
git commit -m "docs: add AcneTrex Phase 2 unified GitHub handoff"
git push -u origin feat/phase2-unified-handoff
```

NON-NEGOTIABLES
- Never commit secrets.
- Never commit directly to `main`.
- Never rewrite the provided handoff content unless the user explicitly asks.
- Never merge to `main` without explicit user approval.
- Keep the final repository state clean, traceable, and reviewable.
- Report the final branch name, commit hash, PR link, and files changed.
````


---

## 2. Source File Manifest

| Label | Uploaded / Source File | Size | SHA-256 |
|---|---:|---:|---|
| `Phase 2 ZIP Artifact` | `acnetrex-phase2 ZIP (1).zip` | 114,664 bytes | `c4d6fc471353d6978c34e3fbfbfdd188ced242803f532770e30f6ae28e34e78e` |
| `Phase 2 Documentation` | `PHASE2_DOCUMENTATION(1).md` | 8,827 bytes | `1a4ff5005bdd6174786ef268a194a6ab5041ec344a7a324ecd9c54f26ad7463c` |
| `PRD Reference` | `acnetrex-v3-mobile-prd-v1.5-interface-sleep-food-skin-twin-integrated(2).md` | 288,958 bytes | `1c873a44692db73a600f4bbd6f4f6612cb5e62bf5ec111919d1e8b63302bee2d` |

---

## 3. Phase 2 Documentation

Original source: `PHASE2_DOCUMENTATION(1).md`

````markdown
# AcneTrex V3 — Phase 2: UI Prototype & Onboarding Implementation Log

**Platform:** Base44 (Free Tier Web App Builder)  
**Date:** 2026-06-30  
**Status:** Complete — Frontend UI prototype with onboarding and placeholder navigation

---

## Summary

Phase 2 used Base44 to scaffold the AcneTrex V3 frontend UI prototype. The deliverables include:

1. **Pre-Account Consent Education Flow** (8 steps)
2. **Mandatory Personalization Onboarding** (7 steps)
3. **Main App Shell** with bottom tab navigation
4. **Placeholder Screens** for all major modules
5. **This documentation log**

---

## Screens Produced

### Pre-Account Consent Flow (8 screens)

| Step | Screen | Required | Default |
|------|--------|----------|---------|
| 1 | Terms of Use | Yes | Off |
| 2 | Privacy Policy | Yes | Off |
| 3 | Health Data Processing | Yes | Off |
| 4 | AI Limitations / Non-Diagnostic | Yes | Off |
| 5 | Camera & Media Education | Yes | Off |
| 6 | Notification Education | Yes | Off |
| 7 | Anonymous Network Learning | Optional | Off |
| 8 | Raw Image Model Improvement | Optional | Off |

### Mandatory Onboarding Wizard (7 steps)

| Step | Title | Fields Collected |
|------|-------|-----------------|
| 1 | Basic Profile | Age range, timezone, primary goals, guidance style |
| 2 | Skin History | Acne onset (13 options per PRD), severity, breakout zones, lesion types, free-text notes |
| 3 | Skin Type & Barrier | Skin type, sensitivity, barrier symptoms, actives tolerance |
| 4 | Routine & Products | Routine timing, current products, sunscreen behavior, recent changes |
| 5 | Lifestyle & Triggers | Sleep quality, stress, meal frequency, snack frequency, dairy, exercise |
| 6 | Goals & Constraints | Urgency, complexity tolerance, medication openness, fragrance preference |
| 7 | Consent & Learning | Anonymous learning, derived features, annotations, raw images, evidence retrieval, revocation |

### Main App Navigation (5 bottom tabs)

| Tab | Screen | Purpose |
|-----|--------|---------|
| Today | Dashboard | Daily command center with AI status, tasks, quick actions, modules |
| Logs | Log Hub | 10 daily log types with navigation |
| FaceAtlas | Face Analysis | Placeholder for multi-angle scan |
| Insights | Intelligence Hub | 10 insight modules with navigation |
| Profile | User Profile | Settings, consent, badges, reports, account |

### Log Sub-screens (10 total)
Sleep, Food, Stress, Activity, Hydration, Skin State, Routine, Treatment, Contact, Cycle

### Insight Sub-screens (10 total)
Forecast, TriggerGraph, BarrierGuard, FormulaLens, CutisAI, Intelligence Core, Skin Twin Lab, Treatment Plan Center, Reports, ClimateSkin Radar

---

## PRD Compliance Notes

### Respected Requirements
- Pre-account consent education flow with all 8 required consent states
- Mandatory onboarding with progress indicators, defined answer sets, multi-select chips
- "Not sure," "Not applicable," "Prefer not to answer" options for sensitive fields
- Stitch-derived Skin History with 13 acne-onset options and structured values
- Meal frequency baseline capture for adaptive food logging
- Anonymous learning OFF by default, raw image consent OFF by default
- Revocation acknowledgement before proceeding
- Mobile-first, touch-friendly design with large cards and adequate touch targets
- Navigation structure matching PRD section 12.1 and 12.2
- Premium, clinical, calm, non-judgmental visual tone
- Zero-fabrication: all placeholder screens clearly labeled "Coming in a future phase"
- No fake scores, mock data, or random values displayed anywhere
- Built-in Base44 authentication (email/password + Google OAuth)

### Known Limitations (Base44 Platform)
- **No React Native export**: Base44 generates React web code, not Expo React Native. The generated code must be manually translated or rebuilt in the target mobile framework.
- **No backend logic**: Base44's free tier provides only frontend code. All backend logic (AI/ML engines, evidence retrieval, forecasting, reports, treatment planning) must be implemented in later phases using FastAPI/Supabase.
- **No complex validation**: Multi-step conditional branching and autosave-on-return are simplified. Full resume-on-return requires backend persistence.
- **No offline support**: Base44 apps are web-only; offline queue, secure storage, and background sync require native implementation.
- **No native camera/media**: FaceAtlas camera flow requires Expo Camera in the real app.
- **No push notifications**: Requires expo-notifications + backend scheduling.
- **Placeholder API calls**: The onboarding saves to Base44's built-in entity system. Later phases must replace these with real API calls to the FastAPI backend.

---

## Architecture Decisions

1. **Entity Schema**: Created OnboardingProfile entity with answers (JSON), consent_states (JSON), completed (boolean), and current_step (string) to support resume-on-return.
2. **Component Structure**: Onboarding uses a wizard pattern with independent step components. Each step manages its own validation state and passes data up.
3. **Consent Flow**: Separated into its own pre-registration flow with 8 steps. Required consents block progression; optional items (anonymous learning, raw images) default to OFF.
4. **Navigation**: 5 bottom tabs matching PRD section 12.1. Sub-screens use stack navigation patterns within the web router.
5. **Design System**: Emerald/green accent (brand colors), Inter font, rounded cards with generous white space, clinical calm aesthetic.

---

## Handoff Notes for Later Phases

### Phase 3+ Must:
1. Replace Base44 entities with real PostgreSQL tables via Supabase/FastAPI
2. Implement autosave — currently saves only on completion
3. Add conditional branching — e.g., cycle tracking questions only if user enables it
4. Build real FaceAtlas camera flow with Expo Camera
5. Connect all placeholder screens to real backend services
6. Implement Treatment Plan Center with evidence retrieval and calendar
7. Build CutisAI with backend LLM routing and evidence layer
8. Add offline queue for daily logs
9. Implement push notifications tied to real events
10. Translate to Expo React Native from React web code

---

## Code Organization

- `src/components/onboarding/` — Consent flow, wizard, shared components
- `src/components/onboarding/steps/` — Individual onboarding step components
- `src/pages/` — Main app pages
- `src/pages/daily-logs/` — Log sub-pages (placeholder)
- `src/pages/insights/` — Insight sub-pages (placeholder)
- `src/components/AppLayout.jsx` — Bottom tab navigation layout
- `src/components/PlaceholderScreen.jsx` — Reusable coming-soon template

---

## Files Modified/Created

### Entities
- `base44/entities/OnboardingProfile.jsonc`

### Components (14 files)
- `src/components/onboarding/ConsentFlow.jsx`
- `src/components/onboarding/OnboardingWizard.jsx`
- `src/components/onboarding/OnboardingChip.jsx`
- `src/components/onboarding/OnboardingCard.jsx`
- `src/components/onboarding/FieldLabel.jsx`
- `src/components/onboarding/steps/StepBasicProfile.jsx`
- `src/components/onboarding/steps/StepSkinHistory.jsx`
- `src/components/onboarding/steps/StepSkinType.jsx`
- `src/components/onboarding/steps/StepRoutine.jsx`
- `src/components/onboarding/steps/StepLifestyle.jsx`
- `src/components/onboarding/steps/StepGoals.jsx`
- `src/components/onboarding/steps/StepConsentLearning.jsx`
- `src/components/AppLayout.jsx`
- `src/components/PlaceholderScreen.jsx`

### Pages (25 files)
- `src/pages/Onboarding.jsx`
- `src/pages/Home.jsx`
- `src/pages/Logs.jsx`
- `src/pages/FaceAtlas.jsx`
- `src/pages/Insights.jsx`
- `src/pages/Profile.jsx`
- `src/pages/Phase2Documentation.jsx`
- 10 log sub-pages in `src/pages/daily-logs/`
- 10 insight sub-pages in `src/pages/insights/`

### Config
- `src/App.jsx` — Full router with all routes
- `src/index.css` — Updated brand colors and fonts
- `index.html` — Updated title, meta, and fonts
- `tailwind.config.js` — Tailwind configuration
- `package.json` — Dependencies and scripts

---

## How to Use This Code

1. **Clone or extract** this zip to your local machine
2. Run `npm install` to install all dependencies
3. Run `npm run dev` to start the development server
4. The app will run at `http://localhost:5173`
5. You will need a Base44 account and API key for the backend (auth, entities)
6. Replace placeholder screens with real backend integrations in Phase 3+

---

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Icons:** lucide-react
- **Routing:** react-router-dom v6
- **State:** React hooks + @tanstack/react-query
- **Backend:** Base44 BaaS (auth, database, entities)
- **Charts:** recharts
- **Markdown:** react-markdown
- **Animations:** framer-motion

---

_Generated on 2026-06-30 by Base44 AI Agent_
````

---

## 4. PRD Reference

Original source: `acnetrex-v3-mobile-prd-v1.5-interface-sleep-food-skin-twin-integrated(2).md`

````markdown
# AcneTrex V3 Mobile Application PRD

**Document type:** Product Requirements Document and Engineering Specification  
**Product:** AcneTrex V3  
**Target platform:** Mobile-first native iOS and Android application. Web compatibility is secondary and must never drive architecture, UX, or feature behavior.  
**Version:** 1.5.0  
**Status:** Execution-ready specification  
**Primary audience:** Claude, Manus, Replit AI, full-stack engineers, mobile engineers, backend engineers, AI/ML engineers, QA engineers, security reviewers  
**Product classification:** Premium personal acne intelligence platform  
**Revision focus:** Research-integrated mobile-native upgrade for mandatory account/onboarding flow, real AI/ML readiness gating, FaceAtlas annotation-first analysis, FormulaLens product intelligence, treatment planning, consented anonymous learning, professional clinical reports, streak/badge motivation, push notifications, permissioned native weather/location context, N-of-1 longitudinal acne dynamics analysis, Stitch-derived Skin History onboarding, meal-baseline-adaptive food logging, SleepDerm circadian/sleep-debt intelligence, Skin Twin visual simulation, privacy controls, and App Store / Play Store release readiness.  

---

## 1. Executive Summary

AcneTrex V3 is not a simple acne tracker. It is a production-grade, AI-powered skin health intelligence platform that combines daily user behavior data, multi-photo face analysis, product and ingredient intelligence, environmental context, evidence retrieval, personalized forecasting, and longitudinal learning to help users understand acne patterns and improve skin outcomes.

The mobile application must feel premium, clinically calm, trustworthy, fast, touch-friendly, accessible, and useful immediately after login. It must function as a durable personal acne intelligence system, not as a demo, prototype, or static UI shell.

The central objective of V3 is to move AcneTrex from **looks functional** to **actually functional**. Every major interaction must persist, every intelligence output must be traceable, every AI/ML module must operate through real service boundaries, and every user-owned record must survive logout, refresh, reinstall, device changes, and future upgrades.

The mobile app must preserve the existing AcneTrex product identity, module names, route logic, feature intent, and design language from the current deployed web foundation while upgrading the implementation into a secure, backend-backed, mobile-native system.

The V1.2 feature upgrade integrates the research findings and product decisions needed to make AcneTrex a cohesive, mobile-native, ethical, law-abiding, live, interactive, responsive, clinically useful, and production-grade acne intelligence platform. It strengthens account-first access, mandatory low-fatigue personalization, FaceAtlas annotation-first analysis, real model confidence/readiness visibility, consented anonymous learning, FormulaLens product intelligence, evidence-cited CutisAI actions, push notifications, streak and badge systems tied to real data utility, and dermatologist-ready reporting. These upgrades are additive and supersede conflicting V1.1 language only where explicitly stated.

The V1.4 upgrade adds study-grade longitudinal acne dynamics inside the app. Instead of making users keep a separate Excel diary, AcneTrex must record the same high-resolution daily variables directly through its existing logs, FaceAtlas scans, treatment plans, routine records, product changes, weather context, and CutisAI interactions. The AI/ML engines must use these real user records to perform descriptive, diagnostic, predictive, prescriptive, correlational, lagged, regression, episode-based, and N-of-1 analyses. The system must be capable of producing deeply contextual personal history interpretation, critical pattern analysis, stillness/breakout/purging differentiation, and evidence-grounded personalized outputs without fabricating causation or overstating certainty.

The V1.5 upgrade integrates interface-derived and advanced daily-intelligence requirements. It formalizes the Stitch Skin History onboarding flow, adaptive meal-baseline food logging, snack sub-events, SleepDerm Circadian Intelligence, sleep debt tracking, sleep-inflammation correlation analysis, SleepDerm optimization plans, Skin Twin active-variable simulation, and confidence-limited current-skin and future projection visualizations. These additions are integrated into the same product, data, API, AI/ML, testing, and acceptance structure so the PRD remains cohesive and execution-ready rather than becoming a loose addendum.

---

## 2. Product Identity

### 2.1 Product Definition

AcneTrex is an AI-powered acne forecasting and skin health intelligence system that combines:

- acne tracking
- skin analytics
- multi-photo FaceAtlas analysis
- user-guided lesion annotation and self-labeling support
- consented anonymous lesion-learning loops for model improvement
- progress monitoring
- AI coaching
- treatment optimization
- pattern detection
- habit analysis
- product and ingredient intelligence
- predictive insights
- personalized recommendations
- clinical-grade data collection
- N-of-1 longitudinal acne dynamics tracking
- study-grade daily exposure logging inside the app instead of external spreadsheets
- stillness, breakout, suspected purging, and lesion-longevity analysis
- evidence retrieval
- privacy-preserving anonymous learning
- live AI/ML activity, confidence, performance, and readiness observability
- motivating task board with real backend-linked points and completion animations
- dermatologist-ready reports
- Stitch-derived Skin History onboarding with structured acne-onset timeline capture
- meal-frequency-based food logging with snack sub-events and honest completion states
- SleepDerm Circadian Intelligence with sleep debt, nocturnal recovery opportunity, and sleep-inflammation correlation analysis
- Skin Twin current-skin visualization, zone heatmaps, and confidence-limited simulation projections

### 2.2 Product Philosophy

Every decision must support:

1. Better acne outcomes.
2. Better user understanding.
3. Better treatment adherence.
4. Better long-term personalization.
5. Better pattern detection.
6. Better privacy and consent control.
7. Better clinical usefulness.
8. Better trust through honest uncertainty.

### 2.3 Product Tone

AcneTrex must feel:

- modern
- premium
- intelligent
- medically cautious
- scientifically grounded
- reassuring
- personal
- calm
- elegant
- non-judgmental
- clinically useful

The app must never feel like a toy, random score generator, template chatbot, or generic habit tracker.

---

## 3. Mission, Goals, and Non-Goals

### 3.1 Mission

Build AcneTrex V3 as a real, production-grade native mobile acne intelligence platform for iOS and Android with durable persistence, secure authentication, backend-driven AI/ML services, real evidence retrieval, real learning loops, strong privacy controls, and zero fake logic.

### 3.2 Primary Product Goals

1. Give users a clear daily understanding of their acne and barrier state.
2. Help users detect personal acne triggers across sleep, food, stress, cycle, products, contact, activity, climate, hydration, cleansing, sunscreen, makeup, and treatments.
3. Forecast flare risk using real historical data, scans, product history, and contextual signals.
4. Analyze products and ingredients against the user’s skin profile and acne history.
5. Provide a real AI assistant, CutisAI, with user context, evidence retrieval, uncertainty handling, and persisted conversation memory.
6. Improve FaceAtlas lesion identification through guided user lesion annotation, model-user comparison, consented feedback, and calibrated learning.
7. Build a comprehensive personalization profile from account setup onward so AI/ML engines can learn each user’s skin history, triggers, routine, behavior patterns, environment, goals, and constraints.
8. Build a privacy-preserving research network where users can opt in to anonymous learning that improves model accuracy for everyone without exposing raw personal data.
9. Make the AI/ML system observable through a modern, futuristic, clinically elegant live engine-status interface showing real activity, learning state, confidence, readiness, and performance.
10. Generate dermatologist-ready reports from real stored data.
11. Ensure all features survive upgrades, reinstall, session expiration, and schema evolution.

### 3.3 Engineering Goals

1. Build mobile app with Expo React Native and TypeScript.
2. Use a secure backend service layer for auth, data, AI routing, retrieval, forecasting, reports, and telemetry.
3. Use PostgreSQL with pgvector for durable records and retrieval embeddings.
4. Use row-level security or equivalent tenant isolation so users can access only their own records.
5. Use private object storage for face/product images.
6. Use Redis and background workers for heavy tasks.
7. Use runtime validation on all API, AI, and persistence boundaries.
8. Use recursive testing loops before and during implementation.
9. Prevent SQL injection, IDOR, missing authorization, API key exposure, debug leakage, and DDoS abuse.
10. Keep functions short, intentional, testable, and maintainable.

### 3.4 Non-Goals

The app must not:

- diagnose diseases as a doctor would
- replace dermatology care
- provide emergency medical advice
- fabricate scores, metrics, recommendations, or research statistics
- use local-only storage as the production source of truth
- expose raw health data without consent
- use fake AI/ML outputs
- use uncontrolled self-modifying models
- require users to repeatedly re-enter data already captured elsewhere
- create generic wellness features unrelated to acne or skin intelligence

---

## 4. Source of Truth and Compatibility Contract

### 4.1 Existing Web Foundation

The existing AcneTrex web application, recovered artifacts, package manifest, lockfile, dependency graph, route map, entity schemas, current visual identity, and feature names must be treated as the source-of-truth behavioral reference.

The mobile app may use a new native UI implementation, but it must preserve:

- product name
- module names
- product philosophy
- route/screen intent
- visual language
- user flows where valid
- feature hierarchy
- data model continuity
- legacy migration compatibility

### 4.2 Existing Web Stack to Preserve for Compatibility

The current web foundation must remain compatible with:

- React 19.2.6
- React-DOM 19.2.6
- Vite 7.3.2
- TypeScript 5.9.3
- Tailwind CSS 4.1.17
- @vitejs/plugin-react 5.1.1
- vite-plugin-singlefile 2.3.0
- react-router-dom 7.18.0
- react-hook-form 7.80.0
- zod 4.4.3
- zustand 5.0.14
- framer-motion 12.40.0
- recharts 3.8.1
- react-dropzone 15.0.0
- lucide-react 1.21.0
- date-fns 4.4.0
- clsx 2.1.1
- tailwind-merge 3.4.0
- @hookform/resolvers 5.4.0

The mobile app should share domain contracts, schemas, API clients, and core business logic where practical.

### 4.3 Legacy Data Keys for One-Time Migration

The previous app used local browser storage keys:

- `acnetrex_credentials`
- `acnetrex_auth_v2`
- `acnetrex_data_v2`
- `acnetrex_ai_v2`

These keys must be used only for one-time migration/import. They must never remain the production authentication or health-data storage system.

### 4.4 Decision Hierarchy

When requirements conflict, resolve decisions in this order:

1. System safety, correctness, user privacy, and data integrity.
2. Existing source-of-truth artifacts and recovered behavior.
3. Explicit V3 requirements in this PRD.
4. Existing stack constraints and platform capabilities.
5. Performance, polish, and optimization.

---

## 5. Zero-Fabrication Contract

The AcneTrex codebase must never ship any of the following in a production path:

- `Math.random()` used to generate a displayed score, percentage, risk level, status, trend, or insight.
- Hardcoded numeric values, status strings, participant counts, user counts, or trend indicators not derived from real records, model outputs, or validated retrieval results.
- Arrays of mock, sample, demo, or dummy data used as production intelligence.
- Placeholder implementations that render UI cards without executing real inference, persistence, retrieval, or calculation.
- Simplified AI/ML logic that replaces a multi-step intelligence engine with a static template or one generic model call.
- Decorative badges, model readiness tiers, research-network statistics, or AI status indicators not computed from real backend events.
- Silent failures that return undefined, null, default values, empty strings, or fake success without an error state.
- Duplicate same-day log records when intended behavior is to update the existing record.
- Client-side-only auth used as production auth.
- Uncontrolled self-modifying models.
- Contradictory state paths that produce different outcomes depending on race timing.
- API keys, service-role secrets, private credentials, database URLs, or connection strings in frontend code.

When real data does not yet exist, render a shared empty or insufficient-data state. Never invent values to make the UI look complete.


---

## 5A. V1.2 Research-Integrated Product Constitution

This section integrates the research findings and the latest product requirements into the existing PRD. It supersedes conflicting language elsewhere while preserving all unaffected requirements exactly as they are.

### 5A.1 Mobile-First Native Constitution

AcneTrex V3 is a **native mobile application first**, not a website that happens to fit on a phone.

Required interpretation:

- Build the primary product in Expo React Native for iOS and Android.
- The app must feel native on iPhone and Android devices: fast touch response, safe-area-aware layouts, native camera/gallery access, native notifications, biometric session support where available, and offline-safe behavior.
- Web compatibility is allowed only as a secondary compatibility layer. Web constraints must not weaken mobile camera flows, background jobs, notifications, local queueing, secure storage, or App Store / Play Store compliance.
- All flows must be designed for one-handed mobile use, small screens, intermittent connectivity, and real user fatigue.
- The final product must align with App Store and Play Store requirements for privacy disclosures, data deletion, health-data handling, notification consent, camera/media permissions, account deletion, content accuracy, and avoidance of misleading medical claims.

### 5A.2 Account-First Access and Pre-Account Consent Education

The app requires account creation before feature access. Users must not enter the main app, FaceAtlas, CutisAI, FormulaLens, forecasts, reports, or logs without a valid authenticated session and completed onboarding.

Before account creation, the app must present a concise but complete privacy and safety education flow explaining:

- AcneTrex is not a replacement for a dermatologist and does not diagnose disease.
- Personal skin data is private and user-owned.
- Raw face images are controlled by the user and handled differently from derived features.
- Anonymous network learning is off by default and requires explicit opt-in.
- Users can use full personal AI personalization without joining anonymous network learning.
- Users may delete individual scans/logs, delete all face images, revoke future learning consent, export data, and delete the account separately.
- AI confidence levels, forecasts, and trigger hypotheses depend on available data; the app will say when data is insufficient rather than fabricate.
- External evidence citations may be retrieved for scientific, product, and treatment explanations, but medical decisions must be made with a qualified healthcare provider.

Required pre-account consent states:

- Terms of Use acknowledgement.
- Privacy Policy acknowledgement.
- Health-data processing acknowledgement.
- AI limitation / non-diagnostic acknowledgement.
- Camera/media permission education before permission request.
- Notification permission education before permission request.
- Anonymous network learning opt-in, default off.
- Raw image model-improvement consent, default off and separate from derived-feature learning.
- Marketing communications, default off if present.

### 5A.3 Mandatory but Low-Fatigue Personalization Intake

Onboarding must be mandatory and complete before the user reaches the main app. No required step may be left blank. If the user tries to continue with an empty field, the app must highlight the unanswered field and state: “Please answer this part to continue.”

However, mandatory does not mean exhausting. The system must minimize fatigue through:

- step-by-step cards with progress indicators;
- defined answer sets wherever possible;
- multi-select chips for common patterns;
- search/select product lists where available;
- smart defaults only when safe and clearly editable;
- “Not sure,” “Not applicable,” and “Prefer not to answer” options for sensitive or genuinely unknown fields;
- conditional branching so users only see relevant questions;
- autosave at every step;
- resume-on-return if the app closes;
- short explanations of why each section matters;
- no repeated questions already answered elsewhere.

The mandatory intake must include, at minimum:

1. **Basic identity and context:** age range, timezone, coarse climate/location preference, guidance style, notification preference, privacy choices, and optional skin tone/Fitzpatrick-style imaging calibration range.
2. **Acne history:** onset age/period, duration, recurrence pattern, current severity self-assessment, flare frequency, affected zones, lesion types usually seen, deep/painful lesion tendency, clogged-pore tendency, PIH/PIE/scarring concern, picking/touching tendency, past dermatology consults, past prescriptions, procedures, and free-text treatment timeline.
3. **Skin type and barrier:** oily/dry/combination/normal pattern, oiliness by zone, sensitivity level, stinging/burning/tightness, redness/flushing, barrier symptoms, actives tolerance, known allergies, product reactions, eczema/dermatitis/rosacea history only if voluntarily disclosed.
4. **Routine and products:** current cleanser, moisturizer, sunscreen, actives, spot treatments, prescriptions, oral medications, supplements, procedures, routine timing, product start dates, recent changes, sunscreen, cleansing, exfoliation, makeup, hair products, shaving/hair removal, patch testing, and introduce-one-thing-at-a-time behavior.
5. **Lifestyle and triggers:** sleep schedule and quality, stress pattern, diet pattern, dairy intake, high-glycemic/sugary food pattern, hydration, caffeine, exercise/sweat, mask/helmet/contact exposure, pillowcase/towel/phone habits, climate, sun exposure, travel/routine disruption, menstrual cycle/hormonal context where voluntarily relevant.
6. **Goals and constraints:** primary goals, urgency, tolerance for routine complexity, budget sensitivity, fragrance preference, texture preference, medication openness, dermatologist visit preparation, and report needs.
7. **Consent and learning:** anonymous network learning, derived feature contribution, annotation contribution, raw image model-improvement consent, evidence retrieval acknowledgement, and revocation acknowledgement.

Free-text fields must be supported where structured sets are insufficient, especially acne history, product reactions, medication/treatment timeline, unusual symptoms, and user explanations during model-user disagreements. Free-text answers must be embedded, summarized, and used by the AI/ML engines; they must not be stored as ignored notes.

### 5A.4 Post-Onboarding Intelligence Boot Sequence

Immediately after account creation and onboarding save, the backend must run the first personalization job and generate every output that can honestly be produced from onboarding data alone.

Required initial outputs:

- baseline profile snapshot;
- self-reported acne history summary;
- skin type and barrier baseline;
- medication/product/routine inventory;
- risk summary with confidence notes;
- trigger hypotheses clearly labeled as hypotheses;
- routine review and compatibility warnings based only on known inputs;
- task plan for the first 7 days;
- forecast readiness score;
- feature-readiness map showing which features are unlocked, partially ready, or locked due to insufficient data;
- recommended next data actions such as first FaceAtlas scan, sleep log, product scan, or routine confirmation;
- CutisAI welcome summary using the user’s actual profile.

Readiness-gated features must not generate fake outputs. A feature may be locked, partially available, or available:

- **Locked:** required data criteria are not met.
- **Partially available:** output can be produced but must carry a low-confidence/insufficient-data explanation.
- **Available:** minimum data criteria and validation gates are met.

Examples:

- Flare forecasting should require enough logs/scans to support the requested forecast window.
- Trigger correlation should require repeated exposures and outcomes before calling anything a likely trigger.
- Product compatibility can run from ingredients and profile, but product-effect claims require later user outcomes.
- Skin Twin scenarios can simulate only when the required baseline and comparison variables exist.

### 5A.5 Hypothesis, Validation, Confidence, and Anti-Fabrication Framework

All self-reported onboarding answers, early logs, and user annotations must be treated as useful hypotheses until confirmed by scans, repeated logs, outcomes, and model validation.

The AI/ML system must distinguish:

- user self-report;
- observed scan data;
- product ingredient evidence;
- environmental/weather context;
- repeated longitudinal pattern;
- statistical association;
- clinical evidence;
- model inference;
- assistant explanation;
- validated trigger;
- insufficient-data state.

Before the app says something is a likely acne trigger, it must check:

- number of exposure events;
- number of outcome events;
- recency and consistency;
- delay window plausibility;
- confounders such as cycle, product changes, stress, sleep, weather, treatment changes, and occlusion;
- effect direction and magnitude;
- confidence interval or equivalent uncertainty estimate where implemented;
- evidence support from trusted sources if making a scientific claim;
- user-specific plausibility based on history;
- safe language review.

The system must show real confidence levels, readiness levels, and validation states. It must never inflate confidence to look advanced. Required confidence wording:

- “Insufficient data.”
- “Early hypothesis.”
- “Moderate confidence.”
- “High confidence.”
- “Needs confirmation.”
- “Confounded by another change.”
- “Model disagrees with user annotation.”
- “User feedback accepted for review.”
- “Calibration pending.”

### 5A.6 FaceAtlas Annotation-First Scan Constitution

FaceAtlas analysis must require all required photo angles before analysis begins:

1. Front.
2. Left 45 degrees.
3. Right 45 degrees.
4. Forehead/upper face.
5. Chin/lower face.

After image capture/upload and before the user can press **Start Analysis**, the user must complete a structured lesion annotation step. This is mandatory because it improves accuracy, creates a weak-label learning signal, and helps the system compare human-observed lesions against model-detected lesions.

The user must enter:

- total visible lesions;
- total suspected invisible/growing lesions felt under the skin;
- visible vs not-yet-visible split;
- zone counts for forehead, left cheek, right cheek, chin, jawline, nose, temples, neck, and custom zone if needed;
- lesion labels: closed comedones, open comedones, papules, pustules, nodules, cysts, inflamed bumps, PIH marks, PIE redness, scars, custom, and unsure;
- certainty for each label/count: sure, somewhat sure, unsure;
- pain/tenderness/itch/swelling/recent change notes where relevant;
- current self-rated oiliness using a defined scale such as 0–4 or 0–10 with plain-language anchors;
- optional note explaining anything the camera may miss.

Each lesion option must show a definition and either a simple illustration, a real reference image, or both. Reference content must be medically cautious, non-alarming, inclusive across skin tones, and clearly labeled as educational support rather than diagnosis.

FaceAtlas must estimate oiliness using image-derived signals such as shine/reflection patterns, lighting-normalized facial zones, skin-surface specular highlights, and quality-controlled capture metadata. The app must also ask the user to rate perceived oiliness so the model can compare subjective and image-derived oiliness. The output must disclose limitations if lighting, blur, angle, makeup, sunscreen, sweat, or poor image quality may affect oiliness estimation.

Raw face images must be handled as follows:

- stored temporarily only until analysis and derived feature extraction complete;
- deleted automatically after analysis unless the user explicitly chooses retention or raw-image model-improvement consent allows a longer retention policy;
- never placed in public storage;
- never used for model improvement without explicit raw-image consent;
- available for local device/gallery saving if the user chooses;
- deletable by the user at any time through FaceAtlas or Privacy settings.

### 5A.7 Model-User Disagreement and CutisAI Reconciliation

FaceAtlas must show where the AI agrees or disagrees with the user’s lesion counts and labels. The result UI must display:

- user count vs model count;
- agreement percentage or agreement class;
- disagreement by lesion type;
- disagreement by facial zone;
- model confidence;
- user certainty;
- image-quality limitations;
- explanation of why the model disagrees;
- “Discuss with CutisAI” action.

When redirected to CutisAI, the assistant must receive the scan context, model output, user annotation, disagreement metrics, image-quality metadata, lesion definitions, and relevant evidence. CutisAI must help the user understand the disagreement, ask clarifying questions, and educate without being dismissive.

Possible outcomes:

- user accepts AI explanation;
- user corrects their label;
- user insists with justification;
- user provides additional evidence or explanation;
- system marks the case for calibration review;
- system accepts the user feedback as a personal learning signal;
- system queues consented, de-identified feedback for network learning if allowed.

The model must learn from every outcome, but “learning” must mean validated feedback capture, calibration review, feature update, retraining queueing, or personal model adaptation. It must not mean uncontrolled silent production model mutation.

### 5A.8 Personal Learning vs Anonymous Network Learning

The UI must clearly separate four concepts:

1. **Personal personalization:** learning your own skin patterns from your private logs, scans, products, and outcomes.
2. **On-device/local contribution state:** data saved locally or queued safely until sync.
3. **Anonymous network learning:** opt-in de-identified contribution to population model improvement.
4. **Released model updates:** validated model version changes deployed after evaluation.

Anonymous network learning is off by default. Consenting users may contribute:

- derived lesion counts;
- labels and certainty levels;
- zone patterns;
- routine/product reactions;
- trigger correlations;
- weather/climate context;
- model-user feedback;
- forecast-vs-outcome comparisons;
- de-identified image embeddings;
- raw facial images only if separately and explicitly consented.

If the user revokes learning consent, future data must stop contributing. The app must explain that previously aggregated, de-identified learning contributions may not always be removable from already-trained aggregate models, but no future contributions will be accepted after revocation.

The user must still receive full personal AI personalization without joining anonymous network learning.

User-visible learning status must include:

- contribution count;
- contribution categories;
- personal confidence trend;
- cohort learning status;
- current model version;
- current model badge/rank;
- validation status;
- latest calibration update;
- pending inference/learning queue status;
- last successful analysis;
- which learning modes are on/off.

### 5A.9 AI/ML Engine Rank, Streaks, Badges, and Streak Pet

Gamification must reinforce accurate data contribution and adherence, not fake medical progress.

AcneTrex must implement streaks aggressively but ethically:

- daily streak activates only when all required daily tasks for that user are completed or queued offline successfully;
- partial streak states may exist for partial completion but must not count as full streaks;
- missed days trigger backfill or gentle recovery flows rather than fake completion;
- notifications may remind users before streak loss;
- streak loss language must be supportive, never shame-based.

Badges and the streak pet may be used to increase motivation, similar in emotional function to modern social/habit apps, but the tone must remain premium and clinical. The streak pet must represent data consistency and skin-intelligence growth, not guaranteed skin improvement.

The ranking system must connect directly to real AI/ML readiness and performance. Example rank dimensions:

- personal data depth;
- logging consistency;
- FaceAtlas scan completeness;
- annotation usefulness;
- forecast readiness;
- model confidence trend;
- product/routine data completeness;
- validation status;
- network learning contribution if opted in.

Ranks must not be decorative. A rank such as “Calibration Level 3” or “FaceAtlas Confidence: Improving” must be computed from real backend records and model-performance snapshots. The UI must show why the user has the current rank and what real data would improve it.

Points must reward:

- consistency;
- data importance;
- task difficulty;
- streak maintenance;
- AI usefulness of the data;
- filling high-impact missing fields;
- feedback that resolves uncertainty;
- scan quality improvements;
- routine adherence logs;
- report-ready data completeness.

Task completion animation must feel satisfying and premium: card collapse, soft pulse, haptic tick, data-node activation, points glide into a readiness ring, and AI meter update only if backend state truly changed. Reduced-motion fallback is mandatory.

### 5A.10 Sleep Logging Efficiency Requirement

Sleep logging must ask:

- what time the user slept;
- what time the user woke;
- sleep quality;
- disturbances;
- naps if relevant;
- optional notes.

The app must automatically calculate sleep duration from sleep time and wake time, correctly handling overnight sleep across date boundaries. The calculated duration must be editable only by changing the source times, not by typing fake totals, unless the app explicitly supports a manual override with a reason.

Sleep data must feed SleepDerm, TriggerGraph, forecast readiness, routine scheduling, task planning, reports, and CutisAI summaries.

### 5A.11 CutisAI Capabilities Without ResearchVault

There must be no standalone ResearchVault or DermVault feature. CutisAI must still be evidence-based through a secure backend evidence-retrieval layer.

CutisAI must cite evidence when:

- discussing products or ingredients;
- discussing treatments, actives, medication classes, or procedures;
- explaining acne science;
- making claims based on external research;
- comparing research-supported risks;
- explaining trigger plausibility beyond user data.

CutisAI must also take actions through secure backend tools, not merely chat:

- create tasks;
- summarize logs;
- generate reports;
- suggest routine changes;
- explain FaceAtlas disagreements;
- update task plans after user approval;
- start product analysis when provided product input;
- prepare dermatologist-ready summaries;
- identify insufficient-data gaps;
- create reminders or notification preferences after explicit user confirmation;
- retrieve current evidence through approved databases and sources.

Every tool action must be authenticated, authorized, validated, persisted, and auditable.

### 5A.12 Forecasting and Skin Twin Windows

Users must be able to choose forecast windows:

- 3 days;
- 7 days;
- 14 days;
- 30 days;
- treatment-cycle timelines.

The forecast engine must adjust features, validation criteria, and confidence disclosures to the selected window. Longer windows require stronger historical data. If the user chooses a window that lacks enough data, the app must state the insufficiency and suggest what logs/scans are needed.

Skin Twin simulations must support scenarios such as:

- better sleep;
- lower stress;
- no dairy;
- reduced high-glycemic intake;
- hydration improvement;
- routine consistency;
- product removal;
- weather changes;
- treatment adherence;
- reduced occlusion/mask/contact exposure;
- reduced picking/touching;
- improved sunscreen consistency;
- active ingredient pause or introduction where safe and evidence-supported.

Simulations must be labeled as estimates, not predictions of guaranteed results.

### 5A.13 FormulaLens Product Intelligence Expansion

Product input priority:

1. Label photo OCR.
2. Manual ingredient paste.
3. Product name search with internet retrieval.
4. Barcode lookup where supported.
5. Manual brand/product entry.

All external product, ingredient, weather, AI, retrieval, and storage calls must go through backend services using secure server-side environment variables. No frontend API keys are allowed.

FormulaLens must show risk categories:

- comedogenic potential;
- irritation risk;
- barrier disruption risk;
- occlusion risk;
- fragrance/allergen risk;
- active conflict;
- fungal-acne relevance;
- dryness risk;
- purge risk;
- photosensitivity risk;
- routine compatibility;
- user allergy conflict;
- pregnancy/cycle/hormonal relevance only when user voluntarily provided relevant context.

FormulaLens must provide:

- simple verdict: safe, caution, or avoid;
- nuanced compatibility score;
- ingredient-level explanations;
- full-routine conflict detection, such as retinoid plus exfoliating acids, benzoyl peroxide irritation risk, duplicate actives, over-exfoliation, barrier-risk combinations, photosensitizing routines without sunscreen, and occlusive layering concerns;
- uncertainty explanation;
- evidence citations where applicable;
- patch-test and introduce-one-thing-at-a-time recommendations.

### 5A.14 Notifications and Risk Alerts

Notifications must be important, personalized, consented, and tied to real events. They must never be decorative.

Eligible notification categories:

- daily log reminders;
- scan reminders;
- routine reminders;
- medication/treatment reminders;
- treatment plan application/taking reminders;
- treatment review, escalation, hold, or provider-check reminders;
- streak-risk reminders;
- forecast warnings when risk meaningfully changes;
- weather/climate trigger alerts;
- UV/photosensitivity alerts for relevant treatments;
- sleep/circadian risk alerts;
- product analysis complete;
- report ready;
- AI insight updates;
- CutisAI follow-up ready;
- consent/privacy change confirmations;
- missed-day backfill prompt;
- dermatologist report export completion.

Forecast warnings may be sent only when risk is significant, confidence is adequate, and the user has enabled that notification type. Low-confidence alerts should use careful wording such as “Possible pattern to review,” not “Your acne will flare.”

### 5A.15 Missing Data and Backfill Handling

AcneTrex must handle missed days honestly.

If a day is missed, the system must:

- mark the date as missing data;
- ask for backfill if the user remembers the relevant details;
- offer a gentle recovery task if exact backfill is not possible;
- keep forecasts and trigger analysis aware of missingness;
- never silently estimate missing data as if it were observed;
- show how missing days affect confidence/readiness;
- preserve streak rules transparently.

A recovery task may restore motivation points, but it must not pretend the original data was logged on time unless the user actually backfills the record.

### 5A.16 AI/ML Activity Visibility

The app must visually reflect real AI/ML engine activity. Statuses must combine technical wording and user-friendly wording.

Required visible engine activities:

- analyzing scans / “checking today’s images”;
- updating confidence / “learning your skin patterns”;
- reading logs / “reviewing your recent habits”;
- comparing patterns / “checking possible trigger links”;
- retrieving evidence / “looking up reliable skin science”;
- calibrating forecast / “tuning your flare estimate”;
- processing feedback / “reviewing your correction”;
- learning from network data / “updating population model when enough consented data is validated”;
- inference queue;
- model calibration;
- validation pending;
- confidence updated;
- insufficient data;
- error/retry state.

Personal learning, anonymous network learning, periodic population retraining, calibration updates, and released model versions must be clearly separated in the UI.

### 5A.17 Professional Profile Interface

The profile must look and function like a serious health intelligence profile, not a simple settings page.

Required profile sections:

- identity and account settings;
- baseline skin profile;
- acne history;
- current severity and lesion tendency;
- barrier and sensitivity profile;
- routine and product inventory;
- medication and treatment history;
- Treatment Plan Center active plans, archived plans, tolerance history, and adherence summary;
- allergy and reaction history;
- lifestyle baseline;
- trigger hypotheses and validation status;
- FaceAtlas history summary;
- model confidence/readiness summary;
- streak/badge/rank summary;
- consent and privacy center;
- notification preferences;
- data export and report history;
- account deletion and data deletion controls.

All profile data must be editable after onboarding with versioned history where clinically or analytically important.

### 5A.18 Dermatologist-Ready Report Design and Content

The report export must follow the professional visual direction shown in the attached AcneTrex report screenshots.

Visual requirements:

- portrait PDF optimized for mobile preview, printing, and email sharing;
- white clinical document card on a soft neutral background;
- rounded page container with subtle border and shadow;
- AcneTrex logo at the top with green accent and V3 badge;
- large bold title such as “AcneTrex Skin Intelligence”;
- smaller subtitle such as “Clinical Reporting Services • Model V3.0”;
- right-aligned metadata block with Report ID, compiled date/time, and secure-record status;
- strong horizontal divider under header;
- uppercase section titles with letter spacing and small medical icons;
- two-column label/value rows for patient specifications and diagnostic baseline;
- metric cards for current scan outputs such as Cutis Health Index, barrier status, inflammatory lesions, non-inflammatory lesions, oiliness estimate, confidence, and validation status;
- historical scan log table with date, CHI, inflammatory count, comedone count, oiliness, confidence, and validation status;
- cosmetics/skincare audit section;
- circadian, glycemic, sweat, climate, product, contact, and routine-trigger summaries;
- bottom footer with privacy/compliance note, “generated by AcneTrex,” and signature/date area for provider review;
- typography that feels clinical, modern, and premium;
- no clutter, no childish visuals, no fake values.

Report content must include every clinically useful detail available from real records:

- patient/user profile summary;
- onset and acne history;
- skin type, sensitivity, barrier symptoms;
- lesion trends by type and zone;
- visible and suspected/growing lesion summaries;
- FaceAtlas scan photos or thumbnails only if user explicitly includes them;
- model-user disagreement history and confidence notes;
- PIH/PIE/scarring notes;
- oiliness/dryness/redness trends;
- product/routine history;
- medication and treatment history;
- active and archived Treatment Plan Center schedules, adherence, tolerance trajectory, plan adjustments, and provider-review prompts;
- allergies and adverse reactions;
- adherence timeline;
- sleep, stress, diet, cycle, sweat, contact, climate, and lifestyle context;
- trigger hypotheses with validation status;
- forecast summaries and selected forecast windows;
- Skin Twin scenario summaries where available;
- FormulaLens product findings and routine conflicts;
- CutisAI summaries;
- evidence citations used for product/treatment/science claims;
- uncertainty and confidence notes;
- insufficient-data notes;
- provider-facing questions or topics to discuss.

If the user is new or insufficient data exist, the report must say exactly what is missing and what additional logs/scans are required. It must never fill empty tables with fake history or fake conclusions.

### 5A.19 Infrastructure and Stack Decision Rule

The build should use the recovered codebase and architecture as the compatibility source of truth. Use Base44 patterns if they are present and useful, but do not force them if they weaken production quality.

Permitted backend/platform approaches:

- FastAPI + PostgreSQL + pgvector + Redis + object storage + background workers;
- Supabase for auth, PostgreSQL, storage, row-level security, and edge functions where appropriate;
- Firebase only if it best matches recovered codebase constraints and does not weaken SQL/reporting/vector/search requirements;
- hybrid architecture only if boundaries are documented and secrets remain server-side.

Advanced infrastructure is required immediately, not deferred indefinitely:

- Redis or equivalent queues;
- background workers for OCR, FaceAtlas analysis, forecasts, reports, evidence retrieval, notifications, and retraining jobs;
- private object storage for images and reports;
- pgvector or equivalent vector search for evidence/user-context retrieval;
- model registry or version table;
- telemetry and audit logs;
- scheduled jobs;
- secure server-side environment variables.

### 5A.20 Treatment Plan Center and Treatment Tolerance Planner

Treatment planning must be integrated into **Treatment Plan Center**, **ClearPath Planner**, **Task Board**, **Notifications**, **Reports**, **FormulaLens**, **CutisAI**, **TriggerGraph**, **BarrierGuard**, and **Skin Twin Lab**. It must not become a disconnected medication reminder. The feature exists to help users follow dermatologist-prescribed or user-selected acne treatments safely, consistently, and with evidence-aligned tolerance building.

The feature must support topical acne treatments, active skincare treatments, and oral acne treatments where appropriate, including but not limited to adapalene, tretinoin, tazarotene, retinol, retinal, benzoyl peroxide, azelaic acid, salicylic acid, topical antibiotic combinations, fixed combination products such as adapalene/benzoyl peroxide, dermatologist-prescribed oral antibiotics, hormonal treatments where user-relevant, isotretinoin monitoring support, and other acne-related treatments that require structured use, adherence tracking, safety monitoring, or tolerance development.

The app must be medically cautious: AcneTrex may help organize, track, explain, and personalize an adherence/tolerance plan, but it must not prescribe, diagnose, independently start prescription medication, change a prescribed dose, stop a prescribed medication, or override a dermatologist or healthcare provider. Prescription plans must be entered as “provider-prescribed” or “provider-directed,” and medication dose/frequency adjustments must be framed as “suggested discussion points” or “provider-confirmation needed” unless the change is limited to non-prescription routine spacing, barrier support, or app reminders.

Evidence anchors for this module must include current clinical guidelines and product labeling. For example, NICE acne guidance recommends discussing treatment benefits and drawbacks, emphasizes adherence because positive effects may take 6 to 8 weeks to become noticeable, recommends review of first-line treatment at 12 weeks, and states that irritation from topical benzoyl peroxide or retinoids may be reduced by starting with alternate-day or short-contact application and progressing if tolerated. NICE also requires caution around pregnancy, oral tetracyclines, topical retinoids, oral antibiotics, antimicrobial resistance, and oral isotretinoin risk minimization requirements. The Treatment Plan Center must retrieve and cite current authoritative sources before generating treatment education, safety constraints, and evidence-based plan logic.

#### Core workflow

```text
user starts treatment plan
→ treatment identified from catalog, OCR, product search, prescription label, or manual entry
→ medication/product class resolved
→ evidence and safety rules retrieved server-side
→ user baseline tolerance questions answered
→ existing profile, logs, FaceAtlas, BarrierGuard, FormulaLens, allergies, cycle/pregnancy-relevant voluntary context, weather, routine, and treatment history are loaded
→ contraindication and caution screen runs
→ plan generated with calendar map, start frequency, escalation criteria, barrier-support steps, reminders, tasks, and stop/seek-help rules
→ user confirms plan details
→ plan persists
→ daily treatment task appears
→ check-ins capture adherence and skin response
→ AI/ML updates plan status, confidence, safety flags, and next-step recommendations
→ completed plan is archived into treatment history and reports
```

#### Treatment plan intake questions

Before creating a plan, the app must collect the minimum necessary information without overwhelming the user. Use defined answer sets wherever possible, with free-text only when clinically or contextually necessary. Required question groups include:

- treatment name, brand, strength/concentration, vehicle/form, active ingredients, prescription status, source of recommendation, and intended affected areas;
- whether the plan is dermatologist-prescribed, self-selected OTC, or imported from a prior routine;
- prescribed instructions exactly as written, if any;
- current skin tolerance baseline: dryness, burning, stinging, tightness, peeling, redness, itching, sensitivity, barrier symptoms, active irritation, sunburn, broken skin, eczema/dermatitis/rosacea history if voluntarily disclosed;
- acne baseline: lesion types, severity, painful/deep lesion tendency, PIH/PIE/scarring concern, current FaceAtlas scan status, and current Cutis Health Index;
- routine compatibility: cleanser, moisturizer, sunscreen, exfoliants, benzoyl peroxide, retinoids, acids, vitamin C, masks, scrubs, prescriptions, oral medicines, supplements, procedures, shaving/hair removal, makeup, sunscreen behavior, and product start dates;
- lifestyle and context: sleep, stress, sweat/occlusion, climate/weather, sun exposure, travel, adherence ability, preferred reminder times, and days where application is difficult;
- safety context: allergies, prior reactions, pregnancy/planning/breastfeeding context only where voluntarily relevant, age restrictions where applicable, medication interactions, photosensitivity risk, provider warning instructions, and emergency symptoms;
- user goals: acne reduction, comedone control, inflammatory lesions, hyperpigmentation, scarring prevention, barrier repair, tolerance building, dermatologist visit preparation, or maintenance.

#### Plan generation rules

Each generated treatment plan must include:

- plan name and active treatment class;
- whether the plan is OTC, prescription, or provider-directed;
- evidence summary and citations;
- baseline risk and tolerance profile;
- starting schedule, such as short-contact, alternate-day, 1–2 nights per week, 2–3 nights per week, every other night, or daily only when evidence and tolerance criteria allow;
- escalation windows and conditions, such as “increase only if dryness/redness/stinging remains below threshold for X consecutive uses”;
- de-escalation rules, such as “pause, reduce frequency, switch to short-contact, add barrier recovery, or contact provider if irritation threshold is exceeded”;
- expected adaptation window and when results may begin to appear;
- reminder schedule;
- daily tasks;
- barrier-support instructions;
- sunscreen and photosensitivity cautions where relevant;
- interactions and active conflicts;
- monitoring questions;
- serious warning signs requiring medical advice;
- plan end date or review checkpoint;
- provider review checkpoint for prescription medicines;
- confidence level and reasons for that confidence;
- insufficient-data notes if the plan is generated without recent scans/logs.

The plan must appear as a calendar-style schedule that highlights application/taking days, rest days, review days, barrier-recovery days, provider-check days, and escalation checkpoints. The user must be able to tap a calendar day to see what to do, why it matters, how to apply/take the treatment according to the saved instructions, what to avoid that day, what symptoms to watch for, and which logs will affect the next plan update.

#### Multiple active plans

Users may have multiple treatment plans running at once. Examples include a topical retinoid tolerance plan, a benzoyl peroxide wash plan, an oral antibiotic adherence plan, and a dermatologist follow-up preparation plan. The app must:

- display all active plans in Treatment Plan Center;
- identify routine conflicts across active plans;
- prevent duplicate reminders for the same treatment event;
- warn when combined plans increase irritation, photosensitivity, dryness, purge confusion, or adherence burden;
- allow edit, pause, resume, delete, complete, and archive;
- preserve completed or deleted plan history in memory/audit/history unless the user explicitly deletes the record under data controls;
- include plan history in dermatologist-ready reports.

#### Daily treatment check-in

When a treatment task is due, the app must ask targeted questions that feed the AI/ML engine. Required check-in fields include:

- used/applied/taken as planned, skipped, delayed, partial, or stopped;
- time used;
- amount used or source instruction confirmation where safe;
- affected zones;
- irritation symptoms: dryness, peeling, burning, stinging, itching, redness, swelling, pain, tightness;
- barrier symptoms and oiliness/dryness changes;
- acne changes: new inflammatory lesions, comedones, deep painful bumps, PIH/PIE, suspected purge, suspected breakout;
- side effects relevant to the treatment class;
- sunscreen use and sun exposure where photosensitivity is relevant;
- moisturizer/barrier support used;
- conflicting actives used the same day;
- user confidence and notes.

The AI/ML system must use check-ins to decide whether the plan should continue, slow down, hold, shift to short-contact, add barrier recovery tasks, suggest provider review, or—only when safe and evidence-aligned—advance frequency faster because tolerance is better than expected. Any prescription-related change must be framed as a provider-confirmation item unless the user entered provider-approved escalation instructions.

#### Safety and validation rules

The Treatment Plan Center must apply strict safety gates:

- If the treatment is prescription-only, require user confirmation that it was prescribed or recommended by a qualified provider before giving schedule support.
- If pregnancy/planning/breastfeeding relevance is voluntarily indicated, trigger conservative warnings for topical retinoids, oral tetracyclines, isotretinoin, and other relevant treatments.
- If severe irritation, swelling, blistering, allergic symptoms, severe mental health symptoms, severe acne flare, or other red flags are reported, the app must stop escalation, lower confidence, advise contacting a healthcare professional, and avoid generating routine changes that could worsen risk.
- Oral isotretinoin support must be limited to education, adherence, symptom logging, lab/appointment reminders if user/provider enters them, and report preparation. AcneTrex must not manage isotretinoin dosing independently.
- Antibiotic plans must include antimicrobial stewardship warnings and provider-review checkpoints.
- The app must distinguish expected mild adaptation from unsafe irritation and must not label every worsening as “purging.”

#### AI/ML integration

Treatment Plan Center must use:

- onboarding profile and skin tolerance baseline;
- FaceAtlas lesion trends and model-user agreement;
- BarrierGuard status;
- FormulaLens ingredient conflicts;
- routine inventory and product start dates;
- SleepDerm, DermDiet, SweatFlow, ContactGuard, ClimateSkin Radar, and CycleSync context;
- prior treatment outcomes;
- CutisAI evidence retrieval;
- anonymous network learning only when consented and privacy-filtered;
- model confidence and safety validation gates.

Network learning may improve tolerance predictions and adherence planning only through consented, de-identified outcomes such as treatment class, frequency ramp, irritation trajectory, barrier response, adherence pattern, and plan adjustment outcome. Raw medication labels, raw personal notes, and identifiable medical data must not enter population learning unless explicitly permitted under the consent model and privacy policy.

### 5A.21 Streak Pet, Restore Logic, Ranks, and Badges Expansion

The streak system must be motivational, visually alive, and tightly connected to real data contribution. It must not imply guaranteed skin improvement.

#### Streak restore rules

- A full streak is earned only when the user completes all required daily tasks or safely queues them offline before the day closes in the user’s timezone.
- If a user misses a day, the app should offer a gentle backfill or recovery flow.
- The user may restore the streak pet or streak chain up to **3 times per calendar month**.
- Restores reset monthly based on the user’s local calendar month.
- If all three restores are used and the user misses another full-streak day, the streak must restart from scratch.
- Restores must be recorded in backend streak records with timestamp, reason, affected date, and whether backfill data was provided.
- Restores must never fabricate missing health data; they only restore the motivational streak state. Missing data must still remain marked as missing unless the user backfills it.

#### Streak pet evolution concept

The streak representation may evolve like a premium streak pet or data companion. It should feel futuristic and clinically elegant, not childish. The pet represents “skin intelligence growth” and “data consistency,” not the user’s acne improving. Suggested stages:

1. **Seed Signal** – first consistent logs; the AI is just learning.
2. **Calibration Sprout** – early streak; enough data to start pattern hints.
3. **Data Bloom** – stronger consistency; forecasts become more useful.
4. **Pattern Sentinel** – logs, scans, and treatment adherence are stable; trigger analysis improves.
5. **Cutis Guardian** – mature data routine; plan readiness, report quality, and model confidence are high.
6. **Atlas Prime** – long-term consistency and high-quality scans; FaceAtlas and Skin Twin are highly personalized.

Evolution triggers must be computed from real records: streak days, task completeness, scan quality, log diversity, treatment check-ins, model confidence improvement, forecast readiness, and missing-data recovery. Visual changes can include glow intensity, orbital data rings, subtle animations, shield/atlas motifs, or “JARVIS-like” diagnostic halos. Reduced-motion and low-distraction modes are required.

#### AI/ML rank and badge concept

Ranks and badges must represent the maturity and reliability of the user’s personal AI/ML profile. They must be calculated from data depth and engine readiness, not arbitrary engagement. Ranking dimensions include:

- FaceAtlas scan completeness and quality;
- lesion annotation usefulness and user certainty;
- daily log consistency;
- treatment plan adherence and check-in completeness;
- product/routine inventory completeness;
- model-user disagreement resolution;
- forecast-vs-outcome feedback;
- Weather/Climate context availability;
- TriggerGraph sample size and validation state;
- personal confidence trend;
- calibrated model performance;
- consented network contribution where opted in, without penalizing users who opt out.

Example badges include “FaceAtlas Calibrated,” “TriggerGraph Ready,” “FormulaLens Complete,” “Treatment Plan Steward,” “Barrier Recovery Watch,” “Forecast Reliable,” “Report Ready,” “Climate Context Active,” and “Annotation Mentor.” Every badge must show its exact evidence: what records unlocked it, what it improves, what is still missing, and which engine benefits.

### 5A.22 Native Weather, Location, and ClimateSkin Radar Upgrade

ClimateSkin Radar must use real, current weather context tied to the user’s authorized location or a manually selected location. The app must not rely on static weather values, fake weather, or web-only assumptions.

Required behavior:

- Before requesting device permission, show an in-app education sheet that clearly asks whether the user wants AcneTrex to use their location **while using the app** for local weather and climate context. The user must see two clear choices: **Yes, allow while using the app** and **No, do not use my location**.
- If the user selects yes, request the native iOS/Android location permission using the least intrusive mode supported by the platform, prioritizing **While Using the App** rather than always-on tracking.
- If the user selects no or denies the platform permission, the app must continue functioning and offer manual city/coarse-location entry.
- Support manual location entry for users who deny location access, disable location, travel, or prefer not to share device location.
- Use device location APIs and a secure backend weather provider integration; if platform-native weather data is available through an approved OS/provider route such as an OS weather service, WeatherKit-style provider, or equivalent approved native provider, use it only when permitted and documented. The app must not depend on scraping or reading another weather app’s private data; it must use supported APIs, backend providers, or manually entered location.
- All weather API keys must remain server-side.
- Weather snapshots must be persisted with source, timestamp, geohash/coarse location where possible, and confidence/quality metadata.
- The app must store only the location precision needed for skin intelligence; precise GPS should not be retained unless necessary and consented.
- The user must be able to change weather/location preference later in Settings, including turning off location, switching to manual location, deleting stored location preferences, and re-requesting permission.
- Weather context must feed forecasts, TriggerGraph, Skin Twin, SweatFlow, BarrierGuard, notifications, treatment plans, N-of-1 longitudinal analysis, daily exposure context, and reports.

Weather variables should include temperature, humidity, heat index, UV index, precipitation, wind, air quality/pollution where available, dew point, pressure, seasonality, and abrupt weather changes. The AI/ML engine must distinguish observed weather from forecast weather and must disclose uncertainty when using forecasted weather.

Eligible weather-linked outputs include humidity/barrier alerts, UV/photosensitivity cautions for retinoids or antibiotics, sweat/heat occlusion reminders, climate-trigger hypotheses, and forecast adjustments. Weather alerts must be sent only when enabled, relevant, and supported by enough confidence.


### 5A.23 N-of-1 Longitudinal Acne Dynamics and Study-Grade Pattern Intelligence

AcneTrex must incorporate the logic of a high-resolution N-of-1 longitudinal observational acne study directly into the app. The user must not need Excel, external spreadsheets, or manual research files to achieve this level of tracking. All study-grade variables must be captured through existing app features and stored as structured, validated records that AI/ML engines can use.

This capability must be integrated into **SkinState Journal**, **FaceAtlas**, **TriggerGraph**, **DermDiet Intelligence**, **SleepDerm Analytics**, **Stress logs**, **Treatment Plan Center**, **FormulaLens**, **BarrierGuard**, **ClimateSkin Radar**, **CutisAI**, **Reports**, and the **Task Board**. It must not be a disconnected research vault. It is the analytical foundation that allows AcneTrex to understand within-person acne dynamics over time.

The system must support longitudinal analysis of acne vulgaris as a chronic inflammatory condition involving the pilosebaceous unit, where lesion expression may be influenced by sebaceous activity, follicular hyperkeratinization, Cutibacterium acnes-related inflammatory pathways, genetic/endocrine susceptibility, barrier condition, medication history, diet, sleep, stress, product exposure, climate, occlusion, activity, and routine adherence. This background must inform engine design without causing the app to diagnose, prescribe, or claim causation beyond the evidence.

#### Required longitudinal data capture

The app must capture, store, and analyze:

- daily FaceAtlas or quick photo evidence where available;
- lesion counts by total count, inflammatory count, comedonal count, cystic/nodular count, PIH/PIE/scar marks, and unsure/custom labels;
- lesion location by facial zone and optional body zone where relevant;
- lesion lifecycle: appearance date, peak date, resolution date, longevity in days, and recurrence in the same zone;
- daily acne state: clear, stillness, mild flare, moderate flare, significant breakout, severe/cystic breakout, suspected purging, irritant reaction, or insufficient data;
- sleep onset time, wake time, duration, regularity, and sleep-risk category;
- diet exposures including high-glycemic/high-load foods, dairy, sweets/chocolate, processed foods, fried/oily foods, saturated-fat-rich meals, fruit excess if user-reported, caffeine, hydration, meal timing, and user-specific trigger foods;
- daily stress score using a 0–10 scale and optional periodic validated stress anchor such as PSS-10 if implemented;
- routine adherence, cleansing frequency, shower timing, moisturizer use, sunscreen use, active use, missed steps, overuse, skipped core products, and barrier-disruptive deviations;
- product change score: no change, minor frequency/amount change, significant active introduction/discontinuation, prescription change, or provider-directed change;
- treatment-plan adherence and tolerance check-ins;
- weather and climate context from permissioned location or manual location: humidity, heat, UV, air quality, precipitation, and abrupt changes;
- sweat, exercise, occlusion, masks, helmets, pillowcase/towel/phone contact, hair products, shaving/hair removal, and contact exposures;
- user notes describing perceived triggers, unusual events, medication changes, illness, travel, exams, emotional stress, or other context.

#### Built-in operational definitions

The app must support configurable but evidence-aware default definitions:

- **Stillness:** days or periods with 0–2 small lesions and predominantly clear skin, or a user-personalized threshold learned from baseline.
- **Breakout:** a sustained elevation in lesion count, inflammation, size, pain, cystic activity, or acne index above the user’s recent baseline.
- **Suspected purging:** a short, temporally circumscribed increase in lesions after initiation or adjustment of an active ingredient that plausibly increases cell turnover, followed by decreased lesion burden or longer stillness compared with pre-change baseline. The app must clearly state that “purging” is an operational tracking label, not a formal diagnosis, and that irritation, ordinary breakout, or natural disease fluctuation may mimic it.
- **Irritant reaction:** redness, burning, stinging, peeling, barrier decline, diffuse sensitivity, or flare pattern inconsistent with ordinary acne or suspected purging.
- **Lesion longevity:** number of days from appearance to visible resolution or mark-only status.
- **Exposure window:** same-day, 1-day lag, 2-day lag, 3-day lag, and configurable 3–7 day pre-episode windows.

The app must allow personalization of thresholds after enough data accumulates. For example, a user whose acne reliably worsens after sleeping later than a personally observed threshold may receive a personalized sleep-risk cutoff, but the cutoff must be labeled as a personal association until validated by repeated logs and scan outcomes.

#### N-of-1 hypothesis engine

The system must internally translate user data into testable hypotheses rather than unsupported conclusions. For every possible trigger factor \(F\) such as diet, sleep, stress, routine deviation, weather, treatment change, product exposure, occlusion, or activity, AcneTrex must track:

- **F-Main:** whether levels of factor \(F\) are associated with same-day or subsequent acne activity, breakout probability, stillness duration, or lesion count.
- **F-Location:** whether factor \(F\) is associated with regional lesion distribution such as forehead, cheeks, chin, jawline, temples, nose, neck, or body zones.
- **F-Type:** whether factor \(F\) is associated with lesion type distribution such as comedonal, inflammatory, pustular, nodular/cystic, PIH/PIE, or unsure.
- **F-Longevity:** whether factor \(F\) around lesion onset is associated with longer or shorter lesion duration.
- **F-Interaction:** whether combinations such as late sleep plus high-glycemic intake plus high stress produce larger effects than any single factor alone.

The engine must keep the null interpretation available: “no reliable association detected yet.” It must never force every variable to become a trigger. It must distinguish absence of evidence, insufficient data, weak signal, moderate signal, strong repeated association, and clinically concerning pattern.

#### Personal history and critical analysis requirements

Onboarding and profile updates must support a detailed acne history narrative, including puberty/onset timing, hospitalization or systemic medication periods, asthma or other chronic conditions, steroid/antibiotic exposure when voluntarily reported, mental-health medication history where voluntarily relevant, past skincare overuse, barrier injury, burning/stinging reactions, retinoid intolerance, benzoyl peroxide response, topical antibiotic exposure, oral antibiotic courses, routine changes, diet transitions, sleep-history changes, stress periods, activity changes, and observed regional flare patterns.

The AI/ML engines must use this history the way a careful research analyst would: as context for hypotheses, confounder tracking, safety gates, and personalization. The system must be capable of producing a professional, deeply contextual analysis similar to a study participant history and critical pattern interpretation, but stronger because it can continuously use real app data, photos, logs, treatment events, weather, and external evidence. Outputs must remain medically cautious and must not diagnose medication-induced acne, steroid acne, psychiatric conditions, endocrine disorders, or treatment indications without professional evaluation.

#### Analysis methods required

The Longitudinal Acne Dynamics Engine must support:

- descriptive statistics: mean, median, standard deviation, range, trend summaries, missingness summaries, and distribution checks;
- time-series visualization and state timelines for acne index, lesion counts, sleep, diet, stress, routine deviation, treatment changes, and weather;
- same-day Pearson/Spearman correlations when assumptions permit;
- lagged correlations for 1–3 day delayed effects, and configurable longer lags where clinically or behaviorally relevant;
- linear regression for daily acne index or lesion count;
- logistic regression for breakout vs non-breakout or stillness vs non-stillness;
- ordinal or multinomial models when acne state has more than two ordered or categorical levels;
- episode-based analysis comparing stillness, breakout, suspected purging, irritant reaction, and treatment adaptation windows;
- pre-episode exposure windows of 3–7 days;
- non-parametric comparisons where distributions are skewed or sample size is small;
- interaction analysis for combined trigger burden such as high stress plus short sleep plus high-risk diet;
- sensitivity analysis to identify which variables most influence the user’s forecast or trigger hypothesis;
- confounder checks for product changes, treatment adherence, cycle/hormonal context where voluntarily tracked, weather, illness, travel, occlusion, and missing data;
- confidence scoring based on sample size, consistency, effect magnitude, missingness, measurement quality, and recurrence across time.

#### Built-in longitudinal methodology

For app-level analysis, AcneTrex must implement the same study logic that a rigorous year-long N-of-1 acne diary would use, but automated and stored inside the app:

1. **Research-design equivalent:** prospective longitudinal within-person observation using daily records, periodic global summaries, and episode-level classification.
2. **Data structure:** one user-local day equals one merged daily data record, plus linked scans, weather snapshots, treatment events, product changes, lesion lifecycle records, and notes.
3. **Daily acquisition:** acne index, lesion counts, sleep timing/duration, diet exposures, stress, routine adherence, product/treatment changes, weather, sweat/contact, and relevant free-text context.
4. **Derived variables:** 1–3 day lagged exposures, 3–7 day pre-episode exposure windows, episode identifiers, lesion longevity, weekly global severity, and exposure-risk scores.
5. **Descriptive layer:** summary statistics and time-series charts for acne activity and all major exposures.
6. **Diagnostic layer:** correlation, lag analysis, regression, confounder review, and episode comparison.
7. **Predictive layer:** forecast readiness and flare probability based on validated history and current context.
8. **Prescriptive layer:** cautious action suggestions, task generation, treatment-plan prompts, routine-risk warnings, and provider-review recommendations.

#### Personal history analysis output template

When enough onboarding/profile data exists, the engine must be able to generate a professional personal history interpretation with this structure:

- **Acne timeline:** onset age, worsening periods, improvement periods, and major turning points.
- **Baseline susceptibility:** skin type, oiliness, sensitivity, barrier status, genetic/endocrine context if voluntarily reported, and lesion phenotype.
- **Medication and health context:** systemic medications, asthma or other health conditions, antibiotics/steroids if voluntarily reported, and treatment-response history, always with non-diagnostic wording.
- **Barrier and product history:** over-exfoliation, burning, stinging, dryness, rebound oiliness, retinoid intolerance, benzoyl peroxide response, topical antibiotic history, and current routine.
- **Lifestyle trajectory:** sleep-history changes, diet changes, stress periods, activity/sweat changes, and observed flare reductions or worsening.
- **Pattern analysis:** likely personal trigger hypotheses, strongest confounders, regional flare behavior, product-change effects, possible purging/irritation distinction, and data limitations.
- **Next data actions:** what the user should log next so the AI/ML engines can improve confidence without fabricating missing evidence.

This output must be based on stored profile/log/scan data, not generic assumptions. If a user provides a long narrative history, the system must summarize and structure it into analyzable fields while preserving the raw narrative for future reprocessing.

#### User-facing output requirements

The app must be able to generate:

- “What changed before this breakout?” explanations;
- “What conditions preceded stillness?” summaries;
- “Is this more consistent with breakout, purging, irritation, or insufficient data?” cautious classification;
- lesion location/type/longevity insights;
- personal trigger hypotheses with confidence and evidence level;
- combined lifestyle burden summaries;
- daily, weekly, monthly, and year-long acne dynamics reports;
- provider-ready longitudinal summaries that include methods, variables tracked, operational definitions, limitations, confidence notes, and evidence references.

All outputs must be grounded in stored records and must cite external evidence where claims depend on general dermatology or lifestyle-acne research. The system must always state limitations, especially for self-reported data, single-user observational patterns, confounding, missing logs, changing routines, medication changes, and natural acne variability.

### 5A.24 Mobile-Native Architecture Remediation Requirement

Any technical trace of the old web-first architecture that causes mobile problems must be corrected in favor of native iOS and Android behavior. The recovered web app is a behavioral and visual reference, not a reason to preserve broken web technical constraints.

Mandatory remediation priorities:

- Replace browser-only camera/gallery assumptions with native camera, media library, file-system, and permission flows.
- Replace localStorage/sessionStorage production reliance with secure mobile storage, backend persistence, and offline-safe queues.
- Replace web-only routing assumptions with mobile navigation and deep-link mapping.
- Replace hover/mouse-dependent UI with touch-first interaction.
- Replace web notification assumptions with native push notifications and backend scheduling.
- Replace web upload assumptions with signed native file uploads and background-safe retry logic.
- Replace fragile viewport layouts with safe-area-aware native layouts.
- Replace frontend-only AI, weather, storage, and retrieval calls with backend service calls.
- Preserve the web compatibility layer only when it does not weaken native behavior.

If a recovered module works in the web build but fails in installed-app context, the native mobile behavior wins. The PRD must be interpreted as mobile-first, App Store / Play Store compatible, and cross-platform native.

### 5A.25 Final Quality Gate Addendum

The final build is unacceptable if any of the following remain:

- console errors;
- broken routes;
- failed forms;
- unhandled promise rejections;
- fake intelligence values;
- mock reports;
- frontend API keys;
- exposed service secrets;
- unprotected storage URLs;
- unauthorized cross-user data access;
- incomplete account deletion;
- non-persistent consent states;
- FaceAtlas analysis without mandatory annotation;
- Treatment Plan Center plan generation without evidence retrieval, safety validation, and user confirmation;
- treatment schedules that override prescribed instructions without provider confirmation;
- reports that fabricate data;
- notifications not tied to real events;
- weather, AI, retrieval, storage, or treatment evidence calls made directly from frontend secrets;
- unsupported App Store / Play Store permission behavior;
- mobile camera/gallery failure in installed app context.

---

## 5B. Interface-Derived, Food Baseline, SleepDerm, and Skin Twin Intelligence Constitution

This section integrates the attached interface-derived and advanced-intelligence requirements into the PRD as a structured constitution instead of a disconnected addendum. These requirements are additive. They must be implemented without weakening the existing Zero-Fabrication Contract, mobile-first architecture, privacy rules, AI/ML execution contract, daily logging rules, FaceAtlas requirements, forecasting rules, treatment-planning rules, native weather/location rules, and longitudinal N-of-1 analysis requirements.

This section strengthens:

- Stitch-derived onboarding clinical history behavior;
- meal-count-based onboarding and food logging;
- snack logging as incremental daily food-log updates;
- SleepDerm Circadian Intelligence;
- sleep debt calculation and gradual recovery tracking;
- nocturnal recovery pattern analysis;
- sleep debt and circadian disruption correlation with dermal inflammatory response;
- SleepDerm optimization planning;
- Skin Twin Lab active-variable simulation depth;
- live current-skin visualization, zone heatmaps, and future simulation projection;
- database, API, AI/ML, testing, and acceptance requirements for these features.

No feature in this section may produce fake scores, fake visuals, fake lesion changes, fake inflammation correlations, fake sleep insights, fake simulation outputs, fake confidence values, or fake completion states. If data is insufficient, the app must state this clearly and show what data is required next.

### 5B.1 Stitch-Derived Onboarding Clinical History Flow

The Stitch-derived interface shows a clinical onboarding screen titled **“When did it start?”** inside **Step 2 of 4: Skin History**, with a progress indicator around **50% complete** and card-style answers such as **“Within the last 6 months”** and **“1–2 years ago.”** This behavior is an explicit product requirement, not a loose visual suggestion.

#### Purpose

The Skin History onboarding step must classify the user’s acne onset pattern, duration, and recurrence timeline in a way that helps the AI/ML engines differentiate likely adolescent, adult-onset, persistent, relapsing, sudden-flare, hormonal-pattern, product-change-associated, treatment-associated, stress-associated, medication-associated, and environment-associated acne histories.

This does not diagnose acne type. It creates a structured historical baseline used for personalization, forecast readiness, Skin Twin simulation readiness, FaceAtlas calibration, TriggerGraph hypotheses, SleepDerm context, DermDiet context, Treatment Plan Center context, FormulaLens purge-vs-breakout caution, CutisAI summaries, and dermatologist-ready reports.

#### Required UI behavior

The onboarding flow must include a dedicated Skin History screen with:

- current step label, such as “Step 2 of 4”;
- section title, such as “Skin History”;
- progress percentage derived from real completed onboarding sections;
- main question: “When did it start?”;
- explanatory subtitle: “Clinical history helps us differentiate between hormonal, adult, adolescent, sudden, persistent, and recurring patterns.”;
- large mobile-friendly answer cards;
- autosave on selection;
- clear selected state;
- no blank progression;
- explicit “Not sure” option;
- optional free-text detail after structured answer selection.

#### Required answer options

The initial acne-onset question must support, at minimum:

- Within the last 6 months;
- 6–12 months ago;
- 1–2 years ago;
- 3–5 years ago;
- More than 5 years ago;
- Since early adolescence;
- Since childhood;
- Adult-onset after age 18;
- Started after a product/routine change;
- Started after medication/treatment change;
- Started after lifestyle/environment change;
- Comes and goes in episodes;
- Not sure.

Each option must map to a structured value and a user-facing interpretation.

| Option | Structured value | Initial interpretation |
|---|---|---|
| Within the last 6 months | `acute_recent_onset` | Acute onset or recent flare pattern |
| 6–12 months ago | `subacute_recent_onset` | Recent persistent pattern requiring timeline context |
| 1–2 years ago | `persistent_recent_history` | Consistent breakout pattern |
| 3–5 years ago | `multi_year_persistent` | Longitudinal acne history requiring trigger/treatment timeline |
| More than 5 years ago | `long_term_persistent` | Long-term acne course with possible chronicity |
| Since early adolescence | `adolescent_persistent` | Long-term adolescent/persistent pattern |
| Since childhood | `childhood_onset_history` | Early history requiring cautious context and provider guidance if concerning |
| Adult-onset after age 18 | `adult_onset` | Adult-onset pattern requiring cautious contextual analysis |
| Started after a product/routine change | `product_temporal_association` | Product/routine change hypothesis, not confirmed causation |
| Started after medication/treatment change | `medication_temporal_association` | Medication/treatment timing hypothesis, not diagnosis |
| Started after lifestyle/environment change | `lifestyle_environment_temporal_association` | Lifestyle or environmental change hypothesis |
| Comes and goes in episodes | `episodic_relapsing` | Relapsing pattern requiring episode tracking |
| Not sure | `unknown_onset` | Known uncertainty retained for confidence calculation |

#### AI/ML use

The selected onset pattern must feed:

- baseline UserSkinModel;
- acne history summary;
- Skin Twin baseline constraints;
- TriggerGraph hypothesis priors;
- Longitudinal Acne Dynamics Engine;
- Treatment Plan Center safety context;
- FormulaLens purge-vs-breakout caution;
- FaceAtlas expected lesion-history interpretation;
- CutisAI onboarding summary;
- Reports and Export.

#### Rules

- The app must never diagnose hormonal acne, adult acne, medication-induced acne, fungal acne, steroid acne, rosacea, dermatitis, or any medical condition from onboarding alone.
- The app may label an answer as a historical pattern or hypothesis.
- The answer must remain editable in Profile > Acne History.
- Changes to acne-onset history must create a versioned history entry because downstream outputs may change.
- If the user changes this answer later, affected intelligence outputs must be marked stale and queued for recalculation where appropriate.

#### Acceptance criteria

- User cannot complete the Skin History step with a blank acne-onset answer.
- “Not sure” is accepted and stored as known uncertainty.
- The selected answer persists after app close, logout, reinstall, and login.
- The selected answer appears in Profile, CutisAI context, and dermatologist-ready report.
- Forecasting, TriggerGraph, Skin Twin, Treatment Plan Center, FaceAtlas, and Longitudinal Analysis can access the structured onset value through backend service boundaries.
- No downstream module converts the onset answer into a diagnosis.

### 5B.2 Meal Frequency Baseline and Progressive Food Logging

The onboarding flow must ask how often the user usually eats within a day so the daily food log can adapt to the user’s real baseline instead of assuming everyone eats the same number of meals.

#### Purpose

The meal-frequency baseline allows DermDiet Intelligence, TriggerGraph, Forecasting, Skin Twin Lab, and the Longitudinal Acne Dynamics Engine to interpret food exposure data more accurately. A user who usually eats once per day must not be treated as incomplete because they did not log three meals. A user who usually eats three meals per day should receive a food-log completion state based on their own expected pattern. Snacks must be captured as optional exposure events because snacks may meaningfully affect glycemic load, dairy exposure, caffeine intake, processed food intake, fried/oily exposure, sodium load, and user-specific trigger analysis.

#### Onboarding requirement

During onboarding, under Lifestyle and Trigger Context, the app must ask:

**“How many meals do you usually eat in a day?”**

Required answer options:

- 1 meal per day;
- 2 meals per day;
- 3 meals per day;
- It varies a lot;
- Not sure;
- Prefer not to answer.

Optional follow-up:

**“Do you usually snack between meals?”**

Answer options:

- Rarely or never;
- Sometimes;
- Often;
- It depends;
- Not sure;
- Prefer not to answer.

Optional follow-up:

**“What snack types do you commonly have?”**

Multi-select examples:

- sweets/chocolate;
- chips/processed snacks;
- dairy snacks;
- bread/pastries;
- fruit;
- nuts;
- protein snacks;
- sugary drinks;
- caffeine drinks;
- user-specific snack;
- not sure.

#### Daily food log behavior

The Food Log must generate a daily structure based on the user’s expected meal count:

```text
expected_meal_count = onboarding.meal_frequency_baseline
food_log_date = user-local YYYY-MM-DD

if expected_meal_count == 1:
  show Meal 1 card
if expected_meal_count == 2:
  show Meal 1 and Meal 2 cards
if expected_meal_count == 3:
  show Breakfast, Lunch, Dinner cards or Meal 1, Meal 2, Meal 3 depending on user preference
if expected_meal_count == varies/not_sure/prefer_not:
  show flexible Add meal cards with completion based on user confirmation
```

The user must be able to update the food log throughout the day until all expected meals are logged or the user explicitly marks the food log complete.

#### Snack logging behavior

Snack logging must be supported as an optional repeated event inside the same daily food log. Snack entries must include:

- snack time;
- snack name or description;
- optional photo;
- portion estimate;
- tags such as dairy, high-glycemic, sugary, processed, fried/oily, caffeine, spicy, salty, high-fat, user-specific trigger, or unknown;
- confidence level if the user is unsure;
- optional notes.

Snack entries must not create duplicate daily food logs. They must update the same food log payload for that date or create typed sub-events linked to one daily parent record.

#### Food log completion states

The Food Log must support these completion states:

- `not_started`;
- `partially_logged`;
- `meals_complete_no_snacks_logged`;
- `meals_complete_with_snacks_logged`;
- `user_marked_complete`;
- `incomplete_but_saved`;
- `backfilled`;
- `unknown_day`;
- `skipped_with_reason`;
- `offline_queued`.

The dashboard must show food logging honestly. It must not mark the day complete until the expected meal count is satisfied or the user explicitly confirms completion.

#### AI/ML use

Food baseline and food logs must feed:

- DermDiet Intelligence;
- TriggerGraph;
- Longitudinal Acne Dynamics Engine;
- Skin Twin Lab;
- Forecasting;
- CutisAI summaries;
- Treatment Plan Center, where food may affect treatment tolerance, photosensitivity support, stomach-related medication instructions where externally evidenced, or routine adherence;
- Reports and Export.

#### Rules

- Food logging must remain non-judgmental and must never shame the user.
- The app must not claim a food caused acne without enough repeated user-specific data and evidence-grounded plausibility.
- Missing meals must be treated as missing data, not assumed fasting.
- Snacks must be treated as optional exposure events, not failures.
- A meal-frequency baseline must be editable in Profile > Lifestyle Baseline.
- Changing the baseline must affect future food-log completion logic but must not rewrite historical logs unless the user explicitly backfills or edits those days.
- Daily same-day merge behavior must apply: repeated food updates on the same day update the same food log record.

#### Acceptance criteria

- Onboarding captures meal frequency and snack tendency.
- Food Log generates the correct number of expected meal cards.
- User can add snacks throughout the day.
- Multiple food updates on the same date update one food log record.
- Dashboard completion status reflects the user’s meal baseline.
- DermDiet, TriggerGraph, Forecasting, Skin Twin, CutisAI, Reports, and Longitudinal Analysis can consume meal and snack data.
- Missing food data lowers confidence instead of being silently estimated.

### 5B.3 SleepDerm Circadian Intelligence

SleepDerm must be upgraded from a sleep-duration logger into a true circadian and nocturnal recovery intelligence module.

#### Purpose

SleepDerm Circadian Intelligence analyzes the user’s sleep timing, sleep duration, sleep regularity, sleep quality, disturbance pattern, naps, sleep debt, and nocturnal recovery opportunity. It must help the app understand how the user’s sleep rhythm may relate to acne activity, barrier disruption, inflammation, oiliness, irritation, lesion longevity, treatment tolerance, and flare risk.

SleepDerm must not claim that sleep caused acne. It must treat sleep as one possible factor among many and must evaluate sleep effects alongside stress, diet, cycle, weather, products, routine changes, treatment changes, occlusion, sweat, contact exposure, and missing data.

#### Required inputs

SleepDerm must consume:

- sleep start time;
- wake time;
- automatically calculated sleep duration;
- sleep quality rating;
- awakenings/disturbances;
- naps;
- optional manual override with reason;
- user age range;
- timezone;
- user’s typical schedule from onboarding;
- wearable sleep data where connected and consented;
- school/work schedule where voluntarily provided;
- bedtime routine consistency;
- caffeine timing where logged;
- stress level;
- late-night screen use where voluntarily logged;
- treatment/routine timing;
- skin state and FaceAtlas outcomes;
- inflammatory lesion count;
- comedonal lesion count;
- redness, pain, tenderness, swelling, itch, and barrier symptoms;
- weather/context variables.

#### Derived variables

SleepDerm must compute, at minimum:

- total sleep duration;
- sleep midpoint;
- sleep onset regularity;
- wake time regularity;
- bedtime drift;
- wake-time drift;
- rolling 3-day, 7-day, 14-day, and 30-day average sleep duration;
- rolling sleep regularity score;
- sleep debt;
- sleep recovery credit;
- nap-adjusted sleep opportunity;
- nocturnal recovery opportunity score;
- circadian alignment score;
- circadian disruption flag;
- sleep consistency streak;
- sleep-risk category;
- sleep-data confidence.

#### Circadian alignment computation

The app must calculate circadian alignment cautiously using observable timing proxies.

```text
sleep_midpoint = sleep_start + (sleep_duration / 2)

onset_sd_7d = standard_deviation(sleep_start_clock_time over last 7 valid sleep records)
wake_sd_7d = standard_deviation(wake_time_clock_time over last 7 valid sleep records)
midpoint_sd_7d = standard_deviation(sleep_midpoint_clock_time over last 7 valid sleep records)
bedtime_drift = absolute(today_sleep_start - user_median_sleep_start)
wake_drift = absolute(today_wake_time - user_median_wake_time)

circadian_alignment_score:
  start from 100
  subtract duration_deficit_penalty
  subtract onset_irregularity_penalty
  subtract wake_irregularity_penalty
  subtract midpoint_irregularity_penalty
  subtract disturbance_penalty
  subtract late_caffeine_penalty where logged
  subtract low_quality_penalty
  clamp to 0-100
```

If the user has fewer than 7 valid sleep records, the score must be labeled low confidence or insufficient data.

#### Nocturnal recovery opportunity score

SleepDerm must calculate a Nocturnal Recovery Opportunity Score as a proxy for how favorable the user’s sleep period was for recovery.

Inputs:

- duration sufficiency;
- sleep timing consistency;
- sleep quality;
- awakenings/disturbances;
- nap impact;
- sleep debt load;
- late routine/treatment use where relevant;
- stress before sleep;
- caffeine timing;
- skin barrier symptoms the next morning;
- user-reported morning skin state.

Example output categories:

- Optimal;
- Adequate;
- Compromised;
- Severely compromised;
- Insufficient data.

This score must be presented as an opportunity estimate, not proof that skin repair occurred.

#### Outputs

SleepDerm must show:

- total sleep duration;
- sleep debt;
- circadian alignment;
- bedtime/wake regularity;
- recovery opportunity;
- possible sleep-related skin risk;
- confidence level;
- missing data notes;
- top confounders;
- next recommended action;
- whether sleep pattern is stable, shifting, irregular, or unknown.

#### Rules

- SleepDerm must never diagnose insomnia, circadian rhythm disorder, endocrine disorder, or psychiatric condition.
- Wearable sleep-stage data must be treated as estimated and device-dependent.
- Without wearable data, SleepDerm must not claim exact REM, deep sleep, or sleep-stage cycles.
- The app may use “nocturnal recovery opportunity” but must not claim exact skin repair cycles.
- Any sleep-related acne insight must disclose whether it is based on user data, external evidence, or both.
- Severe persistent sleep problems, extreme daytime sleepiness, breathing disruption, or health concerns must trigger gentle provider-review guidance rather than app-only optimization.

#### Acceptance criteria

- SleepDerm computes sleep duration automatically across midnight.
- SleepDerm computes sleep regularity and circadian alignment only when enough data exists.
- SleepDerm shows insufficient-data states honestly.
- SleepDerm updates TriggerGraph, Forecasting, Skin Twin, CutisAI, Reports, and Task Board.
- SleepDerm never claims causation from a single night of poor sleep.
- SleepDerm can explain which sleep variables most affected the current sleep-risk score.

### 5B.4 Sleep Debt Tracker

SleepDerm must include a Sleep Debt Tracker that automatically calculates accumulated sleep deficit from sleep logs.

#### Purpose

Sleep debt tracking helps the user understand whether repeated short sleep may be contributing to acne-relevant patterns such as higher inflammatory burden, slower lesion resolution, barrier symptoms, irritation susceptibility, stress sensitivity, or treatment intolerance. It also helps the app recommend realistic recovery actions.

#### Sleep target logic

The app must assign a baseline target sleep duration using:

1. age-aware recommended sleep ranges;
2. user-reported usual sleep need;
3. wearable history where available;
4. user-reported functioning and recovery;
5. clinician/user override if appropriate.

Default target examples:

```text
teen_target_default = 8-10 hours
adult_target_default = 7-9 hours
older_adult_target_default = 7-8 or 7-9 hours depending on age band and source rule
```

The app must store the target as a range and a selected working target.

```text
target_sleep_range = [8, 10]
working_sleep_target = 8.5
target_source = age_default | user_selected | wearable_estimated | clinician_entered
```

#### Sleep debt computation

For each sleep period:

```text
actual_sleep_hours = wake_time - sleep_start_time - excluded_awake_time_if_known
nap_credit_hours = eligible_nap_minutes / 60, capped by configured nap_credit_cap
adjusted_sleep_hours = actual_sleep_hours + nap_credit_hours

nightly_sleep_deficit = max(0, working_sleep_target - adjusted_sleep_hours)
nightly_sleep_surplus = max(0, adjusted_sleep_hours - working_sleep_target)
recovery_credit = min(nightly_sleep_surplus, nightly_recovery_credit_cap)

rolling_sleep_debt = max(0, previous_sleep_debt + nightly_sleep_deficit - recovery_credit)
```

The tracker must also compute:

- 3-day sleep debt;
- 7-day sleep debt;
- 14-day sleep debt;
- 30-day sleep debt;
- debt trend: improving, stable, worsening, insufficient data;
- debt category: none/minimal, mild, moderate, high, severe, insufficient data;
- recovery estimate with uncertainty.

#### Recovery logic

Sleep debt recovery must be framed as gradual and behavior-based, not as a guaranteed immediate reset. The app may recommend:

- earlier bedtime by 15–30 minutes;
- consistent wake time;
- consistent sleep window;
- reducing late caffeine if logged;
- reducing late screen use if logged;
- scheduling a short nap where appropriate;
- avoiding extreme weekend oversleep as the only recovery strategy;
- aligning routine/treatment timing with a realistic bedtime;
- provider review for persistent severe sleep issues.

#### UI requirements

The Sleep Debt Tracker must show:

- current sleep debt;
- last night’s deficit or recovery credit;
- rolling 7-day graph;
- sleep target range;
- confidence level;
- what contributed most to debt;
- how much is realistically recoverable;
- “what to do tonight” action card;
- missing-data warning if logs are incomplete.

#### Rules

- The app must not make sleep debt negative.
- The app must not assume missing sleep data equals zero sleep.
- The app must not treat naps as full replacements for nighttime sleep unless explicitly allowed by configuration and clearly explained.
- Manual overrides require a reason and must be labeled.
- If the user has shift work, irregular school/work schedules, or variable sleep patterns, the tracker must adapt cautiously and disclose limitations.

#### Acceptance criteria

- Sleep debt auto-calculates after sleep start and wake time are entered.
- Sleep debt updates when the user edits source sleep times.
- Sleep debt appears in SleepDerm, TriggerGraph, Skin Twin, Forecasting, Reports, and CutisAI.
- Missing sleep logs create missingness warnings, not fake debt.
- Recovery suggestions are generated from real sleep patterns and user constraints.

### 5B.5 Sleep Debt and Dermal Inflammatory Response Correlation

The AI/ML engines must analyze whether sleep debt, short sleep, late sleep timing, irregular sleep, poor sleep quality, and disturbed sleep correlate with dermal inflammatory response in the user’s own data.

#### Purpose

This feature allows AcneTrex to evaluate sleep as a possible acne-relevant factor without overclaiming causation. The system must analyze whether sleep-related variables are associated with inflammatory lesion count, inflammatory flare probability, redness, pain/tenderness, barrier symptoms, irritation, and lesion resolution time.

#### Required sleep-side variables

- sleep duration;
- sleep debt;
- sleep start time;
- wake time;
- sleep midpoint;
- bedtime drift;
- wake-time drift;
- sleep regularity score;
- sleep quality;
- disturbance count;
- nap behavior;
- circadian alignment score;
- nocturnal recovery opportunity score.

#### Required skin-side outcome variables

- daily acne index;
- inflammatory lesion count;
- papule/pustule/nodule/cyst count where available;
- comedonal lesion count;
- redness score;
- pain/tenderness score;
- swelling score;
- itch score;
- barrier symptoms;
- oiliness score;
- lesion appearance date;
- lesion peak date;
- lesion resolution date;
- lesion longevity;
- FaceAtlas inflammatory score;
- user morning skin state.

#### Analysis windows

The engine must test:

- same-day association;
- next-day association;
- 2-day lag;
- 3-day lag;
- 3–7 day pre-breakout exposure window;
- rolling sleep debt burden;
- combined sleep + stress burden;
- combined sleep + high-risk diet burden;
- combined sleep + weather/climate burden;
- combined sleep + treatment irritation burden.

#### Statistical methods

The system must use methods appropriate to the available data:

- descriptive trend comparison;
- Pearson correlation only when assumptions are reasonable;
- Spearman correlation for non-normal or ordinal variables;
- lagged cross-correlation;
- logistic regression for breakout vs non-breakout;
- ordinal regression for acne state levels where appropriate;
- count models for lesion counts where appropriate;
- non-parametric comparisons for small/skewed data;
- mixed or hierarchical models only if data volume supports them;
- sensitivity analysis with and without confounders;
- bootstrapped confidence intervals where appropriate.

#### Confounders that must be considered

The engine must check and disclose:

- stress;
- high-glycemic/dairy/processed food exposure;
- cycle/hormonal context where enabled;
- product changes;
- active ingredient introduction;
- treatment adherence;
- over-exfoliation;
- cleansing deviation;
- barrier symptoms;
- weather/humidity/heat/UV/AQI;
- sweat/exercise;
- mask/helmet/phone/pillowcase contact;
- travel;
- illness;
- medication changes;
- missing data.

#### Output language

Allowed language:

- “Sleep debt is an early possible contributor.”
- “Short sleep appears associated with higher inflammatory scores in your recent logs.”
- “This pattern is confounded by stress and product changes.”
- “There is not enough data yet to evaluate sleep as a trigger.”
- “Your sleep timing became more irregular before several flare windows, but this is not proof of causation.”
- “The strongest current pattern is combined short sleep + high stress, not sleep alone.”

Forbidden language:

- “Sleep debt caused your acne.”
- “Your acne will flare because you slept late.”
- “Fixing sleep will clear your acne.”
- “Your skin failed to recover overnight.”
- “Your circadian rhythm is medically abnormal.”

#### Acceptance criteria

- The engine tests sleep debt against inflammatory outcomes only when minimum data thresholds are met.
- The system discloses confounders and missing data.
- Reports include sleep-inflammation analysis with confidence and limitations.
- CutisAI can explain the result without overstating causation.
- Forecasting may use sleep debt only as one weighted feature among many.
- Skin Twin may simulate sleep improvement only when baseline sleep and acne outcome data are sufficient.

### 5B.6 SleepDerm Optimization Engine

SleepDerm must provide an optimized sleep-recovery recommendation plan that aligns the user’s natural rhythm with acne-relevant recovery goals.

#### Purpose

The optimization engine helps the user improve sleep consistency and recovery opportunity without forcing unrealistic schedules. It must personalize recommendations based on actual sleep logs, user constraints, chronotype proxy, schedule, age, treatment plan, skincare routine, reminders, and acne outcome patterns.

#### Inputs

- sleep history;
- sleep debt;
- circadian alignment score;
- user’s usual bedtime and wake time;
- user’s school/work constraints where provided;
- treatment/routine timing;
- caffeine timing;
- stress timing;
- exercise timing;
- skin symptoms;
- flare windows;
- forecast risk;
- user preference for reminders;
- notification permissions.

#### Optimization outputs

- suggested bedtime window;
- suggested wake-time consistency target;
- realistic tonight target;
- 7-day adjustment plan;
- recovery priority level;
- routine timing recommendation;
- treatment/routine reminder timing;
- risk warning if sleep debt is worsening;
- confidence level;
- reason summary.

#### Rules

- Recommendations must be incremental and realistic.
- The app must not require perfection.
- The app must not shame irregular sleep.
- The app must distinguish “ideal target” from “realistic next step.”
- The app must not override medical sleep advice.
- The app must not recommend unsafe sleep deprivation or extreme oversleeping.
- If the user has severe or persistent sleep issues, the app must suggest professional help rather than app-only optimization.

#### Acceptance criteria

- The optimization plan updates after each valid sleep log.
- The plan respects user constraints and notification preferences.
- The plan feeds Task Board and notification scheduling.
- The plan can be explained by CutisAI.
- The plan appears in Reports when sleep patterns are relevant.

### 5B.7 Skin Twin Lab Advanced Variable Simulation

Skin Twin Lab must be upgraded into a strict, data-fed, active-variable simulation system. It must allow users to choose many acne-relevant variables while maintaining trust, precision, and honest uncertainty.

#### Purpose

Skin Twin Lab allows the user to simulate “what-if” scenarios using their real AcneTrex data. It must estimate how selected changes may influence flare risk, lesion count, inflammation, barrier status, oiliness, lesion longevity, and confidence across a selected time window.

Skin Twin is not a guarantee. It is a counterfactual scenario engine that compares a current baseline against controlled variable changes.

#### Required scenario windows

Users must be able to simulate:

- 3 days;
- 7 days;
- 14 days;
- 30 days;
- treatment-cycle timeline;
- custom provider-review timeline where supported.

Longer windows require more data and must have stricter confidence thresholds.

#### Active variable catalog

Skin Twin must support a large variable library grouped by category.

**Sleep and circadian variables**

- sleep duration increase/decrease;
- earlier bedtime;
- later bedtime;
- wake-time consistency;
- reduced sleep debt;
- improved sleep quality;
- reduced awakenings;
- nap addition/removal;
- circadian alignment improvement;
- routine timing aligned with bedtime.

**Diet and meal variables**

- reduced high-glycemic intake;
- reduced dairy;
- reduced sugary snacks;
- reduced processed snacks;
- reduced fried/oily meals;
- caffeine timing change;
- hydration improvement;
- meal timing consistency;
- snack frequency reduction;
- user-specific trigger avoidance;
- balanced meal completion based on baseline meal frequency.

**Stress and behavior variables**

- lower stress score;
- improved stress consistency;
- reduced picking/touching;
- better adherence to wind-down routine;
- reduced late-night routine disruption.

**Routine and product variables**

- routine consistency improvement;
- cleansing frequency adjustment;
- moisturizer consistency;
- sunscreen consistency;
- active ingredient pause;
- active ingredient introduction;
- reduced exfoliation;
- product removal;
- product replacement;
- fragrance/allergen avoidance;
- occlusive product reduction;
- patch-test compliance.

**Treatment variables**

- treatment adherence improvement;
- missed-dose reduction;
- tolerance-based ramp-up;
- rest-day addition;
- irritation hold;
- provider-directed plan continuation;
- photosensitivity precaution improvement.

**Environment and contact variables**

- lower heat exposure;
- humidity shift;
- UV/photosensitivity management;
- AQI/pollution exposure;
- sweat management;
- mask/helmet exposure reduction;
- pillowcase/towel/phone hygiene improvement;
- travel/routine disruption reduction.

**Cycle and hormonal-context variables**

- cycle phase context where voluntarily enabled;
- premenstrual flare window support;
- cycle-aware routine caution;
- hormonal-context flag as a confounder, not a diagnosis.

**FaceAtlas and skin-state variables**

- baseline lesion count;
- inflammatory lesion count;
- comedonal lesion count;
- oiliness score;
- barrier score;
- redness score;
- lesion zone distribution;
- lesion longevity;
- PIH/PIE mark progression.

#### Simulation requirements

Every simulation must include:

- selected active variables;
- baseline data used;
- time window;
- model version;
- minimum data checks;
- confidence level;
- uncertainty band;
- confounder list;
- current baseline projection;
- scenario projection;
- explanation of what changed;
- explanation of what did not change;
- user action plan only if safe and supported;
- “insufficient data” outcome if requirements are not met.

#### Required output structure

```text
Skin Twin Simulation Output
- Scenario name
- Time window
- Variables changed
- Baseline state
- Simulated state
- Expected direction of change
- Estimated magnitude, if supported
- Confidence level
- Uncertainty range
- Main drivers
- Confounders
- Data gaps
- Safety notes
- Recommended next data actions
```

#### Rules

- Skin Twin must not be a generic LLM answer.
- The simulation engine must compute from stored records and validated features.
- The LLM may explain outputs but must not invent values.
- The app must not show a precise visual projection when the statistical projection is low confidence.
- Users must be able to compare multiple scenarios side by side.
- Scenario outputs must be saved and versioned.
- If the user changes source data, old simulations must remain historically preserved but marked as based on older data.

#### Acceptance criteria

- User can choose multiple active variables.
- User can select a valid time window.
- Simulation refuses to run or downgrades confidence when data is insufficient.
- Outputs include uncertainty, drivers, and confounders.
- Simulation records persist and can be exported in reports.
- CutisAI can explain a saved scenario using the exact variables and model output.

### 5B.8 Live Current Skin Visualization and Skin Twin Projection

Skin Twin Lab and FaceAtlas must support a live current-skin visualization and a simulation projection view.

#### Purpose

The visualization layer helps the user understand their current acne state and simulated future scenario spatially. It must show where lesions are located, how lesion types are distributed by facial zone, and how a selected Skin Twin scenario may change the projected skin state over the selected time window.

This feature must prioritize trust over visual drama. It must never render fake certainty or misleading “after photos.”

#### Visualization modes

The app must support:

1. **Current Skin Model**
   - shows the user’s latest analyzed FaceAtlas state;
   - displays lesion markers by zone;
   - shows lesion type, count, confidence, and source;
   - distinguishes model-detected vs user-annotated lesions;
   - shows image-quality warnings.
2. **Zone Heatmap**
   - maps lesion burden to forehead, left cheek, right cheek, chin, jawline, nose, temples, neck, and custom zones;
   - supports inflammatory, comedonal, oiliness, redness, and barrier overlays.
3. **Simulation Projection**
   - shows projected scenario change over the selected time window;
   - displays expected direction and uncertainty;
   - uses translucent or confidence-coded markers for simulated lesions;
   - distinguishes observed lesions from projected lesions.
4. **Before vs Scenario Comparison**
   - side-by-side baseline and simulated projection;
   - slider comparison where appropriate;
   - clear labels: “Observed current state” and “Estimated scenario projection.”
5. **Confidence and Uncertainty Overlay**
   - shows high, moderate, low, or insufficient confidence;
   - explains why confidence is limited;
   - hides overly precise visuals when confidence is low.

#### Visual data source rules

The visualization may use:

- latest FaceAtlas scan;
- user lesion annotation;
- model lesion detection;
- zone map;
- facial landmark/segmentation output;
- lesion type probabilities;
- oiliness estimate;
- redness/barrier estimate;
- historical lesion lifecycle data;
- Skin Twin simulation output.

If the user does not consent to raw image retention, the app must still support a privacy-preserving derived visualization using a neutral face map or canonical face model. In that case, the app must not display retained raw photos unless the user explicitly saved them.

#### Current skin model requirements

The current visualization must show:

- scan date and time;
- whether raw photo, derived feature map, or neutral model is being displayed;
- lesion markers;
- zone labels;
- lesion type;
- confidence;
- user annotation comparison;
- model-user disagreement;
- inflammatory vs non-inflammatory split;
- oiliness/barrier/redness overlays where available;
- insufficient-scan-quality warning where applicable.

#### Simulation projection requirements

The simulation projection must show:

- selected scenario;
- selected window;
- expected lesion count direction;
- expected inflammation direction;
- expected barrier direction;
- expected oiliness direction where supported;
- zone-level changes where supported;
- uncertainty band;
- confidence;
- data sufficiency;
- “not a guaranteed outcome” label.

#### Forbidden visualization behavior

The app must not:

- generate a fake photorealistic future face as if it were guaranteed;
- erase or add lesions without explaining confidence and source;
- show exact future lesion positions unless supported by model output and clearly labeled as estimated;
- imply medical diagnosis;
- shame or scare the user;
- use beauty-filter language;
- use before/after visuals that imply guaranteed clearing;
- display raw face photos after user deletion or without consent.

#### Acceptance criteria

- Current visualization renders from latest persisted FaceAtlas data.
- Lesion markers map to stored lesion annotations and model detections.
- Simulation projection renders only after a valid Skin Twin run.
- Low-confidence simulations show abstract/zone-level projections instead of precise lesion visuals.
- User can open details for each lesion marker or zone.
- Reports can include visualization summaries only with explicit user approval.
- Deleting face images removes raw-photo display while preserving allowed derived records according to consent settings.

### 5B.9 Evidence and Methodology Basis for Sleep and Circadian Features

The sleep additions must use a simple, defensible evidence basis:

- recommended sleep targets must be age-aware and maintained through backend evidence configuration, using authoritative sources such as CDC sleep-duration ranges and AASM/Sleep Research Society guidance when available;
- adults should generally be treated as needing at least 7 hours by default unless user-specific configuration, clinician-entered information, age band, or wearable history justifies a different working target;
- sleep debt must be computed as the difference between needed sleep and obtained sleep, accumulated over time, and reduced gradually through recovery credit rather than a fake instant reset;
- circadian rhythm must be treated as a 24-hour sleep-wake timing pattern affected by light/darkness and daily behavior;
- skin-related claims must remain cautious because sleep, circadian rhythm, barrier function, inflammation, and acne are related through evidence but require user-specific validation inside the app.

SleepDerm must distinguish:

- general evidence;
- user-specific associations;
- speculative hypotheses;
- insufficient-data states.

---


## 6. Target Users and Personas

### 6.1 Primary User: Acne-Prone Individual

A user with recurring acne who wants to understand what affects their skin and wants a structured, data-backed improvement plan.

Needs:

- simple daily logging
- face progress tracking
- product safety checks
- trigger discovery
- routine guidance
- flare forecasting
- privacy and reassurance

### 6.2 Secondary User: Skincare Optimizer

A user who actively researches ingredients and routines and wants evidence-based personalization.

Needs:

- FormulaLens product analysis
- ingredient risk mapping
- barrier health tracking
- what-if simulations
- evidence-backed insight layer
- progress reports

### 6.3 Clinical-Adjacent User

A user preparing for dermatology visits or treatment monitoring.

Needs:

- clean report exports
- timeline of logs, scans, and products
- medication and routine adherence tracking
- confidence and uncertainty disclosure
- non-diagnostic language

### 6.4 Research-Interested User

A privacy-conscious user willing to opt into anonymous learning.

Needs:

- clear consent controls
- explanation of what data is used
- ability to revoke participation
- visible contribution status
- assurance that raw images and raw logs are not shared without explicit consent

---

## 7. Product Scope

### 7.1 MVP Scope for V3 Production Foundation

The V3 foundation must include:

1. Real authentication.
2. Real onboarding persistence.
3. Real profile and settings persistence.
4. Real daily logging with same-day merge/update behavior.
5. Real FaceAtlas multi-photo scan flow.
6. Real product/ingredient analysis workflow.
7. Real CutisAI assistant with backend routing and persisted messages.
8. Real forecasting service boundary with confidence and validation.
9. Real Treatment Plan Center with tolerance planning, calendar mapping, check-ins, tasks, notifications, evidence retrieval, and safety validation.
10. CutisAI evidence retrieval and citation layer without a standalone ResearchVault or DermVault feature.
11. Intelligence events, audit logs, telemetry, and validation records.
12. Research consent and anonymous learning controls.
13. Notifications tied to real backend events.
14. Dermatologist-ready report export.
15. Legacy migration path.
16. Security, rate limiting, RLS/tenant isolation, and testing gates.

### 7.2 Full V3 Scope

The complete V3 system must preserve and upgrade all canonical modules:

- FaceAtlas
- Cutis Health Index
- BarrierGuard
- Acne Signature Map
- TriggerGraph
- DermDiet Intelligence
- SleepDerm Analytics
- FormulaLens
- SweatFlow Index
- ClimateSkin Radar
- CycleSync Skin Tracker
- SkinState Journal
- ContactGuard
- ClearPath Planner
- CutisAI
- CutisAI Evidence Layer
- AcneTrex Research Network
- Procedure Compass
- Treatment Plan Center
- Hydration Tracking
- Cleansing Behavior Tracking
- Exfoliation and Active Ingredient Tracking
- Hyperpigmentation and Acne Mark Tracking
- Sunscreen Behavior Tracking
- Makeup and Cosmetic Compatibility
- Patch Test and Introduce-One-Thing-At-A-Time Logic
- Confidence and Uncertainty Scoring
- Privacy and Data Control
- Dermatologist-Ready Report Export
- Smartwatch integration for sleep and activity context
- Weather forecasting integration
- Skin Horizon
- What-If Simulator
- ClearPath Forecast
- FlareWindow Predictor
- Skin Twin Lab
- Intelligence Core
- Task Board
- Anonymous Network Learning

---

## 8. Recommended Technical Stack

### 8.1 Mobile App

Use this stack unless a stronger implementation reason is documented:

| Layer | Technology | Purpose |
|---|---|---|
| Core mobile framework | Expo React Native with TypeScript | Native iOS/Android app with rapid iteration |
| Navigation | Expo Router or React Navigation | Typed screen navigation and deep links |
| Server state | TanStack Query / React Query | Fetching, caching, retries, invalidation |
| Local UI state | Zustand | Lightweight state for non-sensitive UI state |
| Forms | React Hook Form + Zod | Form handling and runtime validation |
| Secure device storage | Expo SecureStore | Short-lived tokens or encrypted session references |
| Offline cache | expo-sqlite or MMKV | Non-sensitive offline cache and queue staging |
| Camera | expo-camera | FaceAtlas and product label capture |
| Image processing | expo-image-manipulator | JPEG compression, resizing, metadata stripping |
| File upload | expo-file-system | Upload to backend-signed URLs |
| Notifications | expo-notifications + backend scheduler | Event-based reminders and alerts |
| Location | expo-location or equivalent native location module | Permissioned location for ClimateSkin Radar and weather context |
| Calendar UI | Native calendar/list components | Treatment Plan Center calendar map, treatment events, review points |
| Charts | react-native-svg + chart library | CHI trends, trigger charts, forecast curves |
| Styling | NativeWind or StyleSheet system | Consistent design tokens and mobile UI |
| Build and deploy | EAS Build / EAS Submit | App Store and Play Store delivery with platform permission/privacy compliance |
| Testing | Jest, React Native Testing Library, Maestro or Detox | Unit, component, and E2E mobile tests |

### 8.2 Backend and API

| Layer | Technology | Purpose |
|---|---|---|
| API server | FastAPI with Python | Secure service-oriented API |
| Database | PostgreSQL | Durable relational health records |
| Vector search | pgvector | Evidence retrieval and RAG indexing |
| ORM / migrations | SQLAlchemy 2.x + Alembic | Typed models and versioned migrations |
| Auth provider | Supabase Auth or Clerk; alternatively FastAPI-native auth | Real auth, sessions, password reset, abuse controls |
| RLS / tenant isolation | PostgreSQL RLS + backend ownership checks | Users can access only their own data |
| Cache and queue | Redis | Rate limits, repeated request caching, job queues |
| Background workers | Celery or Dramatiq | AI, email, exports, parsing, image analysis |
| Object storage | Private S3-compatible storage or Supabase Storage | Face and product images with signed URLs |
| AI routing | Backend AI service layer | LLM calls, vision calls, RAG, validation |
| Weather provider layer | Server-side weather integration | Current weather, forecasts, UV, humidity, air quality where available |
| ML runtime | Backend ML modules | Forecasting, feature store, calibration, model registry |
| Observability | OpenTelemetry, structured logs, Sentry | Error tracing and production monitoring |
| Deployment | Railway, Render, Fly.io, AWS, GCP, or Supabase + worker host | Managed production deployment |

### 8.3 Recommended Accessible Architecture

For easiest production execution:

- **Expo React Native** for mobile.
- **Supabase Auth** for accessible authentication, email flows, and session management.
- **Supabase Postgres with RLS and pgvector** for durable database and retrieval.
- **Private Supabase Storage or S3-compatible storage** for images.
- **FastAPI backend** for protected AI/ML, forecasting, report generation, and service orchestration.
- **Redis + worker** for heavy asynchronous jobs.

This gives an accessible auth/database foundation while preserving a real backend service layer for intelligence and ML.

### 8.4 Secret Management Rules

- No service-role keys in the mobile app.
- No private AI API keys in the mobile app.
- No S3 secret keys in the mobile app.
- No database URLs in the mobile app.
- Mobile may contain only public API base URLs and public anon keys where appropriate.
- All privileged calls must go through the backend.
- All environment variables must be server-side for secrets.
- Signed upload/download URLs must be short-lived.

---

## 9. System Architecture

### 9.1 High-Level Flow

```text
Mobile App
  ↓
Typed API Client
  ↓
Auth Middleware / Session Verification
  ↓
FastAPI Service Layer
  ↓
Validation / Authorization / Rate Limit
  ↓
PostgreSQL + Object Storage + Redis
  ↓
AI/ML Orchestration + Background Workers
  ↓
Persistence + Audit Logs + Intelligence Events
  ↓
Realtime or Polling Updates
  ↓
Mobile UI
```

### 9.2 Core Architecture Principle

The mobile app is the presentation and interaction layer. The backend is the source of truth. AI/ML services are executed through controlled backend pipelines. The database is the permanent health timeline. Every important output must be stored with provenance.

### 9.3 Monorepo Structure

```text
acnetrex-v3/
  apps/
    mobile/
      app/
      src/
        components/
        features/
        hooks/
        lib/
        navigation/
        screens/
        stores/
        theme/
        types/
        validation/
      assets/
      tests/
      app.json
      eas.json
    web/
      src/
      public/
      package.json
  backend/
    app/
      main.py
      core/
      db/
      api/
      schemas/
      services/
      ml/
      workers/
      tests/
    alembic/
    pyproject.toml
  packages/
    shared/
      schemas/
      types/
      constants/
      api-contracts/
  docs/
    activity-log.md
    architecture.md
    security.md
    testing.md
    prd.md
```

### 9.4 Backend Structure

```text
backend/
  app/
    main.py
    core/
      config.py
      security.py
      logging.py
      consent.py
      errors.py
      constants.py
      rate_limit.py
      permissions.py
    db/
      session.py
      base.py
      models.py
      rls.sql
      migrations/
    api/
      v1/
        router.py
        routes/
          auth.py
          profile.py
          onboarding.py
          logs.py
          scans.py
          annotations.py
          products.py
          forecast.py
          assistant.py
          evidence.py
          intelligence.py
          network.py
          notifications.py
          reports.py
          exports.py
          migration.py
    schemas/
      auth.py
      profile.py
      onboarding.py
      logs.py
      scans.py
      lesion_annotations.py
      products.py
      forecast.py
      assistant.py
      evidence.py
      intelligence.py
      network.py
      notifications.py
      reports.py
      common.py
    services/
      auth_service.py
      migration_service.py
      profile_service.py
      onboarding_service.py
      log_service.py
      scan_service.py
      annotation_service.py
      learning_service.py
      model_training_service.py
      product_service.py
      forecast_service.py
      assistant_service.py
      evidence_service.py
      rag_service.py
      intelligence_service.py
      notification_service.py
      network_service.py
      export_service.py
      validation_service.py
      audit_service.py
      storage_service.py
    ml/
      face_pipeline.py
      lesion_taxonomy.py
      annotation_reconciliation.py
      product_pipeline.py
      forecast_pipeline.py
      assistant_routing.py
      calibration.py
      confidence.py
      feature_store.py
      model_registry.py
      model_evaluation.py
      safety.py
    workers/
      tasks.py
      queues.py
      schedules.py
    tests/
```

---

## 10. Architectural Constitutions

### 10.1 Data Persistence Constitution

AcneTrex is a longitudinal intelligence platform. Without durable memory, there is no intelligence.

Requirements:

- Every meaningful interaction must create or update persistent backend records.
- No prediction, personalization, learning, report, recommendation, or status may depend only on client state.
- Every entity must include stable ownership and versioning metadata.
- Every health-data write must emit an audit log.
- Every AI/ML output must persist with input references, model version, confidence, schema version, and validation status.
- Every user-provided lesion annotation, model-user disagreement signal, consented learning contribution, model training run, and model performance snapshot must persist with ownership, provenance, consent, and versioning metadata.

Acceptance criterion: A feature is incomplete if it cannot survive logout, refresh, reinstall, device change, or future upgrade.

### 10.2 Cloud Execution Constitution

AcneTrex is a distributed intelligent system. Cloud infrastructure exists to guarantee reliability, continuity, and scalability.

Cloud responsibilities:

- authentication
- database
- object storage
- AI inference
- ML forecasting
- evidence retrieval
- notifications
- exports
- telemetry
- learning
- analytics
- backups
- migrations

Acceptance criterion: No production health data depends on browser storage, mobile memory, or local-only storage.

### 10.3 Authentication Constitution

Identity is the foundation of personalization. Every intelligence event belongs to one authenticated user.

Required behavior:

- signup
- login
- logout
- remember me
- session renewal
- password reset where supported
- account lookup through real auth provider
- role and permission resolution
- migration from legacy credentials without trusting legacy auth

Acceptance criterion: The same authenticated account must always retrieve the correct historical account, settings, scans, logs, AI outputs, evidence, and reports.

### 10.4 Notification Constitution

Notifications are clinical adherence interventions, not decoration.

Notification types:

- medication reminder
- routine reminder
- daily log reminder
- forecast update
- AI insight ready
- research update
- goal achievement
- risk warning
- product analysis complete
- FaceAtlas scan ready
- forecast changed
- sleep pattern alert
- hydration reminder
- cycle reminder
- weather trigger alert
- dermatologist report ready

Acceptance criterion: Every notification must map to a real backend event, schedule, user preference, or persisted task. No fake notifications.

### 10.5 Security Constitution

The backend must enforce security. The frontend must never be trusted as the security boundary.

Mandatory controls:

- parameterized queries only
- ownership checks on every user-owned record
- backend authorization on all protected endpoints
- RLS or equivalent database isolation
- rate limits
- input validation and sanitization
- secure session handling
- private object storage
- signed URLs
- no service secrets in client
- no AI, retrieval, weather, storage, or third-party API keys in frontend code; all integrations must route through server-side environment variables
- production logs without sensitive values
- CSRF-safe behavior where applicable
- audit trails for health-data writes

### 10.6 AI/ML Constitution

Every intelligence module must be a real operational engine.

A valid engine must have:

1. Real inputs.
2. Explicit pipeline.
3. Runtime validation.
4. Persisted outputs.
5. Confidence and uncertainty.
6. Downstream effect.
7. Telemetry emission.
8. Failure behavior.
9. Feedback or calibration loop.
10. No placeholder intelligence.

---

## 11. Core Functional Requirements

### 11.1 Authentication and Account Management

#### Requirements

Users must be able to:

- create an account
- log in
- log out
- stay logged in when remember me is enabled
- reset password if supported by provider
- update profile
- manage settings
- delete account with grace period
- migrate legacy local data

#### Backend rules

- Passwords must be handled only by the auth provider or hashed with Argon2id/bcrypt if custom auth is used.
- The app must never store raw passwords.
- Session tokens must be stored securely.
- Backend must validate every request.
- Login and signup must be rate-limited.
- Account deletion must be soft-delete first, with media cleanup queued.

#### Acceptance criteria

- User can sign up and immediately complete onboarding.
- User can log out and log back in with all data preserved.
- Invalid credentials show a clear error.
- Session expiration redirects to login without data corruption.
- Protected screens cannot be accessed without a valid session.

### 11.2 Onboarding

#### Purpose

Collect the baseline profile needed for serious personalization without overwhelming the user. Onboarding is the first intelligence ingestion event. The moment the user saves responses and creates the account, AcneTrex must begin building a durable, versioned personalization profile that AI/ML engines can use to understand skin behavior, detect patterns, compare future changes, and generate more precise outputs.

Onboarding must feel like a premium clinical intake, not a generic signup quiz. It must use progressive disclosure, but every required section must be answered before the user can proceed. To prevent fatigue, the app must use defined answer sets, chips, sliders, search fields, conditional branching, autosave, and explicit choices such as “Not sure,” “Not applicable,” or “Prefer not to answer” where medically or ethically appropriate. Editable profile sections remain available after account creation, but initial onboarding completion is mandatory for app access.

#### Personalization boot sequence

```text
account creation
→ verified identity/session
→ onboarding response capture
→ runtime validation
→ profile persistence
→ baseline UserSkinModel/ProfileSnapshot creation
→ intelligence event emission
→ personalization features become available
→ dashboard readiness updated
```

#### Required onboarding field groups

The following groups define the personalization contract. Individual fields must be answered before progression unless a legal/privacy rule requires a separately optional consent. Sensitive fields must offer explicit structured alternatives such as “Prefer not to answer,” and unknown fields must offer “Not sure.” A blank skipped field is not allowed because downstream AI/ML confidence depends on knowing whether data is absent, unknown, not applicable, or withheld.

##### Basic profile and personalization context

- age range
- biological sex where relevant to cycle tracking, optional and user-controlled
- cycle tracking preference
- pregnancy/postpartum relevance only if voluntarily provided
- general location or climate preference at coarse granularity only
- timezone
- skin tone/Fitzpatrick-style imaging calibration range, optional and used only for analysis calibration
- primary goals
- preferred guidance style
- notification preferences
- research participation preference
- privacy preferences

##### Acne history

- age or period when acne started
- acne duration and recurrence pattern
- current severity self-assessment
- usual breakout frequency
- recent flare history
- primary acne concerns
- breakout zones
- suspected lesion types user commonly sees
- painful/deep lesion tendency
- clogged-pore tendency
- redness tendency
- post-inflammatory hyperpigmentation tendency
- post-inflammatory erythema tendency
- scarring concern
- picking/touching tendency, optional and non-judgmental
- past dermatology consults, optional
- past prescriptions or procedures, optional

##### Skin type and barrier profile

- skin type
- oiliness pattern by zone
- dryness pattern by zone
- sensitivity level
- barrier symptoms
- stinging/burning/tightness frequency
- redness/flushing tendency
- irritation triggers
- known allergies or reactions, optional
- eczema/dermatitis/rosacea history only if voluntarily provided
- tolerance to actives

##### Routine, products, and treatments

- current cleanser, moisturizer, sunscreen, actives, spot treatments, prescriptions, oral medications, supplements, and procedures where voluntarily provided
- routine timing
- routine consistency
- product start dates where known
- recent product changes
- sunscreen behavior
- cleansing behavior
- exfoliation/active ingredient behavior
- makeup/cosmetic use
- shaving/hair-removal habits where relevant
- hair products and contact with face
- patch-test behavior
- introduce-one-thing-at-a-time behavior

##### Lifestyle and trigger context

- sleep duration and schedule
- sleep quality
- stress pattern
- diet patterns
- dairy intake pattern
- high-glycemic/sugary food pattern
- hydration pattern
- caffeine pattern
- exercise and sweat pattern
- mask/helmet/contact exposure
- phone/pillowcase/towel contact habits
- climate/environment context
- sun exposure
- travel or routine disruption tendency

##### Data consent and learning preferences

- research network opt-in state
- anonymous learning opt-in state
- media learning consent state
- whether derived features from scans may improve models
- whether user annotations may be used for model calibration
- whether raw images may ever be used, default no unless separately explicit
- revocation acknowledgement

#### Rules

- Onboarding must not force FaceAtlas multi-photo capture.
- FaceAtlas capture belongs inside the FaceAtlas module.
- If any onboarding image baseline is implemented, it must be clearly optional and must use real camera input and real analysis. However, V3 should reserve routine face capture for FaceAtlas to avoid duplicated flows.
- Every onboarding answer must persist.
- User cannot leave mandatory onboarding sections blank; sensitive or unknown topics must use explicit non-blank answers such as “Not sure,” “Not applicable,” or “Prefer not to answer.”
- Incomplete onboarding resumes from last saved step.
- Every saved onboarding step must update the user profile or onboarding record and emit a non-sensitive intelligence event.
- The personalization engine must create or update a baseline profile snapshot after onboarding completion.
- CutisAI, Forecasting, FormulaLens, FaceAtlas, TriggerGraph, BarrierGuard, Reports, and the Evidence Retrieval Layer must consume onboarding profile fields through validated backend service boundaries.
- Users must be able to update onboarding-derived profile answers later without resetting their account.
- Sensitive questions must be clearly explained and must never force disclosure. When disclosure is not appropriate, the answer set must include “Prefer not to answer” so the form is completed without coercion.

#### Acceptance criteria

- Onboarding persists after app close.
- Onboarding completion unlocks the main dashboard only after all required sections validate and persist.
- Profile is available to CutisAI, forecasting, FormulaLens, FaceAtlas calibration, TriggerGraph, BarrierGuard, Reports, and task personalization.
- A newly created account produces a durable baseline personalization record.
- Blank answers are blocked. Explicit “Not sure,” “Not applicable,” or “Prefer not to answer” responses are represented honestly and never fabricated.

### 11.2A Onboarding Addendum: Meal Baseline, Clinical History Specificity, and Sleep/Circadian Baseline

The existing onboarding requirements must be expanded with the following required field groups. These fields must follow the same mandatory-but-low-fatigue rule as the rest of onboarding: no blank skipped answers, but explicit alternatives such as “Not sure,” “Not applicable,” and “Prefer not to answer” are valid where appropriate.

#### Acne onset and clinical history pattern

Required fields:

- acne start period;
- acne onset pattern;
- sudden vs gradual onset;
- persistent vs episodic pattern;
- suspected timing around product changes;
- suspected timing around medication/treatment changes;
- suspected timing around lifestyle/environment changes;
- user confidence in acne history answer;
- optional free-text acne timeline.

#### Meal and snack baseline

Required fields:

- usual meal count per day;
- meal timing pattern;
- breakfast/lunch/dinner labels or flexible meal labels;
- snack frequency;
- common snack categories;
- caffeine timing tendency;
- late-night eating tendency;
- user-specific suspected food triggers;
- confidence in diet baseline.

#### Sleep and circadian baseline

Required fields:

- usual sleep start time;
- usual wake time;
- usual sleep duration;
- sleep schedule regularity;
- bedtime variability;
- wake-time variability;
- night-awakenings tendency;
- nap tendency;
- sleep quality baseline;
- school/work schedule constraints where voluntarily provided;
- preferred sleep reminder style.

#### Rules

- These fields must be saved into `onboarding_profiles.answers` and normalized into `user_profiles`, `meal_baselines`, `sleep_baselines`, or derived baseline tables where appropriate.
- Unknown or variable patterns must be captured explicitly.
- Meal frequency must drive Food Log completion rules.
- Sleep baseline must initialize SleepDerm targets and circadian analysis.
- Acne onset pattern must be versioned and available to CutisAI, Reports, FaceAtlas, Forecasting, Treatment Plan Center, Skin Twin, and Longitudinal Analysis.

#### Acceptance criteria

- A new user cannot complete onboarding unless acne-onset, meal-baseline, snack-baseline, and sleep-baseline fields have valid structured answers.
- Sensitive answers allow “Prefer not to answer” and are stored as intentional non-disclosure rather than missing data.
- Updating these baseline answers later creates a versioned profile event and marks affected downstream outputs stale when necessary.



### 11.3 Dashboard

#### Purpose

The dashboard is the daily command center.

#### Must show

- today’s Cutis Health Index state
- latest FaceAtlas summary or empty state
- daily task board
- log completion status
- current flare risk
- top likely trigger signals
- barrier status
- recent AI insight
- next recommended action
- research participation state
- notification or reminder cards
- insufficient-data progress indicators
- live AI/ML engine activity panel with real backend status
- model learning/readiness snapshot derived from intelligence events and model metrics

#### Rules

- No random score.
- No fake trend.
- No decorative AI status.
- Dashboard values must come from latest persisted records, validated AI/ML outputs, or explicit insufficient-data states.

#### Acceptance criteria

- Dashboard loads within target performance budget.
- Pull-to-refresh updates state.
- Each card navigates to its source module.
- Newly created logs or scans update dashboard after persistence.

### 11.4 Daily Logging System

#### Log types

- skin state
- sleep
- food
- stress
- activity
- sweat
- hydration
- cycle
- contact exposure
- cleansing
- exfoliation
- active ingredients
- sunscreen
- makeup
- product use
- treatment/medication
- picking/touching
- environment/climate context
- mood/confidence notes

#### Same-Day Merge Rule

If the user submits a daily log of the same type on the same calendar day, update the existing record instead of creating a duplicate, unless the user explicitly creates a new distinct event.

Implementation pattern:

```text
log_date = user-local YYYY-MM-DD
existing = find record where user_id = current user, log_type = type, log_date = today
if existing exists:
  update existing record
else:
  create new record
```

#### Required states

- unsaved
- validating
- saving
- saved
- updated
- failed
- offline queued
- conflict detected

#### Acceptance criteria

- Same-day sleep, food, stress, activity, contact, hydration, cycle, routine, and treatment logs update instead of duplicating.
- Every save emits an audit log.
- Every save updates dashboard and intelligence readiness.
- Offline saves queue safely and sync when network returns.


### 11.4A Sleep Log Calculation Requirement

Sleep logging must be optimized for speed and accuracy.

Required fields:

- sleep start time;
- wake time;
- automatically calculated sleep duration;
- sleep quality rating;
- awakenings/disturbances;
- optional nap field;
- optional notes.

Rules:

- Duration must calculate automatically from start and wake time.
- Overnight sleep must calculate correctly across midnight.
- The user should not need to manually calculate hours.
- Manual duration override is allowed only if clearly marked and requires a reason.
- Same-day merge/update behavior must preserve one sleep record per sleep period or per supported sleep episode design.
- Sleep data must feed SleepDerm Analytics, TriggerGraph, forecasts, task planning, CutisAI summaries, and reports.

### 11.4B Food Log Baseline-Adaptive Completion Requirement

Food logging must respect the user’s baseline meal count and support progressive updates throughout the day.

#### Required fields

- expected meal count;
- meal entries array;
- snack entries array;
- completion state;
- user-marked-complete flag;
- backfill status;
- missingness status;
- meal timing;
- food tags;
- portion estimate where provided;
- confidence/uncertainty;
- optional photo;
- optional notes.

#### Same-day merge behavior

All meals and snacks for a single user-local date must update the same daily food log record unless the product intentionally implements typed sub-events linked to one daily parent record.

```text
if user_adds_meal_or_snack on same user-local date:
  find existing daily food log parent
  append or update entry under same parent
  recompute completion state
  emit audit_log and intelligence_event
else:
  create parent food log record
```

#### Completion logic

```text
if meals_logged >= expected_meal_count:
  food_log_state = meals_complete
else:
  food_log_state = partially_logged

if user_adds_snack:
  append snack to same daily food log

if user_marks_complete:
  food_log_state = user_marked_complete

if expected_meal_count is variable/not_sure/prefer_not:
  require user confirmation before marking complete
```

#### Acceptance criteria

- A user with a 1-meal baseline can complete food logging with one meal.
- A user with a 3-meal baseline remains partial until three meals are logged or explicitly marked complete.
- Snacks can be added any time without duplicating the log.
- Food updates immediately reflect on Dashboard, DermDiet, TriggerGraph, and Skin Twin readiness.
- Missing meals are not silently estimated.

### 11.4C SleepDerm, Sleep Debt, and Circadian Calculation Requirement

Sleep logging must calculate more than total hours slept. It must generate sleep-derived features needed for SleepDerm Circadian Intelligence.

#### Required calculated fields

- `sleep_duration_hours`;
- `sleep_midpoint_time`;
- `onset_regularities`;
- `wake_regularities`;
- `sleep_debt_daily`;
- `sleep_debt_3d`;
- `sleep_debt_7d`;
- `sleep_debt_14d`;
- `sleep_debt_30d`;
- `circadian_alignment_score`;
- `nocturnal_recovery_opportunity_score`;
- `sleep_risk_score`;
- `sleep_data_confidence`.

#### Rules

- All calculated values must be derived from source sleep records.
- Calculated values must be versioned.
- Changing sleep start/wake time must trigger recalculation.
- Sleep-derived features must be persisted so AI/ML outputs are reproducible.
- If calculation assumptions change, old derived values must retain their computation version.

#### Acceptance criteria

- SleepDerm updates after every sleep log.
- Sleep debt is automatically computed.
- Circadian alignment is computed only when minimum data is present.
- Nocturnal recovery opportunity is shown as a cautious proxy.
- Sleep-derived variables feed forecasting, TriggerGraph, Skin Twin, CutisAI, Reports, Task Board, and the Longitudinal Acne Dynamics Engine.



### 11.5 FaceAtlas

#### Purpose

FaceAtlas is the official face-analysis capture flow. It must combine real multi-photo capture, backend image analysis, user-guided lesion annotation, validation, persistence, and consented learning signals so AcneTrex can become more accurate at acne lesion identification over time.

FaceAtlas must not simply tell the model what acne lesions are. It must also collect structured user feedback after scan upload so the system can compare model predictions against user-observed lesion counts, resolve uncertainty, and improve lesion identification through validated and consent-governed learning loops.

#### Required capture angles

1. Front.
2. Left 45 degrees.
3. Right 45 degrees.
4. Forehead/upper face.
5. Chin/lower face.

#### Mobile capture requirements

- Use native camera through Expo Camera.
- Request permission with clear explanation.
- Use front camera by default.
- Allow gallery fallback if permitted.
- Validate image quality before upload.
- Compress images to target size before upload.
- Strip unnecessary metadata.
- Upload through signed URL or protected backend flow.
- Store only private object references.
- Never expose public bucket URLs.

#### Capture state machine

```text
IDLE
PERMISSION_REQUESTED
CAMERA_OPEN
CAPTURING
REVIEWING
UPLOADING
ANNOTATING
ANALYZING
COMPLETE
ERROR
```

#### Analysis pipeline

```text
image acquisition
→ quality validation
→ face detection
→ alignment validation
→ zone segmentation
→ user lesion annotation intake
→ lesion taxonomy guidance
→ model lesion classification
→ model-user comparison
→ annotation reconciliation
→ redness/oiliness/dryness estimation
→ PIH/PIE/scar visibility estimation
→ confidence generation
→ validation gate
→ persistence
→ telemetry
→ consented learning contribution evaluation
→ downstream updates
```

#### User lesion annotation feature

After the user uploads the required FaceAtlas photos, the app must show a guided annotation step before backend analysis can start. This step is mandatory but must be fast, structured, and low-fatigue. The **Start Analysis** button must remain disabled until all required annotation fields validate. The annotation exists to improve analysis accuracy, compare model and user observations, create learning signals, and make the user aware that their data helps personalize the AI/ML engine.

The annotation step must allow the user to enter:

- total visible lesion count across the scan
- total suspected invisible/growing or not-yet-fully-visible lesion count the user can feel under the skin
- visible vs not-yet-visible split
- per-lesion-type counts
- per-zone counts for forehead, left cheek, right cheek, chin, jawline, nose, temples, neck, and custom zone if needed
- certainty level for each count and label: sure, somewhat sure, or unsure
- current user-rated oiliness using a defined scale with plain-language anchors
- optional notes about pain, tenderness, itch, swelling, or recent change
- whether the scan reflects a normal day, flare day, recovery day, or unusual condition

The app must provide lesion-type reference cards so users can self-identify more accurately. Each card must include a short definition, what to look for, and a small reference image or medically appropriate illustration.

Required lesion reference categories:

- open comedone / blackhead: dark open clogged pore
- closed comedone / whitehead: small closed clogged bump without obvious redness
- papule: red or inflamed raised bump without visible pus
- pustule: inflamed bump with visible pus or white/yellow center
- nodule: deeper painful firm bump under the skin
- cystic lesion: deep inflamed lesion that may feel swollen, tender, or fluid-filled
- PIH mark: brown/dark post-acne mark
- PIE mark: pink/red/purple post-acne mark
- scar texture: pitted, raised, or uneven texture after acne
- inflamed bump: visibly inflamed bump when the user cannot distinguish papule/pustule/nodule
- unsure / other: used when the user cannot confidently classify the lesion
- custom: user-defined label when none of the provided categories fits

The UI must make clear that user annotations are helpful signals, not medical diagnoses. The user must be allowed to mark “not sure” without penalty, but the annotation step must still be completed with explicit answers.

#### Annotation learning rules

- User annotations must be persisted as structured records linked to the FaceScan.
- User annotation data must never overwrite model analysis directly; it is a high-value weak label that requires validation, reconciliation, and calibration review.
- The backend must compare user annotations against model outputs and store agreement, disagreement, and uncertainty metrics.
- Disagreement must trigger calibration review, not blind model self-change.
- If the user has consented to anonymous learning, eligible annotation-derived features may feed the model-improvement pipeline.
- Raw images must be stored only temporarily until analysis and derived-feature extraction complete, then deleted unless the user explicitly saves them locally, explicitly retains them, or separately consents to raw-image model improvement. Raw images must not be used for network learning unless separate explicit media consent exists.
- Derived features, labels, zone counts, confidence signals, and model-user disagreement metrics may be used only according to consent state.
- Every learning contribution must be versioned, auditable, and traceable to consent state without exposing raw personal data.

#### Outputs

- scan id
- image references
- captured angles
- quality score
- face presence status
- alignment status
- zone metrics
- user lesion annotation summary
- total visible lesion count from user, nullable
- total suspected growing lesion count from user, nullable
- per-lesion-type user counts
- per-zone user counts
- user uncertainty score
- model lesion counts/classifications where available
- model-user agreement metrics
- model-user disagreement flags
- redness estimate
- image-derived oiliness estimate
- user-rated oiliness
- model-user oiliness agreement
- dryness estimate
- PIH/PIE indicators
- scar visibility indicators
- confidence
- limitations
- validation status
- model version
- analysis summary
- learning eligibility state

#### Downstream effects

FaceAtlas must influence:

- Cutis Health Index
- BarrierGuard
- Acne Signature Map
- TriggerGraph
- Forecasting
- Skin Twin Lab
- Reports
- CutisAI context
- Intelligence Core model readiness
- anonymous network learning where consented
- lesion model calibration and evaluation

#### Acceptance criteria

- User can complete five-photo scan on mobile.
- Permission errors are clear.
- Upload failure is recoverable.
- User must complete guided lesion annotation after upload and before pressing Start Analysis.
- Lesion reference cards are visible, understandable, and clinically cautious.
- User annotation records persist and are linked to the correct scan.
- Model-user agreement/disagreement metrics are computed and stored.
- No scan result appears unless analysis passes validation.
- Scan records persist and appear in history.
- Consented annotation signals can contribute to anonymous model improvement.
- Non-consented annotation signals improve only that user’s private/personal personalization where allowed and must not enter network training.
- FaceAtlas must provide a “Discuss with CutisAI” action for model-user disagreements, passing the scan, annotation, disagreement metrics, image-quality metadata, confidence values, and lesion definitions to CutisAI.

### 11.6 Cutis Health Index

#### Purpose

CHI is a composite view of current skin health.

#### Inputs

- latest FaceAtlas scan
- daily logs
- barrier symptoms
- sleep
- diet
- stress
- activity/sweat
- product history
- weather/context
- treatment adherence
- cycle data where enabled
- prior CHI history

#### Rules

- No random CHI score.
- No hardcoded CHI score.
- If minimum data is missing, show insufficient-data state.
- CHI must disclose major contributing factors.
- CHI must store snapshots.

#### Minimum data threshold

- At least 3 meaningful logs or a validated scan to generate early CHI.
- Higher confidence requires more data.

### 11.7 BarrierGuard

#### Purpose

Monitor skin barrier condition and risk.

#### Inputs

- dryness
- burning/stinging
- tightness
- redness
- active ingredient use
- exfoliation frequency
- cleansing behavior
- moisturizer use
- climate conditions
- FaceAtlas dryness/redness indicators

#### Outputs

- barrier status
- likely stressors
- recovery suggestions
- routine cautions
- confidence
- insufficient-data state when needed

### 11.8 TriggerGraph

#### Purpose

Detect personal correlations between behaviors/context and acne changes.

#### Inputs

- daily logs
- scan history
- product use history
- sleep/stress/activity data
- cycle data if enabled
- weather/context
- symptom changes

#### Rules

- Minimum 14 days of logs for meaningful trigger analysis.
- Must distinguish correlation from causation.
- Must expose confidence and uncertainty.
- Must never overstate findings.

### 11.9 FormulaLens Product and Ingredient Intelligence

#### Input methods

Priority order:

1. product label photo OCR
2. manual ingredient paste
3. product name search through backend internet retrieval
4. manual brand/product name
5. barcode if future-supported

#### Pipeline

```text
input capture
→ OCR or text extraction
→ ingredient parsing
→ normalization
→ acne-relevant mechanism mapping
→ evidence retrieval
→ user profile comparison
→ product risk analysis
→ validation
→ persistence
→ downstream forecast/routine impact
```

#### Risk dimensions

- comedogenic potential
- irritancy potential
- barrier disruption risk
- occlusive risk
- barrier-supporting ingredients
- fragrance/allergen signal
- active conflict
- fungal-acne relevance
- dryness risk
- purge risk
- photosensitivity concerns
- hormonal/acne mechanism relevance where evidence exists
- routine compatibility
- patch-test recommendation

#### Output

- product name
- brand
- ingredient list
- parsed ingredient confidence
- simple verdict: safe, caution, or avoid
- nuanced compatibility score
- risk summary
- ingredient flags
- user-specific compatibility
- full-routine conflict analysis
- evidence citations used for product, treatment, ingredient, and acne-science claims
- safer-use suggestions
- confidence
- limitations

#### Acceptance criteria

- Product analysis persists.
- User can revisit previous products.
- FormulaLens can influence forecast and CutisAI.
- No product conclusion appears without parsed input or explicit insufficient-data state.

### 11.9A Treatment Plan Center and Tolerance Builder

#### Purpose

Treatment Plan Center is the structured treatment-adherence and tolerance-building system for acne therapies. It helps users organize dermatologist-prescribed plans, OTC active routines, retinoid acclimation, benzoyl peroxide usage, oral treatment adherence, and review checkpoints while keeping medical safety, evidence, and user-specific tolerance at the center.

This feature is connected to ClearPath Planner, FormulaLens, BarrierGuard, FaceAtlas, TriggerGraph, Skin Twin Lab, Notifications, Task Board, Reports, ClimateSkin Radar, and CutisAI. It must be treated as a core AcneTrex module, not as a simple reminder list.

#### User capabilities

Users must be able to:

- create a new treatment plan from product name search, prescription/label OCR, manual entry, or saved FormulaLens product;
- identify the treatment as prescribed, dermatologist-recommended, OTC, or self-selected;
- enter exact provider instructions when applicable;
- answer baseline tolerance and safety questions;
- generate an evidence-aware calendar plan;
- view the plan as a calendar with active days, rest days, escalation points, review points, and completion target;
- receive reminders and daily tasks for each scheduled use;
- log use, skipped days, irritation, barrier symptoms, acne changes, and side effects;
- let the AI/ML engine update plan status and safe next-step suggestions based on response;
- edit, pause, resume, delete, complete, archive, or start additional plans;
- run multiple treatment plans at the same time;
- include plan history in dermatologist-ready reports;
- ask CutisAI to explain the plan, summarize progress, or prepare provider questions.

#### Plan types

Treatment Plan Center must support at least:

- topical retinoid tolerance plans: adapalene, tretinoin, tazarotene, retinal, retinol, retinoid combinations;
- benzoyl peroxide plans: leave-on, wash, spot, combination therapy;
- azelaic acid plans;
- exfoliating-acid or keratolytic plans where acne-relevant;
- prescription topical combinations;
- oral antibiotic adherence plans with antimicrobial-stewardship reminders;
- isotretinoin support plans limited to education, adherence, provider/lab/appointment reminders, symptom tracking, and report preparation;
- hormonal/acne-related medication tracking only when voluntarily relevant and provider-directed;
- post-procedure or procedure-preparation plans if connected to Procedure Compass.

#### Plan creation fields

A treatment plan record must capture:

- treatment name, brand, active ingredient, strength, vehicle/form, route, affected zones, prescription status, provider status, start date, intended review date, and end/review rule;
- exact saved instruction text, if user/provider supplied it;
- evidence source summary and citation references;
- baseline tolerance profile;
- related active products and conflict risks;
- location/weather context if photosensitivity or sweat/heat risk matters;
- initial schedule and ramp strategy;
- allowed escalation/de-escalation conditions;
- check-in questions assigned to each scheduled use;
- notifications and tasks linked to the plan;
- confidence, validation state, safety flags, and insufficiency notes.

#### AI/ML behavior

The AI/ML engine must not simply output a fixed schedule. It must compute a personalized treatment plan from:

- treatment class and product evidence;
- user profile and barrier sensitivity;
- recent FaceAtlas and BarrierGuard results;
- FormulaLens conflicts across the whole routine;
- prior reactions and treatment history;
- adherence constraints and preferred reminder times;
- current weather, UV, heat, humidity, and sweat/occlusion context;
- treatment check-ins and outcomes;
- anonymous network learning only if consented, de-identified, and validated;
- conservative medical safety rules.

Outputs must include confidence and safety status. If data is insufficient, the module must say exactly what is missing, such as “recent barrier status,” “current product routine,” “treatment strength,” or “provider instruction.”

#### Treatment check-in acceptance criteria

- A scheduled treatment task must persist only after successful backend write or offline-safe queue.
- The same treatment event must not create duplicate completion records.
- The plan must adapt after repeated irritation, skipped use, worsening barrier status, or unexpectedly good tolerance.
- Prescription-related changes must be worded as “ask your provider” unless user entered provider-approved escalation instructions.
- Severe symptoms must trigger stop-escalation behavior and provider-contact guidance.
- Completed plans must become archived treatment history, not disappear.

### 11.10 CutisAI Evidence Retrieval Layer

#### Purpose

Provide backend evidence retrieval for CutisAI, FormulaLens, forecasting explanations, Skin Twin scenario explanations, FaceAtlas disagreement education, and report citations without creating a standalone ResearchVault or DermVault feature.

The user-facing product must not include a separate research-vault screen. Evidence appears only where it supports an answer, product analysis, treatment explanation, provider report, or AI/ML engine output.

#### Requirements

- Search trusted medical, dermatology, skincare science, ingredient, and public health sources through secure backend services.
- Retrieve external references only through server-side environment variables and protected API keys.
- Store permitted citation metadata and summaries where allowed.
- Provide evidence snippets to CutisAI and intelligence engines.
- Provide trust labels and source type labels.
- Show citations or source links where appropriate.
- Cite evidence whenever CutisAI discusses products, ingredients, treatments, acne science, trigger mechanisms, or external research claims.
- Clearly separate user-specific data from external evidence.
- Never use evidence retrieval to fabricate certainty when user-specific data are insufficient.
- Never expose raw API keys, database credentials, retrieval credentials, or service secrets to the mobile client.

#### Evidence fields

- title
- authors
- journal/source
- year
- DOI/PMID/source id if available
- abstract or summary where permitted
- topic tags
- trust label
- retrieval query
- retrieved_at
- embedding vector where applicable
- linked answer/output id
- citation display text
- usage context
- source freshness status where available

### 11.11 CutisAI Assistant

#### Purpose

CutisAI is the conversational intelligence layer.

#### Requirements

CutisAI must operate as an authenticated action assistant, not only a chat responder. It must be able to:

- create tasks after user confirmation;
- summarize logs;
- generate reports;
- suggest routine changes with evidence and uncertainty;
- explain FaceAtlas model-user disagreements;
- start a FormulaLens product analysis when provided a product name, ingredient list, or label photo workflow;
- identify missing data and tell the user what to log next;
- prepare provider-facing summaries;
- cite evidence for product, treatment, and acne-science claims;
- refuse to overstate trigger certainty when data are insufficient.

All CutisAI actions must pass through authenticated backend endpoints, permission checks, validation, persistence, audit logging, and user confirmation where the action modifies records, tasks, reports, reminders, or settings.

- answer clearly
- use user history
- retrieve evidence when appropriate
- cite relevant evidence when available
- explain scores and trends
- compare products and routines
- disclose uncertainty
- provide medically cautious guidance
- avoid diagnosis
- remember conversation history
- persist messages
- emit intelligence events
- support follow-up reasoning

#### Pipeline

```text
user question
→ auth and consent check
→ retrieve profile/logs/scans/products/forecasts
→ retrieve evidence when needed
→ build safe prompt
→ route to suitable model
→ generate draft response
→ validation and safety check
→ persist assistant message
→ emit telemetry
→ render response with confidence and citations
```

#### Failure behavior

- If retrieval fails, answer only from available user context and disclose retrieval limitation.
- If user data is insufficient, ask for the minimum data needed.
- If medical risk appears, recommend professional care.
- If answer confidence is low, state uncertainty.

### 11.12 Forecasting and Simulation

#### Modules

- Skin Horizon
- ClearPath Forecast
- FlareWindow Predictor
- What-If Simulator
- Skin Twin Lab

#### Inputs

- historical logs
- scan history
- product use
- weather/context
- cycle data where enabled
- treatment adherence
- previous forecasts
- feedback/outcomes

#### Outputs

- current risk
- forecast horizon
- risk drivers
- confidence interval or calibrated confidence
- no-change scenario
- improved-behavior scenario
- expected time to improvement
- counterfactual explanation
- model version
- validation status

#### Rules

- Forecasting must not be a generic LLM sentence.
- The engine must compute features from stored history.
- LLM may explain forecast outputs but must not fabricate underlying numbers.
- Forecast records must persist.


#### Forecast window requirements

Users must be able to choose forecast windows:

- 3 days;
- 7 days;
- 14 days;
- 30 days;
- treatment-cycle timelines.

The engine must adjust its feature weighting, confidence threshold, and insufficiency rules to the selected window. Longer windows require more historical data. If the user requests a window without enough data, the app must show an honest insufficient-data state and explain what logs/scans are needed.

Skin Twin scenario simulations must support better sleep, lower stress, no dairy, lower high-glycemic intake, hydration improvement, routine consistency, product removal, weather changes, treatment adherence, reduced occlusion/contact exposure, and other acne-relevant changes. These are scenario estimates, not guaranteed outcomes.

### 11.12A Skin Twin Lab Visualization and Simulation Requirement

Skin Twin Lab must include both statistical scenario simulation and visual projection.

#### Required capabilities

- choose active variables;
- choose simulation window;
- run readiness check;
- run scenario engine;
- persist simulation;
- display current skin model;
- display zone heatmap;
- display scenario projection;
- compare baseline vs scenario;
- explain uncertainty;
- export summary to report.

#### Rules

- Simulation must be computed through the backend AI/ML service.
- Visualization must be derived from FaceAtlas and saved simulation outputs.
- LLM explanation cannot create the simulation result.
- Low-confidence outputs must be abstract, not photorealistic.
- Every visual output must disclose whether it is observed, estimated, or insufficient data.

#### Acceptance criteria

- User can run a Skin Twin scenario only when required data exists.
- The app explains why a scenario cannot run.
- The visual projection updates from the saved scenario output.
- Lesion markers and heatmaps match stored data.
- User can inspect variable effects and confidence.
- Scenario appears in Reports if user includes it.



### 11.13 Task Board and Gamified Data Contribution

#### Purpose

Encourage users to provide the data needed for better intelligence. The task board is not decoration; it is the daily behavior layer that feeds the AI/ML system with fresh, validated, useful inputs.

The system must make daily logging feel rewarding, polished, and motivating without becoming childish or clinically unserious.

#### Requirements

- Daily tasks tied to real data contributions.
- Point values based on importance, data freshness, data difficulty, streak maintenance, and AI usefulness of the submitted data.
- Streaks that activate only when all required daily tasks are completed or safely queued offline.
- Badges and optional streak-pet progression that represent data consistency and intelligence readiness, never guaranteed skin improvement.
- Ranking system tied to real AI/ML readiness, personal data depth, FaceAtlas calibration, model confidence trends, validation status, and forecast readiness.
- Completion writes backend task records.
- No fake streaks or fake progress.
- Tasks influence intelligence readiness.
- Task recommendations must adapt to missing data, forecast needs, model uncertainty, and the user’s current routine.
- The app must explain why a task matters, such as “improves trigger detection” or “helps FaceAtlas calibrate today’s scan.”
- Points must not imply medical improvement by themselves; they represent data contribution and adherence support.
- Streak restore must be supported up to 3 times per user-local calendar month, tracked in backend records, and reset monthly.
- Restoring a streak restores the motivational streak state only; it must not fabricate missing health logs.
- If the monthly restore allowance is used and the user misses another required day, the streak restarts from scratch.
- Streak pet evolution must be tied to real record completeness, not random or decorative progression.
- Rank and badge progression must be tied to AI/ML readiness, model confidence, task consistency, scan quality, treatment-plan adherence, and forecast validation.

#### Streak pet and rank requirements

The streak pet must behave as a premium data companion that evolves as the user's personal AI profile becomes more complete. It should visually signal data consistency, scan quality, treatment adherence, and model readiness. It must never imply that the user's acne is automatically improving.

Minimum streak-pet states:

1. **Seed Signal** — first daily records and onboarding baseline.
2. **Calibration Sprout** — repeated logs and early FaceAtlas scans.
3. **Data Bloom** — stable data collection across multiple modules.
4. **Pattern Sentinel** — enough repeated exposures/outcomes for early TriggerGraph insights.
5. **Cutis Guardian** — strong adherence, scan quality, and forecast readiness.
6. **Atlas Prime** — long-term consistency with high personalization confidence.

The rank system must show what each rank means, what unlocked it, what engine benefits from it, and what data would improve the next rank. Badge examples include FaceAtlas Calibrated, TriggerGraph Ready, Treatment Plan Steward, Climate Context Active, Forecast Reliable, FormulaLens Complete, Report Ready, and Annotation Mentor.

#### Task completion animation requirements

Task completion must include a small premium animation that fits the AcneTrex visual identity. It should feel like a subtle futuristic clinical interface response, not an arcade effect.

Required interaction qualities:

- soft completion pulse
- smooth checkmark or node-activation animation
- small point gain reveal
- optional micro-progress ring update
- haptic feedback where platform-appropriate
- reduced-motion fallback
- no distracting confetti overload
- no misleading claims such as “skin improved” just because a task was completed

Suggested visual metaphor:

```text
task card completed
→ premium card collapse
→ data node lights up
→ points glide into daily readiness ring
→ AI readiness or confidence meter updates if real backend state changed
→ task_completions record persists
```

#### Example tasks

- Complete skin state log.
- Add sleep log.
- Add stress log.
- Complete FaceAtlas scan.
- Complete FaceAtlas lesion annotation.
- Log product use.
- Confirm routine adherence.
- Answer trigger follow-up.
- Review AI insight.
- Update consent preference.

#### Acceptance criteria

- Every task maps to a real backend event, log, scan, annotation, consent, feedback, or review action.
- Completing a task updates `task_completions` and relevant intelligence readiness state.
- Completion animation appears only after successful persistence or after a clearly marked offline-safe queue.
- Points, badges, streaks, streak-pet state, ranks, and readiness indicators are derived from real task records, model performance snapshots, confidence trends, and validation states.
- Missed days create missing-data records and trigger backfill or recovery flows; the app must not fake completed logs.

### 11.14 AcneTrex Research Network

#### Purpose

Enable privacy-preserving anonymous learning from opt-in users. This is an integral product system, not an informational page. The network must help improve AI/ML accuracy, lesion recognition, forecasting, product analysis, calibration, and confidence estimation for all users while protecting individual privacy.

Anonymous network learning must actually utilize eligible consented data. It must not be a fake toggle, decorative statistic, or static explanation.

#### Learning philosophy

Every consented user interaction can become a learning signal after validation, privacy filtering, and eligibility checks. The system should continuously ingest new eligible signals into a learning queue so the platform improves as real users use it.

“Constantly learning” means:

- new eligible events are captured in near real time
- data is validated before entering learning datasets
- raw personal records are transformed into privacy-preserving derived features where possible
- user annotations, model outputs, feedback, and downstream outcomes are compared
- performance metrics are recalculated on a schedule or after sufficient new data accumulates
- model improvements are versioned, evaluated, and released through controlled model registry updates
- no model may silently self-modify in production without validation, rollback support, and version tracking

#### Eligible learning signals

Subject to consent state and privacy rules, the network may learn from:

- FaceAtlas model outputs
- user lesion annotations
- model-user agreement/disagreement metrics
- scan quality and alignment metadata
- de-identified zone-level lesion counts
- acne mark and lesion trend summaries
- daily logs
- product usage and compatibility outcomes
- forecast predictions compared with later outcomes
- CutisAI feedback signals
- task completion patterns
- routine adherence signals
- climate/context correlations
- validation failures and low-confidence outputs

#### Requirements

- Anonymous network learning must be opt-out by default, meaning the default state is **not participating** until the user explicitly opts in.
- Visible participation status.
- Explicit opt-in and opt-out.
- Consent versioning.
- Revocation support.
- No raw images shared without explicit media-learning consent.
- No raw logs shared without explicit consent.
- Aggregate statistics derived only from real consent records.
- When consent is revoked, future data must stop contributing immediately. Historical aggregate model effects may not always be removable from already validated population models; user must be informed before revocation.
- Every learning contribution must be tied to a consent record and eligibility decision.
- Every model improvement must be associated with a model version, training run, validation metrics, and release status.
- Network learning must improve everyone only through approved model or calibration updates, not uncontrolled per-request mutation.

#### Required UI

- participation status
- what data may be used
- what data is never used
- how anonymous learning works
- active aggregate contribution state
- active users count or safe aggregate equivalent derived from records
- user’s contribution categories
- model improvement areas supported by the network
- model version, model badge/rank, confidence trend, cohort learning status, validation status, and last improvement summary where available
- revoke consent button
- privacy explanation

#### Acceptance criteria

- Opting in creates a consent record and enables eligible future learning contributions.
- Opting out or revoking consent prevents future network-learning contributions.
- Network metrics are derived from real consent and contribution records.
- User lesion annotations can improve FaceAtlas only when consent allows.
- Model improvements are versioned and observable.
- The interface honestly distinguishes personal learning, anonymous network learning, and released model improvements.

### 11.15 Notifications

#### Requirements

- Notifications must originate from backend events, schedules, risk thresholds, or user settings.
- User must control notification types.
- Notifications must be rate-limited and respectful.
- Forecast warnings must be sent only when the change is significant enough, confidence is adequate, and user preferences allow it.
- Streak reminders may be used before end-of-day when required daily tasks are incomplete.
- Low-confidence alerts must be framed as possible patterns to review, not certain flare predictions.
- Notification delivery and acknowledgement must be logged.

#### Examples

- Daily log reminder.
- Face scan reminder.
- Routine reminder.
- Product analysis complete.
- Report ready.
- Forecast changed.
- Weather trigger alert.
- Sleep pattern alert.
- Streak-risk reminder.
- AI insight update.
- CutisAI follow-up ready.
- Missed-day backfill prompt.
- Consent/privacy confirmation.

### 11.16 Reports and Export

#### Purpose

Generate dermatologist-ready summaries.



#### Visual report specification inspired by the attached report screenshots

The exported PDF must look like a professional clinical report:

- portrait page with a white rounded document card on a soft neutral background;
- subtle border, shadow, and generous margins;
- AcneTrex logo at top with green accent and V3 badge;
- large bold “AcneTrex Skin Intelligence” title;
- small uppercase subtitle such as “Clinical Reporting Services • Model V3.0”;
- right-aligned report metadata block with Report ID, compiled date/time, and secure-record indicator;
- strong horizontal divider below the header;
- uppercase letter-spaced section headers with small medical icons;
- patient specifications table with label/value rows;
- diagnostics baseline table;
- metric cards for current spatial scan outputs such as CHI, barrier status, inflammatory lesions, non-inflammatory lesions, oiliness estimate, confidence, and validation status;
- historical scan log table;
- cosmetics and skincare audit section;
- circadian, glycemic, sweat, climate, contact, product, routine, and treatment trigger summaries;
- evidence and confidence notes;
- footer with privacy/compliance note, generated-by text, and physician signature/date line.

If the report lacks enough data for a section, the section must show an explicit insufficient-data statement and the exact logs/scans needed. It must never use fake rows, fake values, or decorative placeholders as clinical data.

#### Report contents

- user profile summary
- acne timeline
- FaceAtlas scan summaries
- CHI history
- barrier trends
- product history
- treatment/routine adherence
- likely trigger patterns
- forecast history
- AI insights
- evidence citations used for product, treatment, ingredient, and acne-science claims
- uncertainty, confidence, readiness, and insufficient-data notes
- provider-facing questions/topics to discuss
- optional FaceAtlas images/thumbnails only when explicitly included by the user
- export date

#### Requirements

- PDF generation in backend worker.
- Export records persisted.
- Report access protected.
- No sensitive data included unless user explicitly chooses.
- Report must be tailored for a dermatologist or healthcare provider and must include history, current condition, patterns, risks, allergens, products, treatments, adherence, triggers, forecasts, confidence notes, and evidence citations when available.

---


### 11.17 Longitudinal Acne Dynamics and N-of-1 Pattern Lab

#### Definition

The Longitudinal Acne Dynamics and N-of-1 Pattern Lab is the analytical layer that turns daily AcneTrex use into a study-grade personal acne intelligence system. It must not require spreadsheet logging. It must use existing AcneTrex logs, scans, product records, treatment events, weather snapshots, and user notes as the structured dataset.

This feature must be presented as part of SkinState Journal, TriggerGraph, Reports, CutisAI, and Dashboard insights. It may have its own screen only if the UX benefits from a dedicated “Pattern Lab” interface, but the underlying data must remain shared with the existing modules.

#### Core user flow

1. User completes onboarding and provides acne history, skin type, sensitivity, barrier history, routine, treatment history, allergies, lifestyle patterns, and observed triggers.
2. User logs daily sleep, diet, stress, routine, activity/sweat, contact/occlusion, treatment use, and notes through normal app flows.
3. User completes FaceAtlas scans or quick lesion logs with lesion type, zone, count, and optional appearance/resolution updates.
4. The app stores all entries in structured tables and updates derived exposure scores.
5. The AI/ML engines compute descriptive trends, lagged correlations, regression estimates, episode classifications, and confidence scores.
6. The app produces personalized outputs such as stillness predictors, likely pre-breakout exposure windows, suspected purging vs ordinary breakout analysis, and lesion longevity patterns.
7. CutisAI can explain the pattern in plain language, cite external evidence where needed, and create safer tasks or treatment-plan prompts.
8. Reports can export the longitudinal history for dermatology review.

#### Required daily variables

The daily log system must support:

- **Acne activity:** daily acne index, total lesion count, inflammatory count, comedonal count, nodular/cystic count, dominant lesion type, dominant zone, pain/tenderness, and mark/scar status.
- **Sleep:** sleep start time, wake time, automatically calculated duration, sleep regularity, naps if relevant, and risk category.
- **Diet:** meal entries, ingredient tags, high-glycemic/high-load exposure, dairy exposure, sweets/chocolate, processed foods, fried/oily foods, saturated-fat-rich meals, fruit servings, caffeine, hydration, and user-specific trigger tags.
- **Stress:** daily 0–10 stress score, optional stress category, and optional periodic PSS-10 anchor if implemented.
- **Routine and products:** adherence, cleansing/shower timing, skipped core steps, over-cleansing, active use, moisturizer use, sunscreen use, makeup/hair-product/shaving exposures, product change score, and treatment plan events.
- **Environment and contact:** weather snapshot, humidity/UV/heat/AQI, sweat, exercise, masks, helmets, pillowcase, towels, phone contact, travel, and routine disruption.
- **Lesion lifecycle:** appearance date, peak severity, resolution date, longevity, recurrence zone, and residual PIH/PIE/scar transition.

#### Daily acne index

AcneTrex may use a user-facing six-level index for daily consistency, calibrated against FaceAtlas and weekly global severity:

| Index | Default criteria | State |
|---|---|---|
| 0 | 0–1 tiny lesions | Clear |
| 1 | 0–2 very small non-inflamed lesions | Stillness |
| 2 | 3–5 inflammatory lesions or mild rise above baseline | Mild flare |
| 3 | 6–20 inflammatory lesions or sustained moderate worsening | Moderate flare |
| 4 | 21–50 inflammatory lesions or significant inflammatory/cystic activity | Significant breakout |
| 5 | >50 inflammatory lesions, cystic clusters, or severe widespread activity | Severe/cystic breakout |

Thresholds must be adjustable by validated personal baseline after enough data exists. Any personalization must be recorded as a versioned scoring rule so reports can explain how the index was computed.

#### Exposure scoring

The app must support default exposure scoring but allow personalization after enough data is collected:

- **Sleep Risk Score:** 0 = optimal duration/timing for user; 1 = mild late/short/irregular; 2 = severe late/short/irregular.
- **Diet Risk Score:** 0 = low-risk day by user profile; 1 = moderate risk; 2 = high-risk day with major user-specific or evidence-supported exposures.
- **Stress Risk Score:** 0 = low, 1 = moderate, 2 = high, derived from the 0–10 stress scale and personal distribution.
- **Routine Deviation Score:** 0 = fully adhered; 1 = minor deviation; 2 = skipped core steps, overuse, or altered active use.
- **Product Change Score:** 0 = no change; 1 = minor frequency/amount change; 2 = active ingredient introduction, discontinuation, prescription change, or major routine change.
- **Weather/Climate Risk Score:** derived from humidity, heat, UV, AQI, sweat/occlusion probability, and treatment photosensitivity context.

Exposure scores must not replace raw data. The raw data must remain stored so future models can reprocess it with improved methods.

#### Purging vs breakout vs irritation support

The app must support operational episode labels:

- **Ordinary breakout candidate:** sustained acne elevation without recent active change or irritant signal.
- **Suspected purging candidate:** flare occurring within a configured window after active introduction or adjustment, especially in microcomedone-prone areas, followed by improvement or stillness.
- **Irritant reaction candidate:** burning, stinging, redness, peeling, barrier decline, diffuse sensitivity, or worsening inconsistent with tolerable adaptation.
- **Insufficient data:** used when logs, photos, product-change dates, or symptom data are too incomplete to classify.

The app must never present suspected purging as a guaranteed beneficial process. It must explain that purging is a tracking hypothesis and that irritation or ordinary breakout may look similar. Any severe irritation, swelling, allergic signs, severe pain, eye/mucosal involvement, systemic symptoms, or worsening on prescription medication must trigger provider-review guidance.

#### Provider-ready longitudinal output

Reports must include, when data is sufficient:

- personal acne history timeline;
- current routine and treatment history;
- lesion trend graphs;
- daily acne index distribution;
- stillness/breakout/suspected-purging episodes;
- diet/sleep/stress/routine/weather exposure summaries;
- lagged analysis results;
- regression/correlation summaries with confidence and limitations;
- lesion location/type/longevity patterns;
- product and treatment changes overlaid on acne timeline;
- what data is missing and what cannot be concluded.

#### Acceptance criteria

- Users can log all longitudinal variables through app flows without external spreadsheets.
- Same-day logs merge rather than duplicate.
- The system can generate at least descriptive statistics, trends, lagged exposure summaries, and episode labels from real records.
- The system refuses to classify purging, triggers, or treatment response when data is insufficient.
- CutisAI can summarize longitudinal patterns and create tasks from the analysis.
- Reports can export the longitudinal analysis in dermatologist-ready language.


## 12. Navigation and Mobile Screen Map

### 12.1 Primary Navigation

Use bottom tabs for the most frequent destinations:

1. Today
2. Logs
3. FaceAtlas
4. Insights
5. Profile

### 12.2 Suggested Screen Structure

```text
/(auth)
  login
  signup
  forgot-password

/(onboarding)
  welcome
  profile-basics
  skin-history
  routine
  triggers
  privacy-consent
  complete

/(tabs)
  today
  logs
  face-atlas
  insights
  profile

/logs
  sleep
  food
  stress
  activity
  hydration
  cycle
  contact
  routine
  treatment
  skin-state

/insights
  forecast
  triggers
  barrier
  products
  assistant
  intelligence
  skin-twin

/products
  scan
  manual-entry
  analysis/:id
  history

/treatments
  create
  plan/:id
  calendar/:id
  check-in/:eventId
  history

/reports
  create
  history
  detail/:id

/settings
  privacy
  notifications
  data-export
  account-deletion
```

### 12.3 Web Route Compatibility Mapping

Existing web routes must map to mobile screens or deep links, except removed standalone research-vault routes which must redirect safely:

| Existing route | Mobile equivalent |
|---|---|
| `/auth` | Auth stack |
| `/onboarding` | Onboarding stack |
| `/` | Today dashboard |
| `/log/face` | FaceAtlas capture |
| `/log/sleep` | Sleep log |
| `/log/food` | Food log |
| `/log/stress` | Stress log |
| `/log/activity` | Activity log |
| `/face-atlas` | FaceAtlas main |
| `/triggers` | TriggerGraph |
| `/forecast` | Forecast |
| `/barrier` | BarrierGuard |
| `/products` | FormulaLens |
| `/treatments` | Treatment Plan Center |
| `/research` | Deprecated; redirect to CutisAI evidence/citations or Settings > Privacy. No standalone ResearchVault or DermVault screen. |
| `/ai` | CutisAI |
| `/intelligence` | Intelligence Core |
| `/skin-twin` | Skin Twin Lab |
| `/sleep` | SleepDerm |
| `/diet` | DermDiet |
| `/activity` | SweatFlow |
| `/cycle` | CycleSync |
| `/contact` | ContactGuard |
| `/climate` | ClimateSkin Radar |
| `/reports` | Reports |
| `/profile` | Profile/settings |

---

## 13. UI/UX Requirements

### 13.1 Design Direction

The app must look premium and clinically trustworthy.

#### Visual principles

- Clean whitespace.
- Soft medical-grade surfaces.
- Calm neutral palette with gentle skin-health accents.
- High contrast text.
- Large touch targets.
- Rounded cards with clear hierarchy.
- Progressive disclosure.
- Summary first, detail on demand.
- No cluttered dashboards.
- No scary or shame-based language.

### 13.2 Futuristic AI/ML Activity Interface

The app should include a modern, futuristic, Jarvis-inspired intelligence interface while remaining medically calm and trustworthy. The goal is to make the AI/ML engine feel alive, observable, and premium without inventing status values.

#### Visual direction

- clinical command-center feel
- soft glass-like panels where appropriate
- subtle neural-grid or signal-line motifs
- animated readiness rings based on real backend state
- model activity pulse tied to actual jobs, queues, and intelligence events
- confidence, learning, validation, and performance cards
- elegant microinteractions instead of noisy effects
- accessible contrast and reduced-motion support

#### Required observable AI/ML status surfaces

- current engine activity: idle, ingesting, validating, analyzing, learning-queued, calibrating, failed, recovered
- FaceAtlas analysis status
- forecasting readiness
- CutisAI retrieval/generation status
- CutisAI Evidence Layer retrieval activity
- FormulaLens product analysis status
- anonymous learning contribution status
- model confidence/readiness indicators
- model version and validation state
- recent intelligence events
- queued background jobs where relevant
- performance snapshot such as recent success rate, validation pass rate, or low-confidence count, only if derived from real records

#### Rules

- No decorative status indicator may exist without a backend source.
- If there is no data, render EmptyState or InsufficientDataState.
- If performance metrics are unavailable, say unavailable instead of fabricating.
- Activity animations must pause or degrade gracefully when no live work is happening.
- The interface must help users understand why daily data improves personalization.

### 13.3 Interaction Principles

- All primary actions reachable with one thumb.
- Short forms with step-by-step entry.
- Save progress automatically where safe.
- Show sync status clearly.
- Avoid infinite spinners.
- Use skeleton loading only when real loading is happening.
- Every empty state must have a CTA.
- Every error must explain recovery.

### 13.4 Shared State Components

#### EmptyState

Use when an entity query returns zero records.

Props:

```ts
{
  icon: IconComponent;
  title: string;
  description: string;
  ctaLabel: string;
  ctaRoute: string;
}
```

#### InsufficientDataState

Use when data volume is below the minimum for meaningful analysis.

Props:

```ts
{
  moduleName: string;
  requiredDataPoints: number;
  currentDataPoints: number;
  ctaLabel: string;
  ctaRoute: string;
}
```

#### ErrorState

Use when a real failure occurs.

Props:

```ts
{
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  supportCode?: string;
}
```

### 13.5 Accessibility

- Minimum touch target: 44 x 44 points.
- Text must support dynamic font scaling.
- Color must not be the only indicator.
- Screen reader labels required for key controls.
- Forms must expose validation errors accessibly.
- Motion must respect reduced-motion settings.
- Images must include descriptive context where possible.

---

## 14. Database Requirements

### 14.1 Global Entity Fields

Every user-owned entity must include:

- `id`
- `user_id`
- `created_at`
- `updated_at`
- `schema_version`
- `app_version`
- `source`
- `consent_state`
- `validation_status`
- `deleted_at` where soft deletion applies

### 14.2 Core Tables

#### users

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| auth_provider_id | text | Supabase/Clerk/custom auth reference |
| email | text | Unique, normalized |
| display_name | text | Optional |
| role | text | user/admin/reviewer |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |
| deleted_at | timestamp | Soft deletion |
| deletion_requested_at | timestamp | Account deletion workflow |
| schema_version | text | Required |
| app_version | text | Required |

#### user_profiles

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| skin_type | text | Optional |
| acne_history | jsonb | Structured history |
| sensitivity_level | text | Optional |
| barrier_profile | jsonb | Barrier symptoms |
| routine_summary | jsonb | Current routine |
| known_triggers | jsonb | User-reported triggers |
| cycle_tracking_enabled | boolean | Optional |
| weather_location_pref | jsonb | Coarse location/weather preference |
| cohort_learning_enabled | boolean | Consent-linked |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### onboarding_profiles

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| answers | jsonb | Versioned onboarding responses |
| completed | boolean | Gate flag |
| completed_at | timestamp | Completion time |
| current_step | text | Resume support |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### daily_logs

Unified daily log table or typed tables may be used. If unified, use:

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| log_type | text | sleep/food/stress/activity/etc. |
| log_date | date | User-local date |
| payload | jsonb | Type-specific validated data |
| source | text | user/import/wearable/weather/ai_prompt |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |
| schema_version | text | Required |
| app_version | text | Required |
| validation_status | text | valid/partial/invalid |

Unique index:

```sql
unique(user_id, log_type, log_date) where deleted_at is null
```


This enforces same-day merge behavior.

#### longitudinal_exposure_scores

Derived daily scoring table for N-of-1 analysis. Raw logs remain the source of truth; this table stores versioned derived variables for efficient analysis.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| score_date | date | User-local date |
| sleep_risk_score | integer | 0–2 or versioned scale |
| diet_risk_score | integer | 0–2 or versioned scale |
| stress_risk_score | integer | 0–2 or versioned scale |
| routine_deviation_score | integer | 0–2 or versioned scale |
| product_change_score | integer | 0–2 or versioned scale |
| weather_risk_score | integer | Nullable if no weather context |
| combined_lifestyle_burden | numeric | Derived composite with method version |
| raw_record_refs | jsonb | Linked logs/scans/weather/treatment events |
| scoring_rule_version | text | Required |
| validation_status | text | valid/partial/insufficient |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

Unique index:

```sql
unique(user_id, score_date) where deleted_at is null
```

#### acne_state_episodes

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| episode_type | text | stillness/breakout/suspected_purging/irritant_reaction/insufficient_data |
| start_date | date | User-local date |
| end_date | date | Nullable while active |
| peak_acne_index | integer | Nullable |
| peak_lesion_count | integer | Nullable |
| pre_episode_window | jsonb | 3–7 day exposure summaries |
| trigger_hypotheses | jsonb | Ranked hypotheses with confidence |
| product_change_context | jsonb | Active/routine/treatment changes |
| weather_context_summary | jsonb | Optional climate context |
| classification_rationale | text | User-facing explanation |
| confidence | numeric | Required |
| validation_status | text | valid/partial/insufficient |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### lesion_lifecycles

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| face_scan_id | uuid | Optional linked scan |
| first_observed_date | date | Appearance date |
| peak_date | date | Optional |
| resolved_date | date | Optional |
| zone | text | Facial/body zone |
| lesion_type | text | Taxonomy value or unsure |
| initial_confidence | numeric | User/model certainty |
| longevity_days | integer | Derived when resolved |
| residual_mark_status | text | none/PIH/PIE/scar/unknown |
| source_refs | jsonb | Scans/logs/annotations |
| validation_status | text | active/resolved/uncertain |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### longitudinal_analysis_runs

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| analysis_type | text | descriptive/correlation/lagged/regression/episode/purging/trigger_hypothesis/report |
| date_range | jsonb | Included dates |
| input_refs | jsonb | Logs/scans/scores used |
| methods_used | jsonb | Pearson/Spearman/regression/etc. |
| assumptions | jsonb | Statistical assumptions and limitations |
| results_payload | jsonb | Structured result |
| confidence | numeric | Method-specific confidence |
| validation_status | text | valid/partial/insufficient/failed |
| model_version | text | Analysis engine version |
| created_at | timestamp | Required |

#### face_scans

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| scan_date | date | User-local date |
| capture_status | text | complete/partial/failed |
| image_refs | jsonb | Private object keys by angle |
| quality_result | jsonb | Quality checks |
| analysis_result | jsonb | Validated analysis |
| user_annotation_summary | jsonb | Optional guided lesion annotation summary |
| model_user_agreement | jsonb | Agreement/disagreement metrics |
| learning_eligibility | text | none/personal/network/media_allowed |
| confidence | numeric | Nullable until analysis |
| model_version | text | Required after analysis |
| validation_status | text | Required |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### lesion_annotations

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| face_scan_id | uuid | Linked FaceScan |
| total_visible_lesions | integer | User-entered, nullable |
| total_suspected_growing_lesions | integer | User-entered, nullable |
| per_type_counts | jsonb | Counts by lesion taxonomy |
| per_zone_counts | jsonb | Counts by facial zone |
| user_confidence | numeric | User certainty estimate |
| annotation_notes | text | Optional, non-diagnostic |
| lesion_taxonomy_version | text | Required |
| reference_asset_version | text | Required |
| consent_use_status | text | personal_only/network_allowed/media_allowed/revoked |
| validation_status | text | valid/partial/invalid |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

Unique index:

```sql
unique(user_id, face_scan_id) where deleted_at is null
```

#### lesion_annotation_items

Use only if the product supports per-photo, per-zone, or marker-level annotation.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| annotation_id | uuid | Linked lesion annotation |
| user_id | uuid | Owner |
| image_angle | text | front/left/right/forehead/chin |
| zone | text | forehead/left_cheek/right_cheek/chin/jaw/etc. |
| lesion_type | text | Taxonomy value or unsure |
| count | integer | Required |
| user_confidence | numeric | Optional |
| marker_payload | jsonb | Optional coordinates if marker UI exists |
| created_at | timestamp | Required |

#### product_scans

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| product_name | text | Nullable until identified |
| brand | text | Optional |
| input_type | text | photo/label/manual/barcode |
| image_ref | text | Private object key if image |
| raw_ingredient_text | text | From OCR/manual |
| parsed_ingredients | jsonb | Normalized ingredients |
| analysis_result | jsonb | Risk and compatibility |
| evidence_refs | jsonb | Evidence ids |
| confidence | numeric | Required after analysis |
| validation_status | text | Required |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### treatment_catalog

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| treatment_name | text | Generic/normalized name |
| brand_names | jsonb | Known brands and aliases |
| treatment_class | text | retinoid/BPO/antibiotic/isotretinoin/etc. |
| route | text | topical/oral/procedure/other |
| prescription_status | text | OTC/prescription/varies_by_region |
| evidence_refs | jsonb | Linked evidence records |
| safety_rules | jsonb | Contraindications, cautions, escalation constraints |
| default_tolerance_templates | jsonb | Evidence-based starting schedules and review points |
| version | text | Catalog version |
| updated_at | timestamp | Required |

#### treatment_plans

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| treatment_catalog_id | uuid | Nullable if custom/manual |
| plan_name | text | User-facing name |
| treatment_payload | jsonb | Name, strength, route, vehicle, active ingredients |
| provider_status | text | prescribed/derma_recommended/OTC/self_selected |
| provider_instructions | text | Exact entered instructions if available |
| baseline_tolerance | jsonb | Barrier, sensitivity, history, safety context |
| plan_status | text | draft/active/paused/completed/archived/deleted |
| start_date | date | User-local date |
| review_date | date | Initial review or provider checkpoint |
| end_rule | jsonb | Date, completion criteria, or open-ended maintenance |
| schedule_map | jsonb | Calendar/ramp/rest/review days |
| escalation_rules | jsonb | Conditions for increasing frequency |
| deescalation_rules | jsonb | Conditions for reducing/holding |
| safety_flags | jsonb | Pregnancy, irritation, interaction, photosensitivity, etc. |
| evidence_refs | jsonb | Evidence records used |
| confidence | numeric | Plan confidence |
| validation_status | text | valid/partial/unsafe/needs_provider/insufficient_data |
| model_version | text | Required after AI-generated plan |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |
| completed_at | timestamp | Optional |
| archived_at | timestamp | Optional |

#### treatment_plan_events

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| treatment_plan_id | uuid | Linked plan |
| event_date | date | Scheduled date |
| event_type | text | use/rest/review/escalate/barrier_recovery/provider_check |
| due_time | timestamp | Optional reminder target |
| task_id | uuid | Linked task if generated |
| status | text | pending/completed/skipped/missed/cancelled |
| instruction_payload | jsonb | Day-specific instructions |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

Unique index:

```sql
unique(user_id, treatment_plan_id, event_date, event_type) where deleted_at is null
```

#### treatment_checkins

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| treatment_plan_id | uuid | Linked plan |
| treatment_plan_event_id | uuid | Linked scheduled event |
| checkin_date | date | User-local date |
| adherence_status | text | used/skipped/partial/delayed/stopped |
| usage_time | timestamp | Optional |
| amount_confirmation | text | Pea-size/thin-layer/as-prescribed/etc., no unsafe dose generation |
| zones_used | jsonb | Affected zones |
| symptom_payload | jsonb | Dryness, peeling, redness, burning, etc. |
| acne_response_payload | jsonb | New lesions, purge concern, breakout concern |
| side_effect_flags | jsonb | Treatment-class-specific flags |
| conflict_payload | jsonb | Other actives/sun exposure/weather context |
| user_notes | text | Optional |
| ai_update_result | jsonb | Plan adjustment recommendation and rationale |
| validation_status | text | valid/partial/red_flag/needs_provider |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### treatment_plan_adjustments

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| treatment_plan_id | uuid | Linked plan |
| source_checkin_id | uuid | Optional triggering check-in |
| adjustment_type | text | continue/increase/hold/decrease/short_contact/barrier_recovery/provider_review |
| previous_schedule | jsonb | Snapshot before change |
| proposed_schedule | jsonb | Proposed/accepted change |
| safety_rationale | text | User-facing explanation |
| evidence_refs | jsonb | Evidence used |
| requires_provider_confirmation | boolean | Required for prescription-sensitive changes |
| accepted_by_user | boolean | Optional |
| created_at | timestamp | Required |

#### weather_context_snapshots

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| context_date | date | User-local date |
| source | text | backend_weather_provider/native_supported/manual |
| location_mode | text | precise/coarse/manual/denied |
| coarse_location_ref | jsonb | Geohash or city-level reference, privacy minimized |
| weather_payload | jsonb | Temperature, humidity, UV, AQI, precipitation, wind, etc. |
| forecast_payload | jsonb | Forecasted variables if used |
| confidence | numeric | Source quality |
| consent_state | text | Location/weather permission state |
| app_permission_choice | text | yes_while_using/no/manual/unset |
| platform_permission_status | text | granted_while_using/denied/restricted/unavailable |
| permission_updated_at | timestamp | Last explicit user choice |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### streak_states

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| current_streak_days | integer | Full streak days |
| longest_streak_days | integer | Historical max |
| streak_pet_stage | text | Seed Signal/Calibration Sprout/etc. |
| monthly_restores_used | integer | 0–3 |
| restore_month | text | YYYY-MM in user timezone |
| last_full_streak_date | date | User-local date |
| missing_data_dates | jsonb | Missing days affecting confidence |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### streak_restores

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| restored_date | date | Missed date restored motivationally |
| restore_month | text | YYYY-MM |
| restore_number | integer | 1–3 for month |
| backfill_record_ref | jsonb | Optional if real data was backfilled |
| reason | text | User-selected reason or recovery flow |
| created_at | timestamp | Required |

#### badge_awards

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| badge_key | text | FaceAtlas Calibrated, Treatment Plan Steward, etc. |
| badge_level | text | Optional tier |
| evidence_payload | jsonb | Records and metrics that unlocked badge |
| engine_benefit | text | Which AI/ML engine improved |
| awarded_at | timestamp | Required |

#### forecasts

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| forecast_date | date | Required |
| horizon_days | integer | Required |
| input_refs | jsonb | Logs/scans/products/weather |
| risk_score | numeric | Validated output |
| risk_level | text | Derived, not hardcoded |
| drivers | jsonb | Contributing factors |
| scenarios | jsonb | No-change/improved paths |
| confidence | numeric | Required |
| model_version | text | Required |
| validation_status | text | Required |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### assistant_conversations

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| title | text | Optional |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### assistant_messages

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| conversation_id | uuid | Conversation |
| user_id | uuid | Owner |
| role | text | user/assistant/system |
| content | text | Message body |
| citations | jsonb | Evidence links |
| confidence | numeric | Assistant confidence |
| model_version | text | For assistant messages |
| validation_status | text | Required |
| created_at | timestamp | Required |

#### evidence_records

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| source_type | text | PubMed/web/manual/etc. |
| source_id | text | DOI/PMID/etc. |
| title | text | Required |
| authors | jsonb | Optional |
| journal | text | Optional |
| year | integer | Optional |
| abstract_or_summary | text | Allowed content only |
| source_url | text | Trusted link |
| trust_label | text | Evidence quality label |
| topic_tags | jsonb | Search tags |
| embedding | vector | pgvector |
| retrieved_at | timestamp | Required |

#### evidence_bookmarks

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| evidence_id | uuid | Evidence record |
| note | text | Optional |
| created_at | timestamp | Required |

#### intelligence_events

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner, nullable for system aggregate |
| event_type | text | inference/retrieval/validation/etc. |
| engine | text | face/forecast/assistant/product/etc. |
| status | text | started/succeeded/failed/recovered |
| input_refs | jsonb | Source records |
| output_ref | jsonb | Result record |
| model_version | text | Optional |
| confidence | numeric | Optional |
| validation_status | text | Optional |
| consent_status | text | active/revoked/not_applicable |
| error_code | text | Optional |
| metadata | jsonb | Non-sensitive telemetry |
| created_at | timestamp | Required |

#### audit_logs

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| entity_type | text | Required |
| entity_id | uuid | Required |
| operation | text | create/update/delete/import |
| changed_fields | jsonb | Field names only, not values |
| source | text | user/migration/ai_engine/system |
| app_version | text | Required |
| created_at | timestamp | Required |

Audit logs are append-only and must not store sensitive field values.

#### consent_records

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| consent_type | text | research/network/media/etc. |
| status | text | granted/revoked/expired |
| version | text | Consent document version |
| granted_at | timestamp | Nullable |
| revoked_at | timestamp | Nullable |
| created_at | timestamp | Required |
| updated_at | timestamp | Required |

#### network_learning_contributions

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Nullable only after anonymization policy allows |
| consent_record_id | uuid | Consent source |
| source_entity_type | text | FaceScan/LesionAnnotation/DailyLog/etc. |
| source_entity_id | uuid | Original owner record, protected |
| contribution_type | text | annotation/calibration/outcome/forecast_feedback/etc. |
| derived_feature_ref | jsonb | Privacy-preserving feature reference |
| anonymization_method | text | Method used before learning |
| eligibility_status | text | eligible/excluded/revoked/invalid |
| included_in_training_run_id | uuid | Optional |
| created_at | timestamp | Required |

#### model_versions

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| engine | text | face/forecast/product/assistant/etc. |
| model_version | text | Unique per engine |
| status | text | draft/validating/released/rolled_back/deprecated |
| training_data_summary | jsonb | Non-sensitive summary |
| validation_metrics | jsonb | Accuracy/precision/recall/calibration/etc. |
| release_notes | text | Optional |
| created_at | timestamp | Required |
| released_at | timestamp | Optional |

#### model_training_runs

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| engine | text | Required |
| target_model_version | text | Required |
| input_contribution_refs | jsonb | Contribution ids or aggregate references |
| training_status | text | queued/running/validated/failed/released |
| validation_metrics | jsonb | Required before release |
| approved_for_release | boolean | Required |
| started_at | timestamp | Optional |
| completed_at | timestamp | Optional |
| created_at | timestamp | Required |

#### model_performance_snapshots

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| engine | text | Required |
| model_version | text | Required |
| metric_name | text | Required |
| metric_value | numeric | Required |
| metric_context | jsonb | Cohort-safe metadata |
| computed_at | timestamp | Required |

#### notifications

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| type | text | Reminder/alert category |
| title | text | Required |
| body | text | Required |
| source_event_id | uuid | Optional intelligence/task event |
| scheduled_for | timestamp | Optional |
| delivered_at | timestamp | Optional |
| acknowledged_at | timestamp | Optional |
| status | text | pending/sent/failed/acknowledged |
| created_at | timestamp | Required |

#### task_completions

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| task_type | text | Daily task category |
| task_date | date | User-local date |
| points | integer | Importance-based |
| source_record_ref | jsonb | Log/scan/etc. |
| completed_at | timestamp | Required |

#### export_reports

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| report_type | text | dermatologist/progress/etc. |
| date_range | jsonb | Included period |
| file_ref | text | Private object key |
| status | text | queued/ready/failed |
| created_at | timestamp | Required |
| completed_at | timestamp | Optional |

### 14.2A Additional Database Requirements: Meal Baseline, Food Entries, SleepDerm Features, and Skin Twin Visualization

The database must support the new onboarding, food, sleep, and Skin Twin requirements. These tables may be implemented as dedicated tables or as typed records under existing daily-log/entity patterns, but the final schema must preserve ownership, versioning, auditability, and reproducibility.

#### `meal_baselines`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `usual_meal_count` | integer/text | `1`, `2`, `3`, `varies`, `not_sure`, `prefer_not` |
| `meal_label_preference` | text | `breakfast_lunch_dinner` or `flexible` |
| `usual_snack_frequency` | text | `rarely`, `sometimes`, `often`, `varies`, `not_sure` |
| `common_snack_tags` | jsonb | Structured tags |
| `caffeine_timing_baseline` | jsonb | Optional |
| `late_eating_tendency` | text | Optional |
| `source` | text | onboarding/profile_update |
| `effective_from` | timestamp | Version start |
| `effective_to` | timestamp | Nullable |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `food_log_entries`

If `daily_logs` remains unified, this may be embedded in the payload. If typed tables are used, create this table and link it to the daily parent log.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `daily_log_id` | uuid | Parent food daily log |
| `user_id` | uuid | Owner |
| `entry_type` | text | `meal`, `snack`, `drink` |
| `meal_slot` | text | `meal_1`, `meal_2`, `meal_3`, `breakfast`, `lunch`, `dinner`, `flexible` |
| `consumed_at` | timestamp | User-local time |
| `description` | text | User entry |
| `tags` | jsonb | Dairy, high-glycemic, processed, caffeine, etc. |
| `portion_estimate` | text/jsonb | Optional |
| `confidence` | text | `sure`, `somewhat`, `unsure` |
| `media_id` | uuid | Optional photo |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `sleep_derm_daily_features`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `feature_date` | date | User-local date |
| `source_sleep_log_id` | uuid | Source sleep record |
| `sleep_duration_hours` | numeric | Derived |
| `sleep_midpoint_time` | time | Derived |
| `sleep_debt_daily` | numeric | Derived |
| `sleep_debt_3d` | numeric | Derived |
| `sleep_debt_7d` | numeric | Derived |
| `sleep_debt_14d` | numeric | Derived |
| `sleep_debt_30d` | numeric | Derived |
| `onset_sd_7d` | numeric | Derived |
| `wake_sd_7d` | numeric | Derived |
| `midpoint_sd_7d` | numeric | Derived |
| `circadian_alignment_score` | numeric | Versioned score |
| `nocturnal_recovery_opportunity_score` | numeric | Versioned score |
| `sleep_risk_score` | integer | 0–2 or versioned |
| `data_confidence` | text | `insufficient`, `low`, `moderate`, `high` |
| `calculation_version` | text | Required |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `skin_twin_simulations`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `scenario_name` | text | User or system label |
| `window_days` | integer/text | `3`, `7`, `14`, `30`, `treatment_cycle`, `custom` |
| `active_variables` | jsonb | Selected variables |
| `baseline_snapshot` | jsonb | Frozen source data |
| `simulation_output` | jsonb | Computed result |
| `confidence` | text | `insufficient`, `low`, `moderate`, `high` |
| `uncertainty` | jsonb | Intervals/ranges |
| `confounders` | jsonb | Detected confounders |
| `data_gaps` | jsonb | Missing data |
| `model_version` | text | Required |
| `validation_status` | text | `pending`, `valid`, `limited`, `failed` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `skin_visualization_snapshots`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `source_type` | text | `faceatlas_current`, `skin_twin_projection`, `zone_heatmap` |
| `source_id` | uuid | Face scan or simulation |
| `visualization_payload` | jsonb | Lesion markers, zones, overlays |
| `raw_image_used` | boolean | Whether raw image is displayed |
| `derived_only` | boolean | Privacy-preserving mode |
| `confidence` | text | `insufficient`, `low`, `moderate`, `high` |
| `model_version` | text | Required |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |



### 14.3 RLS and Ownership Rules

For every user-owned table:

- Users may select only rows where `user_id = auth.uid()` or backend-equivalent owner id.
- Users may insert only rows with their own `user_id`.
- Users may update only their own rows.
- Users may not hard-delete rows unless deletion policy allows it.
- Admin access must require backend role checks.
- Backend must also check ownership to prevent IDOR.

---

## 15. API Requirements

### 15.1 API Principles

- All protected endpoints require auth.
- All user-owned resources require ownership checks.
- All inputs require schema validation.
- All database access uses ORM or parameterized queries.
- All errors return structured error objects.
- All list endpoints require pagination.
- Heavy tasks return job ids.
- AI/ML outputs are persisted before display.

### 15.2 Endpoint Overview

#### Auth

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/signup` | Create account if custom backend auth is used |
| POST | `/api/v1/auth/login` | Login if custom backend auth is used |
| POST | `/api/v1/auth/logout` | End session |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/auth/password-reset/request` | Request reset |
| POST | `/api/v1/auth/password-reset/confirm` | Confirm reset |

If Supabase/Clerk is used, mobile app authenticates with provider, then backend verifies token for protected routes.

#### Profile and Onboarding

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/profile` | Get current profile |
| PATCH | `/api/v1/profile` | Update profile |
| GET | `/api/v1/onboarding` | Get onboarding state |
| PATCH | `/api/v1/onboarding` | Save onboarding step |
| POST | `/api/v1/onboarding/complete` | Mark complete |

#### Logs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/logs/today` | Get today’s logs |
| GET | `/api/v1/logs` | Paginated log history |
| POST | `/api/v1/logs/{type}` | Create or update same-day log |
| PATCH | `/api/v1/logs/{id}` | Update owned log |
| DELETE | `/api/v1/logs/{id}` | Soft delete owned log |

#### Scans

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/scans` | Create scan session |
| POST | `/api/v1/scans/{id}/upload-url` | Get signed upload URL |
| POST | `/api/v1/scans/{id}/complete` | Mark images uploaded |
| POST | `/api/v1/scans/{id}/analyze` | Queue or run analysis |
| GET | `/api/v1/scans/{id}/annotations` | Get scan annotation |
| POST | `/api/v1/scans/{id}/annotations` | Create or update guided lesion annotation |
| PATCH | `/api/v1/scans/{id}/annotations` | Update owned annotation |
| GET | `/api/v1/scans` | Paginated scan history |
| GET | `/api/v1/scans/{id}` | Owned scan detail |

#### Products

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/products` | Create manual product record |
| POST | `/api/v1/products/upload-url` | Signed label image upload |
| POST | `/api/v1/products/analyze` | Analyze product/ingredients |
| GET | `/api/v1/products` | Product history |
| GET | `/api/v1/products/{id}` | Product detail |
| PATCH | `/api/v1/products/{id}` | Update owned product |

#### Forecasts

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health-index/latest` | Latest CHI |
| GET | `/api/v1/health-index/history` | Paginated CHI history |
| POST | `/api/v1/forecast` | Generate forecast |
| GET | `/api/v1/forecast/latest` | Latest forecast |
| GET | `/api/v1/forecast/history` | Forecast history |
| POST | `/api/v1/what-if` | Generate scenario |

#### Treatment Plans

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/treatments/catalog/search` | Search normalized treatment catalog |
| POST | `/api/v1/treatments/identify` | Identify treatment from name, label OCR, barcode, or manual input |
| POST | `/api/v1/treatments/plans` | Create draft or active treatment plan |
| GET | `/api/v1/treatments/plans` | Paginated treatment plan list |
| GET | `/api/v1/treatments/plans/{id}` | Owned plan detail |
| PATCH | `/api/v1/treatments/plans/{id}` | Edit/pause/resume/complete/archive plan |
| DELETE | `/api/v1/treatments/plans/{id}` | Soft delete owned plan |
| GET | `/api/v1/treatments/plans/{id}/calendar` | Calendar map for plan |
| POST | `/api/v1/treatments/events/{event_id}/check-in` | Complete treatment check-in |
| POST | `/api/v1/treatments/plans/{id}/recalculate` | Recalculate plan from latest data and check-ins |
| GET | `/api/v1/treatments/plans/{id}/adjustments` | List plan adjustments and rationale |

#### Weather and Climate

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/weather/location` | Save location preference or manual location |
| GET | `/api/v1/weather/current` | Retrieve current server-side weather context |
| GET | `/api/v1/weather/history` | Paginated weather snapshots |
| POST | `/api/v1/weather/sync` | Refresh weather context for logged-in user |
| GET | `/api/v1/climate/insights` | ClimateSkin Radar insights |
| PATCH | `/api/v1/weather/permission-choice` | Save explicit yes/no/manual weather-location choice |
| DELETE | `/api/v1/weather/location` | Delete stored weather/location preference |

#### Longitudinal Pattern Intelligence

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/patterns/summary` | Personal longitudinal acne dynamics summary |
| POST | `/api/v1/patterns/analyze` | Queue analysis for selected date range |
| GET | `/api/v1/patterns/episodes` | Stillness/breakout/purging/irritation episode history |
| PATCH | `/api/v1/patterns/episodes/{id}` | User correction or confirmation of episode label |
| GET | `/api/v1/patterns/exposure-scores` | Derived daily exposure-score history |
| POST | `/api/v1/patterns/lesions/{id}/resolve` | Mark lesion lifecycle as resolved |
| GET | `/api/v1/patterns/report-preview` | Preview provider-ready longitudinal summary |

#### Gamification

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/gamification/status` | Streak, streak pet, rank, badges, restores |
| POST | `/api/v1/gamification/streak/restore` | Use one monthly streak restore |
| GET | `/api/v1/gamification/badges` | Badge history and unlock criteria |
| GET | `/api/v1/gamification/rank` | AI/ML readiness rank and next requirements |

#### Assistant

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/assistant/conversations` | List conversations |
| POST | `/api/v1/assistant/conversations` | Create conversation |
| GET | `/api/v1/assistant/conversations/{id}` | Read conversation |
| POST | `/api/v1/assistant/messages` | Send message and get AI response |

#### Evidence

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/evidence/search` | Search evidence |
| GET | `/api/v1/evidence/{id}` | Evidence detail |
| POST | `/api/v1/evidence/citations` | Store permitted citation metadata for a CutisAI answer or engine output |
| GET | `/api/v1/evidence/citations` | List permitted citation metadata for the user |

#### Intelligence and Network

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/intelligence/status` | Real AI/ML status |
| GET | `/api/v1/intelligence/events` | Paginated events |
| POST | `/api/v1/intelligence/feedback` | User feedback/calibration |
| GET | `/api/v1/intelligence/model-performance` | Real model performance snapshots |
| GET | `/api/v1/intelligence/model-versions` | Released and validating model versions |
| GET | `/api/v1/network/status` | Research participation |
| POST | `/api/v1/network/consent` | Grant consent |
| POST | `/api/v1/network/revoke` | Revoke consent |
| GET | `/api/v1/network/contributions` | User-visible contribution history |

#### Notifications and Reports

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/notifications/preferences` | Read preferences |
| PATCH | `/api/v1/notifications/preferences` | Update preferences |
| GET | `/api/v1/notifications` | Notification history |
| POST | `/api/v1/reports` | Queue report export |
| GET | `/api/v1/reports` | Report history |
| GET | `/api/v1/reports/{id}` | Report status/detail |

### 15.2A Additional API Requirements: Onboarding, Food, SleepDerm, and Skin Twin

#### Onboarding and Profile

- `PATCH /api/v1/onboarding/meal-baseline`
- `PATCH /api/v1/onboarding/acne-onset`
- `PATCH /api/v1/profile/meal-baseline`
- `PATCH /api/v1/profile/sleep-baseline`

#### Food Logging

- `GET /api/v1/logs/food/today`
- `POST /api/v1/logs/food/meal`
- `POST /api/v1/logs/food/snack`
- `PATCH /api/v1/logs/food/{log_id}/entry/{entry_id}`
- `PATCH /api/v1/logs/food/{log_id}/mark-complete`
- `PATCH /api/v1/logs/food/{log_id}/backfill`
- `DELETE /api/v1/logs/food/{log_id}/entry/{entry_id}`

#### SleepDerm

- `POST /api/v1/sleepderm/recalculate/{date}`
- `GET /api/v1/sleepderm/daily/{date}`
- `GET /api/v1/sleepderm/debt`
- `GET /api/v1/sleepderm/circadian`
- `GET /api/v1/sleepderm/nocturnal-recovery`
- `GET /api/v1/sleepderm/inflammation-correlation`

#### Skin Twin

- `POST /api/v1/skin-twin/readiness-check`
- `POST /api/v1/skin-twin/simulations`
- `GET /api/v1/skin-twin/simulations`
- `GET /api/v1/skin-twin/simulations/{id}`
- `POST /api/v1/skin-twin/simulations/{id}/visualization`
- `GET /api/v1/skin-twin/current-skin-model`
- `GET /api/v1/skin-twin/zone-heatmap`
- `GET /api/v1/skin-twin/projection/{simulation_id}`

#### API rules

- All endpoints must require authentication.
- All endpoints must enforce ownership checks.
- All payloads must use runtime validation.
- All AI/ML outputs must persist.
- All generated insights must emit `intelligence_events`.
- All health-data writes must emit `audit_logs`.
- No endpoint may return fake fallback values.



### 15.3 Pagination Rules

No list endpoint may return all records by default.

Default limits:

- daily logs: 20
- face scans: 10
- assistant messages: 30
- intelligence events: 50
- evidence citation records: 20
- forecasts: 10
- reports: 10
- treatment plans: 10
- treatment plan events: 30
- treatment check-ins: 30
- weather snapshots: 20
- badge awards: 20

Every list endpoint must support `limit`, `offset` or cursor-based pagination.

---

## 16. AI/ML Engine Execution Contract

### 16.1 Mandatory Pre-Implementation Gate

Before implementing any engine, define:

1. Inputs.
2. Outputs.
3. Validation gates.
4. Persistence targets.
5. Telemetry events.
6. Downstream consumers.
7. Failure modes.
8. Acceptance criteria.

No engine code may begin before these are documented.

### 16.2 Universal Engine Pipeline

```text
acquisition
→ preprocessing
→ validation
→ inference or reasoning
→ post-processing
→ confidence generation
→ acceptance validation
→ persistence
→ telemetry emission
→ UI consumption
→ feedback/calibration
```

### 16.3 Face Analysis Engine

Must use a real image analysis pipeline. LLM vision may be used only through backend orchestration and must be validated. For production maturity, combine deterministic quality checks, face detection, zone extraction, model-assisted classification, mandatory user-guided lesion annotation, oiliness estimation, and model-user reconciliation.

Required engine behavior:

- ingest five FaceAtlas images and quality metadata
- ingest mandatory user lesion annotations linked to the scan before analysis starts
- validate lesion annotation payloads against the lesion taxonomy
- run face detection and facial-zone segmentation
- classify lesion types and estimate counts per zone
- compare model counts with user-entered counts
- calculate agreement, disagreement, and uncertainty metrics
- persist analysis and annotation reconciliation results
- emit intelligence events for scan analysis, validation, disagreement, learning eligibility, and downstream updates
- create consent-filtered learning contributions when allowed
- update FaceAtlas, CHI, TriggerGraph, forecasts, reports, CutisAI context, and evidence citations

The engine must never blindly treat user labels as ground truth. User labels are high-value weak labels that require validation, aggregation, and calibration before influencing model training.

### 16.4 Forecast Engine

Must compute features from stored history. LLM may assist explanation, but the risk and scenarios must come from structured feature logic and model outputs.

### 16.5 Assistant Engine

Must retrieve user context, retrieve evidence, assemble bounded prompts, generate answer, self-check, validate safety, persist messages, and emit intelligence events.

### 16.6 Product Engine

Must parse real ingredients, normalize names, retrieve evidence, compare against user history, and persist structured compatibility outputs.

### 16.7 Evidence Engine

Must retrieve and index trusted evidence metadata, support vector search, and provide citations to other engines.

### 16.8 Validation Engine

No intelligence output may be displayed without validation checks:

- sufficient input data
- input quality
- confidence threshold
- evidence alignment
- model agreement where applicable
- outlier detection
- history consistency
- safety constraints

If validation fails, the app must request more data, lower confidence, retrieve more evidence, or refuse to overstate.

### 16.9 Learning, Annotation, and Model Improvement Engine

The learning engine converts validated, consented, privacy-preserving user interactions into model-improvement signals. It is responsible for making AcneTrex improve over time without violating privacy, fabricating progress, or allowing uncontrolled self-modifying models.

Required pipeline:

```text
eligible user action
→ consent check
→ privacy filtering
→ feature extraction
→ validation
→ contribution record
→ training/evaluation queue
→ model performance snapshot
→ model registry update
→ controlled release or rollback
→ user-visible network status update
```

Required learning inputs:

- FaceAtlas lesion annotations
- model-user agreement metrics
- model-user disagreement metrics
- user feedback on AI outputs
- forecast outcome comparisons
- product compatibility outcomes
- validation failures
- task completion patterns
- de-identified daily log summaries
- cohort-safe environmental correlations

Required safeguards:

- no raw image use without explicit media-learning consent
- no raw log use without explicit consent
- no personally identifying values in aggregate learning datasets
- no production model self-update without validation and model registry release
- no fake “learning” indicators unless learning events, queues, or model metrics exist
- consent revocation blocks future contribution creation
- historical aggregate limitations must be disclosed before revocation

Acceptance criteria:

- Every eligible contribution creates a `network_learning_contributions` record or a clear exclusion reason.
- Every training or calibration cycle creates a `model_training_runs` record.
- Every released model has a `model_versions` record with validation metrics.
- The AI/ML status UI reflects real learning state and model performance records.

### 16.9A Treatment Planning Engine

The Treatment Planning Engine must generate, validate, monitor, and update Treatment Plan Center schedules using evidence, user history, safety constraints, and ongoing treatment check-ins. It must never act as an autonomous prescriber.

Required engine pipeline:

```text
treatment input
→ treatment identification and catalog matching
→ evidence retrieval and safety rule loading
→ user baseline and routine context retrieval
→ contraindication/caution validation
→ personalized schedule generation
→ calendar event creation
→ task and notification creation
→ daily check-in ingestion
→ tolerance and irritation scoring
→ plan adjustment recommendation
→ persistence, audit, telemetry, and report integration
```

Required outputs:

- structured treatment plan;
- calendar map;
- schedule confidence;
- safety flags;
- evidence citations;
- task and notification records;
- daily check-in prompts;
- plan adjustment recommendations;
- provider-review prompts when required;
- report-ready treatment timeline.

Validation gates:

- treatment identity confidence;
- prescription/provider status;
- pregnancy/planning/breastfeeding voluntary context where relevant;
- known allergies and prior reactions;
- active conflicts and duplicate actives;
- current barrier state;
- irritation threshold;
- photosensitivity/weather context;
- oral medication caution rules;
- evidence freshness and authority;
- user confirmation before plan activation.

Failure behavior:

- If treatment identity is uncertain, ask for clarification or label photo/manual ingredient confirmation.
- If safety concerns are high, block plan activation and recommend provider guidance.
- If data is insufficient, create a draft plan with missing-data requirements rather than a false complete plan.
- If daily check-ins show red flags, stop escalation and create a provider-review prompt.

### 16.9B Weather and Climate Context Engine

The Weather and Climate Context Engine must retrieve, normalize, persist, and apply weather data through server-side integrations. It must never use hardcoded weather or client-exposed weather API keys.

Required pipeline:

```text
permission/manual location
→ privacy minimization
→ backend weather provider call
→ weather snapshot validation
→ daily context persistence
→ feature extraction
→ forecast, trigger, treatment, and notification consumption
→ telemetry and drift monitoring
```

Weather features may include temperature, humidity, heat index, UV index, air quality, dew point, precipitation, wind, seasonality, abrupt weather change, and forecast uncertainty. The engine must distinguish observed weather from predicted weather and mark its confidence accordingly.

### 16.9C Gamification, Streak Pet, and Rank Engine

The Gamification Engine must compute streaks, restores, badges, ranks, streak pet state, and task point values from real records. It must not fabricate progress, medical improvement, or AI learning.

Required pipeline:

```text
task completion / missed day / model metric update
→ persistence validation
→ streak computation
→ restore eligibility check
→ pet-stage calculation
→ badge/rank recalculation
→ UI state persistence
→ telemetry
```

The engine must enforce the 3-restores-per-calendar-month rule, reset restore allowances monthly, preserve missing-data markings, and compute ranks from AI/ML readiness dimensions such as scan quality, log depth, treatment-plan adherence, forecast validation, and model confidence.

### 16.9D SleepDerm Circadian and Sleep Debt Engine

The SleepDerm Engine is responsible for transforming raw sleep logs into validated sleep-derived features.

#### Required pipeline

```text
collect sleep logs
→ validate source times
→ calculate duration
→ calculate target sleep need
→ calculate daily sleep deficit
→ update rolling sleep debt
→ calculate regularity variables
→ calculate circadian alignment
→ calculate nocturnal recovery opportunity
→ correlate with skin outcomes where sufficient data exists
→ persist derived features
→ emit intelligence event
→ update Dashboard, TriggerGraph, Forecasting, Skin Twin, CutisAI, Reports, and Task Board
```

#### Required outputs

- sleep duration;
- sleep debt;
- sleep regularity;
- circadian alignment;
- nocturnal recovery opportunity;
- skin inflammation correlation status;
- confidence;
- missingness;
- confounders;
- recommended next action.

#### Validation requirements

- source-time validation;
- midnight-crossing test;
- timezone test;
- DST/timezone change test;
- nap-credit cap test;
- missing-day test;
- manual override test;
- rolling-debt fixture test;
- confidence downgrade test;
- confounder disclosure test.

### 16.9E Skin Twin Simulation and Visualization Engine

The Skin Twin Engine is responsible for counterfactual simulation and visual projection.

#### Required pipeline

```text
collect user baseline
→ validate minimum data
→ freeze baseline snapshot
→ receive selected variables
→ generate scenario feature set
→ run simulation model
→ calculate uncertainty
→ detect confounders
→ persist simulation
→ generate visualization payload
→ update UI and reports
```

#### Required outputs

- baseline scenario;
- changed-variable scenario;
- forecast window;
- active variables;
- expected direction;
- estimated magnitude where supported;
- uncertainty;
- confidence;
- visual projection payload;
- safety notes;
- data gaps.

#### Validation requirements

- variable-schema validation;
- minimum-data gating;
- simulation determinism test;
- confidence calibration test;
- visual marker accuracy test;
- raw-photo consent test;
- derived-only visualization test;
- low-confidence abstraction test;
- report export test.



### 16.10 Advanced Analytical Methods and Decision Frameworks

The AcneTrex engines must leverage a wide range of analytical techniques to extract insight from multi‑modal data, support difficult decisions and generate transparent, trustworthy outputs.  This section outlines the key mathematical methods and decision‑support frameworks, explains how each works, and describes how they should be used within AcneTrex V3.  Where appropriate, the mathematical formulae are included and citations reference the supporting literature.

#### 16.10.1 Decision Tree Analysis

A decision tree is a flow‑chart–like structure in which each internal node represents a test on a feature, each branch represents an outcome of the test, and each leaf node represents a class or numerical value.  In supervised learning the tree recursively splits the data to maximize homogeneity at the leaves.  Two impurity measures are commonly used:

- **Entropy**: for a node containing classes with probabilities \(p_1, p_2, \dots, p_k\), the entropy is \(-\sum_{i=1}^{k} p_i \log_2(p_i)\).  Entropy is maximal for a uniform distribution and minimal for a pure node【345277950743144†L71-L75】.
- **Gini impurity**: defined as \(1 - \sum_{i=1}^{k} p_i^2\), it measures the probability of misclassification if a random sample is labeled according to the class distribution at the node【345277950743144†L55-L59】.  A lower Gini value indicates a purer node.

At each split, the algorithm computes **information gain**—the reduction in entropy (or Gini) after partitioning the data.  Formally, the information gain when splitting a dataset \(T\) by attribute \(a\) is \(IG(T,a) = H(T) - H(T\mid a)\), where \(H(T)\) is the entropy of the parent node and \(H(T\mid a)\) is the weighted sum of entropies of the child nodes【456741490155050†L173-L179】.  The tree selects the attribute that maximizes information gain【456741490155050†L263-L264】.

**Use in AcneTrex:**

* *Lesion classification and risk stratification*: The FaceAtlas and forecast engines may use decision trees or tree ensembles (e.g., Random Forest, Gradient Boosting) to classify lesion types or to predict flare risk based on features such as zone counts, user‑reported triggers, environmental variables, and product ingredients.  Entropy or Gini impurity should be used to choose splits, and the resulting tree should be pruned and validated using cross‑validation to avoid overfitting.
* *Treatment recommendation*: When multiple treatment options exist, a decision tree can model possible outcomes (improvement, irritation, no change) and the probability of each.  Expected values can then be computed at the leaves by multiplying outcome values by their probabilities and summing.  The tree should include decision nodes (choices the user can make) and chance nodes (uncertain outcomes).  The **decision tree diagram** creation process—start with the main decision, add chance and decision nodes, expand until end‑points, compute tree values, then choose the branch with the highest expected benefit—must be followed during design and implementation.

#### 16.10.2 Weighted Decision Matrix (Pugh Matrix)

When several options must be compared across multiple criteria, AcneTrex should use a decision matrix.  The steps are:

1. List the decision question and the possible options.
2. Identify evaluation criteria relevant to the user (e.g., efficacy, side effects, cost, adherence difficulty).
3. Assign each criterion a weight reflecting its relative importance.  Weights should sum to 1 or 100 %.
4. Rate each option on each criterion (e.g., on a scale of 0–5).
5. Compute the **weighted score** for each option by multiplying each rating by the criterion weight and summing across all criteria【218908971580252†L20-L32】.  The option with the highest total score is preferred【218908971580252†L106-L116】.

**Use in AcneTrex:**

- *Routine optimization and task planning*: When recommending lifestyle adjustments (e.g., diet changes, sleep improvements, stress reduction techniques), the engine should compute a weighted score using criteria such as predicted impact on acne, user preference, feasibility and safety.  Criteria weights can be derived via the Analytic Hierarchy Process (see below) or learned from user feedback.
- *Product selection*: FormulaLens should evaluate candidate products by scoring them against risk categories (comedogenicity, irritation potential, active conflicts, fragrance/allergen risk, barrier disruption, etc.).  The final recommendation should be the product with the highest weighted score, and the ranking must be transparent to the user.

#### 16.10.3 Analytic Hierarchy Process (AHP)

AHP is a structured method for calculating criterion weights through pairwise comparisons.  Decision makers compare criteria in pairs to express how much more important one criterion is relative to another.  The comparisons populate a square matrix \(A\), where \(A_{ij}\) represents the importance of criterion \(i\) relative to criterion \(j\).  Two common methods derive the weight vector \(w\):

1. **Approximate eigenvector method** – normalize each column of \(A\) so its entries sum to 1, then compute the average of each row; these averages approximate the criterion weights【305781753953700†L121-L134】.
2. **Geometric mean method** – compute the geometric mean of each row’s elements and normalize the resulting vector so its entries sum to 1【305781753953700†L163-L193】.

Consistency checks (Consistency Index and Ratio) must be used to ensure that the pairwise comparisons are not contradictory.  When the Consistency Ratio exceeds 0.1, the comparisons should be revisited.

**Use in AcneTrex:**

- *Personalization intake*: During onboarding, the system must infer the relative importance of different triggers (e.g., diet vs. sleep vs. stress) for each user.  AHP can derive these weights from either expert knowledge or aggregated population data.  For example, if user reports suggest that stress is twice as important as sleep in influencing flares, then the pairwise matrix will reflect that and the resulting weights will feed into risk scoring algorithms.
- *Criteria weighting for product analysis and task prioritization*: AHP can be used to set weights for the decision matrix described above, ensuring that factors such as comedogenicity, irritation, and ingredient conflicts reflect clinical guidance and user feedback.

#### 16.10.4 Monte Carlo Simulation

Monte Carlo simulation accounts for uncertainty by representing input variables as probability distributions and running thousands of simulations with random draws.  Each iteration computes the outcome from a mathematical model linking inputs to outputs (e.g., profit = revenue – expenses).  The distribution of outcomes reveals the full range of possible results and their probabilities【761385286006655†L323-L337】【761385286006655†L381-L429】.  For accurate results, thousands of iterations (typically 1 000–10 000) are required【761385286006655†L370-L378】.

**Use in AcneTrex:**

- *Forecast engine*: To estimate the probability distribution of future acne severity or flare risk over 3, 7, 14 or 30 days, the forecast engine must model uncertain inputs (e.g., future sleep hours, dietary compliance, stress levels, environmental conditions) as distributions based on historical variability.  Monte Carlo simulation can then generate many possible future trajectories, producing a probabilistic forecast rather than a single point estimate.
- *Scenario planning*: When evaluating “what if” situations such as removal of a product, improved sleep or reduction in dairy consumption, the Skin Twin and TriggerGraph components should run Monte Carlo simulations to quantify how the user’s skin may respond under different assumptions.

#### 16.10.5 Sensitivity Analysis

Sensitivity analysis explores how variations in input variables affect an output.  By systematically varying one input at a time (or using variance‑based methods), it identifies which factors have the most influence on the outcome and where additional precision would yield the greatest improvement【491370350271170†L215-L223】.

**Use in AcneTrex:**

- *TriggerGraph and forecasting*: After computing partial correlations and logistic regression models, run sensitivity analysis on top features (e.g., sleep hours, sugar intake, stress, product usage).  This will identify which factors most strongly affect flare risk and help prioritize logging and interventions.  The analysis must be repeated periodically as more data becomes available.
- *Model robustness*: Evaluate how small perturbations in input data (e.g., slight mislabeling of lesions or minor weather fluctuations) impact model outputs.  If a model is overly sensitive to a particular input, the team should either collect more accurate measurements or regularize the model.

#### 16.10.6 Influence Diagrams

An influence diagram visually and mathematically represents decision problems.  It contains three kinds of nodes: **decision nodes** (rectangles) for choices, **chance nodes** (ovals) for uncertainties, and **utility nodes** (diamonds) for objectives.  Directed arrows indicate dependencies and information flow.  Influence diagrams are used to conceptualize relationships among variables and to derive decision strategies【24790909677039†L67-L103】.

**Use in AcneTrex:**

- *Causal reasoning*: When modeling the complex interplay between treatment actions, random events (hormonal cycles, environment), and outcomes (acne severity), design influence diagrams to map out dependencies.  This will inform the structure of Bayesian networks or structural equation models used in TriggerGraph and forecast engines.
- *User education*: Present simplified influence diagrams in user‑facing explanations (via CutisAI) to illustrate how different decisions (e.g., introducing a new product) and uncertainties (e.g., stress) might combine to affect outcomes.

#### 16.10.7 Force Field Analysis

Force field analysis evaluates the forces driving and resisting a proposed change.  The method involves listing driving forces (positive pressures) and restraining forces (negative pressures), rating the strength of each force, and developing actions to strengthen positive forces or mitigate negative ones【569115806133940†L37-L52】【569115806133940†L70-L116】.

**Use in AcneTrex:**

- *Behaviour change interventions*: When recommending changes to a user’s routine (e.g., quitting dairy, adding a new medication, increasing sleep), the system should identify factors that will support the change (e.g., user motivation, clinical evidence) and factors that will hinder it (e.g., taste preference, cost, time constraints).  By quantifying these forces, CutisAI can propose strategies to increase adherence—such as reducing barriers or offering smaller incremental steps.
- *Feature rollout planning*: Within the engineering team, force field analysis can inform internal decisions about when and how to introduce new modules or UI changes.  Understanding developer capacity, user readiness, regulatory constraints, and technical debt will improve execution strategy.

#### 16.10.8 Scenario Planning

Scenario planning is a strategic method that explores multiple plausible futures rather than a single forecast.  The process involves defining a focus and time horizon, assessing external drivers, identifying critical uncertainties, developing a small set of distinct, internally consistent scenarios, analyzing their implications, and monitoring signposts to adjust plans【536803657739669†L29-L49】【536803657739669†L105-L128】.

**Use in AcneTrex:**

- *Long‑term development*: Product, AI and regulatory landscapes change rapidly.  The AcneTrex roadmap should incorporate scenario planning to anticipate future shifts—such as new privacy regulations, AI safety standards, emerging treatments, or hardware capabilities—and ensure the app remains compliant and competitive.
- *User guidance*: For users planning long‑term treatment strategies (e.g., multi‑month isotretinoin cycles or pregnancy planning), scenario planning can help illustrate possible outcomes based on different choices and external conditions.

#### 16.10.9 Comprehensive Analytics: Descriptive, Diagnostic, Predictive, and Prescriptive

AcneTrex must combine all four categories of analytics【989705877999110†L114-L123】【989705877999110†L126-L133】【989705877999110†L136-L144】【989705877999110†L149-L153】【6520824151647†L91-L126】:

1. **Descriptive analytics** summarises past data to identify patterns and trends.  AcneTrex should use time‑series plots, heatmaps and summary statistics to visualise lesion counts, routine adherence, trigger frequencies and model performance.
2. **Diagnostic analytics** investigates why events occurred by drilling into correlations, partial correlations and logistic regression coefficients to uncover causal patterns.  This informs TriggerGraph explanations and CutisAI responses.
3. **Predictive analytics** uses machine‑learning models (decision trees, regression, time‑series models, neural networks) to forecast future acne severity, flare risk, product reactions and treatment outcomes.  Probabilistic methods such as Monte Carlo simulation and uncertainty quantification must be used to represent predictive distributions rather than a single value.
4. **Prescriptive analytics** recommends actions to optimize outcomes.  The AI assistant must evaluate alternative interventions using the decision frameworks above, taking into account user constraints and preferences, and propose specific next steps such as adjusting routines, changing products, or scheduling visits.

#### 16.10.10 Correlation and Causality Methods

When analyzing triggers and correlations, the engines must employ robust statistical techniques:

- **Pearson correlation** quantifies linear relationships between continuous variables; use it for normally distributed variables and linear patterns【345277950743144†L71-L75】.
- **Spearman rank correlation** assesses monotonic relationships using ranks, which is more robust to outliers and non‑linear effects.
- **Partial correlation** measures the relationship between two variables while controlling for confounding variables; compute it using residuals from regressions or the recursive formula.
- **Cross‑correlation** investigates lagged relationships between time series to identify delayed effects, such as how sleep patterns influence acne severity days later.
- **Logistic regression** models binary outcomes (e.g., outbreak vs no outbreak) and provides interpretable odds ratios; evaluate using log‑loss and calibration metrics.

These correlation techniques must be combined with causal inference approaches such as Bayesian networks and structural equation models to avoid spurious correlations and to guide prescriptive actions.

#### 16.10.11 Rigorous Testing and Validation

In addition to the general QA requirements in Section 19, the analytical methods require strict evaluation.  The testing plan must include:

* **Cross‑validation**: Use k‑fold (with stratification for imbalanced classes), time‑series walk‑forward and nested cross‑validation to estimate generalisation performance.  Hold back a never‑seen test set for final metrics.
* **Regression metrics**: Evaluate severity scores and forecast outputs using mean absolute error (MAE), root mean square error (RMSE) and coefficient of determination (R²).
* **Classification and detection metrics**: Measure precision, recall, F1, Matthews correlation coefficient, intersection‑over‑union (IoU), average precision (AP) and mean AP as appropriate.
* **Fairness and calibration**: Compute demographic parity, equalized odds, Brier score, reliability curves and calibration error to ensure outputs are equitable and well‑calibrated.  Stratify metrics by Fitzpatrick skin type, sex and age.
* **Robustness and sensitivity testing**: Introduce perturbations and missing data to evaluate model stability; perform sensitivity analysis to identify influential features.
* **Uncertainty quantification**: Assess confidence intervals and prediction intervals through bootstrapping, quantile regression, Bayesian models or Monte‑Carlo dropout.  The UI must display model confidence and uncertainty transparently.
* **Statistical significance testing**: Use appropriate hypothesis tests (e.g., McNemar, paired t‑tests, Wilcoxon) to compare models and monitor drift.  When time series data exhibits autocorrelation, adjust confidence limits with correction factors【991564386782573†L581-L602】.
* **External validation**: Test models on independent datasets with diverse demographics and imaging conditions to confirm generalisation.

All analytical models must be documented with their assumptions, hyperparameters and evaluation results.  Test harnesses should automate these evaluations and emit telemetry for monitoring and alerting.  Any model update requires re‑validation and must not be released until metrics meet or exceed prior baselines and fairness thresholds.

---


### 16.11 Longitudinal Acne Dynamics Engine

The Longitudinal Acne Dynamics Engine is responsible for turning repeated logs, scans, treatment events, weather snapshots, and user notes into statistically cautious personal insight. It must operate as an analytical engine, not a chatbot summary generator.

Required pipeline:

```text
collect daily logs/scans/events
→ normalize raw variables
→ compute exposure scores
→ generate lagged variables
→ classify daily acne state
→ detect episodes
→ run descriptive and diagnostic analysis
→ run correlation/regression/episode comparison where valid
→ estimate confidence and limitations
→ persist analysis run
→ update TriggerGraph, Forecast, Treatment Plan Center, CutisAI, Tasks, and Reports
```

Required analysis outputs:

- acne activity trend;
- stillness predictors;
- breakout pre-exposure patterns;
- suspected purging vs ordinary breakout vs irritation classification;
- lesion location/type/longevity associations;
- same-day and lagged diet/sleep/stress/routine/weather associations;
- combined lifestyle burden estimates;
- interaction flags such as late sleep plus high-risk diet plus high stress;
- data sufficiency and missingness report;
- confidence level and caveats.

Required hypothesis families:

- **Diet-Main / Diet-Location / Diet-Type / Diet-Longevity:** test whether diet-risk exposures are associated with acne activity, lesion distribution, lesion type, or healing duration.
- **Sleep-Main / Sleep-Location / Sleep-Type / Sleep-Longevity:** test whether sleep timing, duration, or irregularity is associated with acne activity and lesion patterns.
- **Stress-Main / Stress-Location / Stress-Type / Stress-Longevity:** test whether daily stress is associated with lesion count, breakout probability, lesion phenotype, or resolution time.
- **Routine-Main:** test whether cleansing frequency, shower timing, active-use consistency, moisturizer/sunscreen adherence, overuse, or missed products are associated with acne activity or barrier decline.
- **Actives-Purging:** test whether active ingredient initiation/adjustment is associated with a short-term time-locked flare followed by lower lesion burden or longer stillness.
- **Purging-to-Stillness:** test whether suspected purging episodes are followed by longer or more stable stillness than ordinary breakouts.
- **Breakout-vs-Purging:** test whether episodes differ by product-change timing, lesion type distribution, location, onset latency, duration, and subsequent stillness.
- **Combined Burden:** test whether combinations of high-risk exposures produce stronger effects than each variable alone.

Each hypothesis must retain its null alternative and must remain inconclusive until enough validated data exists.

Safety and anti-fabrication rules:

- The engine must never claim strict causation from observational single-user data.
- The engine must label associations as hypotheses until repeatedly supported.
- The engine must adjust for confounders when possible and disclose when it cannot.
- The engine must not classify purging without product-change timing and follow-up outcome data.
- The engine must not infer systemic medication effects unless the user provided medication history and evidence supports caution.
- The engine must use external evidence retrieval for medical/scientific claims.
- The engine must refuse over-specific conclusions when sample size, data quality, or missingness makes the result unreliable.

## 17. Security Requirements

### 17.1 SQL Injection Prevention

- Never concatenate user input into SQL strings.
- Use ORM query builders or parameterized SQL only.
- Validate and sanitize all inputs.
- Restrict raw SQL to reviewed migration or analytics files.

### 17.2 IDOR Prevention

Every endpoint using an id must verify:

1. User is authenticated.
2. Resource exists.
3. Resource belongs to the authenticated user or user has explicit permission.
4. Action is allowed for that role and resource state.

### 17.3 Authorization

- Backend must enforce authorization.
- Hiding frontend buttons is never security.
- Admin endpoints require backend role checks.
- Destructive operations require ownership and confirmation.

### 17.4 Rate Limiting

Apply rate limits to:

- login
- signup
- password reset
- AI requests
- image uploads
- product scans
- evidence search
- report generation
- notification registration

### 17.5 Data Privacy

- Store only necessary health data.
- Use encryption at rest where platform supports it.
- Use TLS for all network traffic.
- Use private object storage.
- Use signed URLs for media.
- Do not log raw images, full logs, passwords, tokens, or secrets.
- Audit health-data writes with field names only.

### 17.6 Storage Security

- S3/Supabase buckets must not be public.
- Uploaded images must be private by default.
- Signed URLs must expire quickly.
- Media deletion must be queued after account deletion grace period.

### 17.7 Mobile Security

- Store tokens using SecureStore or provider-managed secure storage.
- Never store raw health data in unencrypted local files unless non-sensitive offline cache is explicitly allowed.
- Clear sensitive cache on logout.
- Protect against screenshots only if user enables privacy screen mode.

---

## 18. Error Handling and Edge Cases

### 18.1 General Error Rules

Every error must have:

- user-facing message
- internal error code
- retry path where possible
- logging without sensitive values
- stable UI state after failure

### 18.2 Key Edge Cases

#### Auth

- wrong password
- nonexistent email
- unverified email
- expired session
- token refresh failure
- network failure during login
- account deleted
- migration conflict

#### Logs

- duplicate same-day submission
- offline submission
- invalid payload
- timezone crossing midnight
- conflicting offline and server records
- partial sync failure

#### FaceAtlas

- camera permission denied
- no camera available
- poor lighting
- no face detected
- multiple faces detected
- blurry image
- upload failure
- analysis timeout
- model validation failure
- skipped user annotation
- invalid lesion annotation payload
- user unsure labels
- model-user disagreement requiring calibration review
- consent revoked after annotation but before learning contribution

#### Products

- unreadable label
- partial ingredient list
- product not found
- conflicting product names
- OCR failure
- evidence retrieval unavailable
- unsupported language

#### AI Assistant

- retrieval timeout
- LLM timeout
- unsafe medical request
- insufficient user data
- conflicting evidence
- validation failure

#### Forecast

- insufficient history
- outlier data
- missing scan baseline
- weather unavailable
- cycle data disabled
- low confidence

#### Notifications

- permission denied
- device token invalid
- user disabled category
- backend event cancelled
- duplicate notification schedule

#### Treatment Plans

- treatment name cannot be confidently identified
- product strength or active ingredient is missing
- provider instruction conflicts with generated plan
- prescription status requires provider confirmation
- user reports severe irritation or red-flag symptoms
- user uses conflicting actives on the same day
- multiple active plans overlap unsafely
- user misses scheduled treatment event
- plan recalculation cannot run offline
- evidence retrieval unavailable
- oral medication risk requires provider-only guidance

#### Streaks and Badges

- user misses all daily tasks
- user has already used 3 restores this month
- timezone changes near day boundary
- offline queue completes after day cutoff
- badge criteria partially met but not validated
- model metric snapshot unavailable

#### Weather and Location

- location permission denied
- manual location invalid
- weather provider unavailable
- stale weather snapshot
- precise location retention not consented
- observed and forecast weather conflict
- weather confidence too low for alert

---

## 19. Testing and QA Requirements

### 19.1 Recursive Testing Loop

Before implementing features, create the testing framework and define test goals. Tests must be run iteratively as development progresses.

Required testing sequence:

```text
write acceptance criteria
→ write unit tests
→ implement feature
→ run unit tests
→ run integration tests
→ run E2E tests
→ inspect logs
→ fix failures
→ rerun tests
→ verify no regression
```

### 19.2 Test Types

#### Mobile tests

- Jest unit tests
- React Native Testing Library component tests
- Maestro or Detox E2E flows
- Camera permission flow tests
- Offline queue tests
- Deep link tests

#### Backend tests

- Pytest unit tests
- API integration tests
- auth and authorization tests
- database transaction tests
- RLS tests
- migration tests
- worker task tests
- rate-limit tests

#### AI/ML tests

- schema validation tests
- prompt assembly tests
- timeout/retry tests
- insufficient-data tests
- output validation tests
- confidence threshold tests
- evidence retrieval tests
- lesion annotation schema tests
- model-user reconciliation tests
- network learning eligibility tests
- model version and performance snapshot tests
- treatment plan identification tests
- treatment calendar generation tests
- treatment safety gate tests
- treatment check-in adaptation tests
- weather context ingestion and privacy tests
- streak restore monthly-limit tests
- badge/rank derivation tests
- longitudinal exposure-score derivation tests
- N-of-1 episode classification tests
- lagged correlation and regression validation tests
- purging-versus-breakout insufficiency and safety tests

#### Security tests

- SQL injection attempts
- IDOR attempts
- missing auth checks
- rate-limit abuse
- invalid token tests
- bucket privacy checks
- secrets scanning
- debug log review

#### UI validation

- mobile layout screenshots
- accessibility checks
- dark/light mode if implemented
- loading/empty/error states
- no console/runtime errors

### 19.3 Required Critical E2E Flows

1. Signup → onboarding → dashboard.
2. Login → dashboard loads persisted data.
3. Save sleep log twice same day → one updated record.
4. Complete FaceAtlas scan → upload → guided lesion annotation → analyze → result persists.
5. Product label scan → analysis → saved product detail.
6. Ask CutisAI a profile-based question → response persists with context.
7. Generate forecast → result persists and dashboard updates.
8. Opt into research network → FaceAtlas annotation contributes eligible signal → revoke consent → future events excluded.
9. Create treatment plan → generate calendar → complete treatment check-in → plan adapts safely → notifications/tasks update.
10. Miss full-streak day → use streak restore → monthly restore count updates → missing data remains honest.
11. Enable weather/location with explicit “while using app” choice or manual location → weather snapshot persists → forecast/climate insight updates.
12. Log 14+ days of sleep/diet/stress/routine/acne data → run pattern analysis → app shows descriptive trends and insufficient/valid hypotheses honestly.
13. Product change + acne flare → episode is classified as suspected purging, breakout, irritation, or insufficient data only when criteria are met.
14. Generate report → worker completes → report available.
15. Logout → login again → all data still present.

### 19.3A Treatment Plan, Streak, and Weather Validation

Treatment Plan Center must pass stricter validation because it affects user safety and medication adherence. Required validation includes:

- treatment catalog matching accuracy for common acne topicals, oral treatments, and combination products;
- evidence retrieval from trusted clinical sources before treatment education or schedule generation;
- safety-rule tests for pregnancy/planning/breastfeeding relevance, allergies, photosensitivity, severe irritation, oral isotretinoin, oral antibiotics, and conflicting actives;
- calendar generation tests for 1–2 times/week, 2–3 times/week, alternate-day, short-contact, daily, rest-day, and provider-review schedules;
- adaptation tests for good tolerance, mild irritation, severe irritation, skipped days, barrier decline, weather/UV risk, and conflicting product use;
- prescription-sensitivity tests proving the app does not independently change prescribed dose/frequency;
- report inclusion tests proving treatment history and adjustments appear in dermatologist-ready exports.

Streak and gamification validation must verify:

- full streak activates only after all required tasks are completed or offline-queued;
- monthly restore count cannot exceed 3;
- restore counter resets by user-local calendar month;
- missing health data remains missing after restore unless backfilled;
- pet evolution, ranks, and badges derive from records and model metrics only.

Weather validation must verify:

- explicit in-app yes/no location choice works before the platform permission prompt;
- “while using app” permission is requested when the user chooses yes and the platform supports it;
- permission denied flow works with manual location;
- weather data comes from backend provider or documented platform-supported provider, never frontend secrets;
- observed and forecast weather are distinguished;
- coarse location and privacy minimization rules are enforced;
- weather snapshots affect ClimateSkin Radar, forecasts, treatment photosensitivity cautions, and notifications only when confidence is sufficient.


### 19.3B Longitudinal N-of-1 Analysis Validation

The longitudinal pattern engine must pass study-grade validation before release:

- daily log schema tests for sleep, diet, stress, routine, product changes, weather, and lesion lifecycle data;
- same-day merge tests proving repeated daily entries update the same record instead of duplicating;
- derived exposure-score tests for sleep risk, diet risk, stress risk, routine deviation, product change, weather risk, and combined lifestyle burden;
- missing-data tests proving the engine marks gaps honestly and does not infer unlogged meals, sleep, stress, treatments, or lesions;
- lag generation tests for L1, L2, L3, and configurable 3–7 day pre-episode windows;
- descriptive statistics tests against known fixture data;
- Pearson/Spearman selection tests based on data assumptions and sample size;
- regression tests using synthetic datasets with known relationships;
- non-parametric comparison tests for small or skewed samples;
- episode detection tests for stillness, breakout, suspected purging, irritant reaction, and insufficient data;
- purging safety tests proving the app does not label a flare as beneficial purging without active-change timing and follow-up improvement data;
- confounder disclosure tests for simultaneous changes in treatment, sleep, diet, stress, weather, and routine;
- confidence-calibration tests proving confidence decreases with missingness, poor scan quality, small sample size, or inconsistent signals;
- CutisAI explanation tests proving outputs use cautious language, cite external evidence when making scientific claims, and avoid diagnosis or causation overclaims;
- dermatologist report tests proving longitudinal methods, operational definitions, limitations, and results are exportable.

### 19.3C Food, SleepDerm, and Skin Twin Validation

The new features must pass dedicated E2E validation.

#### Food baseline and progressive logging tests

- Complete onboarding with 1 meal/day baseline → Food Log shows one expected meal.
- Complete onboarding with 3 meals/day baseline → Food Log shows three expected meals.
- Add breakfast → dashboard shows partial food logging.
- Add snack → same daily food log updates, no duplicate record.
- Add remaining meals → dashboard shows complete.
- Change meal baseline in Profile → future logs update, historical logs remain unchanged.
- Backfill yesterday’s meals → record is marked backfilled.
- Skip food details with “Not sure” → uncertainty is stored honestly.

#### SleepDerm tests

- Enter sleep start before midnight and wake after midnight → duration is correct.
- Edit wake time → duration and sleep debt recalculate.
- Missing sleep day → missingness is shown, no fake debt is created.
- Seven valid sleep records → circadian alignment becomes available.
- Fewer than seven valid records → circadian alignment is low-confidence or insufficient.
- Add severe sleep debt over multiple days → Sleep Debt Tracker updates.
- Add recovery nights → debt decreases within configured caps.
- Run sleep-inflammation analysis with insufficient skin data → output says insufficient data.
- Run sleep-inflammation analysis with enough fixture data → expected lagged association is detected and confounders are disclosed.

#### Skin Twin tests

- Run simulation without enough baseline data → readiness check blocks or downgrades confidence.
- Run 7-day better-sleep simulation with enough data → simulation persists with uncertainty.
- Select multiple variables → output shows combined effect and confounders.
- Open current skin model → markers match latest FaceAtlas output.
- Open projection → visual output is labeled estimated, not guaranteed.
- Delete raw face photo → visualization switches to derived-only/neutral model.
- Export report → selected Skin Twin scenario appears with confidence and limitations.



### 19.4 Definition of Done

A feature is done only if:

- data model exists
- API exists or service boundary exists
- validation schema exists
- tests exist and pass
- user flow works end-to-end
- persistence works
- audit log works where required
- error states are implemented
- loading and empty states are implemented
- no fake values are used
- security checks pass
- mobile UI is polished

---

## 20. Observability, Logging, and Monitoring

### 20.1 Structured Logging

All backend logs must be structured and must exclude sensitive values.

Log events:

- auth success/failure without password data
- health-data write success/failure
- AI job started/succeeded/failed
- upload started/succeeded/failed
- notification scheduled/sent/failed
- report generation status
- migration results
- validation failures

### 20.2 Intelligence Events

Every significant inference, retrieval, validation outcome, learning event, or model failure must emit `intelligence_events`.

### 20.3 Audit Logs

Every create/update/delete/import on health-data entities must emit `audit_logs` with changed field names only.

### 20.4 Monitoring

Track:

- API latency
- error rate
- auth failures
- upload failures
- AI job failure rate
- forecast generation latency
- evidence retrieval latency
- report generation time
- notification delivery rate
- database slow queries
- queue depth
- model-user disagreement rate
- lesion annotation completion rate
- treatment plan creation/completion rate
- treatment check-in adherence rate
- treatment safety flag frequency
- weather sync success/failure rate
- streak restore usage and monthly-limit enforcement
- badge/rank recalculation errors
- learning contribution eligibility/exclusion counts
- model training run status
- model version release/rollback events
- longitudinal analysis run success/failure rate
- exposure-score derivation failures
- episode classification distribution and insufficiency rate
- weather permission choice rate and manual-location fallback rate

---

## 21. Performance Requirements

### 21.1 Mobile Performance

- App cold start should be optimized.
- Dashboard should show useful content quickly.
- Avoid unbounded list rendering.
- Use pagination and virtualization.
- Use image compression before upload.
- Cache repeated non-sensitive requests.
- Use optimistic UI only when safe and reversible.

### 21.2 Backend Performance

- Cache repeated evidence and product lookups with Redis.
- Move heavy AI, email, PDF, OCR, image analysis, and report generation into jobs.
- Avoid long synchronous API blocking.
- Use database indexes for `user_id`, `log_date`, `created_at`, and frequently queried fields.
- Use pgvector indexes for evidence retrieval.

### 21.3 Offline and Poor Network Behavior

- User can draft logs offline.
- Offline logs queue locally and sync later.
- Face/product uploads require network but must preserve capture progress until upload resumes.
- Treatment plan check-ins can queue offline if the plan event already exists locally, but plan generation/recalculation requires backend evidence and safety validation.
- Weather sync requires backend connection; last known weather must be clearly labeled as stale if used.
- Assistant and forecasting require backend connection.
- UI must explain when features require internet.

---

## 22. Deployment and Infrastructure

### 22.1 Environments

- local
- development
- staging
- production

Each environment must have separate:

- database
- storage bucket
- auth config
- API keys
- Redis instance
- AI provider keys
- monitoring project

### 22.2 CI/CD

Pipeline must include:

1. Install dependencies.
2. Type check.
3. Lint.
4. Unit tests.
5. Backend tests.
6. Migration check.
7. Security scan.
8. Build mobile app.
9. Build backend container.
10. Deploy to staging.
11. Run smoke tests.
12. Manual approval for production.

### 22.3 Backups

- Daily database backups.
- Point-in-time recovery if supported.
- Object storage retention policy.
- Migration rollback plan.

---

## 23. Timeline and Iteration Plan

### Phase 0: Repository and Architecture Audit

Deliverables:

- current system map
- route map
- dependency map
- data flow map
- fake logic audit
- security audit
- implementation plan
- test framework setup

Exit criteria:

- architecture plan approved
- critical risks identified
- tests running

### Phase 1: Backend Foundation and Auth

Deliverables:

- backend skeleton
- database migrations
- auth integration
- profile/onboarding persistence
- RLS/ownership checks
- typed API client
- audit log service

Exit criteria:

- signup/login/logout works
- onboarding persists
- protected endpoints enforced

### Phase 2: Daily Logs and Dashboard

Deliverables:

- daily log endpoints
- same-day merge rule
- dashboard data aggregation
- CHI early snapshot
- task board foundation
- offline log queue

Exit criteria:

- logs persist and update same day
- dashboard reflects backend state

### Phase 3: FaceAtlas

Deliverables:

- camera flow
- five-photo capture
- image compression
- private upload
- analysis job
- guided lesion annotation flow
- lesion taxonomy reference cards
- model-user reconciliation
- scan history
- FaceAtlas result UI

Exit criteria:

- full scan works end-to-end
- user annotations persist and reconcile with model outputs
- results persist and influence dashboard

### Phase 4: Product Intelligence and Evidence Retrieval

Deliverables:

- product image/manual entry
- OCR/text extraction
- ingredient parser
- evidence retrieval
- product risk analysis
- saved product history

Exit criteria:

- FormulaLens produces validated, persisted product analysis

### Phase 5: CutisAI and RAG

Deliverables:

- assistant conversations
- context retrieval
- evidence retrieval
- backend LLM routing
- message persistence
- validation/safety pass

Exit criteria:

- CutisAI answers using user data and saved evidence

### Phase 6: Forecasting and Skin Twin

Deliverables:

- feature extraction
- forecast pipeline
- what-if simulation
- confidence model
- forecast history
- Skin Twin counterfactual UI

Exit criteria:

- forecasts generated from real history and stored

### Phase 7: Research Network, Notifications, Reports

Deliverables:

- consent management
- anonymous learning events
- network learning contributions
- model training run records
- model performance snapshots
- notifications
- PDF reports
- export history

Exit criteria:

- consent state governs learning
- notifications map to real events
- reports generate from real records

### Phase 8: Hardening and Release

Deliverables:

- performance optimization
- security testing
- E2E test completion
- accessibility pass
- app store preparation
- production deployment

Exit criteria:

- no critical bugs
- no fake intelligence
- all acceptance flows pass

---

## 24. Engineering Guardrails for AI Agents

### 24.1 Before Coding

The agent must:

1. Read existing files before modifying.
2. Build a to-do list.
3. Identify affected modules.
4. Define acceptance tests.
5. Create or update unit tests.
6. Write an architecture plan for major changes.
7. Ask before destructive or major architecture changes.

### 24.2 Coding Rules

- Keep functions short.
- Split long functions into named helpers.
- Prefer explicit code over clever code.
- Use existing patterns before inventing new abstractions.
- Avoid unnecessary libraries.
- Do not expose data unnecessarily.
- Use dependency files for correct versions.
- Comments must be one sentence and only where useful.
- No emojis or decorative comments in code.
- Markdown files use kebab-case names.
- Maintain `/docs/activity-log.md` for agent continuity.

### 24.3 Version Control Rules

- Commit after significant changes.
- Keep commits focused and atomic.
- Use clear commit messages.
- Do not auto-push branches.
- Do not commit secrets, credentials, tokens, connection strings, or private data.

### 24.4 Review Rules

Before marking work complete:

- run tests
- run type checks
- inspect logs
- verify no console errors
- verify no missing handlers
- verify no broken navigation
- verify no hardcoded fake values
- verify no secrets leaked
- verify auth and ownership checks
- verify same-day merge behavior

---

## 25. Acceptance Criteria Summary

AcneTrex V3 is acceptable only when:

1. Real auth works.
2. Real persistence works.
3. Legacy data can migrate safely.
4. Daily logs update same-day records.
5. FaceAtlas works with real mobile camera flow.
6. FaceAtlas guided lesion annotation persists and informs validated model-user reconciliation.
7. Anonymous network learning uses eligible consented contributions to improve model versions through controlled, validated releases.
8. Onboarding creates a serious baseline personalization profile for AI/ML engines.
9. Product analysis uses real inputs and persisted outputs.
10. CutisAI uses backend LLM/RAG and persisted user context.
11. Forecasting uses real historical data and stores outputs.
12. CutisAI retrieves evidence through the backend evidence layer and stores only permitted citation metadata.
13. Research participation is consented and revocable.
14. AI/ML activity, confidence, learning, readiness, and performance states are observable through real backend records.
15. Task completion points and animations occur only from real task events.
16. Notifications map to real backend events.
17. Reports export from real records.
18. All sensitive endpoints enforce ownership.
19. RLS or equivalent database isolation is enabled.
20. API keys and secrets are not exposed.
21. Private storage is locked down.
22. Rate limits exist for abuse-prone endpoints.
23. Heavy tasks run asynchronously.
24. Tests exist and pass.
25. UI is premium, mobile-first, accessible, responsive, and visually modern/futuristic where appropriate.
26. No fake logic, mock intelligence, random scores, or decorative system status remains.
27. Zero console errors, zero broken routes, zero failed forms, and zero unhandled promise rejections remain in the accepted build.
28. Account creation, pre-account consent education, mandatory onboarding, and privacy controls are complete before feature access.
29. Native iOS and Android builds pass camera, gallery, notification, offline queue, authentication, and report-generation tests.
30. App Store and Play Store privacy, permission, data deletion, and health-content compliance requirements are satisfied.

---

### 25A Addendum Acceptance Criteria Summary

The interface-derived, food-baseline, SleepDerm, and Skin Twin addendum is complete only when:

1. Stitch-derived Skin History onboarding is explicitly implemented and persisted.
2. Meal frequency baseline is captured during onboarding.
3. Food logging adapts to 1, 2, 3, variable, or unknown meal baselines.
4. Snacks can be logged throughout the day without duplicate food logs.
5. SleepDerm computes duration, sleep debt, circadian alignment, and nocturnal recovery opportunity.
6. Sleep debt is calculated from source sleep records and cannot be fabricated.
7. SleepDerm can correlate sleep variables with inflammatory skin outcomes only when sufficient data exists.
8. Skin Twin supports a broad active-variable catalog.
9. Skin Twin simulations are readiness-gated, persisted, versioned, and uncertainty-aware.
10. Current skin visualization shows real FaceAtlas-derived lesion and zone data.
11. Simulation projection is clearly labeled as estimated and never presented as a guaranteed future face.
12. All new features have database records, APIs, validation schemas, AI/ML pipelines, tests, audit logs, intelligence events, loading states, empty states, error states, and security checks.
13. No output, metric, visualization, recommendation, or projection is generated from fake or placeholder logic.



## 26. Final Product Definition

AcneTrex V3 is a secure, premium, mobile-first acne intelligence platform that turns real user data into personalized insight. It tracks daily skin-relevant behaviors, analyzes face scans and products, retrieves evidence, forecasts acne risk, supports user learning through CutisAI, protects privacy through consent controls, and preserves every meaningful record as part of a durable health timeline.

With the V1.2 through V1.5 feature upgrades, AcneTrex also becomes a participatory learning and longitudinal intelligence system: users can help FaceAtlas improve through guided lesion annotation, opt-in network learning can improve shared model accuracy, onboarding becomes the first serious personalization engine event, AI/ML system activity becomes visually observable, daily tasks become more motivating through real backend-linked points and polished completion feedback, Food Log adapts to the user’s true meal baseline, SleepDerm becomes a circadian/sleep-debt intelligence engine, and Skin Twin can show confidence-limited current-skin and scenario projection visualizations.

The app is complete only when it is mobile-native, App Store / Play Store ready, and not merely visually convincing but operationally real: every route works, every form persists, every AI output is traceable, every engine has validation and telemetry, every user can return to their history, and every feature is built with production-level security, privacy, and maintainability.
````

---

## 5. Phase 2 ZIP Expanded Source Manifest

Original source: `acnetrex-phase2 ZIP (1).zip`

| # | Path | Size | SHA-256 |
|---:|---|---:|---|
| 1 | `acnetrex-phase2/.app.jsonc` | 38 bytes | `235d7042df349f8292c8f8d6525064ed7e358db34d0d6961cdc60dc3c2061a5c` |
| 2 | `acnetrex-phase2/.gitignore` | 284 bytes | `f50b753b9884dbeec612495f084d3bc8010c0c84ca5cf5a16f54a77da4551fb1` |
| 3 | `acnetrex-phase2/AGENTS.md` | 1,592 bytes | `e2c30f526e2bf4cc7bf0e53d396ca8306269a19040a5b5b90a2e5c6ceb9b93be` |
| 4 | `acnetrex-phase2/App.jsx` | 5,420 bytes | `aae21d80f7afd909a632d46d78deae6d755308bfc0423904719f974b4b67eac8` |
| 5 | `acnetrex-phase2/CLAUDE.md` | 57 bytes | `4c9691fea1d31f325645a9d86163cb92ff0097d7cd04cae4ab7d7aff05fa97cd` |
| 6 | `acnetrex-phase2/PHASE2_DOCUMENTATION.md` | 8,827 bytes | `1a4ff5005bdd6174786ef268a194a6ab5041ec344a7a324ecd9c54f26ad7463c` |
| 7 | `acnetrex-phase2/README.md` | 2,377 bytes | `0b85af18216348ca22df4be7aeb412731da75e88fd740db231a4c97fed994813` |
| 8 | `acnetrex-phase2/api/base44Client.js` | 337 bytes | `35647ef13677f2b23399843531e82cb49521bcd6cd09f00e23888b0d7973cf2e` |
| 9 | `acnetrex-phase2/components.json` | 444 bytes | `73e1334afce0f20f01500532e3b63a7cc36238d8a05addef40c476fadf9dc349` |
| 10 | `acnetrex-phase2/components/AppLayout.jsx` | 2,299 bytes | `ebbc97d4114a4513e05f0f314fb2c977de43b137acad23f43a8ef95d5c3c9c0e` |
| 11 | `acnetrex-phase2/components/AuthLayout.jsx` | 955 bytes | `27191e5279ab7a6d30609f7954c64edf586ce11817ca50ca63ed03bd432629ce` |
| 12 | `acnetrex-phase2/components/GoogleIcon.jsx` | 833 bytes | `4d5d7b5c6a368f8246fe088eaa158b2cd0872bfafa8e5c495ec39ebb697c4f6b` |
| 13 | `acnetrex-phase2/components/PlaceholderScreen.jsx` | 1,158 bytes | `5496bed75e402217aa7f586cf2828643bdb7f9891ebf14ed638a0f437c1bfe77` |
| 14 | `acnetrex-phase2/components/ProtectedRoute.jsx` | 1,069 bytes | `f1121449bc7f8f31b2ed2d4a6e0211c8d300319efd58919efdd313dc7b586068` |
| 15 | `acnetrex-phase2/components/ScrollToTop.jsx` | 805 bytes | `56f6ecc5d3f0bd692e7d4bb6d89f73ddac4148150718388ef8cf996a985f6138` |
| 16 | `acnetrex-phase2/components/UserNotRegisteredError.jsx` | 1,592 bytes | `5cecb11fe2fb3a03a73e5845b5ee9d26c9255e80feda689b3dfc70822ba288f1` |
| 17 | `acnetrex-phase2/components/onboarding/ConsentFlow.jsx` | 7,569 bytes | `32b5fc580f1fbcedfa6abadfe5b77a3d778e1186c1e11e2a866da625271d5fcf` |
| 18 | `acnetrex-phase2/components/onboarding/FieldLabel.jsx` | 384 bytes | `503b8a7ea6b5c74e6f61a47d47ea41ca63d1011ef6948b446affefbd38b1c6c1` |
| 19 | `acnetrex-phase2/components/onboarding/OnboardingCard.jsx` | 628 bytes | `14901e8d7716041d822e6e9ddfb9acb5760ffb08b9a5fd536d813819a96602a7` |
| 20 | `acnetrex-phase2/components/onboarding/OnboardingChip.jsx` | 482 bytes | `7fd3f94a21a8e494211f812d9e781d2d79845004251bd883b636a6044410a5f7` |
| 21 | `acnetrex-phase2/components/onboarding/OnboardingWizard.jsx` | 4,832 bytes | `0f3c5eb3a671aca8580955ee835d38d069abb5d5d5d3366ad75eea5dab2172cf` |
| 22 | `acnetrex-phase2/components/onboarding/steps/StepBasicProfile.jsx` | 3,068 bytes | `f94a1ad58353721ba8410329d65361af689785d22a645f4c385355668fd2f50b` |
| 23 | `acnetrex-phase2/components/onboarding/steps/StepConsentLearning.jsx` | 4,496 bytes | `cdf32424868d99599170f6ae5fca877de28f989f61ffc7c2ae74c643af9d745e` |
| 24 | `acnetrex-phase2/components/onboarding/steps/StepGoals.jsx` | 3,002 bytes | `30efd1b4debb79c2b10f5c75e6cadaf1742db40a97cdc51e1086eb6202367eb8` |
| 25 | `acnetrex-phase2/components/onboarding/steps/StepLifestyle.jsx` | 3,773 bytes | `0f5fd126919a0a806bf08d50bd43dd439631aaf6822c41a5ac61d5b09c1a4f03` |
| 26 | `acnetrex-phase2/components/onboarding/steps/StepRoutine.jsx` | 3,120 bytes | `31023af6604c41ee6b1dd5146c1e541232a91ec1bfed8e1e1dc9ece5483ce772` |
| 27 | `acnetrex-phase2/components/onboarding/steps/StepSkinHistory.jsx` | 4,432 bytes | `6c3ffe943f97128835ba72940740b3db77ae849e2eb41d5f25b51ad427111f67` |
| 28 | `acnetrex-phase2/components/onboarding/steps/StepSkinType.jsx` | 3,134 bytes | `36d533ab8656cb52f1478a1e1654080d27b40ec58b99288c02aafa43dbbb6d81` |
| 29 | `acnetrex-phase2/components/ui/accordion.jsx` | 1,615 bytes | `b47533b3783b8149550b8481e4ae93d54bdcbc51d434793c176b0aec5558ee1c` |
| 30 | `acnetrex-phase2/components/ui/alert-dialog.jsx` | 3,461 bytes | `a20098cdc2eb2b5915575d3f0fb7a3e8e6c1035c7eef77144f3fc389e0fdbda0` |
| 31 | `acnetrex-phase2/components/ui/alert.jsx` | 1,335 bytes | `c5baf27fb6a4bf130236fa0f336c21084fee192e8215bb6b20c87436c27f3b38` |
| 32 | `acnetrex-phase2/components/ui/aspect-ratio.jsx` | 140 bytes | `08b0aa0b05efc573c7d63363c03e83d4b101bfeb54140764e96ddea30659cfcc` |
| 33 | `acnetrex-phase2/components/ui/avatar.jsx` | 1,043 bytes | `703fb6852952bd039b68dc494c004eee1d835fa12647b851722ab9b6b3058b32` |
| 34 | `acnetrex-phase2/components/ui/badge.jsx` | 990 bytes | `380dcda78ff8fdd80c82b89cb7dd38ffd84c355735fc8f16300ff647e15988aa` |
| 35 | `acnetrex-phase2/components/ui/breadcrumb.jsx` | 2,271 bytes | `4c0972765dc0212c5101446cb931db44b7db68a21ef9d7bc8a75c46f9bb96e42` |
| 36 | `acnetrex-phase2/components/ui/button.jsx` | 1,679 bytes | `6c28699c64ff8c36ec5a2baf835d6bfa141cedeaf472b97d64671dac6cf7cbf8` |
| 37 | `acnetrex-phase2/components/ui/calendar.jsx` | 2,851 bytes | `06e0c81497bda70ac24855b54fddd385557cbc3be8d8066a345bedbec551b3ee` |
| 38 | `acnetrex-phase2/components/ui/card.jsx` | 1,440 bytes | `8ab6f42e722e9c51752ce2f14aabb2696bddc0b6818041fb8f313f670955c2c4` |
| 39 | `acnetrex-phase2/components/ui/carousel.jsx` | 4,821 bytes | `55eb9456609f96f5c28c1fa35fe79554fc0ffab12883e3aceb041ff10e347e83` |
| 40 | `acnetrex-phase2/components/ui/chart.jsx` | 8,639 bytes | `c4684b470cae53b857a08e5fe006d4406450a442a103858beb179ec810aba2b3` |
| 41 | `acnetrex-phase2/components/ui/checkbox.jsx` | 880 bytes | `b0260cb7767493d8273f5def1b7d32e844d068db5f5760258d333ae6ad88f0d8` |
| 42 | `acnetrex-phase2/components/ui/collapsible.jsx` | 329 bytes | `f4cdd104de29928bfcd40b865c7d08eed9157a537fbb8b5e6d0921f02b63cc04` |
| 43 | `acnetrex-phase2/components/ui/command.jsx` | 3,897 bytes | `e7cea37aff49e211ffea1bf3ed67add6ce1ab29862e902aff739fcd11014f06f` |
| 44 | `acnetrex-phase2/components/ui/context-menu.jsx` | 5,995 bytes | `5fe320cad9ee1833e9528f86e340f83f419f77790549f4cff083fad329e8dc4c` |
| 45 | `acnetrex-phase2/components/ui/dialog.jsx` | 3,228 bytes | `50a7cc4ae5ce0f2527662ed9742d35b8c4933d1629a2740b26890793aee00742` |
| 46 | `acnetrex-phase2/components/ui/drawer.jsx` | 2,359 bytes | `3d2dce97d3f6bc5dfa887e87c6688228298526bfdc29a28f2edbd6c1dc2eb47a` |
| 47 | `acnetrex-phase2/components/ui/dropdown-menu.jsx` | 6,157 bytes | `d36cd67e71781bbb03059b057b6f686445477a4275120359178729574398c465` |
| 48 | `acnetrex-phase2/components/ui/form.jsx` | 3,141 bytes | `d899b071230c321acdb2996cbe02d84a46dd9825f81af1015f7e54c6b9ee211c` |
| 49 | `acnetrex-phase2/components/ui/hover-card.jsx` | 1,070 bytes | `3b49e533ad60995767a3419351642037438e8f27b62132115fc71115cf1fd0ad` |
| 50 | `acnetrex-phase2/components/ui/input-otp.jsx` | 1,811 bytes | `78a437a82203c1d9d22d47db830bdc67d49d6473c5c28ad77634eeb8c399a649` |
| 51 | `acnetrex-phase2/components/ui/input.jsx` | 690 bytes | `4455aea152904f128df0ecd82047bbceb23e06ffcc9ccc7cbb3bcc87df5bcc4f` |
| 52 | `acnetrex-phase2/components/ui/label.jsx` | 525 bytes | `37c6425d2a5c798ade4e60f89f86054d703433a8977e12d796de2b5bb4e3d0b7` |
| 53 | `acnetrex-phase2/components/ui/menubar.jsx` | 6,790 bytes | `5411f1b8221d9a34fc9b58f830642cfa3a33c776d0072014690e2f024515391d` |
| 54 | `acnetrex-phase2/components/ui/navigation-menu.jsx` | 4,217 bytes | `a1f789747cb750329a33ee04c54209b044239a15ba200fb9d7da1f2ce6b73403` |
| 55 | `acnetrex-phase2/components/ui/pagination.jsx` | 2,322 bytes | `1d519fc3ba1c8c6cf7f2d30c98739ecba2fa7af35cbc024d6793785e7a6d65c8` |
| 56 | `acnetrex-phase2/components/ui/popover.jsx` | 1,166 bytes | `199cc7b3d810013867ae91305f0966b8a66526a1c13d10248c38ee1797d169db` |
| 57 | `acnetrex-phase2/components/ui/progress.jsx` | 667 bytes | `1ad2808d51c365f04f23a4e985b03274dcc30735d74db68e1f78332a6533859c` |
| 58 | `acnetrex-phase2/components/ui/radio-group.jsx` | 1,135 bytes | `10ced1e6932e4fe53d6c18201f50b8bb4b334b4372f01ce5f0993aa2a6bb9110` |
| 59 | `acnetrex-phase2/components/ui/resizable.jsx` | 1,570 bytes | `4e74fb31b8321012570554dc8c55a58aacf1adcced2fdc43085c67ff96ce9773` |
| 60 | `acnetrex-phase2/components/ui/scroll-area.jsx` | 1,362 bytes | `3de4bed34be51a940243b0fbf8c6d9324ecb416a91a919d65ca18d15a7ba32a1` |
| 61 | `acnetrex-phase2/components/ui/select.jsx` | 4,677 bytes | `15c7a0e4c45b655ffa8d3f3be8bdaab727a19fd6baa95b34056bf02c7254243e` |
| 62 | `acnetrex-phase2/components/ui/separator.jsx` | 600 bytes | `2c82247abd573d0f4a93eb259166e3b778365b58c0d18921b4739d5ba4b29e7e` |
| 63 | `acnetrex-phase2/components/ui/sheet.jsx` | 3,549 bytes | `33f27d1b55925dbc354d0a61b0cbc6f977352da13f4df519f06e5b5bd9ed2d5c` |
| 64 | `acnetrex-phase2/components/ui/sidebar.jsx` | 20,643 bytes | `828bec5ac1ec715fe50deebae08a7da23f01e9b0dcb221b110e37de63eb22d3c` |
| 65 | `acnetrex-phase2/components/ui/skeleton.jsx` | 227 bytes | `c5f32316d9f8feeba529bac6321766424067185afee5f29a15bb18145adaf1bc` |
| 66 | `acnetrex-phase2/components/ui/slider.jsx` | 914 bytes | `1761bfaa0a06480b76b31511e4a5c24903b407732e027fc11ad615dd3d93a562` |
| 67 | `acnetrex-phase2/components/ui/sonner.jsx` | 799 bytes | `f1309f953467d583202225d08414161fc3183758ac38c997249eb63686a27ba8` |
| 68 | `acnetrex-phase2/components/ui/switch.jsx` | 1,025 bytes | `880e95637cc1d90ef4476f79114afd2fa7b5f6e5da1f49a70e0efc1f84aa0c8a` |
| 69 | `acnetrex-phase2/components/ui/table.jsx` | 2,231 bytes | `301509bb8337184f1b299cb15b8d4f8ec8f0d3bbc17a2ffdf33ff58f7eaa444e` |
| 70 | `acnetrex-phase2/components/ui/tabs.jsx` | 1,529 bytes | `57591bdfb3fa931b06edcf4168b6881a79785c674ad0618003d12cd656072350` |
| 71 | `acnetrex-phase2/components/ui/textarea.jsx` | 587 bytes | `b64a8fabf495dd59dbfd23914334ffbdfa695f506a133370603a49eca1243f62` |
| 72 | `acnetrex-phase2/components/ui/toast.jsx` | 3,804 bytes | `8a98ef70908fd33627d09f6a5c715417b243502836539acda857843dd4817070` |
| 73 | `acnetrex-phase2/components/ui/toaster.jsx` | 785 bytes | `fc1bce32d9a45f5be28c67b486962b90eed76742f3c0995f5fb908ffc6bde3cd` |
| 74 | `acnetrex-phase2/components/ui/toggle-group.jsx` | 1,284 bytes | `1c7566b9f2aa00f0afdf161527be90588a11386158dca55425ea0d8c0e3883e4` |
| 75 | `acnetrex-phase2/components/ui/toggle.jsx` | 1,310 bytes | `e8fe6de52ef73d6fa868229ae7a21e681fb3088975847d6ee65a8387731c1c79` |
| 76 | `acnetrex-phase2/components/ui/tooltip.jsx` | 1,091 bytes | `73e47a5dde6c55aca2e32e429ba95d8746ce2cca02cc718613f337b5bc9f5f19` |
| 77 | `acnetrex-phase2/components/ui/use-toast.jsx` | 3,379 bytes | `40f2839736597a3f7d54e4359a375c5991ce58eb341d8abb944874ac0dce9bbc` |
| 78 | `acnetrex-phase2/config.jsonc` | 182 bytes | `93e6ffb4c5e312c134ec13ddc1979bfa2605d346ca4d7813b46da272d311ccfb` |
| 79 | `acnetrex-phase2/entities/OnboardingProfile.jsonc` | 610 bytes | `39ac714817f02fc88cd819801465867af2a6c9048b8928adc96dd22b41055dcf` |
| 80 | `acnetrex-phase2/entities/User.jsonc` | 251 bytes | `4de38108e89f3bb0c1c7411eabdd47f8899238f1580428a167de47b10c5b3a31` |
| 81 | `acnetrex-phase2/eslint.config.js` | 1,578 bytes | `b0ac68c36cb81cba5bbdd537620b03762164ba276e338fdba73981318f011e60` |
| 82 | `acnetrex-phase2/hooks/use-mobile.jsx` | 545 bytes | `a136217739e79f9d02440e711b9bd1abb6adf60f1a83b45a39a009a09568ad1c` |
| 83 | `acnetrex-phase2/index.css` | 2,654 bytes | `109a679bc72784a48e7c43a7e847eae7735ba486625a9f3b11af857be94eb916` |
| 84 | `acnetrex-phase2/index.html` | 859 bytes | `11204f82aeeb1b6da80d49fe5e3358ec6cfa940c5357d091e4220521485b2f97` |
| 85 | `acnetrex-phase2/jsconfig.json` | 583 bytes | `e73e9adf0fcd9194c496670efb5251825685314475c9548c3ec4d74056ccc75b` |
| 86 | `acnetrex-phase2/lib/AuthContext.jsx` | 4,902 bytes | `c5b2a5f5db9c78b8ec5b686b7a745f3a3fdc7dd892fe3a1b53676b52ca4967bc` |
| 87 | `acnetrex-phase2/lib/PageNotFound.jsx` | 3,930 bytes | `8536e2091188275762a6729ecd77a77b8c5f1187525ae4189df42c95ca42f196` |
| 88 | `acnetrex-phase2/lib/app-params.js` | 1,791 bytes | `d0c8c149528b705355dbc842096b6662df4610eba1f356285fee74211fc580d3` |
| 89 | `acnetrex-phase2/lib/query-client.js` | 197 bytes | `0a080b6d9a1ed9f5f32150d9e3faa928f955d2b8d6206831e2b1658e84612c92` |
| 90 | `acnetrex-phase2/lib/utils.js` | 190 bytes | `4f592359765d69c32c3617700fa111af9a6a9cac8f18cb1987c25503a343c203` |
| 91 | `acnetrex-phase2/main.jsx` | 189 bytes | `caa3bab80b647fbb53fccd2e80d6e190d45a4b06c92bf85e3968d87e8d891cec` |
| 92 | `acnetrex-phase2/package.json` | 3,259 bytes | `0c2fd2328d5eb574f503a308ac2dcaa95294ffc88562c6322a780aaef761f081` |
| 93 | `acnetrex-phase2/pages/Downloads.jsx` | 4,014 bytes | `da883faaa5320e452e5e808cd0d6d6825aed1b3c6a303ba400fe5f0fb7f65a2b` |
| 94 | `acnetrex-phase2/pages/FaceAtlas.jsx` | 445 bytes | `ddcce88d7106515d3a362707026cdaf84d4ae22239f7d5a9a9f5f09c116c1897` |
| 95 | `acnetrex-phase2/pages/ForgotPassword.jsx` | 2,434 bytes | `a5637ed3c56e98a97dd70ff74201a87383d9b9683af43599d39979e0b4a059f3` |
| 96 | `acnetrex-phase2/pages/Home.jsx` | 5,073 bytes | `1d3e8ac1deedd287d2e716a180f56b3818f3073caaf33e5fd90fcebf66e54c37` |
| 97 | `acnetrex-phase2/pages/Insights.jsx` | 2,404 bytes | `bdbdee5e57e7a5aa77515b720fed2a6dc077f8c0aba364a7428117edace6f860` |
| 98 | `acnetrex-phase2/pages/Login.jsx` | 3,986 bytes | `1a181be1838137c3f48865aea8b1ce1a9fdee6594ff2a109733400a691a9cfe0` |
| 99 | `acnetrex-phase2/pages/Logs.jsx` | 2,533 bytes | `bd5641ea42b30e1ce0122a2eead345dd6211e4650f2741af489cb571440ecfe3` |
| 100 | `acnetrex-phase2/pages/Onboarding.jsx` | 2,369 bytes | `eaa92d6e7cf338d4a7ec06b64119aa13dc1bd7d64ed625726637621913552b30` |
| 101 | `acnetrex-phase2/pages/Phase2Documentation.jsx` | 9,349 bytes | `b9af51f4cd98afff8529c4eb0fafe794986eef9e567a5f1799a6d7e0a40a7952` |
| 102 | `acnetrex-phase2/pages/Profile.jsx` | 3,230 bytes | `67666c67a36771b384f79ca2409d3a5cd35a3e29adf487526bdcaa87714a60d9` |
| 103 | `acnetrex-phase2/pages/Register.jsx` | 7,065 bytes | `bad1cc115555d4ee9ffc8dd55c27bd03969212286544ddf5d0396683de5f17f6` |
| 104 | `acnetrex-phase2/pages/ResetPassword.jsx` | 3,729 bytes | `e68c455710f69a5bd3028c3c42609eba8dd11155f076462cb3a1e0e18fc4c3f4` |
| 105 | `acnetrex-phase2/pages/daily-logs/ActivityLog.jsx` | 386 bytes | `07057d765da157953f72173204b873de4e4cecbd18954a54c774606410ac52fc` |
| 106 | `acnetrex-phase2/pages/daily-logs/ContactLog.jsx` | 356 bytes | `cf824594213302427cabad81d9b6cc68dd93a59c8dc2da6dd25aeb664e51a2ef` |
| 107 | `acnetrex-phase2/pages/daily-logs/CycleLog.jsx` | 371 bytes | `fc646da9405829d3928cea66d6d8fca889aec9ae46560bd350122c79d74b4e73` |
| 108 | `acnetrex-phase2/pages/daily-logs/FoodLog.jsx` | 390 bytes | `a6330afe628993a04b05d7f63f86ff24f3beffd01d3136286cec92cce0e47574` |
| 109 | `acnetrex-phase2/pages/daily-logs/HydrationLog.jsx` | 360 bytes | `a5b1d5113d412c2688465f84886886404157d9974672d4862a70b4dc50e17e74` |
| 110 | `acnetrex-phase2/pages/daily-logs/RoutineLog.jsx` | 391 bytes | `5d08ae0aef4484a2b81428f5b471486de03f3aa9813b9ef87ceb2065100d6d36` |
| 111 | `acnetrex-phase2/pages/daily-logs/SkinStateLog.jsx` | 362 bytes | `50bfba433c0e2cd5cf8d2b459a221a8d2f355167491608b0f9b04d36c7d1b1d5` |
| 112 | `acnetrex-phase2/pages/daily-logs/SleepLog.jsx` | 383 bytes | `7af8836fe6ba82acbf0b351bf1b9cc7adde09086872bca4fbfd8e6bf562c38a7` |
| 113 | `acnetrex-phase2/pages/daily-logs/StressLog.jsx` | 357 bytes | `f78d96ca8d21d632ea5a029445d2f4c82b962375705f14ed1e18e00e7bee8e51` |
| 114 | `acnetrex-phase2/pages/daily-logs/TreatmentLog.jsx` | 372 bytes | `e7700c46ce3129570a7e3eb9c7685acf078c5e5a2adbd13314e661d44f5d20cd` |
| 115 | `acnetrex-phase2/pages/insights/Barrier.jsx` | 386 bytes | `962f022d055ad3609e0a0782a0f06337fa21f345c1b310125e4b907af8a970ac` |
| 116 | `acnetrex-phase2/pages/insights/Climate.jsx` | 404 bytes | `7a6008d994a1ada1ac35cd13244c41a888c911cf6a1eeb7d568cf840e8377e83` |
| 117 | `acnetrex-phase2/pages/insights/CutisAI.jsx` | 406 bytes | `d4e402d55f969428106b160764915048bb9fbf3938aab7e1358aa809394d282a` |
| 118 | `acnetrex-phase2/pages/insights/Forecast.jsx` | 395 bytes | `0a2d9c98c0d0b79223bb20b000fce019de4aab429670e7cc2a104c7cdb7be1b7` |
| 119 | `acnetrex-phase2/pages/insights/Intelligence.jsx` | 406 bytes | `878d34a4f9abef53b61b687337adf481c2437637049d0ad343cf9884aed6eb1f` |
| 120 | `acnetrex-phase2/pages/insights/Products.jsx` | 427 bytes | `6a6ddba001716fb4b18a6415d3a1c737b97f09f692984696f60cee8c5264eb52` |
| 121 | `acnetrex-phase2/pages/insights/Reports.jsx` | 408 bytes | `5309b27de79142544613c211a317fe8ebfbe05ebe01417c39fbd8b1deac155b4` |
| 122 | `acnetrex-phase2/pages/insights/SkinTwin.jsx` | 405 bytes | `ecfecc62baa9928a3ea99d5d1b643effb84010df6c198263991586340d25637b` |
| 123 | `acnetrex-phase2/pages/insights/Treatments.jsx` | 422 bytes | `8a23138cb5321ca95cd9c342824a5229912c3105638d44617d2bdd8e0627b5e6` |
| 124 | `acnetrex-phase2/pages/insights/Triggers.jsx` | 381 bytes | `2567b2c30f4b8367e5486ed36e8a589411092db06fd51503398d7aeb05adbb6b` |
| 125 | `acnetrex-phase2/postcss.config.js` | 80 bytes | `190c877db466995bf1482f4a16abd06e04a89ede3119341e2a86ff96e1737b27` |
| 126 | `acnetrex-phase2/tailwind.config.js` | 2,598 bytes | `7b8434c2adeffe61bbb861e11a2af2e1cc3228f64f61ac7b246e3c86ba7c8d4e` |
| 127 | `acnetrex-phase2/utils/index.ts` | 97 bytes | `1bd31d3e8630b19dcb1d92878a2501d5e29fc935eab48ec5d90e66c410cf7e1a` |
| 128 | `acnetrex-phase2/vite.config.js` | 617 bytes | `d92e1eb3037080aa2a643aa3e7fd23b26ba946db9b78ce17e31e2dfc0bb1a586` |

---

## 6. Phase 2 ZIP Expanded Source Files


### 6.1. `acnetrex-phase2/.app.jsonc`

- Size: 38 bytes
- SHA-256: `235d7042df349f8292c8f8d6525064ed7e358db34d0d6961cdc60dc3c2061a5c`

````jsonc
{
  "id": "6a436f3c053ca3bf67c50ecc"
}
````

### 6.2. `acnetrex-phase2/.gitignore`

- Size: 284 bytes
- SHA-256: `f50b753b9884dbeec612495f084d3bc8010c0c84ca5cf5a16f54a77da4551fb1`

````
#env
.env
.env.*

# Logs
/logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

.env
.vite
````

### 6.3. `acnetrex-phase2/AGENTS.md`

- Size: 1,592 bytes
- SHA-256: `e2c30f526e2bf4cc7bf0e53d396ca8306269a19040a5b5b90a2e5c6ceb9b93be`

````markdown
# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.
````

### 6.4. `acnetrex-phase2/App.jsx`

- Size: 5,420 bytes
- SHA-256: `aae21d80f7afd909a632d46d78deae6d755308bfc0423904719f974b4b67eac8`

````jsx
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Onboarding
import Onboarding from '@/pages/Onboarding';

// App layout & pages
import AppLayout from '@/components/AppLayout';
import Home from '@/pages/Home';
import Logs from '@/pages/Logs';
import FaceAtlas from '@/pages/FaceAtlas';
import Insights from '@/pages/Insights';
import Profile from '@/pages/Profile';

// Log sub-pages
import SleepLog from '@/pages/daily-logs/SleepLog';
import FoodLog from '@/pages/daily-logs/FoodLog';
import StressLog from '@/pages/daily-logs/StressLog';
import ActivityLog from '@/pages/daily-logs/ActivityLog';
import HydrationLog from '@/pages/daily-logs/HydrationLog';
import SkinStateLog from '@/pages/daily-logs/SkinStateLog';
import RoutineLog from '@/pages/daily-logs/RoutineLog';
import TreatmentLog from '@/pages/daily-logs/TreatmentLog';
import ContactLog from '@/pages/daily-logs/ContactLog';
import CycleLog from '@/pages/daily-logs/CycleLog';

// Insight sub-pages
import Forecast from '@/pages/insights/Forecast';
import Triggers from '@/pages/insights/Triggers';
import Barrier from '@/pages/insights/Barrier';
import Products from '@/pages/insights/Products';
import CutisAI from '@/pages/insights/CutisAI';
import Intelligence from '@/pages/insights/Intelligence';
import SkinTwin from '@/pages/insights/SkinTwin';
import Treatments from '@/pages/insights/Treatments';
import Reports from '@/pages/insights/Reports';
import Climate from '@/pages/insights/Climate';
import Phase2Documentation from '@/pages/Phase2Documentation';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/logs/sleep" element={<SleepLog />} />
          <Route path="/logs/food" element={<FoodLog />} />
          <Route path="/logs/stress" element={<StressLog />} />
          <Route path="/logs/activity" element={<ActivityLog />} />
          <Route path="/logs/hydration" element={<HydrationLog />} />
          <Route path="/logs/skin-state" element={<SkinStateLog />} />
          <Route path="/logs/routine" element={<RoutineLog />} />
          <Route path="/logs/treatment" element={<TreatmentLog />} />
          <Route path="/logs/contact" element={<ContactLog />} />
          <Route path="/logs/cycle" element={<CycleLog />} />
          <Route path="/face-atlas" element={<FaceAtlas />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/forecast" element={<Forecast />} />
          <Route path="/insights/triggers" element={<Triggers />} />
          <Route path="/insights/barrier" element={<Barrier />} />
          <Route path="/insights/products" element={<Products />} />
          <Route path="/insights/cutisai" element={<CutisAI />} />
          <Route path="/insights/intelligence" element={<Intelligence />} />
          <Route path="/insights/skin-twin" element={<SkinTwin />} />
          <Route path="/insights/treatments" element={<Treatments />} />
          <Route path="/insights/reports" element={<Reports />} />
          <Route path="/insights/climate" element={<Climate />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/docs/phase2" element={<Phase2Documentation />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
````

### 6.5. `acnetrex-phase2/CLAUDE.md`

- Size: 57 bytes
- SHA-256: `4c9691fea1d31f325645a9d86163cb92ff0097d7cd04cae4ab7d7aff05fa97cd`

````markdown
# See AGENTS.md

Follow the instructions in `AGENTS.md`.
````

### 6.6. `acnetrex-phase2/PHASE2_DOCUMENTATION.md`

- Size: 8,827 bytes
- SHA-256: `1a4ff5005bdd6174786ef268a194a6ab5041ec344a7a324ecd9c54f26ad7463c`

````markdown
# AcneTrex V3 — Phase 2: UI Prototype & Onboarding Implementation Log

**Platform:** Base44 (Free Tier Web App Builder)  
**Date:** 2026-06-30  
**Status:** Complete — Frontend UI prototype with onboarding and placeholder navigation

---

## Summary

Phase 2 used Base44 to scaffold the AcneTrex V3 frontend UI prototype. The deliverables include:

1. **Pre-Account Consent Education Flow** (8 steps)
2. **Mandatory Personalization Onboarding** (7 steps)
3. **Main App Shell** with bottom tab navigation
4. **Placeholder Screens** for all major modules
5. **This documentation log**

---

## Screens Produced

### Pre-Account Consent Flow (8 screens)

| Step | Screen | Required | Default |
|------|--------|----------|---------|
| 1 | Terms of Use | Yes | Off |
| 2 | Privacy Policy | Yes | Off |
| 3 | Health Data Processing | Yes | Off |
| 4 | AI Limitations / Non-Diagnostic | Yes | Off |
| 5 | Camera & Media Education | Yes | Off |
| 6 | Notification Education | Yes | Off |
| 7 | Anonymous Network Learning | Optional | Off |
| 8 | Raw Image Model Improvement | Optional | Off |

### Mandatory Onboarding Wizard (7 steps)

| Step | Title | Fields Collected |
|------|-------|-----------------|
| 1 | Basic Profile | Age range, timezone, primary goals, guidance style |
| 2 | Skin History | Acne onset (13 options per PRD), severity, breakout zones, lesion types, free-text notes |
| 3 | Skin Type & Barrier | Skin type, sensitivity, barrier symptoms, actives tolerance |
| 4 | Routine & Products | Routine timing, current products, sunscreen behavior, recent changes |
| 5 | Lifestyle & Triggers | Sleep quality, stress, meal frequency, snack frequency, dairy, exercise |
| 6 | Goals & Constraints | Urgency, complexity tolerance, medication openness, fragrance preference |
| 7 | Consent & Learning | Anonymous learning, derived features, annotations, raw images, evidence retrieval, revocation |

### Main App Navigation (5 bottom tabs)

| Tab | Screen | Purpose |
|-----|--------|---------|
| Today | Dashboard | Daily command center with AI status, tasks, quick actions, modules |
| Logs | Log Hub | 10 daily log types with navigation |
| FaceAtlas | Face Analysis | Placeholder for multi-angle scan |
| Insights | Intelligence Hub | 10 insight modules with navigation |
| Profile | User Profile | Settings, consent, badges, reports, account |

### Log Sub-screens (10 total)
Sleep, Food, Stress, Activity, Hydration, Skin State, Routine, Treatment, Contact, Cycle

### Insight Sub-screens (10 total)
Forecast, TriggerGraph, BarrierGuard, FormulaLens, CutisAI, Intelligence Core, Skin Twin Lab, Treatment Plan Center, Reports, ClimateSkin Radar

---

## PRD Compliance Notes

### Respected Requirements
- Pre-account consent education flow with all 8 required consent states
- Mandatory onboarding with progress indicators, defined answer sets, multi-select chips
- "Not sure," "Not applicable," "Prefer not to answer" options for sensitive fields
- Stitch-derived Skin History with 13 acne-onset options and structured values
- Meal frequency baseline capture for adaptive food logging
- Anonymous learning OFF by default, raw image consent OFF by default
- Revocation acknowledgement before proceeding
- Mobile-first, touch-friendly design with large cards and adequate touch targets
- Navigation structure matching PRD section 12.1 and 12.2
- Premium, clinical, calm, non-judgmental visual tone
- Zero-fabrication: all placeholder screens clearly labeled "Coming in a future phase"
- No fake scores, mock data, or random values displayed anywhere
- Built-in Base44 authentication (email/password + Google OAuth)

### Known Limitations (Base44 Platform)
- **No React Native export**: Base44 generates React web code, not Expo React Native. The generated code must be manually translated or rebuilt in the target mobile framework.
- **No backend logic**: Base44's free tier provides only frontend code. All backend logic (AI/ML engines, evidence retrieval, forecasting, reports, treatment planning) must be implemented in later phases using FastAPI/Supabase.
- **No complex validation**: Multi-step conditional branching and autosave-on-return are simplified. Full resume-on-return requires backend persistence.
- **No offline support**: Base44 apps are web-only; offline queue, secure storage, and background sync require native implementation.
- **No native camera/media**: FaceAtlas camera flow requires Expo Camera in the real app.
- **No push notifications**: Requires expo-notifications + backend scheduling.
- **Placeholder API calls**: The onboarding saves to Base44's built-in entity system. Later phases must replace these with real API calls to the FastAPI backend.

---

## Architecture Decisions

1. **Entity Schema**: Created OnboardingProfile entity with answers (JSON), consent_states (JSON), completed (boolean), and current_step (string) to support resume-on-return.
2. **Component Structure**: Onboarding uses a wizard pattern with independent step components. Each step manages its own validation state and passes data up.
3. **Consent Flow**: Separated into its own pre-registration flow with 8 steps. Required consents block progression; optional items (anonymous learning, raw images) default to OFF.
4. **Navigation**: 5 bottom tabs matching PRD section 12.1. Sub-screens use stack navigation patterns within the web router.
5. **Design System**: Emerald/green accent (brand colors), Inter font, rounded cards with generous white space, clinical calm aesthetic.

---

## Handoff Notes for Later Phases

### Phase 3+ Must:
1. Replace Base44 entities with real PostgreSQL tables via Supabase/FastAPI
2. Implement autosave — currently saves only on completion
3. Add conditional branching — e.g., cycle tracking questions only if user enables it
4. Build real FaceAtlas camera flow with Expo Camera
5. Connect all placeholder screens to real backend services
6. Implement Treatment Plan Center with evidence retrieval and calendar
7. Build CutisAI with backend LLM routing and evidence layer
8. Add offline queue for daily logs
9. Implement push notifications tied to real events
10. Translate to Expo React Native from React web code

---

## Code Organization

- `src/components/onboarding/` — Consent flow, wizard, shared components
- `src/components/onboarding/steps/` — Individual onboarding step components
- `src/pages/` — Main app pages
- `src/pages/daily-logs/` — Log sub-pages (placeholder)
- `src/pages/insights/` — Insight sub-pages (placeholder)
- `src/components/AppLayout.jsx` — Bottom tab navigation layout
- `src/components/PlaceholderScreen.jsx` — Reusable coming-soon template

---

## Files Modified/Created

### Entities
- `base44/entities/OnboardingProfile.jsonc`

### Components (14 files)
- `src/components/onboarding/ConsentFlow.jsx`
- `src/components/onboarding/OnboardingWizard.jsx`
- `src/components/onboarding/OnboardingChip.jsx`
- `src/components/onboarding/OnboardingCard.jsx`
- `src/components/onboarding/FieldLabel.jsx`
- `src/components/onboarding/steps/StepBasicProfile.jsx`
- `src/components/onboarding/steps/StepSkinHistory.jsx`
- `src/components/onboarding/steps/StepSkinType.jsx`
- `src/components/onboarding/steps/StepRoutine.jsx`
- `src/components/onboarding/steps/StepLifestyle.jsx`
- `src/components/onboarding/steps/StepGoals.jsx`
- `src/components/onboarding/steps/StepConsentLearning.jsx`
- `src/components/AppLayout.jsx`
- `src/components/PlaceholderScreen.jsx`

### Pages (25 files)
- `src/pages/Onboarding.jsx`
- `src/pages/Home.jsx`
- `src/pages/Logs.jsx`
- `src/pages/FaceAtlas.jsx`
- `src/pages/Insights.jsx`
- `src/pages/Profile.jsx`
- `src/pages/Phase2Documentation.jsx`
- 10 log sub-pages in `src/pages/daily-logs/`
- 10 insight sub-pages in `src/pages/insights/`

### Config
- `src/App.jsx` — Full router with all routes
- `src/index.css` — Updated brand colors and fonts
- `index.html` — Updated title, meta, and fonts
- `tailwind.config.js` — Tailwind configuration
- `package.json` — Dependencies and scripts

---

## How to Use This Code

1. **Clone or extract** this zip to your local machine
2. Run `npm install` to install all dependencies
3. Run `npm run dev` to start the development server
4. The app will run at `http://localhost:5173`
5. You will need a Base44 account and API key for the backend (auth, entities)
6. Replace placeholder screens with real backend integrations in Phase 3+

---

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Icons:** lucide-react
- **Routing:** react-router-dom v6
- **State:** React hooks + @tanstack/react-query
- **Backend:** Base44 BaaS (auth, database, entities)
- **Charts:** recharts
- **Markdown:** react-markdown
- **Animations:** framer-motion

---

_Generated on 2026-06-30 by Base44 AI Agent_
````

### 6.7. `acnetrex-phase2/README.md`

- Size: 2,377 bytes
- SHA-256: `0b85af18216348ca22df4be7aeb412731da75e88fd740db231a4c97fed994813`

````markdown
# Base44 Project

Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.

See the [Base44 CLI docs](https://docs.base44.com/developers/references/cli/get-started/overview) if you want to run Base44 commands directly.

## Run Locally

Run the full local development environment from the project root:

```bash
base44 dev
```

`base44 dev` starts the local Base44 development backend and, when this app is configured for it, also starts the frontend dev server for you. Use the frontend URL printed by the command.

For example, when the Base44 project config includes a `serveCommand`, `base44 dev` can launch the frontend too:

```json5
{
  "site": {
    "serveCommand": "npm run dev"
  }
}
```

In a Base44 project this lives in `base44/config.jsonc`.

## Run Only The Frontend

If you only want to work on the frontend against the hosted Base44 backend, run:

```bash
npm run dev
```

Open the local URL printed by Vite.

## Use The Hosted Backend

For frontend-only development, create or update `.env.local` in the project root:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

`VITE_BASE44_APP_ID` identifies the Base44 app.

`VITE_BASE44_APP_BASE_URL` tells the Base44 Vite plugin where to send local `/api` requests. Point it at your deployed Base44 app URL when you want the local frontend to use the hosted backend.

When you use `base44 dev`, the command injects the local Base44 values for you, so `.env.local` is mainly needed for frontend-only workflows.

## Publish Your Changes

After pushing your changes to git, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

## Docs & Support

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Base44 CLI command reference: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)

Support: [https://app.base44.com/support](https://app.base44.com/support)
````

### 6.8. `acnetrex-phase2/api/base44Client.js`

- Size: 337 bytes
- SHA-256: `35647ef13677f2b23399843531e82cb49521bcd6cd09f00e23888b0d7973cf2e`

````javascript
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});
````

### 6.9. `acnetrex-phase2/components.json`

- Size: 444 bytes
- SHA-256: `73e1334afce0f20f01500532e3b63a7cc36238d8a05addef40c476fadf9dc349`

````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": false,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
````

### 6.10. `acnetrex-phase2/components/AppLayout.jsx`

- Size: 2,299 bytes
- SHA-256: `ebbc97d4114a4513e05f0f314fb2c977de43b137acad23f43a8ef95d5c3c9c0e`

````jsx
import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, ClipboardList, ScanFace, Lightbulb, User } from "lucide-react";

const TABS = [
  { path: "/", icon: LayoutDashboard, label: "Today" },
  { path: "/logs", icon: ClipboardList, label: "Logs" },
  { path: "/face-atlas", icon: ScanFace, label: "FaceAtlas" },
  { path: "/insights", icon: Lightbulb, label: "Insights" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    base44.entities.OnboardingProfile.list().then(profiles => {
      if (!profiles.length || !profiles[0].completed) {
        navigate("/onboarding");
      }
      setCheckingOnboarding(false);
    }).catch(() => setCheckingOnboarding(false));
  }, []);

  if (checkingOnboarding) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {TABS.map(tab => {
            const active = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
            return (
              <Link key={tab.path} to={tab.path} className="flex flex-col items-center gap-0.5 py-1 px-3">
                <tab.icon className={`w-5 h-5 transition-colors ${active ? "text-emerald-600" : "text-gray-400"}`} />
                <span className={`text-[10px] font-medium transition-colors ${active ? "text-emerald-600" : "text-gray-400"}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
````

### 6.11. `acnetrex-phase2/components/AuthLayout.jsx`

- Size: 955 bytes
- SHA-256: `27191e5279ab7a6d30609f7954c64edf586ce11817ca50ca63ed03bd432629ce`

````jsx
import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
````

### 6.12. `acnetrex-phase2/components/GoogleIcon.jsx`

- Size: 833 bytes
- SHA-256: `4d5d7b5c6a368f8246fe088eaa158b2cd0872bfafa8e5c495ec39ebb697c4f6b`

````jsx
import React from "react";

export default function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
````

### 6.13. `acnetrex-phase2/components/PlaceholderScreen.jsx`

- Size: 1,158 bytes
- SHA-256: `5496bed75e402217aa7f586cf2828643bdb7f9891ebf14ed638a0f437c1bfe77`

````jsx
import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PlaceholderScreen({ title, description, icon: Icon, backPath }) {
  return (
    <div className="px-5 pt-6">
      {backPath && (
        <Link to={backPath} className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      )}
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          {Icon && <Icon className="w-8 h-8 text-emerald-500" />}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 max-w-xs">{description || "This module will be connected to the real backend in a future phase."}</p>
        <div className="mt-6 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
          <p className="text-xs font-medium text-amber-700">Coming in a future phase</p>
        </div>
      </div>
    </div>
  );
}
````

### 6.14. `acnetrex-phase2/components/ProtectedRoute.jsx`

- Size: 1,069 bytes
- SHA-256: `f1121449bc7f8f31b2ed2d4a6e0211c8d300319efd58919efdd313dc7b586068`

````jsx
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}
````

### 6.15. `acnetrex-phase2/components/ScrollToTop.jsx`

- Size: 805 bytes
- SHA-256: `56f6ecc5d3f0bd692e7d4bb6d89f73ddac4148150718388ef8cf996a985f6138`

````jsx
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}
````

### 6.16. `acnetrex-phase2/components/UserNotRegisteredError.jsx`

- Size: 1,592 bytes
- SHA-256: `5cecb11fe2fb3a03a73e5845b5ee9d26c9255e80feda689b3dfc70822ba288f1`

````jsx
import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Restricted</h1>
          <p className="text-slate-600 mb-8">
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600">
            <p>If you believe this is an error, you can:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
````

### 6.17. `acnetrex-phase2/components/onboarding/ConsentFlow.jsx`

- Size: 7,569 bytes
- SHA-256: `32b5fc580f1fbcedfa6abadfe5b77a3d778e1186c1e11e2a866da625271d5fcf`

````jsx
import React, { useState } from "react";
import { Check, Shield, Brain, Camera, Bell, Users, Image, ChevronRight, ChevronLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";

const CONSENT_STEPS = [
  {
    id: "terms",
    icon: Shield,
    title: "Terms of Use",
    required: true,
    description: "By using AcneTrex, you agree to our Terms of Use. AcneTrex provides skin intelligence tools to help you understand your acne patterns — it does not replace professional medical advice.",
    label: "I acknowledge and accept the Terms of Use"
  },
  {
    id: "privacy",
    icon: Shield,
    title: "Privacy Policy",
    required: true,
    description: "Your personal skin data is private and user-owned. We use industry-standard encryption and never sell your data. You can export or delete your data at any time.",
    label: "I acknowledge and accept the Privacy Policy"
  },
  {
    id: "health_data",
    icon: Heart,
    title: "Health Data Processing",
    required: true,
    description: "AcneTrex processes health-related data including skin photos, daily logs, and lifestyle information to provide personalized insights. This data is stored securely and used only for your benefit.",
    label: "I acknowledge how my health data will be processed"
  },
  {
    id: "ai_limitations",
    icon: Brain,
    title: "AI Limitations",
    required: true,
    description: "AcneTrex is NOT a replacement for a dermatologist and does not diagnose disease. AI confidence levels, forecasts, and trigger hypotheses depend on available data — the app will tell you when data is insufficient rather than fabricate answers. Medical decisions must be made with a qualified healthcare provider.",
    label: "I understand AcneTrex does not provide medical diagnosis"
  },
  {
    id: "camera_media",
    icon: Camera,
    title: "Camera & Media",
    required: true,
    description: "FaceAtlas uses your camera to analyze skin condition through multi-angle photos. Raw face images are controlled by you — they're stored temporarily for analysis, then deleted unless you choose to retain them. You can delete any image at any time.",
    label: "I understand how camera and media will be used"
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    required: true,
    description: "AcneTrex can send you personalized reminders for logging, scan schedules, treatment plans, and important insights. You control which notification types you receive, and you can change preferences anytime.",
    label: "I understand how notifications will be used"
  },
  {
    id: "anonymous_learning",
    icon: Users,
    title: "Anonymous Network Learning",
    required: false,
    defaultOff: true,
    description: "You can optionally contribute de-identified data to improve AI accuracy for all users. This is completely optional and OFF by default. You receive full personal AI personalization without joining. You can revoke participation at any time.",
    label: "Opt in to anonymous network learning (optional)"
  },
  {
    id: "raw_image_consent",
    icon: Image,
    title: "Raw Image Model Improvement",
    required: false,
    defaultOff: true,
    description: "Separately from anonymous learning, you can optionally allow de-identified raw images to be used for model improvement. This is OFF by default and completely separate from other consent choices. You can revoke this at any time.",
    label: "Allow raw images for model improvement (optional)"
  }
];

export default function ConsentFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [consents, setConsents] = useState(() => {
    const initial = {};
    CONSENT_STEPS.forEach(s => {
      initial[s.id] = s.defaultOff ? false : false;
    });
    return initial;
  });

  const step = CONSENT_STEPS[currentStep];
  const isLast = currentStep === CONSENT_STEPS.length - 1;
  const canProceed = step.required ? consents[step.id] : true;

  const handleNext = () => {
    if (isLast) {
      onComplete(consents);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AcneTrex</h1>
          <p className="text-xs text-emerald-600 font-medium tracking-widest uppercase mt-1">Privacy & Safety</p>
        </div>
        <div className="flex gap-1.5 mb-2">
          {CONSENT_STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= currentStep ? "bg-emerald-500" : "bg-gray-200"}`} />
          ))}
        </div>
        <p className="text-xs text-gray-500 text-right">{currentStep + 1} of {CONSENT_STEPS.length}</p>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-1 flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                <step.icon className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h2>
              {step.required && (
                <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mb-3 w-fit">Required</span>
              )}
              {!step.required && (
                <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mb-3 w-fit">Optional — Default Off</span>
              )}
              <p className="text-sm text-gray-600 leading-relaxed flex-1">{step.description}</p>

              <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <Switch
                  checked={consents[step.id]}
                  onCheckedChange={(val) => setConsents(prev => ({ ...prev, [step.id]: val }))}
                />
                <label className="text-sm text-gray-700 leading-snug cursor-pointer" onClick={() => setConsents(prev => ({ ...prev, [step.id]: !prev[step.id] }))}>
                  {step.label}
                </label>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setCurrentStep(prev => prev - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button
            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!canProceed}
            onClick={handleNext}
          >
            {isLast ? "Continue to Sign Up" : "Next"} {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
````

### 6.18. `acnetrex-phase2/components/onboarding/FieldLabel.jsx`

- Size: 384 bytes
- SHA-256: `503b8a7ea6b5c74e6f61a47d47ea41ca63d1011ef6948b446affefbd38b1c6c1`

````jsx
import React from "react";

export default function FieldLabel({ label, required, helpText }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {helpText && <p className="text-xs text-gray-500 mt-0.5">{helpText}</p>}
    </div>
  );
}
````

### 6.19. `acnetrex-phase2/components/onboarding/OnboardingCard.jsx`

- Size: 628 bytes
- SHA-256: `14901e8d7716041d822e6e9ddfb9acb5760ffb08b9a5fd536d813819a96602a7`

````jsx
import React from "react";

export default function OnboardingCard({ label, selected, onClick, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200
        ${selected
          ? "bg-emerald-50 border-emerald-300 shadow-sm"
          : "bg-white border-gray-200 hover:border-gray-300"
        }`}
    >
      <p className={`text-sm font-medium ${selected ? "text-emerald-800" : "text-gray-800"}`}>{label}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </button>
  );
}
````

### 6.20. `acnetrex-phase2/components/onboarding/OnboardingChip.jsx`

- Size: 482 bytes
- SHA-256: `7fd3f94a21a8e494211f812d9e781d2d79845004251bd883b636a6044410a5f7`

````jsx
import React from "react";

export default function OnboardingChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
        ${selected
          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
        }`}
    >
      {label}
    </button>
  );
}
````

### 6.21. `acnetrex-phase2/components/onboarding/OnboardingWizard.jsx`

- Size: 4,832 bytes
- SHA-256: `0f3c5eb3a671aca8580955ee835d38d069abb5d5d5d3366ad75eea5dab2172cf`

````jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepBasicProfile from "@/components/onboarding/steps/StepBasicProfile";
import StepSkinHistory from "@/components/onboarding/steps/StepSkinHistory";
import StepSkinType from "@/components/onboarding/steps/StepSkinType";
import StepRoutine from "@/components/onboarding/steps/StepRoutine";
import StepLifestyle from "@/components/onboarding/steps/StepLifestyle";
import StepGoals from "@/components/onboarding/steps/StepGoals";
import StepConsentLearning from "@/components/onboarding/steps/StepConsentLearning";

const STEPS = [
  { id: "basic", title: "Basic Profile", subtitle: "Let's get to know you", component: StepBasicProfile },
  { id: "skin_history", title: "Skin History", subtitle: "Your acne journey", component: StepSkinHistory },
  { id: "skin_type", title: "Skin Type & Barrier", subtitle: "Understanding your skin", component: StepSkinType },
  { id: "routine", title: "Routine & Products", subtitle: "Your current care", component: StepRoutine },
  { id: "lifestyle", title: "Lifestyle & Triggers", subtitle: "Daily patterns", component: StepLifestyle },
  { id: "goals", title: "Goals & Constraints", subtitle: "What matters to you", component: StepGoals },
  { id: "consent_learning", title: "Consent & Learning", subtitle: "Your data choices", component: StepConsentLearning },
];

export default function OnboardingWizard({ consentStates, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [stepValid, setStepValid] = useState(false);

  const step = STEPS[currentStep];
  const StepComponent = step.component;
  const isLast = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleStepData = (data, isValid) => {
    setAnswers(prev => ({ ...prev, [step.id]: data }));
    setStepValid(isValid);
  };

  const handleNext = () => {
    if (isLast) {
      onComplete({ answers, consentStates });
    } else {
      setCurrentStep(prev => prev + 1);
      setStepValid(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-white flex flex-col">
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-emerald-600 tracking-widest uppercase">Step {currentStep + 1} of {STEPS.length}</p>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">{step.title}</h1>
            <p className="text-sm text-gray-500">{step.subtitle}</p>
          </div>
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="#059669" strokeWidth="3"
                strokeDasharray={`${progress * 1.257} 999`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-700">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <StepComponent
              data={answers[step.id] || {}}
              onChange={handleStepData}
              consentStates={consentStates}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-6 pt-3 bg-white border-t border-gray-100">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => { setCurrentStep(prev => prev - 1); setStepValid(true); }}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button
            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!stepValid}
            onClick={handleNext}
          >
            {isLast ? (
              <><Check className="w-4 h-4 mr-1" /> Complete Setup</>
            ) : (
              <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
````

### 6.22. `acnetrex-phase2/components/onboarding/steps/StepBasicProfile.jsx`

- Size: 3,068 bytes
- SHA-256: `f94a1ad58353721ba8410329d65361af689785d22a645f4c385355668fd2f50b`

````jsx
import React, { useEffect, useState } from "react";
import FieldLabel from "@/components/onboarding/FieldLabel";
import OnboardingChip from "@/components/onboarding/OnboardingChip";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AGE_RANGES = ["13–17", "18–24", "25–34", "35–44", "45+", "Prefer not to answer"];
const GOALS = ["Understand my triggers", "Reduce breakouts", "Track progress", "Prepare for dermatologist", "Optimize my routine", "Prevent scarring"];
const GUIDANCE_STYLES = [
  { label: "Gentle & supportive", description: "Encouraging reminders, soft language" },
  { label: "Direct & efficient", description: "Straight to the point, data-focused" },
  { label: "Detailed & educational", description: "Thorough explanations and context" },
];

export default function StepBasicProfile({ data, onChange }) {
  const [form, setForm] = useState({
    age_range: data.age_range || "",
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    primary_goals: data.primary_goals || [],
    guidance_style: data.guidance_style || "",
    ...data
  });

  useEffect(() => {
    const valid = form.age_range && form.primary_goals.length > 0 && form.guidance_style;
    onChange(form, !!valid);
  }, [form]);

  const toggleGoal = (g) => {
    setForm(prev => ({
      ...prev,
      primary_goals: prev.primary_goals.includes(g)
        ? prev.primary_goals.filter(x => x !== g)
        : [...prev.primary_goals, g]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel label="Age range" required helpText="Helps personalize recommendations safely" />
        <div className="flex flex-wrap gap-2">
          {AGE_RANGES.map(a => (
            <OnboardingChip key={a} label={a} selected={form.age_range === a} onClick={() => setForm(prev => ({ ...prev, age_range: a }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Timezone" required />
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 border border-gray-200">
          {form.timezone}
        </div>
      </div>

      <div>
        <FieldLabel label="Primary goals" required helpText="Select all that apply" />
        <div className="flex flex-wrap gap-2">
          {GOALS.map(g => (
            <OnboardingChip key={g} label={g} selected={form.primary_goals.includes(g)} onClick={() => toggleGoal(g)} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Guidance style" required helpText="How should AcneTrex communicate with you?" />
        <div className="space-y-2">
          {GUIDANCE_STYLES.map(s => (
            <OnboardingCard key={s.label} label={s.label} description={s.description}
              selected={form.guidance_style === s.label}
              onClick={() => setForm(prev => ({ ...prev, guidance_style: s.label }))} />
          ))}
        </div>
      </div>
    </div>
  );
}
````

### 6.23. `acnetrex-phase2/components/onboarding/steps/StepConsentLearning.jsx`

- Size: 4,496 bytes
- SHA-256: `cdf32424868d99599170f6ae5fca877de28f989f61ffc7c2ae74c643af9d745e`

````jsx
import React, { useEffect, useState } from "react";
import FieldLabel from "@/components/onboarding/FieldLabel";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, ScanFace, PenTool, FileText } from "lucide-react";

const CONSENT_ITEMS = [
  {
    id: "anonymous_learning",
    icon: Users,
    title: "Anonymous Network Learning",
    description: "Contribute de-identified data to help improve AI accuracy for all users. Your personal data stays private.",
    defaultOff: true,
  },
  {
    id: "derived_features",
    icon: ScanFace,
    title: "Derived Feature Contribution",
    description: "Allow scan-derived features (not raw images) to improve models.",
    defaultOff: true,
  },
  {
    id: "annotation_contribution",
    icon: PenTool,
    title: "Annotation Contribution",
    description: "Allow your lesion annotations to help calibrate AI lesion recognition.",
    defaultOff: true,
  },
  {
    id: "raw_image_consent",
    icon: ScanFace,
    title: "Raw Image Model Improvement",
    description: "Allow raw face images (de-identified) for model training. Separate from derived features.",
    defaultOff: true,
  },
  {
    id: "evidence_acknowledgement",
    icon: FileText,
    title: "Evidence Retrieval",
    description: "AcneTrex may retrieve external evidence for product, treatment, and science explanations. Medical decisions must be made with a healthcare provider.",
    required: true,
  },
];

export default function StepConsentLearning({ data, onChange }) {
  const [form, setForm] = useState({
    anonymous_learning: data.anonymous_learning || false,
    derived_features: data.derived_features || false,
    annotation_contribution: data.annotation_contribution || false,
    raw_image_consent: data.raw_image_consent || false,
    evidence_acknowledgement: data.evidence_acknowledgement || false,
    revocation_acknowledged: data.revocation_acknowledged || false,
    ...data
  });

  useEffect(() => {
    const valid = form.evidence_acknowledgement && form.revocation_acknowledged;
    onChange(form, !!valid);
  }, [form]);

  return (
    <div className="space-y-5">
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Your privacy is protected</p>
            <p className="text-xs text-emerald-700 mt-1">You receive full personal AI personalization without joining any optional programs. All items below are OFF by default.</p>
          </div>
        </div>
      </div>

      {CONSENT_ITEMS.map(item => (
        <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <Switch
                  checked={form[item.id]}
                  onCheckedChange={(val) => setForm(prev => ({ ...prev, [item.id]: val }))}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              {item.required && <span className="inline-block text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-2">Required</span>}
            </div>
          </div>
        </div>
      ))}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <Switch
            checked={form.revocation_acknowledged}
            onCheckedChange={(val) => setForm(prev => ({ ...prev, revocation_acknowledged: val }))}
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">Revocation Acknowledgement <span className="text-red-400">*</span></p>
            <p className="text-xs text-gray-500 mt-1">I understand I can revoke any consent at any time. Previously aggregated, de-identified contributions may not always be removable from already-trained models, but no future data will be used after revocation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
````

### 6.24. `acnetrex-phase2/components/onboarding/steps/StepGoals.jsx`

- Size: 3,002 bytes
- SHA-256: `30efd1b4debb79c2b10f5c75e6cadaf1742db40a97cdc51e1086eb6202367eb8`

````jsx
import React, { useEffect, useState } from "react";
import FieldLabel from "@/components/onboarding/FieldLabel";
import OnboardingChip from "@/components/onboarding/OnboardingChip";
import OnboardingCard from "@/components/onboarding/OnboardingCard";

const URGENCY = ["Not in a rush — I want to learn", "Moderate — want progress in weeks", "High — seeking fast improvement", "Preparing for a specific event", "Not sure"];
const COMPLEXITY = ["Keep it simple — minimal steps", "Moderate — willing to put in effort", "Comprehensive — I want the full routine", "Not sure"];
const MEDICATION = ["Open to trying OTC actives", "Currently on prescription", "Considering prescription", "Prefer non-prescription only", "Open to anything evidence-based", "Not sure", "Prefer not to answer"];
const FRAGRANCE = ["Fragrance-free preferred", "Don't mind fragrance", "No preference", "Not sure"];

export default function StepGoals({ data, onChange }) {
  const [form, setForm] = useState({
    urgency: data.urgency || "",
    complexity_tolerance: data.complexity_tolerance || "",
    medication_openness: data.medication_openness || "",
    fragrance_preference: data.fragrance_preference || "",
    ...data
  });

  useEffect(() => {
    const valid = form.urgency && form.complexity_tolerance && form.medication_openness;
    onChange(form, !!valid);
  }, [form]);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel label="How urgent is improvement?" required helpText="This shapes how aggressively we suggest changes" />
        <div className="space-y-2">
          {URGENCY.map(u => (
            <OnboardingCard key={u} label={u} selected={form.urgency === u}
              onClick={() => setForm(prev => ({ ...prev, urgency: u }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Routine complexity tolerance" required helpText="How many daily skincare steps are you willing to follow?" />
        <div className="space-y-2">
          {COMPLEXITY.map(c => (
            <OnboardingCard key={c} label={c} selected={form.complexity_tolerance === c}
              onClick={() => setForm(prev => ({ ...prev, complexity_tolerance: c }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Medication openness" required />
        <div className="flex flex-wrap gap-2">
          {MEDICATION.map(m => (
            <OnboardingChip key={m} label={m} selected={form.medication_openness === m}
              onClick={() => setForm(prev => ({ ...prev, medication_openness: m }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Fragrance preference" />
        <div className="flex flex-wrap gap-2">
          {FRAGRANCE.map(f => (
            <OnboardingChip key={f} label={f} selected={form.fragrance_preference === f}
              onClick={() => setForm(prev => ({ ...prev, fragrance_preference: f }))} />
          ))}
        </div>
      </div>
    </div>
  );
}
````

### 6.25. `acnetrex-phase2/components/onboarding/steps/StepLifestyle.jsx`

- Size: 3,773 bytes
- SHA-256: `0f5fd126919a0a806bf08d50bd43dd439631aaf6822c41a5ac61d5b09c1a4f03`

````jsx
import React, { useEffect, useState } from "react";
import FieldLabel from "@/components/onboarding/FieldLabel";
import OnboardingChip from "@/components/onboarding/OnboardingChip";
import OnboardingCard from "@/components/onboarding/OnboardingCard";

const SLEEP_QUALITY = ["Excellent", "Good", "Fair", "Poor", "Not sure"];
const STRESS_PATTERN = ["Low most days", "Moderate", "High", "Very high", "Variable", "Not sure"];
const MEAL_COUNTS = ["1 meal per day", "2 meals per day", "3 meals per day", "It varies a lot", "Not sure", "Prefer not to answer"];
const SNACK_FREQ = ["Rarely or never", "Sometimes", "Often", "It depends", "Not sure", "Prefer not to answer"];
const DAIRY = ["None / very little", "Moderate", "High / daily", "Not sure", "Prefer not to answer"];
const EXERCISE = ["Daily", "3–5 times/week", "1–2 times/week", "Rarely", "Never", "Not sure"];

export default function StepLifestyle({ data, onChange }) {
  const [form, setForm] = useState({
    sleep_quality: data.sleep_quality || "",
    stress_pattern: data.stress_pattern || "",
    meal_count: data.meal_count || "",
    snack_frequency: data.snack_frequency || "",
    dairy_intake: data.dairy_intake || "",
    exercise: data.exercise || "",
    ...data
  });

  useEffect(() => {
    const valid = form.sleep_quality && form.stress_pattern && form.meal_count;
    onChange(form, !!valid);
  }, [form]);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel label="Sleep quality" required helpText="How would you rate your typical sleep?" />
        <div className="flex flex-wrap gap-2">
          {SLEEP_QUALITY.map(s => (
            <OnboardingChip key={s} label={s} selected={form.sleep_quality === s}
              onClick={() => setForm(prev => ({ ...prev, sleep_quality: s }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Stress pattern" required />
        <div className="flex flex-wrap gap-2">
          {STRESS_PATTERN.map(s => (
            <OnboardingChip key={s} label={s} selected={form.stress_pattern === s}
              onClick={() => setForm(prev => ({ ...prev, stress_pattern: s }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="How many meals do you usually eat in a day?" required
          helpText="This helps your daily food log match your actual eating pattern" />
        <div className="space-y-2">
          {MEAL_COUNTS.map(m => (
            <OnboardingCard key={m} label={m} selected={form.meal_count === m}
              onClick={() => setForm(prev => ({ ...prev, meal_count: m }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Do you usually snack between meals?" helpText="Snacks may affect glycemic load and trigger analysis" />
        <div className="flex flex-wrap gap-2">
          {SNACK_FREQ.map(s => (
            <OnboardingChip key={s} label={s} selected={form.snack_frequency === s}
              onClick={() => setForm(prev => ({ ...prev, snack_frequency: s }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Dairy intake" />
        <div className="flex flex-wrap gap-2">
          {DAIRY.map(d => (
            <OnboardingChip key={d} label={d} selected={form.dairy_intake === d}
              onClick={() => setForm(prev => ({ ...prev, dairy_intake: d }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Exercise frequency" />
        <div className="flex flex-wrap gap-2">
          {EXERCISE.map(e => (
            <OnboardingChip key={e} label={e} selected={form.exercise === e}
              onClick={() => setForm(prev => ({ ...prev, exercise: e }))} />
          ))}
        </div>
      </div>
    </div>
  );
}
````

### 6.26. `acnetrex-phase2/components/onboarding/steps/StepRoutine.jsx`

- Size: 3,120 bytes
- SHA-256: `31023af6604c41ee6b1dd5146c1e541232a91ec1bfed8e1e1dc9ece5483ce772`

````jsx
import React, { useEffect, useState } from "react";
import FieldLabel from "@/components/onboarding/FieldLabel";
import OnboardingChip from "@/components/onboarding/OnboardingChip";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import { Input } from "@/components/ui/input";

const ROUTINE_TIMING = ["Morning only", "Evening only", "Morning & evening", "Inconsistent", "No routine yet"];
const SUNSCREEN_BEHAVIOR = ["Daily", "Most days", "Sometimes", "Rarely", "Never", "Not sure"];
const PRODUCTS = ["Cleanser", "Moisturizer", "Sunscreen", "Retinoid", "Vitamin C", "AHA/BHA", "Benzoyl peroxide", "Niacinamide", "Azelaic acid", "Spot treatment", "Prescription topical", "Oral medication", "Supplements", "None"];

export default function StepRoutine({ data, onChange }) {
  const [form, setForm] = useState({
    routine_timing: data.routine_timing || "",
    current_products: data.current_products || [],
    sunscreen_behavior: data.sunscreen_behavior || "",
    recent_product_change: data.recent_product_change || "",
    ...data
  });

  useEffect(() => {
    const valid = form.routine_timing && form.current_products.length > 0;
    onChange(form, !!valid);
  }, [form]);

  const toggleProduct = (item) => {
    setForm(prev => ({
      ...prev,
      current_products: prev.current_products.includes(item)
        ? prev.current_products.filter(x => x !== item)
        : [...prev.current_products, item]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel label="Routine timing" required helpText="When do you typically do your skincare?" />
        <div className="flex flex-wrap gap-2">
          {ROUTINE_TIMING.map(t => (
            <OnboardingChip key={t} label={t} selected={form.routine_timing === t}
              onClick={() => setForm(prev => ({ ...prev, routine_timing: t }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Current products" required helpText="What are you currently using? Select all that apply." />
        <div className="flex flex-wrap gap-2">
          {PRODUCTS.map(p => (
            <OnboardingChip key={p} label={p} selected={form.current_products.includes(p)} onClick={() => toggleProduct(p)} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Sunscreen use" helpText="How consistently do you wear sunscreen?" />
        <div className="flex flex-wrap gap-2">
          {SUNSCREEN_BEHAVIOR.map(s => (
            <OnboardingChip key={s} label={s} selected={form.sunscreen_behavior === s}
              onClick={() => setForm(prev => ({ ...prev, sunscreen_behavior: s }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Recent product changes (optional)" helpText="Any products added or removed recently?" />
        <Input
          placeholder="E.g., started retinol 2 weeks ago..."
          value={form.recent_product_change}
          onChange={e => setForm(prev => ({ ...prev, recent_product_change: e.target.value }))}
          className="rounded-xl"
        />
      </div>
    </div>
  );
}
````

### 6.27. `acnetrex-phase2/components/onboarding/steps/StepSkinHistory.jsx`

- Size: 4,432 bytes
- SHA-256: `6c3ffe943f97128835ba72940740b3db77ae849e2eb41d5f25b51ad427111f67`

````jsx
import React, { useEffect, useState } from "react";
import FieldLabel from "@/components/onboarding/FieldLabel";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import OnboardingChip from "@/components/onboarding/OnboardingChip";
import { Textarea } from "@/components/ui/textarea";

const ONSET_OPTIONS = [
  { label: "Within the last 6 months", value: "acute_recent_onset" },
  { label: "6–12 months ago", value: "subacute_recent_onset" },
  { label: "1–2 years ago", value: "persistent_recent_history" },
  { label: "3–5 years ago", value: "multi_year_persistent" },
  { label: "More than 5 years ago", value: "long_term_persistent" },
  { label: "Since early adolescence", value: "adolescent_persistent" },
  { label: "Since childhood", value: "childhood_onset_history" },
  { label: "Adult-onset after age 18", value: "adult_onset" },
  { label: "Started after a product/routine change", value: "product_temporal_association" },
  { label: "Started after medication/treatment change", value: "medication_temporal_association" },
  { label: "Started after lifestyle/environment change", value: "lifestyle_environment_temporal_association" },
  { label: "Comes and goes in episodes", value: "episodic_relapsing" },
  { label: "Not sure", value: "unknown_onset" },
];

const SEVERITY = ["Minimal", "Mild", "Moderate", "Severe", "Very severe", "Not sure"];
const ZONES = ["Forehead", "Left cheek", "Right cheek", "Chin", "Jawline", "Nose", "Temples", "Neck", "Back/chest"];
const LESION_TYPES = ["Blackheads", "Whiteheads", "Red bumps", "Pus-filled bumps", "Deep painful bumps", "Cysts", "Dark marks (PIH)", "Red/pink marks (PIE)", "Scars", "Not sure"];

export default function StepSkinHistory({ data, onChange }) {
  const [form, setForm] = useState({
    acne_onset: data.acne_onset || "",
    severity: data.severity || "",
    zones: data.zones || [],
    lesion_types: data.lesion_types || [],
    history_notes: data.history_notes || "",
    ...data
  });

  useEffect(() => {
    const valid = form.acne_onset && form.severity && form.zones.length > 0;
    onChange(form, !!valid);
  }, [form]);

  const toggleItem = (key, item) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter(x => x !== item) : [...prev[key], item]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel label="When did your acne start?" required
          helpText="Clinical history helps differentiate between hormonal, adult, adolescent, sudden, persistent, and recurring patterns." />
        <div className="space-y-2">
          {ONSET_OPTIONS.map(o => (
            <OnboardingCard key={o.value} label={o.label}
              selected={form.acne_onset === o.value}
              onClick={() => setForm(prev => ({ ...prev, acne_onset: o.value }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Current severity" required helpText="Your honest self-assessment" />
        <div className="flex flex-wrap gap-2">
          {SEVERITY.map(s => (
            <OnboardingChip key={s} label={s} selected={form.severity === s} onClick={() => setForm(prev => ({ ...prev, severity: s }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Breakout zones" required helpText="Where do you typically break out?" />
        <div className="flex flex-wrap gap-2">
          {ZONES.map(z => (
            <OnboardingChip key={z} label={z} selected={form.zones.includes(z)} onClick={() => toggleItem("zones", z)} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Lesion types you usually see" helpText="Select all that apply, or Not sure" />
        <div className="flex flex-wrap gap-2">
          {LESION_TYPES.map(l => (
            <OnboardingChip key={l} label={l} selected={form.lesion_types.includes(l)} onClick={() => toggleItem("lesion_types", l)} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Additional notes (optional)" helpText="Anything else about your acne history" />
        <Textarea
          placeholder="E.g., my acne got worse after switching moisturizers last year..."
          value={form.history_notes}
          onChange={e => setForm(prev => ({ ...prev, history_notes: e.target.value }))}
          className="rounded-xl min-h-[80px]"
        />
      </div>
    </div>
  );
}
````

### 6.28. `acnetrex-phase2/components/onboarding/steps/StepSkinType.jsx`

- Size: 3,134 bytes
- SHA-256: `36d533ab8656cb52f1478a1e1654080d27b40ec58b99288c02aafa43dbbb6d81`

````jsx
import React, { useEffect, useState } from "react";
import FieldLabel from "@/components/onboarding/FieldLabel";
import OnboardingChip from "@/components/onboarding/OnboardingChip";
import OnboardingCard from "@/components/onboarding/OnboardingCard";

const SKIN_TYPES = ["Oily", "Dry", "Combination", "Normal", "Not sure"];
const SENSITIVITY = ["Low — rarely reacts", "Medium — sometimes sensitive", "High — reacts often", "Very high — extremely reactive", "Not sure"];
const BARRIER_SYMPTOMS = ["Dryness", "Flaking/peeling", "Tightness", "Burning", "Stinging", "Redness/flushing", "Itching", "None", "Not sure"];
const TOLERANCE = ["Tolerates most actives well", "Some actives cause irritation", "Most actives cause irritation", "Very few actives tolerated", "Haven't tried actives", "Not sure"];

export default function StepSkinType({ data, onChange }) {
  const [form, setForm] = useState({
    skin_type: data.skin_type || "",
    sensitivity: data.sensitivity || "",
    barrier_symptoms: data.barrier_symptoms || [],
    actives_tolerance: data.actives_tolerance || "",
    ...data
  });

  useEffect(() => {
    const valid = form.skin_type && form.sensitivity && form.barrier_symptoms.length > 0;
    onChange(form, !!valid);
  }, [form]);

  const toggleBarrier = (item) => {
    setForm(prev => ({
      ...prev,
      barrier_symptoms: prev.barrier_symptoms.includes(item)
        ? prev.barrier_symptoms.filter(x => x !== item)
        : [...prev.barrier_symptoms, item]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel label="Skin type" required />
        <div className="flex flex-wrap gap-2">
          {SKIN_TYPES.map(t => (
            <OnboardingChip key={t} label={t} selected={form.skin_type === t} onClick={() => setForm(prev => ({ ...prev, skin_type: t }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Sensitivity level" required helpText="How does your skin typically respond to new products?" />
        <div className="space-y-2">
          {SENSITIVITY.map(s => (
            <OnboardingCard key={s} label={s} selected={form.sensitivity === s}
              onClick={() => setForm(prev => ({ ...prev, sensitivity: s }))} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Barrier symptoms" required helpText="Select any symptoms you currently experience" />
        <div className="flex flex-wrap gap-2">
          {BARRIER_SYMPTOMS.map(b => (
            <OnboardingChip key={b} label={b} selected={form.barrier_symptoms.includes(b)} onClick={() => toggleBarrier(b)} />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel label="Active ingredient tolerance" helpText="How does your skin handle active ingredients like retinoids, acids, benzoyl peroxide?" />
        <div className="space-y-2">
          {TOLERANCE.map(t => (
            <OnboardingCard key={t} label={t} selected={form.actives_tolerance === t}
              onClick={() => setForm(prev => ({ ...prev, actives_tolerance: t }))} />
          ))}
        </div>
      </div>
    </div>
  );
}
````

### 6.29. `acnetrex-phase2/components/ui/accordion.jsx`

- Size: 1,615 bytes
- SHA-256: `b47533b3783b8149550b8481e4ae93d54bdcbc51d434793c176b0aec5558ee1c`

````jsx
import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b", className)} {...props} />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}>
      {children}
      <ChevronDown
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}>
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
````

### 6.30. `acnetrex-phase2/components/ui/alert-dialog.jsx`

- Size: 3,461 bytes
- SHA-256: `a20098cdc2eb2b5915575d3f0fb7a3e8e6c1035c7eef77144f3fc389e0fdbda0`

````jsx
import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref} />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props} />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props} />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
````

### 6.31. `acnetrex-phase2/components/ui/alert.jsx`

- Size: 1,335 bytes
- SHA-256: `c5baf27fb6a4bf130236fa0f336c21084fee192e8215bb6b20c87436c27f3b38`

````jsx
import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props} />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props} />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
````

### 6.32. `acnetrex-phase2/components/ui/aspect-ratio.jsx`

- Size: 140 bytes
- SHA-256: `08b0aa0b05efc573c7d63363c03e83d4b101bfeb54140764e96ddea30659cfcc`

````jsx
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

const AspectRatio = AspectRatioPrimitive.Root

export { AspectRatio }
````

### 6.33. `acnetrex-phase2/components/ui/avatar.jsx`

- Size: 1,043 bytes
- SHA-256: `703fb6852952bd039b68dc494c004eee1d835fa12647b851722ab9b6b3058b32`

````jsx
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props} />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props} />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props} />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
````

### 6.34. `acnetrex-phase2/components/ui/badge.jsx`

- Size: 990 bytes
- SHA-256: `380dcda78ff8fdd80c82b89cb7dd38ffd84c355735fc8f16300ff647e15988aa`

````jsx
import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
````

### 6.35. `acnetrex-phase2/components/ui/breadcrumb.jsx`

- Size: 2,271 bytes
- SHA-256: `4c0972765dc0212c5101446cb931db44b7db68a21ef9d7bc8a75c46f9bb96e42`

````jsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef(
  ({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />
)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props} />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props} />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    (<Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props} />)
  );
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props} />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
    {...props}>
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = ({
  className,
  ...props
}) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
````

### 6.36. `acnetrex-phase2/components/ui/button.jsx`

- Size: 1,679 bytes
- SHA-256: `6c28699c64ff8c36ec5a2baf835d6bfa141cedeaf472b97d64671dac6cf7cbf8`

````jsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
````

### 6.37. `acnetrex-phase2/components/ui/calendar.jsx`

- Size: 2,851 bytes
- SHA-256: `06e0c81497bda70ac24855b54fddd385557cbc3be8d8066a345bedbec551b3ee`

````jsx
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    (<DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props} />)
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
````

### 6.38. `acnetrex-phase2/components/ui/card.jsx`

- Size: 1,440 bytes
- SHA-256: `8ab6f42e722e9c51752ce2f14aabb2696bddc0b6818041fb8f313f670955c2c4`

````jsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
    {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
````

### 6.39. `acnetrex-phase2/components/ui/carousel.jsx`

- Size: 4,821 bytes
- SHA-256: `55eb9456609f96f5c28c1fa35fe79554fc0ffab12883e3aceb041ff10e347e83`

````jsx
import * as React from "react"
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const CarouselContext = React.createContext(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef((
  {
    orientation = "horizontal",
    opts,
    setApi,
    plugins,
    className,
    children,
    ...props
  },
  ref
) => {
  const [carouselRef, api] = useEmblaCarousel({
    ...opts,
    axis: orientation === "horizontal" ? "x" : "y",
  }, plugins)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api) => {
    if (!api) {
      return
    }

    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback((event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      scrollPrev()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      scrollNext()
    }
  }, [scrollPrev, scrollNext])

  React.useEffect(() => {
    if (!api || !setApi) {
      return
    }

    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) {
      return
    }

    onSelect(api)
    api.on("reInit", onSelect)
    api.on("select", onSelect)

    return () => {
      api?.off("select", onSelect)
    };
  }, [api, onSelect])

  return (
    (<CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}>
      <div
        ref={ref}
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}>
        {children}
      </div>
    </CarouselContext.Provider>)
  );
})
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    (<div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props} />
    </div>)
  );
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    (<div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props} />)
  );
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    (<Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn("absolute  h-8 w-8 rounded-full", orientation === "horizontal"
        ? "-left-12 top-1/2 -translate-y-1/2"
        : "-top-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}>
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>)
  );
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    (<Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn("absolute h-8 w-8 rounded-full", orientation === "horizontal"
        ? "-right-12 top-1/2 -translate-y-1/2"
        : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}>
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>)
  );
})
CarouselNext.displayName = "CarouselNext"

export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
````

### 6.40. `acnetrex-phase2/components/ui/chart.jsx`

- Size: 8,639 bytes
- SHA-256: `c4684b470cae53b857a08e5fe006d4406450a442a103858beb179ec810aba2b3`

````jsx
"use client";
import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = {
  light: "",
  dark: ".dark"
}

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    (<ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}>
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>)
  );
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({
  id,
  config
}) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    (<style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
.map(([key, itemConfig]) => {
const color =
  itemConfig.theme?.[theme] ||
  itemConfig.color
return color ? `  --color-${key}: ${color};` : null
})
.join("\n")}
}
`)
          .join("\n"),
      }} />)
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef((
  {
    active,
    payload,
    className,
    indicator = "dot",
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    color,
    nameKey,
    labelKey,
  },
  ref
) => {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = `${labelKey || item.dataKey || item.name || "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? config[label]?.label || label
        : itemConfig?.label

    if (labelFormatter) {
      return (
        (<div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>)
      );
    }

    if (!value) {
      return null
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ])

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    (<div
      ref={ref}
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}>
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = color || item.payload.fill || item.color

          return (
            (<div
              key={item.dataKey}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center"
              )}>
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
                          "h-2.5 w-2.5": indicator === "dot",
                          "w-1": indicator === "line",
                          "w-0 border-[1.5px] border-dashed bg-transparent":
                            indicator === "dashed",
                          "my-0.5": nestLabel && indicator === "dashed",
                        })}
                        style={
                          {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor
                          }
                        } />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center"
                    )}>
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value && (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>)
          );
        })}
      </div>
    </div>)
  );
})
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef((
  { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
  ref
) => {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    (<div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}>
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)

        return (
          (<div
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            )}>
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }} />
            )}
            {itemConfig?.label}
          </div>)
        );
      })}
    </div>)
  );
})
ChartLegendContent.displayName = "ChartLegend"

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config,
  payload,
  key
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey = key

  if (
    key in payload &&
    typeof payload[key] === "string"
  ) {
    configLabelKey = payload[key]
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key] === "string"
  ) {
    configLabelKey = payloadPayload[key]
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
````

### 6.41. `acnetrex-phase2/components/ui/checkbox.jsx`

- Size: 880 bytes
- SHA-256: `b0260cb7767493d8273f5def1b7d32e844d068db5f5760258d333ae6ad88f0d8`

````jsx
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
````

### 6.42. `acnetrex-phase2/components/ui/collapsible.jsx`

- Size: 329 bytes
- SHA-256: `f4cdd104de29928bfcd40b865c7d08eed9157a537fbb8b5e6d0921f02b63cc04`

````jsx
"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
````

### 6.43. `acnetrex-phase2/components/ui/command.jsx`

- Size: 3,897 bytes
- SHA-256: `e7cea37aff49e211ffea1bf3ed67add6ce1ab29862e902aff739fcd11014f06f`

````jsx
import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props} />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({
  children,
  ...props
}) => {
  return (
    (<Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>)
  );
}

const CommandInput = React.forwardRef(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props} />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props} />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props} />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props} />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}) => {
  return (
    (<span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props} />)
  );
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
````

### 6.44. `acnetrex-phase2/components/ui/context-menu.jsx`

- Size: 5,995 bytes
- SHA-256: `5fe320cad9ee1833e9528f86e340f83f419f77790549f4cff083fad329e8dc4c`

````jsx
import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const ContextMenu = ContextMenuPrimitive.Root

const ContextMenuTrigger = ContextMenuPrimitive.Trigger

const ContextMenuGroup = ContextMenuPrimitive.Group

const ContextMenuPortal = ContextMenuPrimitive.Portal

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const ContextMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}>
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
))
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

const ContextMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props} />
))
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

const ContextMenuContent = React.forwardRef(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props} />
  </ContextMenuPrimitive.Portal>
))
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const ContextMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props} />
))
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

const ContextMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
))
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName

const ContextMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
))
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

const ContextMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-foreground",
      inset && "pl-8",
      className
    )}
    {...props} />
))
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

const ContextMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props} />
))
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

const ContextMenuShortcut = ({
  className,
  ...props
}) => {
  return (
    (<span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props} />)
  );
}
ContextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
````

### 6.45. `acnetrex-phase2/components/ui/dialog.jsx`

- Size: 3,228 bytes
- SHA-256: `50a7cc4ae5ce0f2527662ed9742d35b8c4933d1629a2740b26890793aee00742`

````jsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
````

### 6.46. `acnetrex-phase2/components/ui/drawer.jsx`

- Size: 2,359 bytes
- SHA-256: `3d2dce97d3f6bc5dfa887e87c6688228298526bfdc29a28f2edbd6c1dc2eb47a`

````jsx
"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props} />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}>
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props} />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
````

### 6.47. `acnetrex-phase2/components/ui/dropdown-menu.jsx`

- Size: 6,157 bytes
- SHA-256: `d36cd67e71781bbb03059b057b6f686445477a4275120359178729574398c465`

````jsx
import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}>
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props} />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props} />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props} />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props} />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}) => {
  return (
    (<span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props} />)
  );
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
````

### 6.48. `acnetrex-phase2/components/ui/form.jsx`

- Size: 3,141 bytes
- SHA-256: `d899b071230c321acdb2996cbe02d84a46dd9825f81af1015f7e54c6b9ee211c`

````jsx
"use client";
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Controller, FormProvider, useFormContext } from "react-hook-form";

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

const FormFieldContext = React.createContext({})

const FormField = (
  {
    ...props
  }
) => {
  return (
    (<FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>)
  );
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

const FormItemContext = React.createContext({})

const FormItem = React.forwardRef(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    (<FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>)
  );
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    (<Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props} />)
  );
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    (<Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props} />)
  );
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    (<p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props} />)
  );
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    (<p
      ref={ref}
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}>
      {body}
    </p>)
  );
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
````

### 6.49. `acnetrex-phase2/components/ui/hover-card.jsx`

- Size: 1,070 bytes
- SHA-256: `3b49e533ad60995767a3419351642037438e8f27b62132115fc71115cf1fd0ad`

````jsx
"use client"

import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root

const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props} />
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
````

### 6.50. `acnetrex-phase2/components/ui/input-otp.jsx`

- Size: 1,811 bytes
- SHA-256: `78a437a82203c1d9d22d47db830bdc67d49d6473c5c28ad77634eeb8c399a649`

````jsx
import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props} />
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    (<div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      {...props}>
      {char}
      {hasFakeCaret && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>)
  );
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
````

### 6.51. `acnetrex-phase2/components/ui/input.jsx`

- Size: 690 bytes
- SHA-256: `4455aea152904f128df0ecd82047bbceb23e06ffcc9ccc7cbb3bcc87df5bcc4f`

````jsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
````

### 6.52. `acnetrex-phase2/components/ui/label.jsx`

- Size: 525 bytes
- SHA-256: `37c6425d2a5c798ade4e60f89f86054d703433a8977e12d796de2b5bb4e3d0b7`

````jsx
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
````

### 6.53. `acnetrex-phase2/components/ui/menubar.jsx`

- Size: 6,790 bytes
- SHA-256: `5411f1b8221d9a34fc9b58f830642cfa3a33c776d0072014690e2f024515391d`

````jsx
"use client"

import * as React from "react"
import * as MenubarPrimitive from "@radix-ui/react-menubar"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

function MenubarMenu({
  ...props
}) {
  return <MenubarPrimitive.Menu {...props} />;
}

function MenubarGroup({
  ...props
}) {
  return <MenubarPrimitive.Group {...props} />;
}

function MenubarPortal({
  ...props
}) {
  return <MenubarPrimitive.Portal {...props} />;
}

function MenubarRadioGroup({
  ...props
}) {
  return <MenubarPrimitive.RadioGroup {...props} />;
}

function MenubarSub({
  ...props
}) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

const Menubar = React.forwardRef(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm",
      className
    )}
    {...props} />
))
Menubar.displayName = MenubarPrimitive.Root.displayName

const MenubarTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      className
    )}
    {...props} />
))
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName

const MenubarSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}>
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
))
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName

const MenubarSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props} />
))
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName

const MenubarContent = React.forwardRef((
  { className, align = "start", alignOffset = -4, sideOffset = 8, ...props },
  ref
) => (
  <MenubarPrimitive.Portal>
    <MenubarPrimitive.Content
      ref={ref}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props} />
  </MenubarPrimitive.Portal>
))
MenubarContent.displayName = MenubarPrimitive.Content.displayName

const MenubarItem = React.forwardRef(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props} />
))
MenubarItem.displayName = MenubarPrimitive.Item.displayName

const MenubarCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
))
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName

const MenubarRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
))
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName

const MenubarLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props} />
))
MenubarLabel.displayName = MenubarPrimitive.Label.displayName

const MenubarSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName

const MenubarShortcut = ({
  className,
  ...props
}) => {
  return (
    (<span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props} />)
  );
}
MenubarShortcut.displayname = "MenubarShortcut"

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
}
````

### 6.54. `acnetrex-phase2/components/ui/navigation-menu.jsx`

- Size: 4,217 bytes
- SHA-256: `a1f789747cb750329a33ee04c54209b044239a15ba200fb9d7da1f2ce6b73403`

````jsx
import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}>
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props} />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
)

const NavigationMenuTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}>
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
      aria-hidden="true" />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
      className
    )}
    {...props} />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props} />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}>
    <div
      className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
}
````

### 6.55. `acnetrex-phase2/components/ui/pagination.jsx`

- Size: 2,322 bytes
- SHA-256: `1d519fc3ba1c8c6cf7f2d30c98739ecba2fa7af35cbc024d6793785e7a6d65c8`

````jsx
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button";

const Pagination = ({
  className,
  ...props
}) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props} />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props} />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(buttonVariants({
      variant: isActive ? "outline" : "ghost",
      size,
    }), className)}
    {...props} />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}>
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
````

### 6.56. `acnetrex-phase2/components/ui/popover.jsx`

- Size: 1,166 bytes
- SHA-256: `199cc7b3d810013867ae91305f0966b8a66526a1c13d10248c38ee1797d169db`

````jsx
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props} />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
````

### 6.57. `acnetrex-phase2/components/ui/progress.jsx`

- Size: 667 bytes
- SHA-256: `1ad2808d51c365f04f23a4e985b03274dcc30735d74db68e1f78332a6533859c`

````jsx
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}>
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
````

### 6.58. `acnetrex-phase2/components/ui/radio-group.jsx`

- Size: 1,135 bytes
- SHA-256: `10ced1e6932e4fe53d6c18201f50b8bb4b334b4372f01ce5f0993aa2a6bb9110`

````jsx
import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (<RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />);
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}>
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-3.5 w-3.5 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>)
  );
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
````

### 6.59. `acnetrex-phase2/components/ui/resizable.jsx`

- Size: 1,570 bytes
- SHA-256: `4e74fb31b8321012570554dc8c55a58aacf1adcced2fdc43085c67ff96ce9773`

````jsx
"use client"

import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props} />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}>
    {withHandle && (
      <div
        className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
````

### 6.60. `acnetrex-phase2/components/ui/scroll-area.jsx`

- Size: 1,362 bytes
- SHA-256: `3de4bed34be51a940243b0fbf8c6d9324ecb416a91a919d65ca18d15a7ba32a1`

````jsx
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}>
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
````

### 6.61. `acnetrex-phase2/components/ui/select.jsx`

- Size: 4,677 bytes
- SHA-256: `15c7a0e4c45b655ffa8d3f3be8bdaab727a19fd6baa95b34056bf02c7254243e`

````jsx
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn("p-1", position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
````

### 6.62. `acnetrex-phase2/components/ui/separator.jsx`

- Size: 600 bytes
- SHA-256: `2c82247abd573d0f4a93eb259166e3b778365b58c0d18921b4739d5ba4b29e7e`

````jsx
import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef((
  { className, orientation = "horizontal", decorative = true, ...props },
  ref
) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props} />
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
````

### 6.63. `acnetrex-phase2/components/ui/sheet.jsx`

- Size: 3,549 bytes
- SHA-256: `33f27d1b55925dbc354d0a61b0cbc6f977352da13f4df519f06e5b5bd9ed2d5c`

````jsx
"use client";
import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva } from "class-variance-authority";
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref} />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      <SheetPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props} />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
````

### 6.64. `acnetrex-phase2/components/ui/sidebar.jsx`

- Size: 20,643 bytes
- SHA-256: `828bec5ac1ec715fe50deebae08a7da23f01e9b0dcb221b110e37de63eb22d3c`

````jsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

const SidebarContext = React.createContext(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef((
  {
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
  },
  ref
) => {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback((value) => {
    const openState = typeof value === "function" ? value(open) : value
    if (setOpenProp) {
      setOpenProp(openState)
    } else {
      _setOpen(openState)
    }

    // This sets the cookie to keep the sidebar state.
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  }, [setOpenProp, open])

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile
      ? setOpenMobile((open) => !open)
      : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo(() => ({
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
  }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar])

  return (
    (<SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style
            }
          }
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
            className
          )}
          ref={ref}
          {...props}>
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>)
  );
})
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef((
  {
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    className,
    children,
    ...props
  },
  ref
) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      (<div
        className={cn(
          "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
        ref={ref}
        {...props}>
        {children}
      </div>)
    );
  }

  if (isMobile) {
    return (
      (<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE
            }
          }
          side={side}>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>)
    );
  }

  return (
    (<div
      ref={ref}
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}>
      {/* This is what handles the sidebar gap on desktop */}
      <div
        className={cn(
          "relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
        )} />
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...props}>
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow">
          {children}
        </div>
      </div>
    </div>)
  );
})
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef(({ className, onClick, asChild = false, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    (<Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      asChild={asChild}
      {...props}>
      {asChild ? (
        <PanelLeft />
      ) : (
        <>
          <PanelLeft />
          <span className="sr-only">Toggle Sidebar</span>
        </>
      )}
    </Button>)
  );
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    (<button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props} />)
  );
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      {...props} />)
  );
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props} />)
  );
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props} />)
  );
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props} />)
  );
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props} />)
  );
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props} />)
  );
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props} />)
  );
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    (<Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props} />)
  );
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    (<Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props} />)
  );
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props} />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props} />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props} />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SidebarMenuButton = React.forwardRef((
  {
    asChild = false,
    isActive = false,
    variant = "default",
    size = "default",
    tooltip,
    className,
    ...props
  },
  ref
) => {
  const Comp = asChild ? Slot : "button"
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props} />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    (<Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip} />
    </Tooltip>)
  );
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    (<Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
        "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props} />)
  );
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props} />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, [])

  return (
    (<div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}>
      {showIcon && (
        <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
      )}
      <Skeleton
        className="h-4 max-w-[--skeleton-width] flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width
          }
        } />
    </div>)
  );
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props} />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef(
  ({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"

    return (
      (<Comp
        ref={ref}
        data-sidebar="menu-sub-button"
        data-size={size}
        data-active={isActive}
        className={cn(
          "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
          "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          "group-data-[collapsible=icon]:hidden",
          className
        )}
        {...props} />)
    );
  }
)
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
````

### 6.65. `acnetrex-phase2/components/ui/skeleton.jsx`

- Size: 227 bytes
- SHA-256: `c5f32316d9f8feeba529bac6321766424067185afee5f29a15bb18145adaf1bc`

````jsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props} />)
  );
}

export { Skeleton }
````

### 6.66. `acnetrex-phase2/components/ui/slider.jsx`

- Size: 914 bytes
- SHA-256: `1761bfaa0a06480b76b31511e4a5c24903b407732e027fc11ad615dd3d93a562`

````jsx
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}>
    <SliderPrimitive.Track
      className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
````

### 6.67. `acnetrex-phase2/components/ui/sonner.jsx`

- Size: 799 bytes
- SHA-256: `f1309f953467d583202225d08414161fc3183758ac38c997249eb63686a27ba8`

````jsx
"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />)
  );
}

export { Toaster }
````

### 6.68. `acnetrex-phase2/components/ui/switch.jsx`

- Size: 1,025 bytes
- SHA-256: `880e95637cc1d90ef4476f79114afd2fa7b5f6e5da1f49a70e0efc1f84aa0c8a`

````jsx
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}>
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )} />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
````

### 6.69. `acnetrex-phase2/components/ui/table.jsx`

- Size: 2,231 bytes
- SHA-256: `301509bb8337184f1b299cb15b8d4f8ec8f0d3bbc17a2ffdf33ff58f7eaa444e`

````jsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props} />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props} />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
````

### 6.70. `acnetrex-phase2/components/ui/tabs.jsx`

- Size: 1,529 bytes
- SHA-256: `57591bdfb3fa931b06edcf4168b6881a79785c674ad0618003d12cd656072350`

````jsx
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
````

### 6.71. `acnetrex-phase2/components/ui/textarea.jsx`

- Size: 587 bytes
- SHA-256: `b64a8fabf495dd59dbfd23914334ffbdfa695f506a133370603a49eca1243f62`

````jsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
````

### 6.72. `acnetrex-phase2/components/ui/toast.jsx`

- Size: 3,804 bytes
- SHA-256: `8a98ef70908fd33627d09f6a5c715417b243502836539acda857843dd4817070`

````jsx
import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
````

### 6.73. `acnetrex-phase2/components/ui/toaster.jsx`

- Size: 785 bytes
- SHA-256: `fc1bce32d9a45f5be28c67b486962b90eed76742f3c0995f5fb908ffc6bde3cd`

````jsx
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
````

### 6.74. `acnetrex-phase2/components/ui/toggle-group.jsx`

- Size: 1,284 bytes
- SHA-256: `1c7566b9f2aa00f0afdf161527be90588a11386158dca55425ea0d8c0e3883e4`

````jsx
"use client";
import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}>
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    (<ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(toggleVariants({
        variant: context.variant || variant,
        size: context.size || size,
      }), className)}
      {...props}>
      {children}
    </ToggleGroupPrimitive.Item>)
  );
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }
````

### 6.75. `acnetrex-phase2/components/ui/toggle.jsx`

- Size: 1,310 bytes
- SHA-256: `e8fe6de52ef73d6fa868229ae7a21e681fb3088975847d6ee65a8387731c1c79`

````jsx
import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props} />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
````

### 6.76. `acnetrex-phase2/components/ui/tooltip.jsx`

- Size: 1,091 bytes
- SHA-256: `73e47a5dde6c55aca2e32e429ba95d8746ce2cca02cc718613f337b5bc9f5f19`

````jsx
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props} />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
````

### 6.77. `acnetrex-phase2/components/ui/use-toast.jsx`

- Size: 3,379 bytes
- SHA-256: `40f2839736597a3f7d54e4359a375c5991ce58eb341d8abb944874ac0dce9bbc`

````jsx
// Inspired by react-hot-toast library
import { useState, useEffect } from "react";

const TOAST_LIMIT = 20;
const TOAST_REMOVE_DELAY = 1000000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map();

const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

const _clearFromRemoveQueue = (toastId) => {
  const timeout = toastTimeouts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    toastTimeouts.delete(toastId);
  }
};

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function toast({ ...props }) {
  const id = genId();

  const update = (props) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
````

### 6.78. `acnetrex-phase2/config.jsonc`

- Size: 182 bytes
- SHA-256: `93e6ffb4c5e312c134ec13ddc1979bfa2605d346ca4d7813b46da272d311ccfb`

````jsonc
{
  "name": "AcneTrex",
  "site": {
    "installCommand": "npm install",
    "buildCommand": "npm run build",
    "serveCommand": "npm run dev",
    "outputDirectory": "./dist"
  }
}
````

### 6.79. `acnetrex-phase2/entities/OnboardingProfile.jsonc`

- Size: 610 bytes
- SHA-256: `39ac714817f02fc88cd819801465867af2a6c9048b8928adc96dd22b41055dcf`

````jsonc
{
  "name": "OnboardingProfile",
  "type": "object",
  "properties": {
    "answers": {
      "type": "object",
      "description": "Versioned onboarding responses as JSON"
    },
    "completed": {
      "type": "boolean",
      "default": false,
      "description": "Whether onboarding is complete"
    },
    "current_step": {
      "type": "string",
      "default": "consent",
      "description": "Resume support - last completed step"
    },
    "consent_states": {
      "type": "object",
      "description": "Pre-account consent acknowledgements"
    }
  },
  "required": [
    "current_step"
  ]
}
````

### 6.80. `acnetrex-phase2/entities/User.jsonc`

- Size: 251 bytes
- SHA-256: `4de38108e89f3bb0c1c7411eabdd47f8899238f1580428a167de47b10c5b3a31`

````jsonc
{
  "properties": {
    "role": {
      "type": "string",
      "description": "The role of the user in the app",
      "enum": [
        "admin",
        "user"
      ]
    }
  },
  "required": [
    "role"
  ],
  "name": "User",
  "type": "object"
}
````

### 6.81. `acnetrex-phase2/eslint.config.js`

- Size: 1,578 bytes
- SHA-256: `b0ac68c36cb81cba5bbdd537620b03762164ba276e338fdba73981318f011e60`

````javascript
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
````

### 6.82. `acnetrex-phase2/hooks/use-mobile.jsx`

- Size: 545 bytes
- SHA-256: `a136217739e79f9d02440e711b9bd1abb6adf60f1a83b45a39a009a09568ad1c`

````jsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
````

### 6.83. `acnetrex-phase2/index.css`

- Size: 2,654 bytes
- SHA-256: `109a679bc72784a48e7c43a7e847eae7735ba486625a9f3b11af857be94eb916`

````css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 160 45% 40%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
    --font-heading: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --font-body: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --font-display: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}



@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground font-body;
  }
}
````

### 6.84. `acnetrex-phase2/index.html`

- Size: 859 bytes
- SHA-256: `11204f82aeeb1b6da80d49fe5e3358ec6cfa940c5357d091e4220521485b2f97`

````html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="https://base44.com/logo_v2.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="manifest" href="/manifest.json" />
    <title>AcneTrex V3</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <meta name="description" content="AI-powered acne intelligence platform — track, analyze, and understand your skin">
    <meta name="theme-color" content="#059669">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
````

### 6.85. `acnetrex-phase2/jsconfig.json`

- Size: 583 bytes
- SHA-256: `e73e9adf0fcd9194c496670efb5251825685314475c9548c3ec4d74056ccc75b`

````json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["esnext", "dom"],
    "target": "esnext",
    "checkJs": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": []
  },
  "include": ["src/components/**/*.js", "src/pages/**/*.jsx", "src/Layout.jsx"],
  "exclude": ["node_modules", "dist", "src/vite-plugins", "src/components/ui", "src/api", "src/lib"]
}
````

### 6.86. `acnetrex-phase2/lib/AuthContext.jsx`

- Size: 4,902 bytes
- SHA-256: `c5b2a5f5db9c78b8ec5b686b7a745f3a3fdc7dd892fe3a1b53676b52ca4967bc`

````jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
````

### 6.87. `acnetrex-phase2/lib/PageNotFound.jsx`

- Size: 3,930 bytes
- SHA-256: `8536e2091188275762a6729ecd77a77b8c5f1187525ae4189df42c95ca42f196`

````jsx
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* 404 Error Code */}
                    <div className="space-y-2">
                        <h1 className="text-7xl font-light text-slate-300">404</h1>
                        <div className="h-0.5 w-16 bg-slate-200 mx-auto"></div>
                    </div>
                    
                    {/* Main Message */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium text-slate-800">
                            Page Not Found
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            The page <span className="font-medium text-slate-700">"{pageName}"</span> could not be found in this application.
                        </p>
                    </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium text-slate-700">Admin Note</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        This could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="pt-6">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
````

### 6.88. `acnetrex-phase2/lib/app-params.js`

- Size: 1,791 bytes
- SHA-256: `d0c8c149528b705355dbc842096b6662df4610eba1f356285fee74211fc580d3`

````javascript
const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}
````

### 6.89. `acnetrex-phase2/lib/query-client.js`

- Size: 197 bytes
- SHA-256: `0a080b6d9a1ed9f5f32150d9e3faa928f955d2b8d6206831e2b1658e84612c92`

````javascript
import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
````

### 6.90. `acnetrex-phase2/lib/utils.js`

- Size: 190 bytes
- SHA-256: `4f592359765d69c32c3617700fa111af9a6a9cac8f18cb1987c25503a343c203`

````javascript
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;
````

### 6.91. `acnetrex-phase2/main.jsx`

- Size: 189 bytes
- SHA-256: `caa3bab80b647fbb53fccd2e80d6e190d45a4b06c92bf85e3968d87e8d891cec`

````jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
````

### 6.92. `acnetrex-phase2/package.json`

- Size: 3,259 bytes
- SHA-256: `0c2fd2328d5eb574f503a308ac2dcaa95294ffc88562c6322a780aaef761f081`

````json
{
  "name": "base44-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --quiet",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc -p ./jsconfig.json",
    "preview": "vite preview"
  },
  "dependencies": {
    "@base44/sdk": "^0.8.35",
    "@base44/vite-plugin": "^1.0.24",
    "@hello-pangea/dnd": "^17.0.0",
    "@hookform/resolvers": "^4.1.2",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-aspect-ratio": "^1.1.2",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-collapsible": "^1.1.3",
    "@radix-ui/react-context-menu": "^2.2.6",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-hover-card": "^1.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-menubar": "^1.1.6",
    "@radix-ui/react-navigation-menu": "^1.2.5",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-toggle": "^1.1.2",
    "@radix-ui/react-toggle-group": "^1.1.2",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@stripe/react-stripe-js": "^3.0.0",
    "@stripe/stripe-js": "^5.2.0",
    "@tanstack/react-query": "^5.84.1",
    "canvas-confetti": "^1.9.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.5.2",
    "framer-motion": "^11.16.4",
    "html2canvas": "^1.4.1",
    "input-otp": "^1.4.2",
    "jspdf": "^4.2.1",
    "jszip": "^3.10.1",
    "lodash": "^4.17.21",
    "lucide-react": "^0.475.0",
    "moment": "^2.30.1",
    "next-themes": "^0.4.4",
    "react": "^18.2.0",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.54.2",
    "react-hot-toast": "^2.6.0",
    "react-leaflet": "^4.2.1",
    "react-markdown": "^9.0.1",
    "react-quill": "^2.0.0",
    "react-resizable-panels": "^2.1.7",
    "react-router-dom": "^6.26.0",
    "recharts": "^2.15.4",
    "sonner": "^2.0.1",
    "tailwind-merge": "^3.0.2",
    "tailwindcss-animate": "^1.0.7",
    "three": "^0.171.0",
    "vaul": "^1.1.2",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.19.0",
    "@types/node": "^22.13.5",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "baseline-browser-mapping": "^2.8.32",
    "eslint": "^9.19.0",
    "eslint-plugin-react": "^7.37.4",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.18",
    "eslint-plugin-unused-imports": "^4.3.0",
    "globals": "^15.14.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.2",
    "vite": "^6.1.0"
  }
}
````

### 6.93. `acnetrex-phase2/pages/Downloads.jsx`

- Size: 4,014 bytes
- SHA-256: `da883faaa5320e452e5e808cd0d6d6825aed1b3c6a303ba400fe5f0fb7f65a2b`

````jsx
import React from "react";
import { Link } from "react-router-dom";
import { Download, FileText, Package, ChevronLeft, CheckCircle2 } from "lucide-react";

export default function Downloads() {
  return (
    <div className="px-5 pt-6 pb-8 max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Downloads</h1>
      <p className="text-sm text-gray-500 mb-8">Phase 2 source code and documentation, ready for GitHub.</p>

      {/* ZIP Download */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">Source Code (ZIP)</h2>
            <p className="text-xs text-gray-500 mt-1">
              All source files, components, pages, entities, and config files in a single zip. Extract and push to your GitHub repo.
            </p>
            <a
              href="/acnetrex-phase2.zip"
              download="acnetrex-phase2.zip"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Download ZIP
            </a>
          </div>
        </div>
      </div>

      {/* Markdown Documentation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">Documentation (Markdown)</h2>
            <p className="text-xs text-gray-500 mt-1">
              Full Phase 2 implementation log: screens built, PRD compliance, architecture decisions, and handoff notes.
            </p>
            <a
              href="/PHASE2_DOCUMENTATION.md"
              download="PHASE2_DOCUMENTATION.md"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Markdown
            </a>
          </div>
        </div>
      </div>

      {/* What's included */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">What's included in the ZIP</h3>
        <div className="space-y-2">
          {[
            "Full React router (src/App.jsx)",
            "Onboarding consent flow (8 steps)",
            "Personalization wizard (7 steps)",
            "Main app pages (Home, Logs, Insights, Profile, FaceAtlas)",
            "10 daily log placeholder screens",
            "10 insight module placeholder screens",
            "Bottom tab navigation layout",
            "OnboardingProfile entity schema",
            "Tailwind config & design tokens",
            "package.json with all dependencies",
            "Phase 2 documentation (markdown)",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Generated on 2026-06-30 · AcneTrex V3 Phase 2
      </p>
    </div>
  );
}
````

### 6.94. `acnetrex-phase2/pages/FaceAtlas.jsx`

- Size: 445 bytes
- SHA-256: `ddcce88d7106515d3a362707026cdaf84d4ae22239f7d5a9a9f5f09c116c1897`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { ScanFace } from "lucide-react";

export default function FaceAtlas() {
  return (
    <PlaceholderScreen
      title="FaceAtlas"
      description="Multi-angle skin analysis with guided lesion annotation. Capture 5 photos, annotate visible lesions, and receive AI-powered analysis with model-user comparison."
      icon={ScanFace}
    />
  );
}
````

### 6.95. `acnetrex-phase2/pages/ForgotPassword.jsx`

- Size: 2,434 bytes
- SHA-256: `a5637ed3c56e98a97dd70ff74201a87383d9b9683af43599d39979e0b4a059f3`

````jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset password"
      subtitle="We'll send you a link to reset it"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-foreground text-center">
          If an account exists with that email, you'll receive a password reset link shortly.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
````

### 6.96. `acnetrex-phase2/pages/Home.jsx`

- Size: 5,073 bytes
- SHA-256: `1d3e8ac1deedd287d2e716a180f56b3818f3073caaf33e5fd90fcebf66e54c37`

````jsx
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Activity, Moon, Utensils, Brain, ScanFace, Droplets, Thermometer, Heart, ChevronRight, Sparkles } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Face Scan", icon: ScanFace, path: "/face-atlas", color: "bg-emerald-50 text-emerald-600" },
  { label: "Sleep Log", icon: Moon, path: "/logs/sleep", color: "bg-indigo-50 text-indigo-600" },
  { label: "Food Log", icon: Utensils, path: "/logs/food", color: "bg-amber-50 text-amber-600" },
  { label: "Ask CutisAI", icon: Brain, path: "/insights/cutisai", color: "bg-purple-50 text-purple-600" },
];

const MODULE_CARDS = [
  { label: "FaceAtlas", desc: "Multi-angle skin analysis", icon: ScanFace, path: "/face-atlas" },
  { label: "SleepDerm", desc: "Circadian intelligence", icon: Moon, path: "/logs/sleep" },
  { label: "DermDiet", desc: "Food & trigger tracking", icon: Utensils, path: "/logs/food" },
  { label: "ClimateSkin", desc: "Weather & environment", icon: Thermometer, path: "/insights/climate" },
  { label: "Treatment Plans", desc: "Adherence & tolerance", icon: Droplets, path: "/insights/treatments" },
  { label: "Skin Twin", desc: "What-if simulations", icon: Sparkles, path: "/insights/skin-twin" },
];

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="px-5 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{user?.full_name || "Welcome"}</h1>
      </div>

      {/* AI Status Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Intelligence Status</p>
            <p className="text-xs text-emerald-100">Awaiting data — complete your first tasks</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">—</p>
            <p className="text-[10px] text-emerald-100">Health Index</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">—</p>
            <p className="text-[10px] text-emerald-100">Flare Risk</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">0</p>
            <p className="text-[10px] text-emerald-100">Day Streak</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {QUICK_ACTIONS.map(a => (
          <Link key={a.label} to={a.path} className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-xl ${a.color} flex items-center justify-center mb-1.5`}>
              <a.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-medium text-gray-600 text-center">{a.label}</p>
          </Link>
        ))}
      </div>

      {/* Daily Tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Today's Tasks</h2>
          <span className="text-xs text-gray-400">0/6 completed</span>
        </div>
        <div className="space-y-2">
          {["Complete skin state log", "Add sleep log", "Log meals", "Record stress level", "Log routine adherence", "Review AI insights"].map((task, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              <p className="text-sm text-gray-700">{task}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Modules</h2>
        <div className="grid grid-cols-2 gap-3">
          {MODULE_CARDS.map(m => (
            <Link key={m.label} to={m.path} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
              <m.icon className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-gray-800">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
````

### 6.97. `acnetrex-phase2/pages/Insights.jsx`

- Size: 2,404 bytes
- SHA-256: `bdbdee5e57e7a5aa77515b720fed2a6dc077f8c0aba364a7428117edace6f860`

````jsx
import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Zap, Shield, FlaskConical, Brain, Activity, Sparkles, Calendar, BarChart3 } from "lucide-react";

const INSIGHT_MODULES = [
  { label: "Forecast", icon: TrendingUp, path: "/insights/forecast", desc: "Flare risk prediction", color: "bg-emerald-50 text-emerald-600" },
  { label: "TriggerGraph", icon: Zap, path: "/insights/triggers", desc: "Personal correlations", color: "bg-amber-50 text-amber-600" },
  { label: "BarrierGuard", icon: Shield, path: "/insights/barrier", desc: "Barrier health monitor", color: "bg-blue-50 text-blue-600" },
  { label: "FormulaLens", icon: FlaskConical, path: "/insights/products", desc: "Product intelligence", color: "bg-violet-50 text-violet-600" },
  { label: "CutisAI", icon: Brain, path: "/insights/cutisai", desc: "AI assistant", color: "bg-purple-50 text-purple-600" },
  { label: "Intelligence Core", icon: Activity, path: "/insights/intelligence", desc: "AI/ML engine status", color: "bg-gray-50 text-gray-600" },
  { label: "Skin Twin Lab", icon: Sparkles, path: "/insights/skin-twin", desc: "What-if simulations", color: "bg-rose-50 text-rose-600" },
  { label: "Treatment Plans", icon: Calendar, path: "/insights/treatments", desc: "Treatment adherence", color: "bg-teal-50 text-teal-600" },
  { label: "Reports", icon: BarChart3, path: "/insights/reports", desc: "Dermatologist-ready exports", color: "bg-indigo-50 text-indigo-600" },
];

export default function Insights() {
  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Insights</h1>
      <p className="text-sm text-gray-500 mb-6">AI-powered intelligence and analysis</p>

      <div className="space-y-3">
        {INSIGHT_MODULES.map(mod => (
          <Link key={mod.label} to={mod.path} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
            <div className={`w-11 h-11 rounded-xl ${mod.color} flex items-center justify-center flex-shrink-0`}>
              <mod.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{mod.label}</p>
              <p className="text-xs text-gray-500">{mod.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
````

### 6.98. `acnetrex-phase2/pages/Login.jsx`

- Size: 3,986 bytes
- SHA-256: `1a181be1838137c3f48865aea8b1ce1a9fdee6594ff2a109733400a691a9cfe0`

````jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
````

### 6.99. `acnetrex-phase2/pages/Logs.jsx`

- Size: 2,533 bytes
- SHA-256: `bd5641ea42b30e1ce0122a2eead345dd6211e4650f2741af489cb571440ecfe3`

````jsx
import React from "react";
import { Link } from "react-router-dom";
import { Moon, Utensils, Frown, Dumbbell, Droplets, Heart, Hand, Sparkles, Pill, ClipboardCheck } from "lucide-react";

const LOG_TYPES = [
  { label: "Sleep", icon: Moon, path: "/logs/sleep", color: "bg-indigo-50 text-indigo-600", desc: "Track sleep timing & quality" },
  { label: "Food", icon: Utensils, path: "/logs/food", color: "bg-amber-50 text-amber-600", desc: "Log meals & snacks" },
  { label: "Stress", icon: Frown, path: "/logs/stress", color: "bg-red-50 text-red-600", desc: "Daily stress level" },
  { label: "Activity", icon: Dumbbell, path: "/logs/activity", color: "bg-blue-50 text-blue-600", desc: "Exercise & sweat" },
  { label: "Hydration", icon: Droplets, path: "/logs/hydration", color: "bg-cyan-50 text-cyan-600", desc: "Water intake" },
  { label: "Skin State", icon: Sparkles, path: "/logs/skin-state", color: "bg-emerald-50 text-emerald-600", desc: "Daily skin assessment" },
  { label: "Routine", icon: ClipboardCheck, path: "/logs/routine", color: "bg-violet-50 text-violet-600", desc: "Routine adherence" },
  { label: "Treatment", icon: Pill, path: "/logs/treatment", color: "bg-rose-50 text-rose-600", desc: "Medication & treatment use" },
  { label: "Contact", icon: Hand, path: "/logs/contact", color: "bg-orange-50 text-orange-600", desc: "Masks, phone, pillowcase" },
  { label: "Cycle", icon: Heart, path: "/logs/cycle", color: "bg-pink-50 text-pink-600", desc: "Menstrual / hormonal" },
];

export default function Logs() {
  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Daily Logs</h1>
      <p className="text-sm text-gray-500 mb-6">Track daily factors that may affect your skin</p>

      <div className="space-y-3">
        {LOG_TYPES.map(log => (
          <Link key={log.label} to={log.path} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
            <div className={`w-11 h-11 rounded-xl ${log.color} flex items-center justify-center flex-shrink-0`}>
              <log.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{log.label}</p>
              <p className="text-xs text-gray-500">{log.desc}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" title="Not logged today" />
          </Link>
        ))}
      </div>
    </div>
  );
}
````

### 6.100. `acnetrex-phase2/pages/Onboarding.jsx`

- Size: 2,369 bytes
- SHA-256: `eaa92d6e7cf338d4a7ec06b64119aa13dc1bd7d64ed625726637621913552b30`

````jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ConsentFlow from "@/components/onboarding/ConsentFlow";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useToast } from "@/components/ui/use-toast";

export default function Onboarding() {
  const [phase, setPhase] = useState("consent"); // consent | onboarding | complete
  const [consentStates, setConsentStates] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user already completed onboarding
    base44.entities.OnboardingProfile.list().then(profiles => {
      if (profiles.length > 0 && profiles[0].completed) {
        navigate("/");
      } else if (profiles.length > 0 && profiles[0].consent_states) {
        setConsentStates(profiles[0].consent_states);
        setPhase("onboarding");
      }
    }).catch(() => {});
  }, []);

  const handleConsentComplete = (consents) => {
    setConsentStates(consents);
    setPhase("onboarding");
  };

  const handleOnboardingComplete = async (data) => {
    setSaving(true);
    try {
      const existing = await base44.entities.OnboardingProfile.list();
      if (existing.length > 0) {
        await base44.entities.OnboardingProfile.update(existing[0].id, {
          answers: data.answers,
          consent_states: data.consentStates,
          completed: true,
          current_step: "complete"
        });
      } else {
        await base44.entities.OnboardingProfile.create({
          answers: data.answers,
          consent_states: data.consentStates,
          completed: true,
          current_step: "complete"
        });
      }
      toast({ title: "Welcome to AcneTrex!", description: "Your personalization profile has been created." });
      navigate("/");
    } catch (err) {
      toast({ title: "Error saving profile", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (phase === "consent") {
    return <ConsentFlow onComplete={handleConsentComplete} />;
  }

  if (phase === "onboarding") {
    return <OnboardingWizard consentStates={consentStates} onComplete={handleOnboardingComplete} />;
  }

  return null;
}
````

### 6.101. `acnetrex-phase2/pages/Phase2Documentation.jsx`

- Size: 9,349 bytes
- SHA-256: `b9af51f4cd98afff8529c4eb0fafe794986eef9e567a5f1799a6d7e0a40a7952`

````jsx
import React from "react";
import ReactMarkdown from "react-markdown";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const DOCS = `# Phase 2 – UI Prototype & Onboarding Implementation Log

**Platform:** Base44 (Free Tier Web App Builder)  
**Date:** ${new Date().toISOString().split("T")[0]}  
**Status:** Complete — Frontend UI prototype with onboarding and placeholder navigation

---

## Summary

Phase 2 used Base44 to scaffold the AcneTrex V3 frontend UI prototype. The deliverables include:

1. **Pre-Account Consent Education Flow** (8 steps)
2. **Mandatory Personalization Onboarding** (7 steps)
3. **Main App Shell** with bottom tab navigation
4. **Placeholder Screens** for all major modules
5. **This documentation log**

---

## Screens Produced

### Pre-Account Consent Flow (8 screens)
| Step | Screen | Required | Default |
|------|--------|----------|---------|
| 1 | Terms of Use | ✅ Required | Off |
| 2 | Privacy Policy | ✅ Required | Off |
| 3 | Health Data Processing | ✅ Required | Off |
| 4 | AI Limitations / Non-Diagnostic | ✅ Required | Off |
| 5 | Camera & Media Education | ✅ Required | Off |
| 6 | Notification Education | ✅ Required | Off |
| 7 | Anonymous Network Learning | Optional | ❌ Off |
| 8 | Raw Image Model Improvement | Optional | ❌ Off |

### Mandatory Onboarding Wizard (7 steps)
| Step | Title | Fields Collected |
|------|-------|-----------------|
| 1 | Basic Profile | Age range, timezone, primary goals, guidance style |
| 2 | Skin History | Acne onset (13 options per PRD §5B.1), severity, breakout zones, lesion types, free-text notes |
| 3 | Skin Type & Barrier | Skin type, sensitivity, barrier symptoms, actives tolerance |
| 4 | Routine & Products | Routine timing, current products, sunscreen behavior, recent changes |
| 5 | Lifestyle & Triggers | Sleep quality, stress, meal frequency (per PRD §5B.2), snack frequency, dairy, exercise |
| 6 | Goals & Constraints | Urgency, complexity tolerance, medication openness, fragrance preference |
| 7 | Consent & Learning | Anonymous learning, derived features, annotations, raw images, evidence retrieval, revocation |

### Main App Navigation (5 bottom tabs)
| Tab | Screen | Purpose |
|-----|--------|---------|
| Today | Dashboard | Daily command center with AI status, tasks, quick actions, modules |
| Logs | Log Hub | 10 daily log types with navigation |
| FaceAtlas | Face Analysis | Placeholder for multi-angle scan |
| Insights | Intelligence Hub | 10 insight modules with navigation |
| Profile | User Profile | Settings, consent, badges, reports, account |

### Log Sub-screens (10 total)
Sleep, Food, Stress, Activity, Hydration, Skin State, Routine, Treatment, Contact, Cycle

### Insight Sub-screens (10 total)
Forecast, TriggerGraph, BarrierGuard, FormulaLens, CutisAI, Intelligence Core, Skin Twin Lab, Treatment Plan Center, Reports, ClimateSkin Radar

---

## Prompts Used in Base44

1. "Build a premium mobile-first onboarding for an acne intelligence platform with consent education, step-by-step personalization cards, and placeholder module screens"
2. Iterative refinements for each onboarding step matching PRD field requirements
3. Navigation structure based on PRD §12.1 (5 bottom tabs: Today, Logs, FaceAtlas, Insights, Profile)
4. Placeholder screens for all modules per PRD §12.2 screen map

---

## PRD Compliance Notes

### Respected Requirements
- ✅ Pre-account consent education flow with all 8 required consent states (PRD §5A.2)
- ✅ Mandatory onboarding with progress indicators, defined answer sets, multi-select chips (PRD §5A.3)
- ✅ "Not sure," "Not applicable," "Prefer not to answer" options for sensitive fields
- ✅ Stitch-derived Skin History with 13 acne-onset options and structured values (PRD §5B.1)
- ✅ Meal frequency baseline capture for adaptive food logging (PRD §5B.2)
- ✅ Anonymous learning OFF by default, raw image consent OFF by default (PRD §5A.2)
- ✅ Revocation acknowledgement before proceeding (PRD §5A.8)
- ✅ Mobile-first, touch-friendly design with large cards and adequate touch targets
- ✅ Navigation structure matching PRD §12.1 and §12.2
- ✅ Premium, clinical, calm, non-judgmental visual tone (PRD §2.3, §13.1)
- ✅ Zero-fabrication: all placeholder screens clearly labeled "Coming in a future phase"
- ✅ No fake scores, mock data, or random values displayed anywhere
- ✅ Built-in Base44 authentication (email/password + Google OAuth)

### Known Limitations (Base44 Platform)
- **No React Native export**: Base44 generates React web code, not Expo React Native. The generated code must be manually translated or rebuilt in the target mobile framework.
- **No backend logic**: Base44's free tier provides only frontend code. All backend logic (AI/ML engines, evidence retrieval, forecasting, reports, treatment planning) must be implemented in later phases using FastAPI/Supabase.
- **No complex validation**: Multi-step conditional branching and autosave-on-return are simplified. Full resume-on-return requires backend persistence.
- **No offline support**: Base44 apps are web-only; offline queue, secure storage, and background sync require native implementation.
- **No native camera/media**: FaceAtlas camera flow requires Expo Camera in the real app.
- **No push notifications**: Requires expo-notifications + backend scheduling.
- **Placeholder API calls**: The onboarding saves to Base44's built-in entity system. Later phases must replace these with real API calls to the FastAPI backend.

---

## Architecture Decisions

1. **Entity Schema**: Created \`OnboardingProfile\` entity with \`answers\` (JSON), \`consent_states\` (JSON), \`completed\` (boolean), and \`current_step\` (string) to support resume-on-return.

2. **Component Structure**: Onboarding uses a wizard pattern with independent step components. Each step manages its own validation state and passes data up.

3. **Consent Flow**: Separated into its own pre-registration flow with 8 steps. Required consents block progression; optional items (anonymous learning, raw images) default to OFF.

4. **Navigation**: 5 bottom tabs matching PRD §12.1. Sub-screens use stack navigation patterns within the web router.

5. **Design System**: Emerald/green accent (PRD brand colors), Inter font, rounded cards with generous white space, clinical calm aesthetic.

---

## Handoff Notes for Later Phases

### Phase 3+ Must:
1. **Replace Base44 entities** with real PostgreSQL tables via Supabase/FastAPI
2. **Implement autosave** — currently saves only on completion
3. **Add conditional branching** — e.g., cycle tracking questions only if user enables it
4. **Build real FaceAtlas camera flow** with Expo Camera
5. **Connect all placeholder screens** to real backend services
6. **Implement Treatment Plan Center** with evidence retrieval and calendar
7. **Build CutisAI** with backend LLM routing and evidence layer
8. **Add offline queue** for daily logs
9. **Implement push notifications** tied to real events
10. **Translate to Expo React Native** from React web code

### Code Organization
- \`src/components/onboarding/\` — Consent flow, wizard, shared components
- \`src/components/onboarding/steps/\` — Individual onboarding step components
- \`src/pages/\` — Main app pages
- \`src/pages/daily-logs/\` — Log sub-pages (placeholder)
- \`src/pages/insights/\` — Insight sub-pages (placeholder)
- \`src/components/AppLayout.jsx\` — Bottom tab navigation layout
- \`src/components/PlaceholderScreen.jsx\` — Reusable coming-soon template

---

## Files Modified/Created

### Entities
- \`base44/entities/OnboardingProfile.jsonc\`

### Components (14 files)
- \`src/components/onboarding/ConsentFlow.jsx\`
- \`src/components/onboarding/OnboardingWizard.jsx\`
- \`src/components/onboarding/OnboardingChip.jsx\`
- \`src/components/onboarding/OnboardingCard.jsx\`
- \`src/components/onboarding/FieldLabel.jsx\`
- \`src/components/onboarding/steps/StepBasicProfile.jsx\`
- \`src/components/onboarding/steps/StepSkinHistory.jsx\`
- \`src/components/onboarding/steps/StepSkinType.jsx\`
- \`src/components/onboarding/steps/StepRoutine.jsx\`
- \`src/components/onboarding/steps/StepLifestyle.jsx\`
- \`src/components/onboarding/steps/StepGoals.jsx\`
- \`src/components/onboarding/steps/StepConsentLearning.jsx\`
- \`src/components/AppLayout.jsx\`
- \`src/components/PlaceholderScreen.jsx\`

### Pages (25 files)
- \`src/pages/Onboarding.jsx\`
- \`src/pages/Home.jsx\`
- \`src/pages/Logs.jsx\`
- \`src/pages/FaceAtlas.jsx\`
- \`src/pages/Insights.jsx\`
- \`src/pages/Profile.jsx\`
- \`src/pages/Phase2Documentation.jsx\`
- 10 log sub-pages in \`src/pages/daily-logs/\`
- 10 insight sub-pages in \`src/pages/insights/\`

### Config
- \`src/App.jsx\` — Full router with all routes
- \`src/index.css\` — Updated brand colors and fonts
- \`index.html\` — Updated title, meta, and fonts
`;

export default function Phase2Documentation() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      <div className="prose prose-sm prose-gray max-w-none">
        <ReactMarkdown>{DOCS}</ReactMarkdown>
      </div>
    </div>
  );
}
````

### 6.102. `acnetrex-phase2/pages/Profile.jsx`

- Size: 3,230 bytes
- SHA-256: `67666c67a36771b384f79ca2409d3a5cd35a3e29adf487526bdcaa87714a60d9`

````jsx
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Shield, Bell, FileText, Download, Trash2, LogOut, ChevronRight, Award, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROFILE_SECTIONS = [
  { label: "Skin Profile", icon: User, desc: "Baseline skin & acne data" },
  { label: "Privacy & Consent", icon: Shield, desc: "Data sharing preferences" },
  { label: "Notifications", icon: Bell, desc: "Reminder preferences" },
  { label: "Streaks & Badges", icon: Award, desc: "Progress & achievements" },
  { label: "Reports", icon: FileText, desc: "Export history" },
  { label: "Data Export", icon: Download, desc: "Download your data" },
  { label: "Settings", icon: Settings, desc: "Account preferences" },
];

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  return (
    <div className="px-5 pt-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{user?.full_name || "User"}</h1>
            <p className="text-sm text-gray-500">{user?.email || ""}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2 mb-6">
        {PROFILE_SECTIONS.map(s => (
          <button key={s.label} className="w-full flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow text-left">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <s.icon className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{s.label}</p>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="space-y-2 mb-8">
        <button className="w-full flex items-center gap-4 bg-white rounded-xl border border-red-100 p-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Delete Account</p>
            <p className="text-xs text-red-400">Permanently remove all data</p>
          </div>
        </button>

        <Button variant="outline" className="w-full h-12 rounded-xl text-gray-500" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
````

### 6.103. `acnetrex-phase2/pages/Register.jsx`

- Size: 7,065 bytes
- SHA-256: `bad1cc115555d4ee9ffc8dd55c27bd03969212286544ddf5d0396683de5f17f6`

````jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
````

### 6.104. `acnetrex-phase2/pages/ResetPassword.jsx`

- Size: 3,729 bytes
- SHA-256: `e68c455710f69a5bd3028c3c42609eba8dd11155f076462cb3a1e0e18fc4c3f4`

````jsx
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid reset link"
        subtitle="This password reset link is missing or invalid"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          The link you used appears to be incomplete. Please request a new password reset email.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="New password"
      subtitle="Enter your new password below"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
````

### 6.105. `acnetrex-phase2/pages/daily-logs/ActivityLog.jsx`

- Size: 386 bytes
- SHA-256: `07057d765da157953f72173204b873de4e4cecbd18954a54c774606410ac52fc`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Dumbbell } from "lucide-react";

export default function ActivityLog() {
  return <PlaceholderScreen title="SweatFlow Log" description="Track exercise, sweat, and heat exposure. Feeds trigger analysis for occlusion and activity-related breakouts." icon={Dumbbell} backPath="/logs" />;
}
````

### 6.106. `acnetrex-phase2/pages/daily-logs/ContactLog.jsx`

- Size: 356 bytes
- SHA-256: `cf824594213302427cabad81d9b6cc68dd93a59c8dc2da6dd25aeb664e51a2ef`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Hand } from "lucide-react";

export default function ContactLog() {
  return <PlaceholderScreen title="ContactGuard Log" description="Track mask/helmet use, phone contact, pillowcase changes, and other contact exposures." icon={Hand} backPath="/logs" />;
}
````

### 6.107. `acnetrex-phase2/pages/daily-logs/CycleLog.jsx`

- Size: 371 bytes
- SHA-256: `fc646da9405829d3928cea66d6d8fca889aec9ae46560bd350122c79d74b4e73`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Heart } from "lucide-react";

export default function CycleLog() {
  return <PlaceholderScreen title="CycleSync Log" description="Optionally track menstrual cycle and hormonal context for pattern analysis. Only if voluntarily enabled." icon={Heart} backPath="/logs" />;
}
````

### 6.108. `acnetrex-phase2/pages/daily-logs/FoodLog.jsx`

- Size: 390 bytes
- SHA-256: `a6330afe628993a04b05d7f63f86ff24f3beffd01d3136286cec92cce0e47574`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Utensils } from "lucide-react";

export default function FoodLog() {
  return <PlaceholderScreen title="DermDiet Log" description="Log meals and snacks adapted to your baseline meal count. Tracks dairy, glycemic load, and user-specific food triggers." icon={Utensils} backPath="/logs" />;
}
````

### 6.109. `acnetrex-phase2/pages/daily-logs/HydrationLog.jsx`

- Size: 360 bytes
- SHA-256: `a5b1d5113d412c2688465f84886886404157d9974672d4862a70b4dc50e17e74`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Droplets } from "lucide-react";

export default function HydrationLog() {
  return <PlaceholderScreen title="Hydration Log" description="Track daily water intake and hydration patterns to support barrier health analysis." icon={Droplets} backPath="/logs" />;
}
````

### 6.110. `acnetrex-phase2/pages/daily-logs/RoutineLog.jsx`

- Size: 391 bytes
- SHA-256: `5d08ae0aef4484a2b81428f5b471486de03f3aa9813b9ef87ceb2065100d6d36`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { ClipboardCheck } from "lucide-react";

export default function RoutineLog() {
  return <PlaceholderScreen title="Routine Adherence Log" description="Track skincare routine completion, missed steps, over-cleansing, and product application timing." icon={ClipboardCheck} backPath="/logs" />;
}
````

### 6.111. `acnetrex-phase2/pages/daily-logs/SkinStateLog.jsx`

- Size: 362 bytes
- SHA-256: `50bfba433c0e2cd5cf8d2b459a221a8d2f355167491608b0f9b04d36c7d1b1d5`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Sparkles } from "lucide-react";

export default function SkinStateLog() {
  return <PlaceholderScreen title="Skin State Log" description="Daily skin assessment including lesion count, pain, oiliness, and overall condition." icon={Sparkles} backPath="/logs" />;
}
````

### 6.112. `acnetrex-phase2/pages/daily-logs/SleepLog.jsx`

- Size: 383 bytes
- SHA-256: `7af8836fe6ba82acbf0b351bf1b9cc7adde09086872bca4fbfd8e6bf562c38a7`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Moon } from "lucide-react";

export default function SleepLog() {
  return <PlaceholderScreen title="SleepDerm Log" description="Track sleep timing, quality, and disturbances. Automatically calculates duration, sleep debt, and circadian alignment." icon={Moon} backPath="/logs" />;
}
````

### 6.113. `acnetrex-phase2/pages/daily-logs/StressLog.jsx`

- Size: 357 bytes
- SHA-256: `f78d96ca8d21d632ea5a029445d2f4c82b962375705f14ed1e18e00e7bee8e51`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Frown } from "lucide-react";

export default function StressLog() {
  return <PlaceholderScreen title="Stress Log" description="Rate daily stress on a 0–10 scale with optional categories and notes for trigger analysis." icon={Frown} backPath="/logs" />;
}
````

### 6.114. `acnetrex-phase2/pages/daily-logs/TreatmentLog.jsx`

- Size: 372 bytes
- SHA-256: `e7700c46ce3129570a7e3eb9c7685acf078c5e5a2adbd13314e661d44f5d20cd`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Pill } from "lucide-react";

export default function TreatmentLog() {
  return <PlaceholderScreen title="Treatment Log" description="Log medication and treatment use, check-ins, irritation, and adherence for your active treatment plans." icon={Pill} backPath="/logs" />;
}
````

### 6.115. `acnetrex-phase2/pages/insights/Barrier.jsx`

- Size: 386 bytes
- SHA-256: `962f022d055ad3609e0a0782a0f06337fa21f345c1b310125e4b907af8a970ac`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Shield } from "lucide-react";

export default function Barrier() {
  return <PlaceholderScreen title="BarrierGuard" description="Monitor skin barrier condition, risk factors, and recovery suggestions based on routine, products, and environment." icon={Shield} backPath="/insights" />;
}
````

### 6.116. `acnetrex-phase2/pages/insights/Climate.jsx`

- Size: 404 bytes
- SHA-256: `7a6008d994a1ada1ac35cd13244c41a888c911cf6a1eeb7d568cf840e8377e83`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Thermometer } from "lucide-react";

export default function Climate() {
  return <PlaceholderScreen title="ClimateSkin Radar" description="Real weather and environment context: humidity, UV, temperature, air quality, and their potential impact on your skin." icon={Thermometer} backPath="/insights" />;
}
````

### 6.117. `acnetrex-phase2/pages/insights/CutisAI.jsx`

- Size: 406 bytes
- SHA-256: `d4e402d55f969428106b160764915048bb9fbf3938aab7e1358aa809394d282a`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Brain } from "lucide-react";

export default function CutisAI() {
  return <PlaceholderScreen title="CutisAI" description="Your AI skin assistant with evidence retrieval, context awareness, and action capabilities. Ask about your skin, products, or treatment plans." icon={Brain} backPath="/insights" />;
}
````

### 6.118. `acnetrex-phase2/pages/insights/Forecast.jsx`

- Size: 395 bytes
- SHA-256: `0a2d9c98c0d0b79223bb20b000fce019de4aab429670e7cc2a104c7cdb7be1b7`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { TrendingUp } from "lucide-react";

export default function Forecast() {
  return <PlaceholderScreen title="ClearPath Forecast" description="Flare risk prediction for 3, 7, 14, or 30 days. Requires sufficient historical data for meaningful forecasts." icon={TrendingUp} backPath="/insights" />;
}
````

### 6.119. `acnetrex-phase2/pages/insights/Intelligence.jsx`

- Size: 406 bytes
- SHA-256: `878d34a4f9abef53b61b687337adf481c2437637049d0ad343cf9884aed6eb1f`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Activity } from "lucide-react";

export default function Intelligence() {
  return <PlaceholderScreen title="Intelligence Core" description="Live AI/ML engine status: analysis activity, model confidence, learning state, readiness scores, and calibration updates." icon={Activity} backPath="/insights" />;
}
````

### 6.120. `acnetrex-phase2/pages/insights/Products.jsx`

- Size: 427 bytes
- SHA-256: `6a6ddba001716fb4b18a6415d3a1c737b97f09f692984696f60cee8c5264eb52`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { FlaskConical } from "lucide-react";

export default function Products() {
  return <PlaceholderScreen title="FormulaLens" description="Product and ingredient intelligence. Scan labels, paste ingredients, or search products for comedogenic, irritation, and compatibility analysis." icon={FlaskConical} backPath="/insights" />;
}
````

### 6.121. `acnetrex-phase2/pages/insights/Reports.jsx`

- Size: 408 bytes
- SHA-256: `5309b27de79142544613c211a317fe8ebfbe05ebe01417c39fbd8b1deac155b4`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { BarChart3 } from "lucide-react";

export default function Reports() {
  return <PlaceholderScreen title="Reports" description="Generate dermatologist-ready PDF reports from your real data including acne timeline, triggers, treatment history, and confidence notes." icon={BarChart3} backPath="/insights" />;
}
````

### 6.122. `acnetrex-phase2/pages/insights/SkinTwin.jsx`

- Size: 405 bytes
- SHA-256: `ecfecc62baa9928a3ea99d5d1b643effb84010df6c198263991586340d25637b`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Sparkles } from "lucide-react";

export default function SkinTwin() {
  return <PlaceholderScreen title="Skin Twin Lab" description="What-if simulations: explore how better sleep, diet changes, routine consistency, or treatment adherence might affect your skin." icon={Sparkles} backPath="/insights" />;
}
````

### 6.123. `acnetrex-phase2/pages/insights/Treatments.jsx`

- Size: 422 bytes
- SHA-256: `8a23138cb5321ca95cd9c342824a5229912c3105638d44617d2bdd8e0627b5e6`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Calendar } from "lucide-react";

export default function Treatments() {
  return <PlaceholderScreen title="Treatment Plan Center" description="Structured treatment adherence and tolerance building. Calendar-mapped schedules, daily check-ins, and evidence-based plan adjustments." icon={Calendar} backPath="/insights" />;
}
````

### 6.124. `acnetrex-phase2/pages/insights/Triggers.jsx`

- Size: 381 bytes
- SHA-256: `2567b2c30f4b8367e5486ed36e8a589411092db06fd51503398d7aeb05adbb6b`

````jsx
import React from "react";
import PlaceholderScreen from "@/components/PlaceholderScreen";
import { Zap } from "lucide-react";

export default function Triggers() {
  return <PlaceholderScreen title="TriggerGraph" description="Detect personal correlations between behaviors, products, environment, and acne changes. Requires 14+ days of logs." icon={Zap} backPath="/insights" />;
}
````

### 6.125. `acnetrex-phase2/postcss.config.js`

- Size: 80 bytes
- SHA-256: `190c877db466995bf1482f4a16abd06e04a89ede3119341e2a86ff96e1737b27`

````javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
````

### 6.126. `acnetrex-phase2/tailwind.config.js`

- Size: 2,598 bytes
- SHA-256: `7b8434c2adeffe61bbb861e11a2af2e1cc3228f64f61ac7b246e3c86ba7c8d4e`

````javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
````

### 6.127. `acnetrex-phase2/utils/index.ts`

- Size: 97 bytes
- SHA-256: `1bd31d3e8630b19dcb1d92878a2501d5e29fc935eab48ec5d90e66c410cf7e1a`

````typescript
export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}
````

### 6.128. `acnetrex-phase2/vite.config.js`

- Size: 617 bytes
- SHA-256: `d92e1eb3037080aa2a643aa3e7fd23b26ba946db9b78ce17e31e2dfc0bb1a586`

````javascript
import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});
````
