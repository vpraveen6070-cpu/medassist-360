/**
 * MedAssist 360 — Intelligent Medical Retrieval Pipeline
 * =======================================================
 * Transforms free-text patient input into a fully structured clinical response
 * by chaining: Parse → Fuzzy Match → Score → Validate → Enrich → Synthesize
 *
 * Depends on: js/dataset.js (must be loaded first)
 */

window.MedAssistAI = (function () {

    // ── Category → Doctor Specialization Map ─────────────────────────────────
    const CATEGORY_SPECIALIST = {
        'Respiratory':     ['Pulmonologist', 'General Physician', 'Infectious Disease Specialist'],
        'Cardiovascular':  ['Cardiologist', 'General Physician'],
        'Neurological':    ['Neurologist', 'General Physician'],
        'Digestive':       ['Gastroenterologist', 'General Physician'],
        'ENT':             ['ENT Specialist', 'General Physician'],
        'Endocrine':       ['Endocrinologist', 'General Physician'],
        'Dermatological':  ['Dermatologist', 'General Physician'],
        'Musculoskeletal': ['Orthopedic Surgeon', 'Rheumatologist'],
        'Psychiatric':     ['Psychiatrist', 'General Physician'],
        'Oncological':     ['Oncologist'],
        'Ophthalmological':['Ophthalmologist'],
        'Urological':      ['Urologist', 'Nephrologist'],
        'Hematological':   ['Hematologist'],
        'Immunological':   ['Infectious Disease Specialist'],
        'Infectious':      ['Infectious Disease Specialist', 'General Physician'],
        'General':         ['General Physician'],
    };

    const PRECAUTIONS_BY_CATEGORY = {
        'Cardiovascular': [
            'Avoid physical strain, heavy lifting, or sudden posture changes.',
            'Monitor blood pressure, heart rate, and report any sudden spikes.',
            'Keep emergency contacts and relevant medication (e.g. aspirin) close by.'
        ],
        'Respiratory': [
            'Ensure adequate room ventilation; avoid exposure to smoke, dust, or cold dry drafts.',
            'Remain sitting upright if breathing feels shallow or labored.',
            'Check blood oxygen levels (SpO2) using a pulse oximeter if available.'
        ],
        'Neurological': [
            'Rest in a quiet, dimly lit, and noise-free room to limit sensory load.',
            'Do not drive, climb stairs, or operate machinery while symptomatic.',
            'Have someone keep watch in case of coordination changes or lapses in awareness.'
        ],
        'Digestive': [
            'Drink small sips of water or oral rehydration solutions to prevent dehydration.',
            'Avoid solid food, caffeine, dairy, greasy, or highly acidic products.',
            'Avoid taking NSAIDs (like Ibuprofen) which can worsen gastric irritation.'
        ],
        'Infectious': [
            'Restrict contact with others and isolate in a well-ventilated room.',
            'Wear a face cover when around others; wash hands thoroughly and frequently.',
            'Do not share personal items (utensils, towels, bedding).'
        ],
        'General': [
            'Get absolute physical rest and maintain solid fluid intake (water, warm decaf teas).',
            'Log your body temperature every 4 hours to track fever trajectory.',
            'Avoid starting new OTC medications unless authorized by a clinical provider.'
        ]
    };

    const FOLLOW_UPS_BY_CATEGORY = {
        'Cardiovascular': [
            'Schedule a diagnostic checkup (ECG/Echocardiogram) with a clinic.',
            'Follow up with a Cardiologist for custom diagnostic tests.'
        ],
        'Respiratory': [
            'Get a chest auscultation or Spirometry test if symptoms continue.',
            'Consult a Pulmonologist for clinical lung evaluation.'
        ],
        'Neurological': [
            'Track symptom duration, frequency, and potential triggers in a health journal.',
            'Schedule a specialist review with a Neurologist.'
        ],
        'Digestive': [
            'Request an abdominal examination or ultrasound if discomfort doesn\'t resolve.',
            'Consult a Gastroenterologist for evaluation.'
        ],
        'Infectious': [
            'Consult a General Physician or Infectious Disease expert for standard lab work (e.g. CBC, blood cultures).',
            'Complete full medication course even if you start feeling better.'
        ],
        'General': [
            'Book an appointment with a General Physician for full clinical analysis.',
            'Observe and log other emerging symptoms over the next 48 hours.'
        ]
    };

    // ── Urgency escalation triggers ───────────────────────────────────────────
    const EMERGENCY_WORDS = ['chest pain', 'chest tightness', 'cannot breathe', "can't breathe",
        'difficulty breathing', 'shortness of breath', 'heart attack', 'stroke',
        'unconscious', 'seizure', 'severe bleeding', 'paralysis', 'sudden vision loss',
        'sudden numbness', 'coughing blood', 'vomiting blood'];

    // ── Pipeline Stage 1: Fuzzy Token Extractor ───────────────────────────────
    /**
     * Levenshtein distance between two strings.
     */
    function _levenshtein(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                    : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
            }
        }
        return dp[m][n];
    }

    /**
     * Stage 1 — Parse and fuzzy-match user text to symptoms.csv entries.
     * Returns an array of { symptomId, symptomName, confidence, matchType }
     */
    function _extractSymptoms(text) {
        if (!DB.loaded) return [];
        const lower = text.toLowerCase().trim();
        const words  = lower.split(/[\s,;.!?]+/).filter(w => w.length > 2);
        const matched = new Map(); // symptom_id → best match entry

        DB.symptoms.forEach(s => {
            const name  = s.symptom_name.toLowerCase();
            const words_in_name = name.split(' ');
            let bestConf = 0, matchType = '';

            // Exact phrase match
            if (lower.includes(name)) {
                bestConf  = 1.0;
                matchType = 'exact';
            }

            // Word-level exact match
            if (!bestConf) {
                words_in_name.forEach(w => {
                    if (w.length > 3 && words.includes(w)) {
                        const conf = 0.85;
                        if (conf > bestConf) { bestConf = conf; matchType = 'word'; }
                    }
                });
            }

            // Fuzzy single-word match (edit distance ≤ 2)
            if (!bestConf) {
                for (const uw of words) {
                    for (const nw of words_in_name) {
                        if (nw.length > 3) {
                            const dist = _levenshtein(uw, nw);
                            const conf = dist <= 1 ? 0.75 : dist === 2 ? 0.6 : 0;
                            if (conf > bestConf) { bestConf = conf; matchType = 'fuzzy'; }
                        }
                    }
                }
            }

            // Substring / partial token match
            if (!bestConf) {
                words_in_name.forEach(w => {
                    if (w.length > 4 && lower.includes(w.substring(0, Math.ceil(w.length * 0.7)))) {
                        const conf = 0.55;
                        if (conf > bestConf) { bestConf = conf; matchType = 'partial'; }
                    }
                });
            }

            if (bestConf > 0) {
                const existing = matched.get(s.symptom_id);
                if (!existing || bestConf > existing.confidence) {
                    matched.set(s.symptom_id, {
                        symptomId: s.symptom_id,
                        symptomName: s.symptom_name,
                        bodyLocation: s.body_location,
                        severityLevel: s.severity_level,
                        confidence: bestConf,
                        matchType
                    });
                }
            }
        });

        return Array.from(matched.values()).sort((a, b) => b.confidence - a.confidence);
    }

    // ── Pipeline Stage 2: Disease Scorer ─────────────────────────────────────
    /**
     * Stage 2 — Score diseases using weighted symptom-disease mapping.
     * Returns top N diseases with confidence percentage.
     */
    function _scoreDisease(matchedSymptoms, limit = 3) {
        if (!DB.loaded || !matchedSymptoms.length) return [];
        const STRENGTH = { 'Strong': 3, 'Moderate': 2, 'Weak': 1 };
        const diseaseRaw = {};

        matchedSymptoms.forEach(ms => {
            const maps = DB.mappingBySymptom[ms.symptomId] || [];
            maps.forEach(m => {
                const w   = (STRENGTH[m.association_strength] || 1) * ms.confidence;
                const pts = (parseInt(m.frequency_percent) || 0) * w;
                if (!diseaseRaw[m.disease_id]) diseaseRaw[m.disease_id] = 0;
                diseaseRaw[m.disease_id] += pts;
            });
        });

        const sorted = Object.entries(diseaseRaw).sort((a, b) => b[1] - a[1]);
        const maxScore = sorted[0]?.[1] || 1;

        return sorted.slice(0, limit).map(([id, score]) => {
            const d = DB.diseaseById[id];
            if (!d) return null;
            return {
                disease: d,
                rawScore: score,
                confidence: Math.min(99, Math.round((score / maxScore) * 100)),
            };
        }).filter(Boolean);
    }

    // ── Pipeline Stage 3: AI Training Validator ───────────────────────────────
    /**
     * Stage 3 — Cross-reference prediction against ai_training_dataset.csv.
     * Returns { validatedDisease, trainingCount, demographicNote }
     */
    function _validateWithTraining(topDiseaseId, matchedSymptomIds) {
        if (!DB.loaded) return null;
        let matches = 0;
        let genderCounts = { Male: 0, Female: 0, Other: 0 };
        let ageCounts = {};

        DB.aiTraining.forEach(row => {
            if (row.disease_id !== topDiseaseId) return;
            const rowSyms = [row.symptom_1, row.symptom_2, row.symptom_3, row.symptom_4, row.symptom_5, row.symptom_6].filter(Boolean);
            const overlap = rowSyms.filter(s => matchedSymptomIds.includes(s)).length;
            if (overlap > 0) {
                matches++;
                if (row.patient_gender) genderCounts[row.patient_gender] = (genderCounts[row.patient_gender] || 0) + 1;
                if (row.patient_age_group) ageCounts[row.patient_age_group] = (ageCounts[row.patient_age_group] || 0) + 1;
            }
        });

        const topAgeGroup = Object.entries(ageCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
        return { trainingCount: matches, topAgeGroup };
    }

    // ── Pipeline Stage 4: Medicine Retriever ─────────────────────────────────
    /**
     * Stage 4 — Find medicines actually prescribed for a disease in the dataset.
     * Returns top distinct medicines with usage count.
     */
    function _getMedicinesForDisease(diseaseId, limit = 3) {
        if (!DB.loaded) return [];
        const prescriptions = DB.prescriptionsByDisease[diseaseId] || [];
        const medCounts = {};
        prescriptions.forEach(p => {
            medCounts[p.medicine_id] = (medCounts[p.medicine_id] || 0) + 1;
        });
        return Object.entries(medCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([mid, count]) => ({ medicine: DB.medicineById[mid], usageCount: count }))
            .filter(e => e.medicine);
    }

    /**
     * Stage 4b — Retrieve typical prescription details (dosage frequency, duration, notes) from dataset.
     */
    function _getPrescriptionInsights(diseaseId) {
        if (!DB.loaded || !diseaseId) return null;
        const prescriptions = DB.prescriptionsByDisease[diseaseId] || [];
        if (prescriptions.length === 0) return null;

        const frequencies = {};
        const durations = {};
        const activeNotes = [];

        prescriptions.forEach(p => {
            if (p.dosage_frequency) {
                frequencies[p.dosage_frequency] = (frequencies[p.dosage_frequency] || 0) + 1;
            }
            if (p.duration) {
                durations[p.duration] = (durations[p.duration] || 0) + 1;
            }
            if (p.notes && activeNotes.length < 3 && !activeNotes.includes(p.notes)) {
                activeNotes.push(p.notes);
            }
        });

        const topFreq = Object.entries(frequencies).sort((a, b) => b[1] - a[1])[0]?.[0] || 'As directed by physician';
        const topDur = Object.entries(durations).sort((a, b) => b[1] - a[1])[0]?.[0] || 'As directed by physician';

        return {
            totalCount: prescriptions.length,
            commonFrequency: topFreq,
            commonDuration: topDur,
            sampleNotes: activeNotes
        };
    }


    // ── Pipeline Stage 5: Doctor & Hospital Retriever ─────────────────────────
    function _getDoctorsForCategory(category, limit = 3) {
        if (!DB.loaded) return [];
        const specializations = CATEGORY_SPECIALIST[category] || ['General Physician'];
        return DB.doctors
            .filter(d => specializations.includes(d.specialization))
            .sort((a, b) => parseInt(b.years_of_experience) - parseInt(a.years_of_experience))
            .slice(0, limit);
    }

    function _getHospitalsForCategory(category, limit = 3) {
        return DB_getHospitalsForCategory(category, limit);
    }

    // ── Pipeline Stage 6: Health Tips Retriever ───────────────────────────────
    function _getHealthTips(category, limit = 3) {
        return DB_getHealthTips(category, limit);
    }

    // ── Pipeline Stage 7: Response Synthesizer ───────────────────────────────
    /**
     * Converts raw pipeline data into a structured, contextual clinical response.
     */
    function _synthesize({ input, matchedSymptoms, predictions, validation, medicines, prescriptions, doctors, hospitals, healthTips, severity, isEmergency }) {

        const topPrediction  = predictions[0];
        const disease        = topPrediction?.disease;
        const confidence     = topPrediction?.confidence || 0;
        const category       = disease?.category || 'General';
        const specializations = CATEGORY_SPECIALIST[category] || ['General Physician'];

        // ── Clinical Reasoning Engine ──────────────────────────────────────────
        const catPrecautions = PRECAUTIONS_BY_CATEGORY[category] || PRECAUTIONS_BY_CATEGORY['General'];
        const catFollowUps   = FOLLOW_UPS_BY_CATEGORY[category] || FOLLOW_UPS_BY_CATEGORY['General'];

        const bodyParts = [...new Set(matchedSymptoms.map(s => s.bodyLocation))];
        const symptomCorrelation = matchedSymptoms.length > 1
            ? `Your reported symptoms of ${matchedSymptoms.map(s => s.symptomName).join(', ')} are correlated under the ${category} category, typically localizing to the ${bodyParts.filter(Boolean).join('/')} region(s). The co-occurrence of these markers points to a ${confidence}% match for ${disease ? disease.disease_name : 'the assessed condition'}.`
            : `Your symptom of ${matchedSymptoms[0]?.symptomName || 'indisposition'} is primarily associated with the ${category} system (localized to the ${bodyParts[0] || 'general area'}).`;

        const recommendationExplanation = disease
            ? `Based on the predicted condition (${disease.disease_name}), we recommend consulting a specialist in ${specializations[0]} (e.g. ${doctors[0] ? doctors[0].full_name : 'a specialist'} with ${doctors[0] ? doctors[0].years_of_experience : 'extensive'} years of experience). For physical validation, ${hospitals[0] ? hospitals[0].hospital_name : 'the recommended facility'} is preferred due to its focus on ${hospitals[0] ? hospitals[0].specialty_focus : category} and high user rating of ${hospitals[0] ? hospitals[0].rating : '4.5'}.`
            : `Please consult a General Physician for diagnosis.`;

        // ── Urgency level ─────────────────────────────────────────────────────
        let urgencyLevel, urgencyColor, urgencyIcon;
        if (isEmergency || disease?.typical_severity === 'Critical') {
            urgencyLevel = 'EMERGENCY'; urgencyColor = '#ef4444'; urgencyIcon = '🚨';
        } else if (disease?.typical_severity === 'Severe' || severity > 7) {
            urgencyLevel = 'HIGH';     urgencyColor = '#f97316'; urgencyIcon = '🔴';
        } else if (disease?.typical_severity === 'Moderate' || severity > 4) {
            urgencyLevel = 'MODERATE'; urgencyColor = '#f59e0b'; urgencyIcon = '🟠';
        } else {
            urgencyLevel = 'LOW';      urgencyColor = '#22c55e'; urgencyIcon = '🟢';
        }

        // ── Symptom Summary ───────────────────────────────────────────────────
        const exactSymptoms = matchedSymptoms.filter(s => s.confidence >= 0.85).map(s => s.symptomName);
        const fuzzySymptoms = matchedSymptoms.filter(s => s.confidence < 0.85 && s.confidence > 0.5).map(s => s.symptomName);

        // ── Build structured response ─────────────────────────────────────────
        return {
            // Raw pipeline data (for programmatic use)
            raw: { matchedSymptoms, predictions, medicines, prescriptions, doctors, hospitals, healthTips, validation },

            // ── Clinical Summary ──────────────────────────────────────────────
            urgency: { level: urgencyLevel, color: urgencyColor, icon: urgencyIcon },

            symptomsDetected: {
                exact: exactSymptoms,
                fuzzy: fuzzySymptoms,
                count: matchedSymptoms.length,
                bodyLocations: [...new Set(matchedSymptoms.map(s => s.bodyLocation))],
            },

            // ── Disease Assessment ────────────────────────────────────────────
            assessment: predictions.map((p, i) => ({
                rank: i + 1,
                name: p.disease.disease_name,
                category: p.disease.category,
                confidence: p.confidence,
                isChronicRisk: p.disease.is_chronic === 'True',
                severity: p.disease.typical_severity,
                description: p.disease.description,
                isPrimary: i === 0,
            })),

            // ── AI Training Validation ────────────────────────────────────────
            trainingInsight: validation ? {
                confirmedInDataset: validation.trainingCount > 0,
                sampleCount: validation.trainingCount,
                topDemographic: validation.topAgeGroup,
            } : null,

            // ── Medicine Recommendations ──────────────────────────────────────
            medicines: medicines.map(m => ({
                brandName: m.medicine.brand_name,
                genericName: m.medicine.generic_name,
                drugClass: m.medicine.drug_class,
                dosageForm: m.medicine.dosage_form,
                strengthMg: m.medicine.strength_mg,
                commonUse: m.medicine.common_use,
                requiresPrescription: m.medicine.requires_prescription === 'True',
                price: m.medicine.price_inr,
                usageCount: m.usageCount,
            })),

            // ── Specialist Guidance ───────────────────────────────────────────
            specialists: {
                recommended: specializations,
                topDoctors: doctors.map(d => ({
                    name: d.full_name,
                    specialization: d.specialization,
                    qualification: d.qualification,
                    experience: d.years_of_experience,
                    fee: d.consultation_fee_inr,
                    gender: d.gender,
                    contact: d.contact_number,
                })),
            },

            // ── Hospital Guidance ─────────────────────────────────────────────
            hospitals: hospitals.map(h => ({
                name: h.hospital_name,
                type: h.hospital_type,
                specialty: h.specialty_focus,
                city: h.city,
                state: h.state,
                rating: h.rating,
                beds: h.total_beds,
                contact: h.contact_number,
                mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.hospital_name + ' ' + h.city)}`,
            })),

            // ── Health Tips ───────────────────────────────────────────────────
            healthTips: healthTips.map(t => t.tip_text),

            // ── Prescription Insights ─────────────────────────────────────────
            prescriptionInsights: prescriptions,

            // ── Clinical Reasoning Insights ──────────────────────────────────
            reasoning: {
                symptomCorrelation: symptomCorrelation,
                recommendationExplanation: recommendationExplanation,
                precautions: catPrecautions,
                followUpActions: catFollowUps
            },

            // ── Natural language summary (for display in AI chat bubble) ──────
            nlSummary: _buildNLSummary({
                input, exactSymptoms, fuzzySymptoms, disease, confidence,
                predictions, medicines, prescriptions, specializations, urgencyLevel, urgencyIcon,
                category, validation, healthTips, isEmergency,
                reasoning: { symptomCorrelation, recommendationExplanation, precautions: catPrecautions, followUpActions: catFollowUps }
            }),
        };
    }

    function _buildNLSummary({ input, exactSymptoms, fuzzySymptoms, disease, confidence,
        predictions, medicines, prescriptions, specializations, urgencyLevel, urgencyIcon,
        category, validation, healthTips, isEmergency, reasoning }) {

        const lines = [];

        if (isEmergency) {
            lines.push(`🚨 **EMERGENCY DETECTED** — Your symptoms suggest a potentially critical condition. Please call emergency services or go to the nearest ER immediately.`);
            lines.push('');
        }

        // Symptom acknowledgement
        const allSymptoms = [...exactSymptoms, ...fuzzySymptoms];
        if (allSymptoms.length > 0) {
            lines.push(`I've identified **${allSymptoms.length} symptom(s)** from your description: *${allSymptoms.join(', ')}*.`);
        } else {
            lines.push(`I analyzed your description: *"${input}"*`);
        }
        lines.push('');

        // Disease assessment
        if (predictions.length > 0) {
            const d = predictions[0].disease;
            const conf = predictions[0].confidence;
            lines.push(`**Primary Assessment (${conf}% match):** ${d.disease_name}`);
            lines.push(`> ${d.description}`);
            if (d.is_chronic === 'True') lines.push(`> ⚠️ This condition has chronic risk potential — consistent monitoring is advised.`);
            lines.push('');

            if (predictions.length > 1) {
                const others = predictions.slice(1).map(p => `${p.disease.disease_name} (${p.confidence}%)`).join(', ');
                lines.push(`**Other possibilities:** ${others}`);
                lines.push('');
            }
        } else {
            lines.push(`⚠️ I could not find a strong disease match in the medical knowledge base. Please consult a General Physician for an in-person evaluation.`);
            lines.push('');
        }

        // AI training validation
        if (validation && validation.trainingCount > 0) {
            lines.push(`📊 **Dataset Validation:** This symptom pattern appears in **${validation.trainingCount} training records**${validation.topAgeGroup ? ` — most commonly in the **${validation.topAgeGroup}** age group` : ''}.`);
            lines.push('');
        }

        // Prescription Insights
        if (prescriptions && prescriptions.totalCount > 0) {
            lines.push(`📋 **Prescription History & Patterns:**`);
            lines.push(`- Across **${prescriptions.totalCount} active records** for this condition, the most common dosage routine is **${prescriptions.commonFrequency}** for **${prescriptions.commonDuration}**.`);
            if (prescriptions.sampleNotes.length > 0) {
                lines.push(`- *Clinical Notes:* ${prescriptions.sampleNotes.join('; ')}`);
            }
            lines.push('');
        }

        // Medicine recommendations
        if (medicines.length > 0) {
            lines.push(`**💊 Common Medicines Prescribed for ${predictions[0]?.disease.disease_name || 'this condition'}:**`);
            medicines.forEach(m => {
                const rx = m.requiresPrescription ? '*(Rx required)*' : '*(OTC available)*';
                lines.push(`- **${m.brandName}** (${m.genericName} ${m.strengthMg}mg) — ${m.drugClass} ${rx} — ₹${m.price}`);
            });
            lines.push(`> ⚠️ Do not self-medicate. The above are reference medicines from our dataset — always consult a doctor.`);
            lines.push('');
        }

        // Specialist
        lines.push(`**🩺 Recommended Specialist:** ${specializations.slice(0, 2).join(' or ')}`);
        lines.push('');

        // Health tips
        if (healthTips.length > 0) {
            lines.push(`**💡 Health Tips (${category}):**`);
            healthTips.slice(0, 2).forEach(t => lines.push(`- ${t.tip_text}`));
            lines.push('');
        }

        // Precautionary Guidance & Clinical Reasoning
        if (reasoning) {
            lines.push(`**🧠 Clinical Reasoning & Insights:**`);
            lines.push(`- *Symptom Correlation:* ${reasoning.symptomCorrelation}`);
            lines.push(`- *Specialist Rationale:* ${reasoning.recommendationExplanation}`);
            lines.push('');
            if (reasoning.precautions && reasoning.precautions.length > 0) {
                lines.push(`**⚠️ Important Precautions:**`);
                reasoning.precautions.forEach(p => lines.push(`- ${p}`));
                lines.push('');
            }
            if (reasoning.followUpActions && reasoning.followUpActions.length > 0) {
                lines.push(`**📋 Recommended Follow-up Actions:**`);
                reasoning.followUpActions.forEach(f => lines.push(`- ${f}`));
                lines.push('');
            }
        }

        // Urgency advisory
        if (urgencyLevel === 'EMERGENCY') {
            lines.push(`🚨 **Go to Emergency Room immediately.**`);
        } else if (urgencyLevel === 'HIGH') {
            lines.push(`🔴 **Visit a doctor today.** Do not delay treatment.`);
        } else if (urgencyLevel === 'MODERATE') {
            lines.push(`🟠 **Schedule an appointment within 24-48 hours.**`);
        } else {
            lines.push(`🟢 **Monitor your symptoms.** If they persist beyond 3 days, consult a physician.`);
        }

        lines.push('');
        lines.push(`---`);
        lines.push(`*This assessment is generated from a synthetic healthcare dataset and is for informational purposes only. It does not replace professional medical advice.*`);

        return lines.join('\n');
    }

    // ── Main Public API ───────────────────────────────────────────────────────
    /**
     * The full intelligent retrieval pipeline.
     * @param {string} text - User's free-text input
     * @param {object} opts - Optional: { severity: 1-10, gender: string }
     * @returns {object} Structured clinical response
     */
    async function query(text, opts = {}) {
        await DB.loadPromise;
        if (!DB.loaded) throw new Error('MedAssist DB not loaded');

        const severity   = opts.severity || 3;
        const lowerText  = text.toLowerCase();
        const isEmergency = EMERGENCY_WORDS.some(w => lowerText.includes(w)) || severity >= 9;

        // Stage 1 — Symptom extraction
        const matchedSymptoms = _extractSymptoms(text);
        const symptomIds = matchedSymptoms.map(s => s.symptomId);

        // Stage 2 — Disease scoring
        const predictions = _scoreDisease(matchedSymptoms, 3);
        const topDiseaseId = predictions[0]?.disease.disease_id || null;

        // Stage 3 — AI Training validation
        const validation = topDiseaseId ? _validateWithTraining(topDiseaseId, symptomIds) : null;

        // Stage 4 — Medicine retrieval
        const medicines = topDiseaseId ? _getMedicinesForDisease(topDiseaseId, 3) : [];
        const prescriptions = topDiseaseId ? _getPrescriptionInsights(topDiseaseId) : null;

        // Stage 5 — Doctor & Hospital retrieval
        const category = predictions[0]?.disease.category || 'General';
        const doctors  = _getDoctorsForCategory(category, 3);
        const hospitals = _getHospitalsForCategory(category, 3);

        // Stage 6 — Health tips
        const healthTips = _getHealthTips(category, 3);

        // Stage 7 — Synthesize
        return _synthesize({
            input: text, matchedSymptoms, predictions, validation,
            medicines, prescriptions, doctors, hospitals, healthTips, severity, isEmergency
        });
    }

    return { query };

})();
