# Scout model and data findings

## Verified current state

- V4 representation ZIP SHA-256: `DA937A31C3751312F38E0F8EBB37ED444608ECAEC64C980A0DB4F9B07AA3DA14`; 64 entries, zero image files and zero model-weight artifacts.
- Foundation ZIP SHA-256: `112AF3EA7B18A6D9B495D01B1F36037C6FA2292ED9B270C6F938CFC5502B0C7A`; 204 entries, code/scaffolding only, zero image files and zero model-weight artifacts.
- Repository truth is correct: no training-eligible dataset, no active predictive model, no Vertex deployment, and honest abstention.

## Decision-relevant findings

1. No external acne dataset or checkpoint is production-ready.
2. Canonical cohort route: prospective first-party consented longitudinal outcomes with stable participant/episode IDs and a predeclared non-diagnostic endpoint.
3. Best image acquisition leads: DermNet paid custom licence and written ACNE04 commercial permission. SCIN remains `rights_unverified` for product use despite its broad copyright grant.
4. New lawful model opportunity: standard DINOv2 weights are Apache-2.0; use DINOv2-small only as a frozen evaluation baseline after approved images exist. Separate X-ray/cell variants are restrictive.
5. MedSigLIP commercial use is possible under binding HAI-DEF terms, but hosted/derivative duties and health prohibited-use rules require explicit owner/legal approval. It is a cloud representation candidate, never a zero-shot acne predictor.
6. Controlled structured leads exist: GSK CSDR acne raw data, one YODA acne trial, and future Acne-ID repeated CASS IPD. All require reviewed requests/DUAs; production derivative rights are `rights_unverified`.
7. Canonical ANN/ensemble: GBDT and regularized baselines versus a small residual MLP; held-out calibration; weighted/stacked ensemble only after patient-grouped temporal/external gains. Add TCN/GRU/transformers only after data-volume evidence.

## Required next owner actions

- Approve legal/clinical/ethics work for the first-party cohort and consent language.
- Authorize scoped DermNet/ACNE04 licensing inquiries.
- Have counsel review SCIN and HAI-DEF terms.
- Do not accept terms, acquire sensitive data, train, or deploy until each resource enters the governed manifest with exact licence, version and hash.

Full registries and plans are under `research/`; detailed citations and constraints are in `docs/audit/model-data-evidence.md`.
