# Weak-supervision strategy

Weak labels may reduce annotation cost; they never become gold-standard clinical labels by repetition.

| Strategy | Weak-label source | Noise/conflict control | AcneTrex use | Prohibited claim |
|---|---|---|---|---|
| Clinician labeling functions | dermatologist-authored rules | versioned rules; abstain; conflict matrix | triage annotation candidates | clinically validated label |
| Multi-rater consensus | independent dermatologist reviews | adjudication and inter-rater agreement | locked gold subset | unanimous truth outside reviewed set |
| Pseudo-labeling | approved teacher model | high threshold; OOD rejection; human sampling | expand training pool | teacher output equals diagnosis |
| Active learning | model uncertainty/disagreement | diversity sampling and blind review | prioritize expensive labels | sampled data are population-representative |
| Positive-unlabeled learning | confirmed positives plus unlabeled | class-prior sensitivity and calibrated holdout | lesion candidate discovery | unlabeled means negative |
| Multiple-instance learning | scan-level label across regions | region review and attention sanity checks | coarse localization | instance-level lesion proof |
| Treatment/outcome heuristics | logged change and time windows | strict cutoffs and confounder flags | research targets | treatment caused improvement |

Every weak source needs a version, coverage, abstention rate, estimated noise, conflict resolution and audit sample. Train/validation/test separation must occur before pseudo-labeling. Behavior-tuning conversations, static knowledge, and synthetic fixtures must not become flare or lesion labels.
