# Healthcare AI System — Data Dictionary & Validation Report

## What was validated (and confirmed passing)

| Check | Result |
|---|---|
| Row counts match spec exactly (all 11 files) | ✅ PASS |
| Primary key uniqueness (all 11 files) | ✅ PASS — 0 duplicates |
| Foreign key integrity (11 relationships checked) | ✅ PASS — 0 orphaned rows |
| ML dataset symptom references valid (34,628 slots checked) | ✅ PASS — 0 invalid |
| Exact duplicate rows | ✅ PASS — 0 found |
| ML class balance | ✅ 411 diseases, 22–25 samples each (1.14x imbalance ratio) |

Full validation script: `/home/claude/validate_integrity.py` (re-runnable against any regenerated data).

## What "100% accurate" actually means here — and what it can't mean

This dataset is **100% internally consistent** (every ID resolves, every relationship holds, every symptom-disease pairing reflects a real clinical association pattern). It is **not, and cannot be, 100% accurate as a real-world diagnostic ground truth**, because:

- Real symptom-disease relationships have exceptions, comorbidities, and population variation that a static mapping table can't capture.
- Two diseases can share nearly identical symptom profiles (e.g. early Dengue vs. Malaria vs. Typhoid) — this is medically real, not a flaw, but it means no symptom-only model can hit 100% on real patients.
- Numeric fields (lab values, ages, vitals) are statistically plausible, not measurements of real people.

**If this trains a model:** treat its output as a decision-support hint, never a diagnosis. Frame this explicitly in any downstream app / UI.

## Table relationships

```
hospitals ──┬──< doctors (hospital_id)
            └──< patients (registered_hospital_id)

patients ──┬──< prescriptions (patient_id)
           └──< lab_reports (patient_id)

doctors ──┬──< prescriptions (doctor_id)
          └──< lab_reports (doctor_id)

diseases ──┬──< prescriptions (disease_id)
           ├──< symptom_disease_mapping (disease_id)
           └──< ai_training_dataset (disease_id)

symptoms ──< symptom_disease_mapping (symptom_id)
                    │
                    └── sampled from, to build ──> ai_training_dataset (symptom_1..6)

medicines ──< prescriptions (medicine_id)   [selected via category-aware drug-class matching]
```

## Column notes by file

**hospitals.csv** — `hospital_id` (PK), city/state drawn from real Indian metro areas, `rating` 2.5–5.0.

**doctors.csv** — `doctor_id` (PK), `hospital_id` (FK → hospitals), specialization from 20 real medical specialties.

**patients.csv** — `patient_id` (PK), `registered_hospital_id` (FK → hospitals), blood group distribution weighted to real-world population frequencies (O+ ~38%, AB- ~1%, etc.).

**medicines.csv** — built from 88 real generic drugs with correct drug-class/use mappings (e.g. Metformin → Antidiabetic (Biguanide)), cycled to 2,000 rows with varied brand/strength/manufacturer combinations.

**prescriptions.csv** — `patient_id`/`doctor_id`/`medicine_id`/`disease_id` (all FKs). Medicine selection is **category-aware**: a cardiovascular diagnosis draws only from antihypertensive/statin/anticoagulant/diuretic classes, not a random drug — verified in the spot-check above (Hypertension → Losartan, Atenolol, Furosemide, Atorvastatin).

**lab_reports.csv** — `patient_id`/`doctor_id` (FKs). 25 real lab test types with correct clinical reference ranges (e.g. Fasting Glucose 70–100 mg/dL, HbA1c 4.0–5.6%); 75% of numeric results fall in-range, 25% out-of-range for realism, each correctly flagged Normal/Abnormal/Critical based on the actual generated value.

**diseases.csv** — 80 real base diseases across 15 medical categories, expanded to 500 with clinically valid severity-stage prefixes (Acute/Chronic/Advanced/etc.).

**symptoms.csv** — 100 real base symptoms expanded to 1,500 with location + severity qualifiers.

**symptom_disease_mapping.csv** — the clinical backbone. Every one of the 80 base diseases is mapped to its real, textbook symptom cluster (verified: Malaria → Fever/Chills/Sweating at 71–95% frequency, Strong association) with `association_strength` (Strong/Moderate/Weak) and `frequency_percent` grounding.

**health_tips.csv** — generic, safe preventive advice by disease category (no dosage/treatment instructions — intentionally, since specific medical advice should come from a clinician, not a static lookup table).

**ai_training_dataset.csv** — 10,000 rows sampled directly from the validated `symptom_disease_mapping.csv`, weighted by association strength, 2–6 symptoms per case (real patients underreport), 8% include one deliberately unrelated "noise" symptom (flagged in `contains_noise_symptom`) to simulate real-world reporting noise — filter this column to `False` for a clean subset. Balanced across 411 diseases (22–25 samples each).

## Regenerating or extending this data

Three scripts, run in order (later scripts depend on earlier outputs):
```
python3 gen_knowledge_base.py   # diseases, symptoms, mapping, health_tips
python3 gen_hospital_ops.py     # hospitals, doctors, patients, medicines, prescriptions, lab_reports
python3 gen_ml_dataset.py       # ai_training_dataset (depends on knowledge_base outputs)
python3 validate_integrity.py   # re-run this after any change
```
All scripts are seeded (reproducible). Copies are included in `docs/generation_scripts/` for reference.
