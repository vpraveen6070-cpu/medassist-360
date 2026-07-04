/**
 * MedAssist 360 — Unified Dataset Layer
 * ======================================
 * Loads all 11 CSV datasets at page init, indexes them for O(1) lookups,
 * and exposes a single global `DB` object used by every page script.
 *
 * Datasets:
 *   Hospital Operations:  hospitals, doctors, patients, medicines, prescriptions, lab_reports
 *   Medical Knowledge:    diseases, symptoms, symptom_disease_mapping, health_tips
 *   AI Training:          ai_training_dataset
 */

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function _parseCSV(str) {
    const arr = [];
    let quote = false, row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
        const cc = str[c], nc = str[c + 1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; c++; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { col++; continue; }
        if (cc === '\r' && nc === '\n' && !quote) { row++; col = 0; c++; continue; }
        if ((cc === '\n' || cc === '\r') && !quote) { row++; col = 0; continue; }
        arr[row][col] += cc;
    }
    if (!arr.length) return [];
    const headers = arr[0];
    const data = [];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i].length === 1 && arr[i][0] === '') continue;
        const obj = {};
        headers.forEach((h, j) => { obj[h] = arr[i][j] !== undefined ? arr[i][j] : ''; });
        data.push(obj);
    }
    return data;
}

// ─── Base Paths ───────────────────────────────────────────────────────────────
const _BASE_OPS = '/finalframes/healthcare_ai_system%202/data/raw/hospital_operations/';
const _BASE_KB  = '/finalframes/healthcare_ai_system%202/data/raw/medical_knowledge_base/';
const _BASE_ML  = '/finalframes/healthcare_ai_system%202/data/ml/';

// ─── Global DB Object ─────────────────────────────────────────────────────────
window.DB = {
    // Raw arrays
    hospitals: [], doctors: [], patients: [], medicines: [],
    prescriptions: [], labReports: [], diseases: [], symptoms: [],
    mapping: [], healthTips: [], aiTraining: [],

    // Indexed lookup maps (populated after load)
    hospitalById: {}, doctorById: {}, patientById: {}, medicineById: {},
    prescriptionById: {}, diseaseById: {}, symptomById: {},

    // Relational maps
    doctorsByHospital: {},        // hospital_id → doctor[]
    prescriptionsByDisease: {},   // disease_id  → prescription[]
    prescriptionsByMedicine: {},  // medicine_id → prescription[]
    prescriptionsByDoctor: {},    // doctor_id   → prescription[]
    labReportsByPatient: {},      // patient_id  → lab_report[]
    mappingByDisease: {},         // disease_id  → mapping[]
    mappingBySymptom: {},         // symptom_id  → mapping[]
    tipsByCategory: {},           // category    → tip[]
    diseasesByCategory: {},       // category    → disease[]

    loaded: false,
    loadPromise: null,
};

// ─── Load All Datasets ────────────────────────────────────────────────────────
async function _loadAll() {
    const fetchCSV = async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
        return _parseCSV(await r.text());
    };

    const [
        hospitals, doctors, patients, medicines,
        prescriptions, labReports,
        diseases, symptoms, mapping, healthTips,
        aiTraining
    ] = await Promise.all([
        fetchCSV(_BASE_OPS + 'hospitals.csv'),
        fetchCSV(_BASE_OPS + 'doctors.csv'),
        fetchCSV(_BASE_OPS + 'patients.csv'),
        fetchCSV(_BASE_OPS + 'medicines.csv'),
        fetchCSV(_BASE_OPS + 'prescriptions.csv'),
        fetchCSV(_BASE_OPS + 'lab_reports.csv'),
        fetchCSV(_BASE_KB  + 'diseases.csv'),
        fetchCSV(_BASE_KB  + 'symptoms.csv'),
        fetchCSV(_BASE_KB  + 'symptom_disease_mapping.csv'),
        fetchCSV(_BASE_KB  + 'health_tips.csv'),
        fetchCSV(_BASE_ML  + 'ai_training_dataset.csv'),
    ]);

    // Store raw arrays
    Object.assign(DB, { hospitals, doctors, patients, medicines, prescriptions, labReports,
                        diseases, symptoms, mapping, healthTips, aiTraining });

    // ── Build O(1) lookup maps ────────────────────────────────────────────────
    hospitals.forEach(r => DB.hospitalById[r.hospital_id] = r);
    doctors.forEach(r => DB.doctorById[r.doctor_id] = r);
    patients.forEach(r => DB.patientById[r.patient_id] = r);
    medicines.forEach(r => DB.medicineById[r.medicine_id] = r);
    prescriptions.forEach(r => DB.prescriptionById[r.prescription_id] = r);
    diseases.forEach(r => DB.diseaseById[r.disease_id] = r);
    symptoms.forEach(r => DB.symptomById[r.symptom_id] = r);

    // ── Relational maps ───────────────────────────────────────────────────────
    doctors.forEach(d => {
        DB.doctorsByHospital[d.hospital_id] = DB.doctorsByHospital[d.hospital_id] || [];
        DB.doctorsByHospital[d.hospital_id].push(d);
    });

    prescriptions.forEach(p => {
        DB.prescriptionsByDisease[p.disease_id] = DB.prescriptionsByDisease[p.disease_id] || [];
        DB.prescriptionsByDisease[p.disease_id].push(p);

        DB.prescriptionsByMedicine[p.medicine_id] = DB.prescriptionsByMedicine[p.medicine_id] || [];
        DB.prescriptionsByMedicine[p.medicine_id].push(p);

        DB.prescriptionsByDoctor[p.doctor_id] = DB.prescriptionsByDoctor[p.doctor_id] || [];
        DB.prescriptionsByDoctor[p.doctor_id].push(p);
    });

    labReports.forEach(l => {
        DB.labReportsByPatient[l.patient_id] = DB.labReportsByPatient[l.patient_id] || [];
        DB.labReportsByPatient[l.patient_id].push(l);
    });

    mapping.forEach(m => {
        DB.mappingByDisease[m.disease_id] = DB.mappingByDisease[m.disease_id] || [];
        DB.mappingByDisease[m.disease_id].push(m);

        DB.mappingBySymptom[m.symptom_id] = DB.mappingBySymptom[m.symptom_id] || [];
        DB.mappingBySymptom[m.symptom_id].push(m);
    });

    healthTips.forEach(t => {
        DB.tipsByCategory[t.category] = DB.tipsByCategory[t.category] || [];
        DB.tipsByCategory[t.category].push(t);
    });

    diseases.forEach(d => {
        DB.diseasesByCategory[d.category] = DB.diseasesByCategory[d.category] || [];
        DB.diseasesByCategory[d.category].push(d);
    });

    DB.loaded = true;
    console.log('[MedAssist DB] All 11 datasets loaded.', {
        hospitals: hospitals.length, doctors: doctors.length, patients: patients.length,
        medicines: medicines.length, prescriptions: prescriptions.length,
        labReports: labReports.length, diseases: diseases.length,
        symptoms: symptoms.length, mapping: mapping.length,
        healthTips: healthTips.length, aiTraining: aiTraining.length,
    });
}

