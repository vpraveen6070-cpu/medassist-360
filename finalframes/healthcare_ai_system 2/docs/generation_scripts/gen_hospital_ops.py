"""
Generates hospital_operations tables:
  hospitals.csv, doctors.csv, patients.csv, medicines.csv,
  prescriptions.csv, lab_reports.csv

Generation ORDER matters for referential integrity:
  hospitals -> doctors (references hospital_id)
            -> patients (references hospital_id)
  medicines (independent reference list)
  diseases/symptoms already generated (medical_knowledge_base)
  prescriptions (references patient_id, doctor_id, medicine_id, disease_id)
  lab_reports (references patient_id, doctor_id)
"""
import csv
import random
from datetime import datetime, timedelta
from faker import Faker

random.seed(7)
fake = Faker()
Faker.seed(7)

BASE = "/home/claude/healthcare_ai_system/data/raw"
HOSP_OUT = f"{BASE}/hospital_operations"
KB = f"{BASE}/medical_knowledge_base"

def read_csv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))

diseases = read_csv(f"{KB}/diseases.csv")
mapping = read_csv(f"{KB}/symptom_disease_mapping.csv")
symptoms = read_csv(f"{KB}/symptoms.csv")

disease_ids = [d["disease_id"] for d in diseases]
disease_by_id = {d["disease_id"]: d for d in diseases}

# ---------------------------------------------------------------------------
# 1. HOSPITALS (100)
# ---------------------------------------------------------------------------
hospital_types = ["General", "Multi-Specialty", "Teaching", "Community", "Specialty"]
specialty_focus = ["Cardiology", "Oncology", "Orthopedics", "Pediatrics", "Neurology",
                    "General Medicine", "Maternity", "Trauma Care", "Nephrology", "Pulmonology"]
indian_cities_states = [
    ("Hyderabad", "Telangana"), ("Visakhapatnam", "Andhra Pradesh"), ("Vijayawada", "Andhra Pradesh"),
    ("Chennai", "Tamil Nadu"), ("Bengaluru", "Karnataka"), ("Mumbai", "Maharashtra"),
    ("Delhi", "Delhi"), ("Kolkata", "West Bengal"), ("Pune", "Maharashtra"), ("Ahmedabad", "Gujarat"),
    ("Kochi", "Kerala"), ("Coimbatore", "Tamil Nadu"), ("Nagpur", "Maharashtra"), ("Lucknow", "Uttar Pradesh"),
    ("Jaipur", "Rajasthan"), ("Bhopal", "Madhya Pradesh"), ("Guntur", "Andhra Pradesh"),
    ("Warangal", "Telangana"), ("Mangaluru", "Karnataka"), ("Nashik", "Maharashtra"),
]

hospitals = []
for i in range(1, 101):
    city, state = random.choice(indian_cities_states)
    htype = random.choice(hospital_types)
    hospitals.append({
        "hospital_id": f"HOS{i:04d}",
        "hospital_name": f"{city} {htype} Hospital" if random.random() > 0.3 else f"{fake.last_name()} {htype} Hospital, {city}",
        "hospital_type": htype,
        "specialty_focus": random.choice(specialty_focus),
        "city": city,
        "state": state,
        "total_beds": random.choice([50, 75, 100, 150, 200, 300, 500, 750, 1000]),
        "established_year": random.randint(1960, 2018),
        "contact_number": fake.numerify("+91-##########"),
        "rating": round(random.uniform(2.5, 5.0), 1),
    })

