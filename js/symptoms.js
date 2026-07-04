/**
 * Symptoms Checker — Dataset-Driven AI Retrieval Engine
 * Depends on: js/dataset.js (must be loaded first)
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── Cinematic Canvas Engine ──────────────────────────────────────────────
    const sysCanvas = document.getElementById('symptoms-canvas');
    if (sysCanvas) {
        const sysCtx   = sysCanvas.getContext('2d');
        const frameCount = 240;
        const images   = [];
        let loadedImages = 0;
        let sysTargetFrame = 0, sysAnimatedFrame = 0;
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
            img.src = `finalframes/ezgif-frame-${String(i).padStart(3, '0')}.jpg`;
            img.onload = () => { if (++loadedImages === 1) sysResize(); };
            images.push(img);
        }

        function sysRender() {
            const val = sysAnimatedFrame.toFixed(3);
            if (val === sysLastRenderedVal) return;
            sysLastRenderedVal = val;
            const safe  = Math.max(0, sysAnimatedFrame);
            const f1    = Math.floor(safe) % frameCount;
            const f2    = (f1 + 1) % frameCount;
            const frac  = safe - Math.floor(safe);
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
            if (sysTargetFrame >= frameCount) {
                sysTargetFrame   = sysTargetFrame   % frameCount;
                sysAnimatedFrame = sysAnimatedFrame % frameCount;
            }
            const diff = sysTargetFrame - sysAnimatedFrame;
            if (Math.abs(diff) > 0.01) { sysAnimatedFrame += diff * 0.12; sysRender(); }
            else if (sysAnimatedFrame !== sysTargetFrame) { sysAnimatedFrame = sysTargetFrame; sysRender(); }
            requestAnimationFrame(_loop);
        }
    }

    // ── Element References ───────────────────────────────────────────────────
    const navBtn   = document.getElementById('nav-symptoms-btn');
    const heroBtn  = document.getElementById('hero-symptoms-btn');
    const step1    = document.getElementById('step-1');
    const step2    = document.getElementById('step-2');
    const step3    = document.getElementById('step-3');
    const step4    = document.getElementById('step-4');
    const nextStep1    = document.getElementById('next-step-1');
    const prevStep2    = document.getElementById('prev-step-2');
    const analyzeBtn   = document.getElementById('analyze-symptoms-btn');
    const prevStep3    = document.getElementById('prev-step-3');
    const findHospBtn  = document.getElementById('find-hospitals-btn');
    const prevStep4    = document.getElementById('prev-step-4');
    const textInput    = document.getElementById('symptoms-text-input');
    const recordBtn    = document.getElementById('voice-record-btn');
    const severityInput = document.getElementById('sym-severity');
    const genderSelect  = document.getElementById('sym-gender');
    const prefFemaleWrap = document.getElementById('pref-female-doc-wrap');
    const prefFemaleChk  = document.getElementById('pref-female-doc');
    const loadingState   = document.getElementById('symptoms-loading');
    const resultsState   = document.getElementById('symptoms-results');

    // ── State ────────────────────────────────────────────────────────────────
    let predictedCategory = 'General';

    // ── Navigation Helpers ───────────────────────────────────────────────────
    function scrollToChecker(e) {
        if (e) e.preventDefault();
        const el = document.getElementById('checker');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    function showStep(el) {
        [step1, step2, step3, step4].forEach(s => s.classList.add('hidden'));
        el.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetFlow() {
        showStep(step1);
        textInput.value = '';
        loadingState.classList.remove('hidden');
        resultsState.classList.add('hidden');
    }

    navBtn?.addEventListener('click', scrollToChecker);
    heroBtn?.addEventListener('click', scrollToChecker);
    resetFlow();

    // ── Gender Preference ────────────────────────────────────────────────────
    if (genderSelect && prefFemaleWrap) {
        genderSelect.addEventListener('change', e => {
            const isFemale = e.target.value === 'female';
            prefFemaleWrap.classList.toggle('hidden', !isFemale);
            if (prefFemaleChk) prefFemaleChk.checked = isFemale;
        });
    }

    // ── Step Navigation ──────────────────────────────────────────────────────
    nextStep1.addEventListener('click', () => {
        if (!textInput.value.trim()) {
            textInput.style.borderColor = 'var(--primary)';
            setTimeout(() => textInput.style.borderColor = '', 1000);
            return;
        }
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

    // ── Voice Input ──────────────────────────────────────────────────────────
    let recording = false, recognition = null, baseTranscript = '';
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechAPI) {
        recognition = new SpeechAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onstart  = () => { recording = true; recordBtn.classList.add('recording'); recordBtn.innerHTML = '<span class="icon">⏹️</span> Listening...'; baseTranscript = textInput.value + (textInput.value.length && !textInput.value.endsWith(' ') ? ' ' : ''); };
        recognition.onresult = e => { let fin = '', int = ''; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else int += e.results[i][0].transcript; } baseTranscript += fin; textInput.value = baseTranscript + int; };
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

    // ── Analyze Button ───────────────────────────────────────────────────────
    analyzeBtn.addEventListener('click', async () => {
        await DB.loadPromise;
        if (!DB.loaded) { alert('AI Knowledge Base is still loading. Please wait.'); return; }

        const raw = textInput.value.trim();
        const symptomIds = DB_extractSymptomIds(raw);

        if (symptomIds.length === 0 && raw.split(/\s+/).length < 4) {
            alert('We could not detect recognizable medical symptoms. Please describe your condition in more detail.');
            return;
        }

        showStep(step3);
        loadingState.classList.remove('hidden');
        resultsState.classList.add('hidden');

        await renderAnalysis(symptomIds, raw, parseInt(severityInput.value));

        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
    });

    // ── Core Analysis Renderer ───────────────────────────────────────────────
    async function renderAnalysis(symptomIds, rawText, severity) {
        const lowerText = rawText.toLowerCase();
        const isEmergency = lowerText.includes('chest') || lowerText.includes('breath') || lowerText.includes('bleed') || severity > 7;

        const levelDisplay    = document.getElementById('risk-level-display');
        const descDisplay     = document.getElementById('risk-desc-display');
        const emergencyWarn   = document.getElementById('emergency-warning');
        const conditionsList  = document.getElementById('conditions-list');

        levelDisplay.className = 'risk-level';
        conditionsList.innerHTML = '';

        let colorCode, dot;
        if (isEmergency) {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_high_lvl');
            levelDisplay.classList.add('risk-danger');
            descDisplay.setAttribute('data-i18n', 'sym_risk_high_desc');
            emergencyWarn?.classList.remove('hidden');
            colorCode = '#ef4444'; dot = '🔴';
        } else if (severity > 4) {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_med_lvl');
            levelDisplay.classList.add('risk-medium');
            descDisplay.setAttribute('data-i18n', 'sym_risk_med_desc');
            emergencyWarn?.classList.add('hidden');
            colorCode = '#f59e0b'; dot = '🟠';
        } else {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_low_lvl');
            levelDisplay.classList.add('risk-low');
            descDisplay.setAttribute('data-i18n', 'sym_risk_low_desc');
            emergencyWarn?.classList.add('hidden');
            colorCode = '#22c55e'; dot = '🟢';
        }

        // Predict diseases from dataset
        const topDiseases = DB_predictDiseases(symptomIds, 3);

        if (topDiseases.length > 0) {
            predictedCategory = topDiseases[0].category || 'General';

            let html = '';
            topDiseases.forEach((d, idx) => {
                const severity_label = d.typical_severity || '';
                const chronic_badge  = d.is_chronic === 'True' ? '<span style="font-size:0.75rem; color:#f59e0b; margin-left:8px;">Chronic</span>' : '';
                const category_badge = `<span style="font-size:0.75rem; color:#94a3b8; margin-left:6px;">${d.category || ''}</span>`;
                html += `
                    <li style="margin-bottom:18px; line-height:1.6; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:14px;">
                        <strong style="color:${colorCode}; font-size:1.05rem;">${dot} ${idx === 0 ? 'Primary Match' : 'Possible Match'}: ${d.disease_name}</strong>
                        ${chronic_badge}${category_badge}<br>
                        <span style="font-size:0.88rem; opacity:0.85; color:#cbd5e1;">${d.description}</span><br>
                        <span style="font-size:0.8rem; color:#64748b; margin-top:4px; display:block;">Typical Severity: <span style="color:${colorCode}">${severity_label}</span></span>
                    </li>`;
            });

            // Append health tips from dataset
            const tips = DB_getHealthTips(predictedCategory, 2);
            if (tips.length > 0) {
                html += `<li style="margin-top:8px; padding:12px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.07);">
                    <strong style="color:#7c3aed; font-size:0.9rem;">💡 Dataset Health Tips (${predictedCategory})</strong><br>
                    <ul style="margin:8px 0 0 0; padding-left:16px; color:#94a3b8; font-size:0.85rem; line-height:1.7;">
                        ${tips.map(t => `<li>${t.tip_text}</li>`).join('')}
                    </ul>
                </li>`;
            }

            conditionsList.innerHTML = html;
        } else {
            predictedCategory = 'General';
            conditionsList.innerHTML = `
                <li style="margin-bottom:15px; line-height:1.5;">
                    <strong style="color:${colorCode}; font-size:1.05rem;">${dot} General Physiological Response</strong><br>
                    <span style="font-size:0.9em; opacity:0.85; color:#cbd5e1;">Your submitted symptoms match generalized physiological defense markers. Please consult a physician for a thorough evaluation.</span>
                </li>`;
        }

        if (typeof changeLanguage === 'function') {
            changeLanguage(localStorage.getItem('medassist_lang') || 'en');
        }
    }

    // ── Find Hospitals Button ────────────────────────────────────────────────
    findHospBtn.addEventListener('click', async () => {
        await DB.loadPromise;
        if (!DB.loaded) return;

        showStep(step4);
        const container = document.getElementById('hospital-list-container');
        container.innerHTML = '';

        const hospitals = DB_getHospitalsForCategory(predictedCategory, 5);

        hospitals.forEach(h => {
            const beds = h.total_beds ? `${h.total_beds} beds` : '';
            const el = document.createElement('div');
            el.className = 'hospital-item';
            el.innerHTML = `
                <h5>${h.hospital_name} <span class="h-dist">${h.city}, ${h.state}</span></h5>
                <p>${h.hospital_type} • Specialty: ${h.specialty_focus}</p>
                <div class="h-meta">
                    <span>⭐ ${h.rating}</span>
                    <span style="margin-left:12px; font-size:0.8rem; color:#64748b;">${beds}</span>
                </div>`;
            el.addEventListener('click', () => showHospitalDetails(h));
            container.appendChild(el);
        });

        if (typeof changeLanguage === 'function') changeLanguage(localStorage.getItem('medassist_lang') || 'en');
    });

    // ── Hospital Detail View ─────────────────────────────────────────────────
    const detailView   = document.getElementById('hospital-detail-view');
    const listView     = document.getElementById('hospital-list-container');
    const closeDetail  = document.getElementById('close-detail-view');

    function showHospitalDetails(h) {
        listView.style.display = 'none';
        detailView.classList.remove('hidden');

        document.getElementById('h-detail-name').textContent    = h.hospital_name;
        document.getElementById('h-detail-spec').textContent    = h.specialty_focus;
        document.getElementById('h-detail-dist').textContent    = `${h.city}, ${h.state}`;
        document.getElementById('h-detail-rating').textContent  = `⭐ ${h.rating}`;
        document.getElementById('h-detail-address').textContent = `Est. ${h.established_year} • ${h.total_beds} beds`;
        document.getElementById('h-detail-phone').textContent   = h.contact_number;

        const isFullService = h.hospital_type === 'General' || h.hospital_type === 'Multi-Specialty';
        document.getElementById('h-detail-emergency').textContent = isFullService ? 'Yes - 24/7' : 'No - Clinic Hours';

        // Render real doctors from dataset
        const doctorsContainer = document.getElementById('h-detail-doctors');
        doctorsContainer.innerHTML = '';
        let docs = DB.doctorsByHospital[h.hospital_id] || [];
        if (prefFemaleChk && prefFemaleChk.checked) docs = docs.filter(d => d.gender === 'Female');
        docs.slice(0, 4).forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doctor-card';
            card.innerHTML = `
                <div class="doctor-img">${doc.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️'}</div>
                <div class="doctor-info">
                    <div class="doctor-name">${doc.full_name}</div>
                    <div class="doctor-spec">${doc.specialization} • ${doc.qualification}</div>
                    <div class="doctor-rating" style="font-size:0.8rem; color:#64748b;">${doc.years_of_experience} yrs exp • ₹${doc.consultation_fee_inr}</div>
                </div>`;
            doctorsContainer.appendChild(card);
        });

        if (docs.length === 0) {
            doctorsContainer.innerHTML = '<p style="color:#64748b; font-size:0.9rem;">No doctors listed for this hospital.</p>';
        }

        document.getElementById('h-map-link').href =
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.hospital_name + ' ' + h.city)}`;

        if (typeof changeLanguage === 'function') changeLanguage(localStorage.getItem('medassist_lang') || 'en');
    }

    closeDetail?.addEventListener('click', () => {
        detailView.classList.add('hidden');
        listView.style.display = 'block';
    });
});