// ─── Exported Helper Functions ────────────────────────────────────────────────

/**
 * Finds medicines by partial name match (generic or brand), case-insensitive.
 * Returns top N matches.
 */
window.DB_searchMedicines = function(query, limit = 5) {
    if (!DB.loaded) return [];
    const q = query.toLowerCase();
    return DB.medicines.filter(m =>
        m.generic_name.toLowerCase().includes(q) ||
        m.brand_name.toLowerCase().includes(q) ||
        m.drug_class.toLowerCase().includes(q) ||
        m.common_use.toLowerCase().includes(q)
    ).slice(0, limit);
};

/**
 * Extracts matched symptom IDs from free-text by tokenizing against symptoms.csv names.
 */
window.DB_extractSymptomIds = function(text) {
    if (!DB.loaded) return [];
    const lower = text.toLowerCase();
    const matched = new Set();
    DB.symptoms.forEach(s => {
        const name = s.symptom_name.toLowerCase();
        if (lower.includes(name)) { matched.add(s.symptom_id); return; }
        // Single-word fallback (word length > 3 to avoid noise)
        name.split(' ').forEach(w => { if (w.length > 3 && lower.includes(w)) matched.add(s.symptom_id); });
    });
    return Array.from(matched);
};

/**
 * Predicts top N diseases from a list of matched symptom IDs.
 * Scoring: sum of frequency_percent * (Strong=2, Moderate=1.5, Weak=1) weighting.
 */
window.DB_predictDiseases = function(symptomIds, limit = 3) {
    if (!DB.loaded || !symptomIds.length) return [];
    const scores = {};
    const weight = { 'Strong': 2, 'Moderate': 1.5, 'Weak': 1 };
    symptomIds.forEach(sid => {
        const maps = DB.mappingBySymptom[sid] || [];
        maps.forEach(m => {
            const w = weight[m.association_strength] || 1;
            scores[m.disease_id] = (scores[m.disease_id] || 0) + (parseInt(m.frequency_percent) || 0) * w;
        });
    });
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => DB.diseaseById[id])
        .filter(Boolean);
};

/**
 * Returns up to N health tips for a disease category.
 */
window.DB_getHealthTips = function(category, limit = 2) {
    if (!DB.loaded) return [];
    const tips = DB.tipsByCategory[category] || DB.tipsByCategory['General'] || [];
    // Pick a deterministic-but-varied subset
    const offset = Math.floor(Date.now() / 86400000) % Math.max(1, tips.length - limit);
    return tips.slice(offset, offset + limit);
};

/**
 * Returns hospitals relevant to a disease category, sorted by rating desc.
 */
window.DB_getHospitalsForCategory = function(category, limit = 5) {
    if (!DB.loaded) return [];
    const scored = DB.hospitals.map(h => {
        let score = parseFloat(h.rating) || 0;
        if (h.specialty_focus === category) score += 5;
        if (h.hospital_type === 'Multi-Specialty') score += 1;
        return { ...h, _score: score };
    });
    return scored.sort((a, b) => b._score - a._score).slice(0, limit);
};

/**
 * Returns a random prescription with its joined medicine, doctor, and disease data.
 */
window.DB_getRandomPrescription = function() {
    if (!DB.loaded || !DB.prescriptions.length) return null;
    const p = DB.prescriptions[Math.floor(Math.random() * DB.prescriptions.length)];
    return {
        prescription: p,
        medicine: DB.medicineById[p.medicine_id] || null,
        doctor:   DB.doctorById[p.doctor_id]   || null,
        disease:  DB.diseaseById[p.disease_id]  || null,
    };
};

/**
 * Returns a random lab report with its joined doctor data.
 */
window.DB_getRandomLabReport = function() {
    if (!DB.loaded || !DB.labReports.length) return null;
    const l = DB.labReports[Math.floor(Math.random() * DB.labReports.length)];
    return {
        report: l,
        doctor: DB.doctorById[l.doctor_id] || null,
    };
};

// ─── Auto-initialize ──────────────────────────────────────────────────────────
DB.loadPromise = _loadAll().catch(err => {
    console.error('[MedAssist DB] Failed to load datasets:', err);
});