with open(f"{HOSP_OUT}/hospitals.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(hospitals[0].keys()))
    w.writeheader()
    w.writerows(hospitals)

hospital_ids = [h["hospital_id"] for h in hospitals]
print(f"hospitals.csv -> {len(hospitals)} rows")

# ---------------------------------------------------------------------------
# 2. DOCTORS (500) -- each linked to a real hospital_id
# ---------------------------------------------------------------------------
specializations = [
    "General Physician", "Cardiologist", "Neurologist", "Orthopedic Surgeon",
    "Pediatrician", "Dermatologist", "ENT Specialist", "Ophthalmologist",
    "Psychiatrist", "Endocrinologist", "Gastroenterologist", "Nephrologist",
    "Pulmonologist", "Oncologist", "Urologist", "Rheumatologist",
    "Hematologist", "Gynecologist", "Infectious Disease Specialist", "Surgeon",
]
qualifications = ["MBBS", "MBBS, MD", "MBBS, MS", "MBBS, MD, DM", "MBBS, MS, MCh", "MBBS, DNB"]

doctors = []
for i in range(1, 501):
    gender = random.choice(["Male", "Female"])
    first = fake.first_name_male() if gender == "Male" else fake.first_name_female()
    last = fake.last_name()
    exp_years = random.randint(1, 35)
    doctors.append({
        "doctor_id": f"DOC{i:04d}",
        "full_name": f"Dr. {first} {last}",
        "gender": gender,
        "specialization": random.choice(specializations),
        "qualification": random.choice(qualifications),
        "years_of_experience": exp_years,
        "hospital_id": random.choice(hospital_ids),
        "contact_number": fake.numerify("+91-##########"),
        "email": f"{first.lower()}.{last.lower()}{i}@{fake.free_email_domain()}",
        "consultation_fee_inr": random.choice([300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]),
    })

with open(f"{HOSP_OUT}/doctors.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(doctors[0].keys()))
    w.writeheader()
    w.writerows(doctors)

doctor_ids = [d["doctor_id"] for d in doctors]
doctor_by_id = {d["doctor_id"]: d for d in doctors}
print(f"doctors.csv -> {len(doctors)} rows")

# ---------------------------------------------------------------------------
# 3. PATIENTS (5000) -- each linked to a real hospital_id (registering hospital)
# ---------------------------------------------------------------------------
blood_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
# Approx real-world blood group distribution weighting
bg_weights =   [0.34, 0.06, 0.09, 0.02, 0.03, 0.01, 0.38, 0.07]

patients = []
for i in range(1, 5001):
    gender = random.choice(["Male", "Female", "Other"])
    if gender == "Male":
        first = fake.first_name_male()
    elif gender == "Female":
        first = fake.first_name_female()
    else:
        first = fake.first_name()
    last = fake.last_name()
    age = random.randint(0, 95)
    dob = (datetime.now() - timedelta(days=age * 365 + random.randint(0, 364))).date()
    height_cm = round(random.uniform(50, 200), 1) if age > 2 else round(random.uniform(45, 90), 1)
    weight_kg = round(random.uniform(3, 120), 1) if age > 2 else round(random.uniform(3, 15), 1)
    patients.append({
        "patient_id": f"PAT{i:05d}",
        "full_name": f"{first} {last}",
        "gender": gender,
        "date_of_birth": dob.isoformat(),
        "age": age,
        "blood_group": random.choices(blood_groups, weights=bg_weights, k=1)[0],
        "height_cm": height_cm,
        "weight_kg": weight_kg,
        "city": fake.city(),
        "state": random.choice([s for _, s in indian_cities_states]),
        "contact_number": fake.numerify("+91-##########"),
        "email": f"{first.lower()}.{last.lower()}{i}@{fake.free_email_domain()}",
        "registered_hospital_id": random.choice(hospital_ids),
        "registration_date": fake.date_between(start_date="-8y", end_date="today").isoformat(),
        "insurance_provider": random.choice(["Star Health", "HDFC Ergo", "ICICI Lombard", "None", "LIC Health", "National Insurance"]),
    })

with open(f"{HOSP_OUT}/patients.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(patients[0].keys()))
    w.writeheader()
    w.writerows(patients)

patient_ids = [p["patient_id"] for p in patients]
print(f"patients.csv -> {len(patients)} rows")

# ---------------------------------------------------------------------------
# 4. MEDICINES (2000) -- real medicine classes, dosage forms, and generic
#    names mapped to real drug categories (not random strings).
# ---------------------------------------------------------------------------
# (generic_name, drug_class, common_use)
real_medicines = [
    ("Paracetamol", "Analgesic/Antipyretic", "Fever and pain relief"),
    ("Ibuprofen", "NSAID", "Pain and inflammation relief"),
    ("Aspirin", "NSAID/Antiplatelet", "Pain relief and blood thinning"),
    ("Amoxicillin", "Antibiotic (Penicillin)", "Bacterial infections"),
    ("Azithromycin", "Antibiotic (Macrolide)", "Respiratory and skin infections"),
    ("Ciprofloxacin", "Antibiotic (Fluoroquinolone)", "Urinary and GI infections"),
    ("Metformin", "Antidiabetic (Biguanide)", "Type 2 diabetes management"),
    ("Insulin Glargine", "Antidiabetic (Insulin)", "Diabetes mellitus"),
    ("Amlodipine", "Antihypertensive (CCB)", "High blood pressure"),
    ("Losartan", "Antihypertensive (ARB)", "High blood pressure"),
    ("Atenolol", "Antihypertensive (Beta-blocker)", "High blood pressure and arrhythmia"),
    ("Atorvastatin", "Statin", "Cholesterol management"),
    ("Omeprazole", "Proton Pump Inhibitor", "Acid reflux and ulcers"),
    ("Ranitidine", "H2 Blocker", "Acid reflux"),
    ("Cetirizine", "Antihistamine", "Allergy relief"),
    ("Loratadine", "Antihistamine", "Allergy relief"),
    ("Salbutamol", "Bronchodilator", "Asthma and COPD"),
    ("Levothyroxine", "Thyroid Hormone", "Hypothyroidism"),
    ("Carbimazole", "Antithyroid", "Hyperthyroidism"),
    ("Prednisolone", "Corticosteroid", "Inflammation and autoimmune conditions"),
    ("Metronidazole", "Antibiotic/Antiprotozoal", "Anaerobic and parasitic infections"),
    ("Doxycycline", "Antibiotic (Tetracycline)", "Bacterial infections"),
    ("Fluconazole", "Antifungal", "Fungal infections"),
    ("Acyclovir", "Antiviral", "Herpes virus infections"),
    ("Oseltamivir", "Antiviral", "Influenza"),
    ("Artemether-Lumefantrine", "Antimalarial", "Malaria treatment"),
    ("Chloroquine", "Antimalarial", "Malaria prevention and treatment"),
    ("Ondansetron", "Antiemetic", "Nausea and vomiting"),
    ("Domperidone", "Antiemetic/Prokinetic", "Nausea and GI motility"),
    ("Loperamide", "Antidiarrheal", "Diarrhea"),
    ("Oral Rehydration Salts", "Electrolyte Replacement", "Dehydration"),
    ("Diazepam", "Benzodiazepine", "Anxiety and seizures"),
    ("Sertraline", "SSRI Antidepressant", "Depression and anxiety"),
    ("Fluoxetine", "SSRI Antidepressant", "Depression"),
    ("Escitalopram", "SSRI Antidepressant", "Anxiety and depression"),
    ("Risperidone", "Antipsychotic", "Schizophrenia and bipolar disorder"),
    ("Sodium Valproate", "Anticonvulsant", "Epilepsy and bipolar disorder"),
    ("Levetiracetam", "Anticonvulsant", "Epilepsy"),
    ("Gabapentin", "Anticonvulsant/Analgesic", "Nerve pain and seizures"),
    ("Warfarin", "Anticoagulant", "Blood clot prevention"),
    ("Clopidogrel", "Antiplatelet", "Stroke and heart attack prevention"),
    ("Furosemide", "Diuretic", "Fluid retention and heart failure"),
    ("Hydrochlorothiazide", "Diuretic", "High blood pressure"),
    ("Spironolactone", "Diuretic", "Heart failure and fluid retention"),
    ("Diclofenac", "NSAID", "Pain and inflammation"),
    ("Tramadol", "Opioid Analgesic", "Moderate to severe pain"),
    ("Morphine", "Opioid Analgesic", "Severe pain"),
    ("Methotrexate", "Antimetabolite/DMARD", "Rheumatoid arthritis and cancer"),
    ("Hydroxychloroquine", "Antimalarial/DMARD", "Lupus and rheumatoid arthritis"),
    ("Allopurinol", "Antigout", "Gout management"),
    ("Calcium Carbonate", "Mineral Supplement", "Calcium deficiency"),
    ("Ferrous Sulfate", "Iron Supplement", "Iron deficiency anemia"),
    ("Folic Acid", "Vitamin Supplement", "Anemia and pregnancy"),
    ("Vitamin D3", "Vitamin Supplement", "Vitamin D deficiency"),
    ("Vitamin B12", "Vitamin Supplement", "B12 deficiency"),
    ("Multivitamin", "Vitamin Supplement", "General nutritional support"),
    ("Clotrimazole", "Antifungal (Topical)", "Skin fungal infections"),
    ("Hydrocortisone Cream", "Corticosteroid (Topical)", "Skin inflammation"),
    ("Benzoyl Peroxide", "Topical Antiacne", "Acne treatment"),
    ("Salicylic Acid", "Keratolytic", "Acne and skin conditions"),
    ("Latanoprost", "Antiglaucoma", "Glaucoma"),
    ("Timolol Eye Drops", "Antiglaucoma", "Glaucoma"),
    ("Artificial Tears", "Ocular Lubricant", "Dry eyes"),
    ("Chlorpheniramine", "Antihistamine", "Allergy and cold symptoms"),
    ("Dextromethorphan", "Antitussive", "Cough suppression"),
    ("Guaifenesin", "Expectorant", "Chest congestion"),
    ("Pantoprazole", "Proton Pump Inhibitor", "Acid reflux and ulcers"),
    ("Rabeprazole", "Proton Pump Inhibitor", "Acid reflux"),
    ("Simvastatin", "Statin", "Cholesterol management"),
    ("Rosuvastatin", "Statin", "Cholesterol management"),
    ("Enalapril", "Antihypertensive (ACE Inhibitor)", "High blood pressure"),
    ("Ramipril", "Antihypertensive (ACE Inhibitor)", "High blood pressure and heart failure"),
    ("Digoxin", "Cardiac Glycoside", "Heart failure and arrhythmia"),
    ("Amiodarone", "Antiarrhythmic", "Irregular heartbeat"),
    ("Heparin", "Anticoagulant", "Blood clot prevention (acute)"),
    ("Insulin Regular", "Antidiabetic (Insulin)", "Diabetes mellitus"),
    ("Glimepiride", "Antidiabetic (Sulfonylurea)", "Type 2 diabetes"),
    ("Pioglitazone", "Antidiabetic (Thiazolidinedione)", "Type 2 diabetes"),
    ("Montelukast", "Leukotriene Antagonist", "Asthma and allergies"),
    ("Budesonide Inhaler", "Corticosteroid (Inhaled)", "Asthma and COPD"),
    ("Ipratropium Bromide", "Bronchodilator (Anticholinergic)", "COPD"),
    ("Isoniazid", "Antitubercular", "Tuberculosis"),
    ("Rifampicin", "Antitubercular", "Tuberculosis"),
    ("Ethambutol", "Antitubercular", "Tuberculosis"),
    ("Pyrazinamide", "Antitubercular", "Tuberculosis"),
    ("Zidovudine", "Antiretroviral", "HIV management"),
    ("Tenofovir", "Antiretroviral", "HIV and Hepatitis B"),
    ("Lamivudine", "Antiretroviral", "HIV management"),
]

dosage_forms = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Eye Drops", "Inhaler", "Powder"]
strengths_mg = [5, 10, 25, 50, 100, 125, 250, 500, 650, 1000]
manufacturers = ["Sun Pharma", "Cipla", "Dr. Reddy's", "Lupin", "Aurobindo Pharma",
                 "Zydus Cadila", "Mankind Pharma", "Torrent Pharma", "Alkem Labs", "Glenmark"]

medicines = []
mid_counter = 1
for i in range(2000):
    generic, drug_class, use = real_medicines[i % len(real_medicines)]
    form = random.choice(dosage_forms)
    strength = random.choice(strengths_mg)
    brand_suffix = random.choice(["", "-Plus", "-Forte", " XR", " DS", ""])
    medicines.append({
        "medicine_id": f"MED{mid_counter:05d}",
        "generic_name": generic,
        "brand_name": f"{generic.split()[0]}{brand_suffix}-{manufacturers[i % len(manufacturers)][:3].upper()}",
        "drug_class": drug_class,
        "dosage_form": form,
        "strength_mg": strength if form not in ("Cream", "Ointment", "Eye Drops", "Inhaler") else "N/A",
        "common_use": use,
        "manufacturer": manufacturers[i % len(manufacturers)],
        "price_inr": round(random.uniform(10, 2500), 2),
        "requires_prescription": random.choice([True, True, True, False]),  # most require Rx
    })
    mid_counter += 1

with open(f"{HOSP_OUT}/medicines.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(medicines[0].keys()))
    w.writeheader()
    w.writerows(medicines)

medicine_ids = [m["medicine_id"] for m in medicines]
# build disease-class -> suitable medicine lookup for clinically sane prescriptions
med_by_class = {}
for m in medicines:
    med_by_class.setdefault(m["drug_class"], []).append(m["medicine_id"])

print(f"medicines.csv -> {len(medicines)} rows")

# ---------------------------------------------------------------------------
# 5. PRESCRIPTIONS (5000) -- links patient + doctor + medicine + disease
#    Uses category-aware medicine selection so e.g. a diabetes diagnosis
#    tends to get an antidiabetic medicine, not a random unrelated drug.
# ---------------------------------------------------------------------------
category_to_drug_classes = {
    "Respiratory": ["Bronchodilator", "Corticosteroid (Inhaled)", "Antitussive", "Expectorant", "Leukotriene Antagonist", "Bronchodilator (Anticholinergic)", "Antitubercular"],
    "Infectious": ["Antibiotic (Penicillin)", "Antibiotic (Macrolide)", "Antibiotic (Fluoroquinolone)", "Antimalarial", "Antiviral", "Electrolyte Replacement", "Antibiotic/Antiprotozoal"],
    "Endocrine": ["Antidiabetic (Biguanide)", "Antidiabetic (Insulin)", "Thyroid Hormone", "Antithyroid", "Antidiabetic (Sulfonylurea)", "Antidiabetic (Thiazolidinedione)"],
    "Cardiovascular": ["Antihypertensive (CCB)", "Antihypertensive (ARB)", "Antihypertensive (Beta-blocker)", "Statin", "Anticoagulant", "Antiplatelet", "Diuretic", "Antiarrhythmic", "Cardiac Glycoside", "Antihypertensive (ACE Inhibitor)"],
    "Neurological": ["Anticonvulsant", "Anticonvulsant/Analgesic", "Benzodiazepine"],
    "Digestive": ["Proton Pump Inhibitor", "H2 Blocker", "Antiemetic", "Antiemetic/Prokinetic", "Antidiarrheal"],
    "Urological": ["Diuretic", "Antibiotic (Fluoroquinolone)"],
    "Musculoskeletal": ["NSAID", "Antigout", "Antimetabolite/DMARD", "Analgesic/Antipyretic"],
    "Dermatological": ["Antifungal (Topical)", "Corticosteroid (Topical)", "Topical Antiacne", "Keratolytic"],
    "Ophthalmological": ["Antiglaucoma", "Ocular Lubricant"],
    "ENT": ["Antihistamine", "Analgesic/Antipyretic"],
    "Psychiatric": ["SSRI Antidepressant", "Antipsychotic", "Benzodiazepine"],
    "Hematological": ["Iron Supplement", "Vitamin Supplement", "Folic Acid"],
    "Immunological": ["Antihistamine", "Antimalarial/DMARD", "Corticosteroid"],
    "Oncological": ["Antimetabolite/DMARD", "Opioid Analgesic"],
}

def pick_medicine_for_disease(disease_id):
    disease = disease_by_id[disease_id]
    cat = disease["category"]
    candidate_classes = category_to_drug_classes.get(cat, [])
    pool = []
    for cls in candidate_classes:
        pool.extend(med_by_class.get(cls, []))
    if not pool:
        pool = medicine_ids  # fallback
    return random.choice(pool)

frequencies = ["Once daily", "Twice daily", "Thrice daily", "Every 6 hours", "Every 8 hours", "As needed"]
durations = ["3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "3 months", "Ongoing"]
statuses = ["Active", "Completed", "Discontinued"]

prescriptions = []
for i in range(1, 5001):
    patient_id = random.choice(patient_ids)
    doctor_id = random.choice(doctor_ids)
    disease_id = random.choice(disease_ids)
    medicine_id = pick_medicine_for_disease(disease_id)
    presc_date = fake.date_between(start_date="-3y", end_date="today")
    prescriptions.append({
        "prescription_id": f"PRE{i:05d}",
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "disease_id": disease_id,
        "medicine_id": medicine_id,
        "prescription_date": presc_date.isoformat(),
        "dosage_frequency": random.choice(frequencies),
        "duration": random.choice(durations),
        "status": random.choice(statuses),
        "notes": f"Prescribed for {disease_by_id[disease_id]['disease_name']} management.",
    })

with open(f"{HOSP_OUT}/prescriptions.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(prescriptions[0].keys()))
    w.writeheader()
    w.writerows(prescriptions)

print(f"prescriptions.csv -> {len(prescriptions)} rows")

# ---------------------------------------------------------------------------
# 6. LAB_REPORTS (2000) -- linked to real patient_id/doctor_id, with
#    clinically plausible test types and reference-range-aware results.
# ---------------------------------------------------------------------------
# (test_name, unit, normal_low, normal_high)
lab_tests = [
    ("Complete Blood Count - Hemoglobin", "g/dL", 12.0, 16.5),
    ("Fasting Blood Glucose", "mg/dL", 70, 100),
    ("Postprandial Blood Glucose", "mg/dL", 90, 140),
    ("HbA1c", "%", 4.0, 5.6),
    ("Total Cholesterol", "mg/dL", 125, 200),
    ("LDL Cholesterol", "mg/dL", 0, 100),
    ("HDL Cholesterol", "mg/dL", 40, 60),
    ("Triglycerides", "mg/dL", 0, 150),
    ("Serum Creatinine", "mg/dL", 0.6, 1.3),
    ("Blood Urea Nitrogen", "mg/dL", 7, 20),
    ("Liver Function - ALT", "U/L", 7, 56),
    ("Liver Function - AST", "U/L", 8, 48),
    ("Thyroid Stimulating Hormone", "mIU/L", 0.4, 4.0),
    ("Platelet Count", "cells/mcL", 150000, 450000),
    ("White Blood Cell Count", "cells/mcL", 4500, 11000),
    ("C-Reactive Protein", "mg/L", 0, 10),
    ("Vitamin D", "ng/mL", 20, 50),
    ("Vitamin B12", "pg/mL", 200, 900),
    ("Serum Sodium", "mEq/L", 135, 145),
    ("Serum Potassium", "mEq/L", 3.5, 5.1),
    ("Urine Routine - Protein", "mg/dL", 0, 20),
    ("Malaria Parasite Test", "Qualitative", None, None),
    ("Dengue NS1 Antigen", "Qualitative", None, None),
    ("X-Ray Chest", "Imaging", None, None),
    ("ECG", "Imaging/Rhythm", None, None),
]

result_qualitative = ["Positive", "Negative"]
report_status = ["Normal", "Abnormal", "Critical", "Pending Review"]

lab_reports = []
for i in range(1, 2001):
    patient_id = random.choice(patient_ids)
    doctor_id = random.choice(doctor_ids)
    test_name, unit, low, high = random.choice(lab_tests)
    report_date = fake.date_between(start_date="-3y", end_date="today")

    if low is None:
        # qualitative or imaging test
        if "Imaging" in unit:
            value = random.choice(["No Abnormality Detected", "Mild Abnormality Noted", "Requires Further Evaluation"])
            status = "Normal" if value == "No Abnormality Detected" else random.choice(["Abnormal", "Critical"])
        else:
            value = random.choices(result_qualitative, weights=[0.15, 0.85], k=1)[0]
            status = "Abnormal" if value == "Positive" else "Normal"
        lab_reports.append({
            "report_id": f"LAB{i:05d}",
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "test_name": test_name,
            "result_value": value,
            "unit": unit,
            "reference_range": "N/A",
            "status": status,
            "report_date": report_date.isoformat(),
        })
    else:
        # numeric result -- mostly within range, some out of range for realism
        if random.random() < 0.75:
            value = round(random.uniform(low, high), 2)
            status = "Normal"
        else:
            # generate an out-of-range value on either side
            if random.random() < 0.5:
                value = round(random.uniform(max(0, low * 0.4), low * 0.95), 2)
            else:
                value = round(random.uniform(high * 1.05, high * 1.8), 2)
            status = random.choices(["Abnormal", "Critical"], weights=[0.8, 0.2], k=1)[0]
        lab_reports.append({
            "report_id": f"LAB{i:05d}",
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "test_name": test_name,
            "result_value": value,
            "unit": unit,
            "reference_range": f"{low}-{high}",
            "status": status,
            "report_date": report_date.isoformat(),
        })

with open(f"{HOSP_OUT}/lab_reports.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(lab_reports[0].keys()))
    w.writeheader()
    w.writerows(lab_reports)

print(f"lab_reports.csv -> {len(lab_reports)} rows")
print("Hospital operations generation complete.")
