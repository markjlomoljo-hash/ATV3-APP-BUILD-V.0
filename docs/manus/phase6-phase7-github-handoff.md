# Phase 6 and Phase 7 GitHub Handoff

Repository: `markjlomoljo-hash/ATV3-APP-BUILD-V.0`

Use pull requests only:

`feature branch` -> `dev` -> `staging` -> `main`

Do not commit directly to `main` or `staging`.

## Branches

- Phase 6: `feat/phase6-gamification-treatment`
- Phase 7: `feat/phase7-profile-reports`

Both pull requests must target `dev`.

## Package metadata

### Phase 6

- File: `acnetrex-gamification-phase-implementation.zip`
- Archive size: `169271` bytes
- Extracted files: `77`
- Extracted bytes: `152103`
- SHA-256: `17037fee9060428d6c9704638c3da684730b63915fe97e1bf00226e607122eee`

### Phase 7

- File: `acnetrex-professional-profile-reports.zip`
- Archive size: `112871` bytes
- Extracted files: `47`
- Extracted bytes: `102921`
- SHA-256: `02ff3a1bb0dc82963b14be4246480d165c46a6362d8276443f5733ddc2763da0`

## Required commands

```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b feat/phase6-gamification-treatment
# copy reviewed Phase 6 package contents
git add .
git commit -m "feat(phase6): apply package"
git push -u origin feat/phase6-gamification-treatment
```

```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b feat/phase7-profile-reports
# copy reviewed Phase 7 package contents
git add .
git commit -m "feat(phase7): apply package"
git push -u origin feat/phase7-profile-reports
```

## Checks

Run after applying each package:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

## Rules

- Keep the two phases separate.
- Preserve existing architecture and naming.
- Do not overwrite unrelated files without review.
- Do not commit sensitive local configuration values.
- Open pull requests into `dev` only.
