# Mobile runtime

Expo iOS/Android stores offline ML/job state in Expo SQLite with SQLCipher enabled. A 32-byte random key is stored with SecureStore using `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, supplied as a raw hex SQLCipher key immediately after open, and verified by querying `sqlite_master`. Initialization closes and fails when key creation, key application, or verification fails. SQLCipher requires a development/native build and is unavailable in Expo Go.

The local runtime returns deterministic observations only and queues `/api/ml/jobs` for cloud-required tasks. It preserves request and idempotency UUIDs, consent, input record references, readiness, safety, and sync state. It must not present predictive confidence where no calibrated model exists. The dependency lockfile is valid and a clean install plus TypeScript check passes.

Still required outside this environment: EAS iOS/Android builds, physical-device SQLCipher reopen test, airplane-mode queue/replay test, camera capture quality/performance, background/termination recovery, and accessibility/usability verification.

