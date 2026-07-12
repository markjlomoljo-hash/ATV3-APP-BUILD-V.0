-- Foreign tables do not enforce Postgres row-level security. Keep the S3
-- wrapper behind the server/service-role boundary instead of exposing it to
-- browser or native authenticated clients.
revoke all privileges on table public."S3 wrapper " from anon, authenticated;
