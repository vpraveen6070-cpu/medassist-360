"""
Validates referential integrity and row counts across ALL 11 files.
This is the check that actually backs any accuracy/consistency claim --
without this passing, the claim is just an assertion.
"""
import csv

ROOT = "/home/claude/healthcare_ai_system/data"
KB = f"{ROOT}/raw/medical_knowledge_base"
HOSP = f"{ROOT}/raw/hospital_operations"
ML = f"{ROOT}/ml"

def read_csv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))

def col(rows, name):
    return set(r[name] for r in rows)

errors = []
warnings = []

# ---- Load everything ----
patients = read_csv(f"{HOSP}/patients.csv")
doctors = read_csv(f"{HOSP}/doctors.csv")
hospitals = read_csv(f"{HOSP}/hospitals.csv")
prescriptions = read_csv(f"{HOSP}/prescriptions.csv")
medicines = read_csv(f"{HOSP}/medicines.csv")
lab_reports = read_csv(f"{HOSP}/lab_reports.csv")
diseases = read_csv(f"{KB}/diseases.csv")
symptoms = read_csv(f"{KB}/symptoms.csv")
mapping = read_csv(f"{KB}/symptom_disease_mapping.csv")
health_tips = read_csv(f"{KB}/health_tips.csv")
ml_data = read_csv(f"{ML}/ai_training_dataset.csv")

# ---- 1. Row count check ----
expected_counts = {
    "patients.csv": (patients, 5000),
    "doctors.csv": (doctors, 500),
    "hospitals.csv": (hospitals, 100),
    "prescriptions.csv": (prescriptions, 5000),
    "medicines.csv": (medicines, 2000),
    "lab_reports.csv": (lab_reports, 2000),
    "diseases.csv": (diseases, 500),
    "symptoms.csv": (symptoms, 1500),
    "symptom_disease_mapping.csv": (mapping, 2000),
    "health_tips.csv": (health_tips, 500),
    "ai_training_dataset.csv": (ml_data, 10000),
}
print("=" * 70)
print("ROW COUNT VALIDATION")
print("=" * 70)
for name, (data, expected) in expected_counts.items():
    actual = len(data)
    status = "OK" if actual == expected else "MISMATCH"
    if actual != expected:
        errors.append(f"{name}: expected {expected}, got {actual}")
    print(f"{name:35s} expected={expected:6d}  actual={actual:6d}  [{status}]")

# ---- 2. Primary key uniqueness ----
print()
print("=" * 70)
print("PRIMARY KEY UNIQUENESS")
print("=" * 70)
pk_checks = [
    ("patients.csv", patients, "patient_id"),
    ("doctors.csv", doctors, "doctor_id"),
    ("hospitals.csv", hospitals, "hospital_id"),
    ("prescriptions.csv", prescriptions, "prescription_id"),
    ("medicines.csv", medicines, "medicine_id"),
    ("lab_reports.csv", lab_reports, "report_id"),
    ("diseases.csv", diseases, "disease_id"),
    ("symptoms.csv", symptoms, "symptom_id"),
    ("symptom_disease_mapping.csv", mapping, "mapping_id"),
    ("health_tips.csv", health_tips, "tip_id"),
    ("ai_training_dataset.csv", ml_data, "sample_id"),
]
for name, data, pk in pk_checks:
    ids = [r[pk] for r in data]
    unique = len(set(ids))
    status = "OK" if unique == len(ids) else "DUPLICATES FOUND"
    if unique != len(ids):
        errors.append(f"{name}: {len(ids) - unique} duplicate {pk} values")
    print(f"{name:35s} total={len(ids):6d}  unique={unique:6d}  [{status}]")

# ---- 3. Foreign key referential integrity ----
print()
print("=" * 70)
print("FOREIGN KEY REFERENTIAL INTEGRITY")
print("=" * 70)

hospital_ids = col(hospitals, "hospital_id")
doctor_ids = col(doctors, "doctor_id")
patient_ids = col(patients, "patient_id")
medicine_ids = col(medicines, "medicine_id")
disease_ids = col(diseases, "disease_id")
symptom_ids = col(symptoms, "symptom_id")

