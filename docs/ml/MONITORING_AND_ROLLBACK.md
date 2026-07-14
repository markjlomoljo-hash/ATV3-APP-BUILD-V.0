# Monitoring and rollback

Log only request IDs, module/task, runtime mode/provider, readiness/safety state, latency, status, model/dataset/feature versions, coverage, and coarse errors. Do not log tokens, raw inputs, user IDs, image paths, or health contents. Track request/error/timeout/replay rates, queue age, retries/dead letters, abstention/unavailable rate, coverage, feature missingness, drift, calibration error, subgroup performance, and local/cloud parity.

Alert on readiness failure, sustained error/timeout or queue-age breach, replay conflicts, drift threshold breach, calibration degradation, subgroup regression, checksum mismatch, or unexpected model activation. Retraining is review-triggered, reproducible, and never self-promoting.

Rollback order: disable the affected task or force explicit unavailable state; stop new claims if persistence is unsafe; revert model registry/config to the last approved checksum; revert Cloud Run revision if service behavior regressed; verify root/live/ready/auth/predict/replay; document affected request window. Production revision `mlatv-00012-biw` is active at 100%; placeholder revision `mlatv-00002-4ww` is retained only as the tested zero-traffic `rollback` target. Because that target is the pre-ML placeholder, rollback restores availability but intentionally removes ML inference until a corrected revision is promoted.
