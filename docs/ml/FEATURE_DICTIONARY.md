# Feature dictionary

Canonical machine-readable source: `ml-service/schemas/feature-schema.json`, version 1.0.0. Every feature records type, unit, source, calculation, valid range, missing behavior, privacy class, cloud availability, offline availability, and introduction version.

Missing is never coerced to zero unless the schema explicitly says so. Unknown meals are not skipped meals. Cross-midnight sleep uses elapsed time. Longitudinal features require stable record IDs and event timestamps; training snapshots must additionally use an as-of cutoff to prevent future leakage. Raw image bytes are not features and may be read only for a consented server-side transformation. Derived biometric values remain sensitive.

Contract fields `features_used`, `features_missing`, `sample_count`, `coverage`, `confounders`, and `limitations` make feature availability visible. Feature changes require a schema-version bump, migration/mapping review, parity fixtures, and artifact checksum update.

