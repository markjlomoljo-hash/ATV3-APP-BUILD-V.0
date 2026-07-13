# ML data governance

No supplied or discovered dataset is currently training-eligible. The V4 representation pack is accepted only as non-training interface/reference material. Candidate disposition and license evidence live in `docs/ml-research`.

The local forward migration `20260714060500_ml_governance_security_hardening.sql` adds dataset snapshots, consent/de-identification state, PHI review, population and split metadata, quality/bias results, retention/deletion rules, approvals, training lineage, and immutable result metadata. It revokes client access to governance and raw feature tables. Reports, Skin Twin, and ML artifacts are server-generated; FaceAtlas raw upload/delete is limited to the authenticated owner folder with active consent.

Required before training: documented collection authority; purpose-compatible license; active consent at snapshot cutoff; de-identification verification; stable subject grouping; temporal cutoff; train/validation/test hashes; label provenance and inter-rater review where clinical labels are used; population coverage; deletion propagation; and independent approval. Service-role access is privileged and must remain server-only. The migration has static policy tests but has not been applied to a live project.