fk_checks = [
    ("doctors.hospital_id -> hospitals", doctors, "hospital_id", hospital_ids),
    ("patients.registered_hospital_id -> hospitals", patients, "registered_hospital_id", hospital_ids),
    ("prescriptions.patient_id -> patients", prescriptions, "patient_id", patient_ids),
    ("prescriptions.doctor_id -> doctors", prescriptions, "doctor_id", doctor_ids),
    ("prescriptions.medicine_id -> medicines", prescriptions, "medicine_id", medicine_ids),
    ("prescriptions.disease_id -> diseases", prescriptions, "disease_id", disease_ids),
    ("lab_reports.patient_id -> patients", lab_reports, "patient_id", patient_ids),
    ("lab_reports.doctor_id -> doctors", lab_reports, "doctor_id", doctor_ids),
    ("symptom_disease_mapping.disease_id -> diseases", mapping, "disease_id", disease_ids),
    ("symptom_disease_mapping.symptom_id -> symptoms", mapping, "symptom_id", symptom_ids),
    ("ai_training_dataset.disease_id -> diseases", ml_data, "disease_id", disease_ids),
]

for label, data, fk_col, valid_ids in fk_checks:
    bad = [r[fk_col] for r in data if r[fk_col] not in valid_ids]
    status = "OK" if not bad else f"{len(bad)} ORPHANED ROWS"
    if bad:
        errors.append(f"{label}: {len(bad)} orphaned references, e.g. {bad[:3]}")
    print(f"{label:50s} [{status}]")

# ---- 4. ML dataset symptom columns reference real symptom_ids ----
print()
print("=" * 70)
print("ML DATASET SYMPTOM COLUMN INTEGRITY")
print("=" * 70)
bad_symptom_refs = 0
total_symptom_slots = 0
for r in ml_data:
    for col_name in ["symptom_1", "symptom_2", "symptom_3", "symptom_4", "symptom_5", "symptom_6"]:
        val = r[col_name]
        if val == "":
            continue
        total_symptom_slots += 1
        if val not in symptom_ids:
            bad_symptom_refs += 1
status = "OK" if bad_symptom_refs == 0 else "BAD REFERENCES FOUND"
if bad_symptom_refs:
    errors.append(f"ai_training_dataset.csv: {bad_symptom_refs} symptom columns reference unknown symptom_id")
print(f"Total non-empty symptom slots checked: {total_symptom_slots}")
print(f"Invalid symptom_id references: {bad_symptom_refs}  [{status}]")

# ---- 5. No fully-duplicate rows (exact duplicate records) ----
print()
print("=" * 70)
print("EXACT DUPLICATE ROW CHECK")
print("=" * 70)
for name, data in [
    ("patients.csv", patients), ("doctors.csv", doctors), ("prescriptions.csv", prescriptions),
    ("lab_reports.csv", lab_reports), ("ai_training_dataset.csv", ml_data),
]:
    seen = set()
    dupes = 0
    for r in data:
        key = tuple(r.items())
        if key in seen:
            dupes += 1
        seen.add(key)
    status = "OK" if dupes == 0 else "DUPLICATES FOUND"
    if dupes:
        warnings.append(f"{name}: {dupes} exact duplicate rows")
    print(f"{name:35s} exact_duplicates={dupes:4d}  [{status}]")

# ---- 6. ML dataset class balance check ----
print()
print("=" * 70)
print("ML DATASET CLASS BALANCE")
print("=" * 70)
from collections import Counter
disease_counts = Counter(r["disease_id"] for r in ml_data)
counts_list = list(disease_counts.values())
print(f"Unique diseases represented: {len(disease_counts)}")
print(f"Min samples/disease: {min(counts_list)}")
print(f"Max samples/disease: {max(counts_list)}")
print(f"Imbalance ratio (max/min): {max(counts_list)/min(counts_list):.2f}x")
if max(counts_list) / min(counts_list) > 3:
    warnings.append("ML dataset has significant class imbalance (>3x)")

# ---- FINAL SUMMARY ----
print()
print("=" * 70)
print("FINAL VALIDATION SUMMARY")
print("=" * 70)
if not errors:
    print("PASS: Zero referential integrity errors across all 11 files.")
else:
    print(f"FAIL: {len(errors)} integrity errors found:")
    for e in errors:
        print(f"  - {e}")

if warnings:
    print(f"\n{len(warnings)} warning(s) (non-critical):")
    for w in warnings:
        print(f"  - {w}")
else:
    print("No warnings.")
