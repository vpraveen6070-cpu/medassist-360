/**
 * Symptoms Checker — Intelligent AI Pipeline Response
 * Depends on: js/dataset.js, js/ai-engine.js (both must be loaded first)
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── Cinematic Canvas ──────────────────────────────────────────────────────
    const sysCanvas = document.getElementById('symptoms-canvas');
    if (sysCanvas) {
        const sysCtx = sysCanvas.getContext('2d');
        const frameCount = 240;
        const images = [];
        let loadedImages = 0, sysTargetFrame = 0, sysAnimatedFrame = 0;
        let sysLastRenderedVal = -1, sysIsAnimating = false;

        function sysResize() {
            sysCanvas.width  = window.innerWidth;
            sysCanvas.height = window.innerHeight;
            sysLastRenderedVal = -1;
            sysRender();
        }
        window.addEventListener('resize', sysResize);

        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            img.src = `finalframes/ezgif-frame-${String(i).padStart(3,'0')}.jpg`;
            img.onload = () => { if (++loadedImages === 1) sysResize(); };
            images.push(img);
        }

        function sysRender() {
            const val = sysAnimatedFrame.toFixed(3);
            if (val === sysLastRenderedVal) return;
            sysLastRenderedVal = val;
            const safe = Math.max(0, sysAnimatedFrame);
            const f1   = Math.floor(safe) % frameCount;
            const f2   = (f1 + 1) % frameCount;
            const frac = safe - Math.floor(safe);
            if (images[f1] && images[f1].complete) {
                const img = images[f1];
                const cr  = sysCanvas.width / sysCanvas.height;
                const ir  = (img.width || 1920) / (img.height || 1080);
                let dw, dh, ox = 0, oy = 0;
                if (cr > ir) { dw = sysCanvas.width;  dh = dw / ir;  oy = (sysCanvas.height - dh) / 2; }
                else          { dh = sysCanvas.height; dw = dh * ir;  ox = (sysCanvas.width  - dw) / 2; }
                sysCtx.clearRect(0, 0, sysCanvas.width, sysCanvas.height);
                sysCtx.globalAlpha = 1;
                sysCtx.drawImage(img, ox, oy, dw, dh);
                if (f2 !== f1 && frac > 0.01 && images[f2] && images[f2].complete) {
                    sysCtx.globalAlpha = frac;
                    sysCtx.drawImage(images[f2], ox, oy, dw, dh);
                }
                sysCtx.globalAlpha = 1;
            }
        }

        window.startSymptomsCanvas = () => { if (!sysIsAnimating) { sysIsAnimating = true; _loop(); } };
        window.stopSymptomsCanvas  = () => { sysIsAnimating = false; };
        function _loop() {
            if (!sysIsAnimating) return;
            sysTargetFrame += 0.35;
            if (sysTargetFrame >= frameCount) { sysTargetFrame %= frameCount; sysAnimatedFrame %= frameCount; }
            const diff = sysTargetFrame - sysAnimatedFrame;
            if (Math.abs(diff) > 0.01) { sysAnimatedFrame += diff * 0.12; sysRender(); }
            requestAnimationFrame(_loop);
        }
    }

    // ── Element References ────────────────────────────────────────────────────
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');
    const nextStep1   = document.getElementById('next-step-1');
    const prevStep2   = document.getElementById('prev-step-2');
    const analyzeBtn  = document.getElementById('analyze-symptoms-btn');
    const prevStep3   = document.getElementById('prev-step-3');
    const findHospBtn = document.getElementById('find-hospitals-btn');
    const prevStep4   = document.getElementById('prev-step-4');
    const textInput   = document.getElementById('symptoms-text-input');
    const recordBtn   = document.getElementById('voice-record-btn');
    const severityInput  = document.getElementById('sym-severity');
    const genderSelect   = document.getElementById('sym-gender');
    const prefFemaleWrap = document.getElementById('pref-female-doc-wrap');
    const prefFemaleChk  = document.getElementById('pref-female-doc');
    const loadingState   = document.getElementById('symptoms-loading');
    const resultsState   = document.getElementById('symptoms-results');

    // State
    let lastResponse = null;

    // ── Navigation ────────────────────────────────────────────────────────────
    const scrollToChecker = (e) => { e?.preventDefault(); document.getElementById('checker')?.scrollIntoView({ behavior: 'smooth' }); };
    document.getElementById('nav-symptoms-btn')?.addEventListener('click', scrollToChecker);
    document.getElementById('hero-symptoms-btn')?.addEventListener('click', scrollToChecker);

    function showStep(el) {
        [step1, step2, step3, step4].forEach(s => s.classList.add('hidden'));
        el.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showStep(step1);
    textInput.value = '';
    loadingState.classList.remove('hidden');
    resultsState.classList.add('hidden');

    // ── Gender Preference ─────────────────────────────────────────────────────
    genderSelect?.addEventListener('change', e => {
        const isFemale = e.target.value === 'female';
        prefFemaleWrap?.classList.toggle('hidden', !isFemale);
        if (prefFemaleChk) prefFemaleChk.checked = isFemale;
    });

    nextStep1.addEventListener('click', () => {
        if (!textInput.value.trim()) { textInput.style.borderColor = 'var(--primary)'; setTimeout(() => textInput.style.borderColor = '', 1000); return; }
        showStep(step2);
    });
    prevStep2.addEventListener('click', () => showStep(step1));
    prevStep3.addEventListener('click', () => showStep(step2));
    prevStep4.addEventListener('click', () => {
        document.getElementById('hospital-detail-view')?.classList.add('hidden');
        const lv = document.getElementById('hospital-list-container');
        if (lv) lv.style.display = 'block';
        showStep(step3);
    });

    // ── Voice Input ───────────────────────────────────────────────────────────
    let recording = false, recognition = null, baseTranscript = '';
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechAPI) {
        recognition = new SpeechAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onstart  = () => { recording = true; recordBtn.classList.add('recording'); recordBtn.innerHTML = '<span class="icon">⏹️</span> Listening...'; baseTranscript = textInput.value + (!textInput.value.endsWith(' ') && textInput.value ? ' ' : ''); };
        recognition.onresult = e => { let fin = '', int = ''; for (let i = e.resultIndex; i < e.results.length; i++) { (e.results[i].isFinal ? fin : int) !== '' || (e.results[i].isFinal ? fin += e.results[i][0].transcript : int += e.results[i][0].transcript); } if (e.results[e.resultIndex].isFinal) { fin = e.results[e.resultIndex][0].transcript; int = ''; } else { int = e.results[e.resultIndex][0].transcript; } baseTranscript += fin.endsWith(' ') ? fin : fin; textInput.value = baseTranscript + int; };
        recognition.onerror  = () => stopRecording();
        recognition.onend    = () => { if (recording) stopRecording(); };
    }
    recordBtn.addEventListener('click', () => {
        if (!recognition) { alert('Speech recognition not supported.'); return; }
        if (!recording) recognition.start(); else stopRecording();
    });
    function stopRecording() {
        if (recording && recognition) { recording = false; recognition.stop(); recordBtn.classList.remove('recording'); recordBtn.innerHTML = '<span class="icon">🎙️</span> Tap to Speak'; }
    }

    // ── AI Pipeline Query ─────────────────────────────────────────────────────
    analyzeBtn.addEventListener('click', async () => {
        await DB.loadPromise;
        if (!DB.loaded) { alert('AI Knowledge Base is loading. Please wait.'); return; }

        const raw = textInput.value.trim();
        if (!raw) { alert('Please describe your symptoms.'); return; }

        showStep(step3);
        loadingState.classList.remove('hidden');
        resultsState.classList.add('hidden');

        // Update loading messages
        const loadingTextEl = loadingState.querySelector('p, .loading-text');
        const stages = [
            'Parsing symptoms from your description...',
            'Fuzzy-matching against 1,500 symptom records...',
            'Scoring diseases using knowledge base mappings...',
            'Validating against 10,000 AI training samples...',
            'Retrieving medicines, doctors and hospitals...',
            'Synthesizing clinical response...'
        ];
        let stageIdx = 0;
        const stageTimer = setInterval(() => {
            if (loadingTextEl && stageIdx < stages.length) loadingTextEl.textContent = stages[stageIdx++];
        }, 500);

        try {
            const response = await MedAssistAI.query(raw, {
                severity: parseInt(severityInput?.value || 3),
                gender:   genderSelect?.value || 'unspecified'
            });
            lastResponse = response;
            clearInterval(stageTimer);
            renderAIResponse(response);
        } catch (err) {
            clearInterval(stageTimer);
            console.error('AI Pipeline error:', err);
        }

        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
    });

    // ── Render AI Response ────────────────────────────────────────────────────
    function renderAIResponse(r) {
        const urgency       = r.urgency;
        const syms          = r.symptomsDetected;
        const assessment    = r.assessment;
        const insight       = r.trainingInsight;
        const medicines     = r.medicines;
        const prescriptions = r.prescriptionInsights;
        const specialists   = r.specialists;
        const tips          = r.healthTips;

        // -- Risk Level Display --
        const levelDisplay  = document.getElementById('risk-level-display');
        const descDisplay   = document.getElementById('risk-desc-display');
        const emergencyWarn = document.getElementById('emergency-warning');
        const conditionsList = document.getElementById('conditions-list');

        levelDisplay.className  = 'risk-level';
        levelDisplay.textContent = `${urgency.icon} ${urgency.level}`;
        levelDisplay.style.color = urgency.color;

        if (urgency.level === 'EMERGENCY') {
            descDisplay.textContent = 'Seek emergency care immediately.';
            emergencyWarn?.classList.remove('hidden');
        } else if (urgency.level === 'HIGH') {
            descDisplay.textContent = 'Visit a doctor today — do not delay.';
            emergencyWarn?.classList.add('hidden');
        } else if (urgency.level === 'MODERATE') {
            descDisplay.textContent = 'Schedule an appointment within 24-48 hours.';
            emergencyWarn?.classList.add('hidden');
        } else {
            descDisplay.textContent = 'Monitor symptoms. Visit a physician if they persist.';
            emergencyWarn?.classList.add('hidden');
        }

        // -- Conditions List (AI Pipeline Response) --
        let html = '';

        // Section 1: Symptom Recognition
        if (syms.count > 0) {
            html += `
            <li class="ai-section ai-symptoms-section" style="margin-bottom:20px; padding:14px; background:rgba(124,58,237,0.07); border-radius:10px; border:1px solid rgba(124,58,237,0.2); list-style:none;">
                <div style="font-size:0.8rem; color:#7c3aed; font-weight:700; letter-spacing:1px; margin-bottom:8px;">🔍 SYMPTOMS DETECTED</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
                    ${syms.exact.map(s => `<span style="background:rgba(124,58,237,0.15); color:#c4b5fd; padding:3px 10px; border-radius:20px; font-size:0.82rem;">${s}</span>`).join('')}
                    ${syms.fuzzy.map(s => `<span style="background:rgba(100,116,139,0.15); color:#94a3b8; padding:3px 10px; border-radius:20px; font-size:0.82rem;">${s} ~</span>`).join('')}
                </div>
                ${syms.bodyLocations.length ? `<div style="font-size:0.78rem; color:#64748b;">Body areas: ${syms.bodyLocations.filter(Boolean).join(', ')}</div>` : ''}
            </li>`;
        }

        // Section 2: Disease Assessment
        assessment.forEach((a, idx) => {
            const barWidth = a.confidence;
            const barColor = idx === 0 ? urgency.color : '#475569';
            html += `
            <li style="margin-bottom:16px; padding:14px; background:${idx === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'}; border-radius:10px; border:1px solid rgba(255,255,255,${idx === 0 ? '0.1' : '0.05'}); list-style:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong style="color:${barColor}; font-size:${idx === 0 ? '1.05' : '0.95'}rem;">
                        ${idx === 0 ? '🏥' : '•'} ${idx === 0 ? 'Primary' : 'Possible'}: ${a.name}
                    </strong>
                    <span style="font-size:0.82rem; color:${barColor}; font-weight:700;">${a.confidence}%</span>
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:4px; margin-bottom:10px; overflow:hidden;">
                    <div style="width:${barWidth}%; height:100%; background:${barColor}; border-radius:4px; transition:width 0.8s ease;"></div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.06); color:#94a3b8; padding:2px 8px; border-radius:12px;">${a.category}</span>
                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.06); color:#94a3b8; padding:2px 8px; border-radius:12px;">${a.severity}</span>
                    ${a.isChronicRisk ? '<span style="font-size:0.75rem; background:rgba(245,158,11,0.1); color:#f59e0b; padding:2px 8px; border-radius:12px;">⚠️ Chronic Risk</span>' : ''}
                </div>
                <p style="font-size:0.85rem; color:#94a3b8; line-height:1.6; margin:0;">${a.description}</p>
            </li>`;
        });

        // Section 3: AI Training Insight
        if (insight && insight.confirmedInDataset) {
            html += `
            <li style="margin-bottom:16px; padding:12px 14px; background:rgba(59,130,246,0.06); border-radius:10px; border:1px solid rgba(59,130,246,0.15); list-style:none;">
                <div style="font-size:0.78rem; color:#3b82f6; font-weight:700; letter-spacing:1px; margin-bottom:6px;">📊 AI TRAINING VALIDATION</div>
                <p style="margin:0; font-size:0.85rem; color:#94a3b8; line-height:1.6;">
                    This symptom combination was confirmed in <strong style="color:#cbd5e1;">${insight.sampleCount} training records</strong>
                    ${insight.topDemographic ? ` — most common in the <strong style="color:#cbd5e1;">${insight.topDemographic}</strong> age group` : ''}.
                </p>
            </li>`;
        }

        // Section 4: Medicines
        if (medicines.length > 0) {
            html += `
            <li style="margin-bottom:16px; padding:14px; background:rgba(34,197,94,0.05); border-radius:10px; border:1px solid rgba(34,197,94,0.15); list-style:none;">
                <div style="font-size:0.78rem; color:#22c55e; font-weight:700; letter-spacing:1px; margin-bottom:10px;">💊 DATASET MEDICINES (Referenced, Not Prescribed)</div>
                ${medicines.map(m => `
                <div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#cbd5e1; font-size:0.9rem;">${m.brandName}</strong>
                        <span style="font-size:0.75rem; color:${m.requiresPrescription ? '#f59e0b' : '#22c55e'};">${m.requiresPrescription ? '⚠️ Rx Only' : '✅ OTC'}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">${m.genericName} ${m.strengthMg}mg · ${m.drugClass} · ₹${m.price}</div>
                    <div style="font-size:0.78rem; color:#475569; margin-top:2px;">Prescribed ${m.usageCount}× in dataset for this condition</div>
                </div>`).join('')}
                <p style="margin:10px 0 0; font-size:0.78rem; color:#475569; font-style:italic;">⚠️ Reference only — consult your doctor before taking any medication.</p>
            </li>`;
        }

        // Section 4b: Prescription Insights
        if (prescriptions && prescriptions.totalCount > 0) {
            html += `
            <li style="margin-bottom:16px; padding:14px; background:rgba(6,182,212,0.05); border-radius:10px; border:1px solid rgba(6,182,212,0.15); list-style:none;">
                <div style="font-size:0.78rem; color:#06b6d4; font-weight:700; letter-spacing:1px; margin-bottom:10px;">📋 CLINICAL PRESCRIPTION PATTERNS</div>
                <p style="margin:0 0 10px; font-size:0.85rem; color:#94a3b8; line-height:1.6;">
                    Across <strong style="color:#cbd5e1;">${prescriptions.totalCount} active records</strong> matching this condition in our network:
                </p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
                        <small style="color:#64748b; display:block; font-size:0.7rem;">FREQUENCY</small>
                        <strong style="color:#cbd5e1; font-size:0.85rem;">${prescriptions.commonFrequency}</strong>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
                        <small style="color:#64748b; display:block; font-size:0.7rem;">DURATION</small>
                        <strong style="color:#cbd5e1; font-size:0.85rem;">${prescriptions.commonDuration}</strong>
                    </div>
                </div>
                ${prescriptions.sampleNotes.length > 0 ? `
                <div style="font-size:0.8rem; color:#64748b; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
                    <span style="font-weight:600; color:#cbd5e1; display:block; margin-bottom:4px; font-size:0.75rem;">CLINICAL RECOMMENDATIONS / NOTES:</span>
                    ${prescriptions.sampleNotes.map(note => `<div style="margin-bottom:4px; line-height:1.4;">• ${note}</div>`).join('')}
                </div>` : ''}
            </li>`;
        }

        // Section 5: Specialist Guidance
        html += `
        <li style="margin-bottom:16px; padding:14px; background:rgba(249,115,22,0.05); border-radius:10px; border:1px solid rgba(249,115,22,0.12); list-style:none;">
            <div style="font-size:0.78rem; color:#f97316; font-weight:700; letter-spacing:1px; margin-bottom:8px;">🩺 RECOMMENDED SPECIALISTS</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
                ${specialists.recommended.slice(0,3).map(s => `<span style="background:rgba(249,115,22,0.1); color:#fed7aa; padding:4px 12px; border-radius:20px; font-size:0.82rem;">${s}</span>`).join('')}
            </div>
            ${specialists.topDoctors.slice(0,2).map(d => `
            <div style="padding:8px 0; border-top:1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:#cbd5e1; font-size:0.88rem;">${d.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️'} ${d.name}</strong>
                    <span style="font-size:0.78rem; color:#94a3b8;">₹${d.fee}</span>
                </div>
                <div style="font-size:0.78rem; color:#64748b;">${d.specialization} · ${d.qualification} · ${d.experience} yrs</div>
            </div>`).join('')}
        </li>`;

        // Section 6: Health Tips
        if (tips.length > 0) {
            html += `
            <li style="margin-bottom:16px; padding:14px; background:rgba(139,92,246,0.05); border-radius:10px; border:1px solid rgba(139,92,246,0.12); list-style:none;">
                <div style="font-size:0.78rem; color:#8b5cf6; font-weight:700; letter-spacing:1px; margin-bottom:8px;">💡 HEALTH TIPS FROM KNOWLEDGE BASE</div>
                ${tips.map(t => `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:0.85rem; color:#94a3b8; line-height:1.6;">→ ${t}</div>`).join('')}
            </li>`;
        }

        // Section 7: Disclaimer
        html += `
        <li style="padding:10px 14px; background:rgba(100,116,139,0.05); border-radius:8px; border:1px solid rgba(100,116,139,0.1); list-style:none;">
            <p style="margin:0; font-size:0.75rem; color:#475569; line-height:1.6; font-style:italic;">
                This assessment is generated from a synthetic healthcare dataset and is for informational purposes only.
                It does not replace a professional medical diagnosis or treatment plan.
            </p>
        </li>`;

        conditionsList.innerHTML = html;

        if (typeof changeLanguage === 'function') changeLanguage(localStorage.getItem('medassist_lang') || 'en');
    }

    // ── Find Hospitals ────────────────────────────────────────────────────────
    findHospBtn.addEventListener('click', async () => {
        await DB.loadPromise;
        showStep(step4);
        const container = document.getElementById('hospital-list-container');
        container.innerHTML = '';

        const hospitals = lastResponse?.hospitals || DB_getHospitalsForCategory('General', 5);
        const category  = lastResponse?.assessment?.[0]?.category || 'General';

        hospitals.forEach(h => {
            const el = document.createElement('div');
            el.className = 'hospital-item';
            el.innerHTML = `
                <h5>${h.name || h.hospital_name}
                    <span class="h-dist">${h.city || h.state}, ${h.state || ''}</span>
                </h5>
                <p>${h.type || h.hospital_type} · Specialty: ${h.specialty || h.specialty_focus}</p>
                <div class="h-meta"><span>⭐ ${h.rating}</span><span style="margin-left:12px; font-size:0.8rem; color:#64748b;">${h.beds || h.total_beds || ''} beds</span></div>`;
            el.addEventListener('click', () => showHospitalDetail(h));
            container.appendChild(el);
        });
    });

    // ── Hospital Detail ───────────────────────────────────────────────────────
    const detailView  = document.getElementById('hospital-detail-view');
    const listView    = document.getElementById('hospital-list-container');
    const closeDetail = document.getElementById('close-detail-view');

    function showHospitalDetail(h) {
        listView.style.display = 'none';
        detailView.classList.remove('hidden');

        const name      = h.name      || h.hospital_name;
        const spec      = h.specialty || h.specialty_focus;
        const city      = h.city;
        const state     = h.state;
        const rating    = h.rating;
        const type      = h.type      || h.hospital_type;
        const beds      = h.beds      || h.total_beds;
        const phone     = h.contact   || h.contact_number;
        const mapsUrl   = h.mapsUrl   || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name + ' ' + city)}`;
        const hId       = h.hospital_id;

        document.getElementById('h-detail-name').textContent    = name;
        document.getElementById('h-detail-spec').textContent    = spec;
        document.getElementById('h-detail-dist').textContent    = `${city}, ${state}`;
        document.getElementById('h-detail-rating').textContent  = `⭐ ${rating}`;
        document.getElementById('h-detail-address').textContent = `Est. ${h.established_year || '—'} · ${beds} beds`;
        document.getElementById('h-detail-phone').textContent   = phone;
        document.getElementById('h-detail-emergency').textContent = (type === 'General' || type === 'Multi-Specialty') ? 'Yes - 24/7' : 'No - Clinic Hours';

        // Doctor cards
        const doctorsContainer = document.getElementById('h-detail-doctors');
        doctorsContainer.innerHTML = '';
        let docs = hId ? (DB.doctorsByHospital[hId] || []) : [];
        if (prefFemaleChk && prefFemaleChk.checked) docs = docs.filter(d => d.gender === 'Female');
        docs.slice(0, 4).forEach(d => {
            const card = document.createElement('div');
            card.className = 'doctor-card';
            card.innerHTML = `
                <div class="doctor-img">${d.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️'}</div>
                <div class="doctor-info">
                    <div class="doctor-name">${d.full_name}</div>
                    <div class="doctor-spec">${d.specialization} · ${d.qualification}</div>
                    <div class="doctor-rating" style="font-size:0.8rem; color:#64748b;">${d.years_of_experience} yrs exp · ₹${d.consultation_fee_inr}</div>
                </div>`;
            doctorsContainer.appendChild(card);
        });
        if (!docs.length) doctorsContainer.innerHTML = '<p style="color:#64748b; font-size:0.9rem;">No doctors listed for this hospital.</p>';

        document.getElementById('h-map-link').href = mapsUrl;
        if (typeof changeLanguage === 'function') changeLanguage(localStorage.getItem('medassist_lang') || 'en');
    }

    closeDetail?.addEventListener('click', () => {
        detailView.classList.add('hidden');
        listView.style.display = 'block';
    });
});
