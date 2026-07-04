"""
Generates ai_training_dataset.csv (10,000 symptom -> disease samples).

Design principle: samples are drawn from the ALREADY-VALIDATED
symptom_disease_mapping.csv, weighted by association_strength, so every
row reflects a real clinical pattern rather than noise. A small, clearly
documented fraction of rows include one "noise" symptom (a symptom not
associated with the disease) to simulate real-world reporting noise --
this is standard practice for realistic training data and is flagged in
a column so it can be filtered out if a "clean" subset is needed.
"""
import csv
import random
from collections import defaultdict

random.seed(99)

BASE = "/home/claude/healthcare_ai_system/data/raw/medical_knowledge_base"
ML_OUT = "/home/claude/healthcare_ai_system/data/ml"

def read_csv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))

diseases = read_csv(f"{BASE}/diseases.csv")
symptoms = read_csv(f"{BASE}/symptoms.csv")
mapping = read_csv(f"{BASE}/symptom_disease_mapping.csv")

disease_by_id = {d["disease_id"]: d for d in diseases}
symptom_by_id = {s["symptom_id"]: s for s in symptoms}
all_symptom_ids = list(symptom_by_id.keys())

# Build disease -> list of (symptom_id, strength) from the validated mapping
disease_symptom_map = defaultdict(list)
for row in mapping:
    disease_symptom_map[row["disease_id"]].append((row["symptom_id"], row["association_strength"]))

# Only use diseases that actually have mapped symptoms (should be all 500,
# but this guards against any edge cases from the generation step above)
valid_disease_ids = [did for did in disease_by_id if disease_symptom_map[did]]

strength_weight = {"Strong": 3, "Moderate": 2, "Weak": 1}

def sample_symptoms_for_disease(disease_id, n_symptoms):
    pool = disease_symptom_map[disease_id]
    sym_ids = [s for s, _ in pool]
    weights = [strength_weight[strength] for _, strength in pool]
    n = min(n_symptoms, len(sym_ids))
    chosen = []
    pool_copy = list(zip(sym_ids, weights))
    for _ in range(n):
        if not pool_copy:
            break
        ids, ws = zip(*pool_copy)
        pick = random.choices(ids, weights=ws, k=1)[0]
        chosen.append(pick)
        pool_copy = [(i, w) for i, w in pool_copy if i != pick]
    return chosen

rows = []
sample_id = 1
target = 10000

# Ensure balanced-ish coverage: cycle through diseases multiple times rather
# than pure random choice, so no disease is drastically underrepresented
# (important for a usable, non-biased ML dataset).
cycles_needed = (target // len(valid_disease_ids)) + 1
disease_cycle = valid_disease_ids * cycles_needed
random.shuffle(disease_cycle)

for disease_id in disease_cycle:
    if sample_id > target:
        break

    # vary how many symptoms are reported per case (real patients don't
    # always report every symptom) -- between 2 and 6 symptoms
    n_symptoms = random.randint(2, min(6, len(disease_symptom_map[disease_id])))
    if n_symptoms == 0:
        continue
    chosen_symptoms = sample_symptoms_for_disease(disease_id, n_symptoms)
    if not chosen_symptoms:
        continue

    is_noisy = random.random() < 0.08  # 8% of rows get one unrelated symptom
    if is_noisy:
        associated_ids = {s for s, _ in disease_symptom_map[disease_id]}
        noise_candidates = [s for s in all_symptom_ids if s not in associated_ids]
        if noise_candidates:
            chosen_symptoms.append(random.choice(noise_candidates))

    # pad to a fixed 6-symptom-slot schema for a clean tabular ML format;
    # unused slots are empty strings (explicit "no symptom reported")
    slots = chosen_symptoms + [""] * (6 - len(chosen_symptoms))
    slots = slots[:6]

    disease = disease_by_id[disease_id]
    rows.append({
        "sample_id": f"TRN{sample_id:06d}",
        "symptom_1": slots[0],
        "symptom_2": slots[1],
        "symptom_3": slots[2],
        "symptom_4": slots[3],
        "symptom_5": slots[4],
        "symptom_6": slots[5],
        "num_symptoms_reported": len(chosen_symptoms),
        "patient_age_group": random.choice(["0-12", "13-19", "20-35", "36-50", "51-65", "66+"]),
        "patient_gender": random.choice(["Male", "Female"]),
        "disease_id": disease_id,
        "disease_name": disease["disease_name"],
        "disease_category": disease["category"],
        "contains_noise_symptom": is_noisy,
    })
    sample_id += 1

rows = rows[:target]

fieldnames = [
    "sample_id", "symptom_1", "symptom_2", "symptom_3", "symptom_4",
    "symptom_5", "symptom_6", "num_symptoms_reported", "patient_age_group",
    "patient_gender", "disease_id", "disease_name", "disease_category",
    "contains_noise_symptom",
]

with open(f"{ML_OUT}/ai_training_dataset.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(rows)

# Quick integrity/balance report
by_disease_count = defaultdict(int)
for r in rows:
    by_disease_count[r["disease_id"]] += 1

counts = list(by_disease_count.values())
print(f"ai_training_dataset.csv -> {len(rows)} rows")
print(f"Diseases covered: {len(by_disease_count)} / {len(valid_disease_ids)}")
print(f"Samples per disease -> min: {min(counts)}, max: {max(counts)}, avg: {sum(counts)/len(counts):.1f}")
print(f"Noisy rows: {sum(1 for r in rows if r['contains_noise_symptom'] == True)} ({sum(1 for r in rows if r['contains_noise_symptom'] == True)/len(rows)*100:.1f}%)")
