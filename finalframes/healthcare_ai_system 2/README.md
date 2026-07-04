# Healthcare AI System — Synthetic Dataset

11 CSV files, exact row counts as specified, fully cross-referenced.
See `docs/DATA_DICTIONARY.md` for schema, relationships, validation results,
and — importantly — what "accurate" does and doesn't mean for this data.

## Quick facts
- All primary keys unique. All foreign keys resolve. Zero orphaned rows. (Verified — see docs.)
- Medical content (diseases, symptoms, drug classes, lab ranges) is drawn from real
  clinical knowledge, not randomly generated text.
- ai_training_dataset.csv is sampled from the validated symptom↔disease mapping table,
  so model training on it reflects real association patterns.
- This is synthetic data for prototyping/demos. It is not real patient data and any
  model trained on it should be positioned as decision-support, not diagnosis.

## Folder structure
```
data/raw/hospital_operations/     patients, doctors, hospitals, prescriptions, medicines, lab_reports
data/raw/medical_knowledge_base/  diseases, symptoms, symptom_disease_mapping, health_tips
data/ml/                          ai_training_dataset.csv
docs/                             data dictionary + generation scripts
```
