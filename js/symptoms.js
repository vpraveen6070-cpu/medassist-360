/**
 * Symptoms Checker Modal Logic
 * Powered by Dataset-Driven AI Retrieval Engine
 */

// Simple robust CSV Parser
function parseCSV(str) {
    const arr = [];
    let quote = false;
    let row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';

        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }
    
    if(arr.length === 0) return [];
    const headers = arr[0];
    const data = [];
    for(let i = 1; i < arr.length; i++) {
        if(arr[i].length === 1 && arr[i][0] === "") continue; 
        const obj = {};
        for(let j = 0; j < headers.length; j++) {
            obj[headers[j]] = arr[i][j];
        }
        data.push(obj);
    }
    return data;
}

// Global DB
const DB = {
    symptoms: [],
    diseases: [],
    mapping: [],
    hospitals: [],
    doctors: [],
    loaded: false
};

async function loadDatasets() {
    try {
        const basePath = '/finalframes/healthcare_ai_system%202/data/raw/';
        
        const [symRes, disRes, mapRes, hosRes, docRes] = await Promise.all([
            fetch(basePath + 'medical_knowledge_base/symptoms.csv'),
            fetch(basePath + 'medical_knowledge_base/diseases.csv'),
            fetch(basePath + 'medical_knowledge_base/symptom_disease_mapping.csv'),
            fetch(basePath + 'hospital_operations/hospitals.csv'),
            fetch(basePath + 'hospital_operations/doctors.csv')
        ]);

        DB.symptoms = parseCSV(await symRes.text());
        DB.diseases = parseCSV(await disRes.text());
        DB.mapping = parseCSV(await mapRes.text());
        DB.hospitals = parseCSV(await hosRes.text());
        DB.doctors = parseCSV(await docRes.text());
        
        DB.loaded = true;
        console.log("Datasets loaded successfully", DB);
    } catch(e) {
        console.error("Error loading datasets", e);
    }
}

// Start loading immediately
loadDatasets();

let predictedDiseaseCategory = null; // Store this globally for hospital filtering

document.addEventListener('DOMContentLoaded', () => {

    // Symptoms Cinematic Canvas Engine
    const sysCanvas = document.getElementById('symptoms-canvas');
    if (sysCanvas) {
        const sysCtx = sysCanvas.getContext('2d');
        const frameCount = 240;
        const currentFrame = index => `finalframes/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`;

        const images = [];
        let loadedImages = 0;
        let sysTargetFrame = 0;
        let sysAnimatedFrame = 0;
        let sysLastRenderedVal = -1;
        let sysIsAnimating = false;

        function sysResize() {
            sysCanvas.width = window.innerWidth;
            sysCanvas.height = window.innerHeight;
            sysLastRenderedVal = -1;
            sysRender();
        }
        window.addEventListener('resize', sysResize);

        // Preload
        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                loadedImages++;
                if (loadedImages === 1) sysResize();
            };
            images.push(img);
        }

        function sysRender() {
            const currentVal = sysAnimatedFrame.toFixed(3);
            if (currentVal === sysLastRenderedVal) return;
            sysLastRenderedVal = currentVal;

            const safeFrame = Math.max(0, sysAnimatedFrame);
            const frame1 = Math.floor(safeFrame) % frameCount;
            const frame2 = (frame1 + 1) % frameCount;
            const fraction = safeFrame - Math.floor(safeFrame);
            
            if (images[frame1] && images[frame1].complete) {
                const img = images[frame1];
                const canvasRatio = sysCanvas.width / sysCanvas.height;
                const imgRatio = (img.width || 1920) / (img.height || 1080);
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

                if (canvasRatio > imgRatio) {
                    drawWidth = sysCanvas.width;
                    drawHeight = sysCanvas.width / imgRatio;
                    offsetY = (sysCanvas.height - drawHeight) / 2;
                } else {
                    drawHeight = sysCanvas.height;
                    drawWidth = sysCanvas.height * imgRatio;
                    offsetX = (sysCanvas.width - drawWidth) / 2;
                }

                sysCtx.clearRect(0, 0, sysCanvas.width, sysCanvas.height);
                sysCtx.globalAlpha = 1;
                sysCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

                if (frame2 !== frame1 && fraction > 0.01 && images[frame2] && images[frame2].complete) {
                    sysCtx.globalAlpha = fraction;
                    sysCtx.drawImage(images[frame2], offsetX, offsetY, drawWidth, drawHeight);
                }
                sysCtx.globalAlpha = 1;
            }
        }

        window.startSymptomsCanvas = function() {
            if(!sysIsAnimating) {
                sysIsAnimating = true;
                sysAnimLoop();
            }
        };

        window.stopSymptomsCanvas = function() {
            sysIsAnimating = false;
        };

        function sysAnimLoop() {
            if(!sysIsAnimating) return;

            sysTargetFrame += 0.35;
            if(sysTargetFrame >= frameCount) {
                sysTargetFrame = sysTargetFrame % frameCount;
                sysAnimatedFrame = sysAnimatedFrame % frameCount;
            }

            const diff = sysTargetFrame - sysAnimatedFrame;
            if (Math.abs(diff) > 0.01) {
                sysAnimatedFrame += diff * 0.12;
                sysRender();
            } else if (sysAnimatedFrame !== sysTargetFrame) {
                sysAnimatedFrame = sysTargetFrame; 
                sysRender();
            }
            requestAnimationFrame(sysAnimLoop);
        }
    }

    // Modal Elements
    const navBtn = document.getElementById('nav-symptoms-btn');
    const heroBtn = document.getElementById('hero-symptoms-btn');
    
    // Step Panes
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');

    // Controls
    const nextStep1 = document.getElementById('next-step-1');
    const prevStep2 = document.getElementById('prev-step-2');
    const analyzeBtn = document.getElementById('analyze-symptoms-btn');
    const prevStep3 = document.getElementById('prev-step-3');
    const findHospitalsBtn = document.getElementById('find-hospitals-btn');
    const prevStep4 = document.getElementById('prev-step-4');

    // Inputs
    const textInput = document.getElementById('symptoms-text-input');
    const recordBtn = document.getElementById('voice-record-btn');
    const severityInput = document.getElementById('sym-severity');
    const genderSelect = document.getElementById('sym-gender');
    const prefFemaleWrap = document.getElementById('pref-female-doc-wrap');
    const prefFemaleCheckbox = document.getElementById('pref-female-doc');

    // Results & State
    const loadingState = document.getElementById('symptoms-loading');
    const resultsState = document.getElementById('symptoms-results');

    // Functions
    function scrollToSymptoms(e) {
        if(e) e.preventDefault();
        const checkerSection = document.getElementById('checker');
        if(checkerSection) {
            checkerSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function showStep(stepElement) {
        [step1, step2, step3, step4].forEach(s => s.classList.add('hidden'));
        stepElement.classList.remove('hidden');
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function resetFlow() {
        showStep(step1);
        textInput.value = '';
        loadingState.classList.remove('hidden');
        resultsState.classList.add('hidden');
    }

    // Event Listeners - Scroll instead of modal
    navBtn?.addEventListener('click', scrollToSymptoms);
    heroBtn?.addEventListener('click', scrollToSymptoms);
    
    resetFlow();

    // Gender Preference Logic
    if (genderSelect && prefFemaleWrap) {
        genderSelect.addEventListener('change', (e) => {
            if (e.target.value === 'female') {
                prefFemaleWrap.classList.remove('hidden');
                if (prefFemaleCheckbox) prefFemaleCheckbox.checked = true;
            } else {
                prefFemaleWrap.classList.add('hidden');
                if (prefFemaleCheckbox) prefFemaleCheckbox.checked = false;
            }
        });
        if (genderSelect.value === 'female') {
            prefFemaleWrap.classList.remove('hidden');
            if (prefFemaleCheckbox) prefFemaleCheckbox.checked = true;
        }
    }

    // Step Navigation
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
        document.getElementById('hospital-detail-view').classList.add('hidden');
        document.getElementById('hospital-list-container').style.display = 'block';
        showStep(step3);
    });

    // Voice Input using Web Speech API
    let recording = false;
    let recognition = null;
    let baseTranscript = '';

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            recording = true;
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '<span class="icon">⏹️</span> Listening... (Speak now)';
            textInput.placeholder = "Listening...";
            
            baseTranscript = textInput.value;
            if (baseTranscript.length > 0 && !baseTranscript.endsWith(' ')) {
                baseTranscript += ' ';
            }
        };

        recognition.onresult = (event) => {
            let currentFinal = '';
            let currentInterim = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    currentFinal += event.results[i][0].transcript;
                } else {
                    currentInterim += event.results[i][0].transcript;
                }
            }

            baseTranscript += currentFinal;
            textInput.value = baseTranscript + currentInterim;
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            stopRecording();
        };

        recognition.onend = () => {
             if(recording) {
                 stopRecording();
             }
        };
    }

    recordBtn.addEventListener('click', () => {
        if (!recognition) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (!recording) {
            recognition.start();
        } else {
            stopRecording();
        }
    });

    function stopRecording() {
        if (recording && recognition) {
            recording = false;
            recognition.stop();
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<span class="icon">🎙️</span> Tap to Speak';
            textInput.placeholder = "Describe your symptoms (e.g., severe headache, fever)";
        }
    }

    // AI Dataset Retrieval Engine Logic
    function extractSymptomIds(userInput) {
        const text = userInput.toLowerCase();
        const matchedSymptomIds = new Set();
        
        DB.symptoms.forEach(sym => {
            const symName = sym.symptom_name.toLowerCase();
            if (text.includes(symName)) {
                matchedSymptomIds.add(sym.symptom_id);
            } else {
                const words = symName.split(' ');
                if(words.some(w => w.length > 3 && text.includes(w))) {
                    matchedSymptomIds.add(sym.symptom_id);
                }
            }
        });
        
        return Array.from(matchedSymptomIds);
    }

    function predictDiseases(matchedSymptomIds) {
        const diseaseScores = {};
        
        DB.mapping.forEach(m => {
            if (matchedSymptomIds.includes(m.symptom_id)) {
                if (!diseaseScores[m.disease_id]) diseaseScores[m.disease_id] = 0;
                diseaseScores[m.disease_id] += parseInt(m.frequency_percent || 0);
            }
        });
        
        const sorted = Object.entries(diseaseScores).sort((a,b) => b[1] - a[1]);
        
        return sorted.slice(0, 2).map(entry => {
            return DB.diseases.find(d => d.disease_id === entry[0]);
        }).filter(Boolean);
    }

    analyzeBtn.addEventListener('click', async () => {
        if (!DB.loaded) {
            alert('AI Knowledge Base is still loading. Please wait a moment.');
            return;
        }

        const symptoms = textInput.value;
        const matchedIds = extractSymptomIds(symptoms);
        
        if (matchedIds.length === 0 && symptoms.trim().split(/\s+/).length < 4) {
            alert('Invalid input: We could not detect any recognizable medical symptoms. Please describe your condition with more specific symptom keywords.');
            return;
        }

        showStep(step3);
        
        loadingState.classList.remove('hidden');
        resultsState.classList.add('hidden');
        
        const severity = parseInt(severityInput.value);

        await renderLiveAnalysis(matchedIds, symptoms, severity);
        
        loadingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
    });

    async function renderLiveAnalysis(matchedIds, rawText, severity) {
        const textLower = rawText.toLowerCase();
        const isEmergency = textLower.includes('chest') || textLower.includes('breath') || textLower.includes('bleed') || severity > 7;
        const levelDisplay = document.getElementById('risk-level-display');
        const descDisplay = document.getElementById('risk-desc-display');
        const emergencyWarning = document.getElementById('emergency-warning');
        const conditionsList = document.getElementById('conditions-list');
        
        levelDisplay.className = 'risk-level';
        conditionsList.innerHTML = '';

        let colorCode = '';
        let dot = '';
        if (isEmergency) {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_high_lvl');
            levelDisplay.classList.add('risk-danger');
            descDisplay.setAttribute('data-i18n', 'sym_risk_high_desc');
            emergencyWarning.classList.remove('hidden');
            colorCode = '#ef4444';
            dot = '🔴';
        } else if (severity > 4) {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_med_lvl');
            levelDisplay.classList.add('risk-medium');
            descDisplay.setAttribute('data-i18n', 'sym_risk_med_desc');
            emergencyWarning.classList.add('hidden');
            colorCode = '#f59e0b';
            dot = '🟠';
        } else {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_low_lvl');
            levelDisplay.classList.add('risk-low');
            descDisplay.setAttribute('data-i18n', 'sym_risk_low_desc');
            emergencyWarning.classList.add('hidden');
            colorCode = '#22c55e';
            dot = '🟢';
        }

        // Run Dataset AI Match
        const topDiseases = predictDiseases(matchedIds);
        let liveConditionsHTML = '';

        if (topDiseases.length > 0) {
            predictedDiseaseCategory = topDiseases[0].category; // Save for hospital filtering

            for (let d of topDiseases) {
                liveConditionsHTML += `
                    <li style="margin-bottom:15px; line-height: 1.5;">
                        <strong style="color: ${colorCode}; font-size:1.05rem;">${dot} Knowledge Base Match: ${d.disease_name}</strong><br>
                        <span style="font-size: 0.9em; opacity: 0.85; color:#cbd5e1;">${d.description}</span>
                    </li>
                `;
            }
        }

        if (liveConditionsHTML.trim()) {
            conditionsList.innerHTML = liveConditionsHTML;
        } else {
            predictedDiseaseCategory = "General"; // Fallback
            conditionsList.innerHTML = `
                <li style="margin-bottom:15px; line-height: 1.5;">
                    <strong style="color: ${colorCode}; font-size:1.05rem;">${dot} General Physiological Response</strong><br>
                    <span style="font-size: 0.9em; opacity: 0.85; color:#cbd5e1;">Your submitted symptoms match generalized physiological defense markers. Please consult our recommended clinics for a thorough physical evaluation.</span>
                </li>
            `;
        }

        if (typeof changeLanguage === 'function') {
            changeLanguage(localStorage.getItem('medassist_lang') || 'en');
        }
    }

    // Hospitals Render
    findHospitalsBtn.addEventListener('click', () => {
        if (!DB.loaded) return;

        showStep(step4);
        const container = document.getElementById('hospital-list-container');
        container.innerHTML = '';
        
        // Filter by predicted category if possible
        let validHospitals = DB.hospitals.filter(h => !predictedDiseaseCategory || h.specialty_focus === predictedDiseaseCategory || h.hospital_type === 'General' || h.hospital_type === 'Multi-Specialty');
        
        // Sort by rating 
        validHospitals.sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating));

        // Limit to top 5
        validHospitals.slice(0, 5).forEach(h => {
            const hId = h.hospital_id;
            const hDocs = DB.doctors.filter(d => d.hospital_id === hId);
            
            // Assign doctors temporarily to hospital object for detail view
            h.doctors = hDocs.map(doc => ({
                name: doc.full_name,
                spec: doc.specialization,
                rating: 4.5 + (Math.random() * 0.5).toFixed(1), // mock rating since doctor csv doesn't have it
                emoji: doc.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️',
                gender: doc.gender
            }));

            // Generate a random distance for demo purposes based on rating
            h.dist = (Math.random() * 5 + 0.5).toFixed(1);

            const el = document.createElement('div');
            el.className = 'hospital-item';
            el.innerHTML = `
                <h5><span data-i18n="${h.hospital_id}_name">${h.hospital_name}</span> <span class="h-dist">${h.dist} km</span></h5>
                <p data-i18n="${h.hospital_id}_spec">${h.hospital_type} • ${h.specialty_focus}</p>
                <div class="h-meta">
                    <span>⭐ ${h.rating}</span>
                </div>
            `;
            el.addEventListener('click', () => showHospitalDetails(h));
            container.appendChild(el);
        });
        
        if (typeof changeLanguage === 'function') {
            changeLanguage(localStorage.getItem('medassist_lang') || 'en');
        }
    });

    const detailView = document.getElementById('hospital-detail-view');
    const listView = document.getElementById('hospital-list-container');
    const closeDetailBtn = document.getElementById('close-detail-view');

    function showHospitalDetails(h) {
        listView.style.display = 'none';
        detailView.classList.remove('hidden');
        
        const hNameDisplay = document.getElementById('h-detail-name');
        hNameDisplay.setAttribute('data-i18n', h.hospital_id + '_name');
        hNameDisplay.textContent = h.hospital_name;
        
        const hSpecDisplay = document.getElementById('h-detail-spec');
        hSpecDisplay.setAttribute('data-i18n', h.hospital_id + '_spec');
        hSpecDisplay.textContent = h.specialty_focus;
        
        document.getElementById('h-detail-dist').textContent = `${h.dist} km`;
        document.getElementById('h-detail-rating').textContent = `⭐ ${h.rating}`;
        
        const hAddrDisplay = document.getElementById('h-detail-address');
        hAddrDisplay.setAttribute('data-i18n', h.hospital_id + '_addr');
        hAddrDisplay.textContent = `${h.city}, ${h.state}`;
        
        document.getElementById('h-detail-phone').textContent = h.contact_number;
        
        const isEmergency = h.hospital_type === 'General' || h.hospital_type === 'Multi-Specialty';
        const hEmerDisplay = document.getElementById('h-detail-emergency');
        hEmerDisplay.setAttribute('data-i18n', isEmergency ? 'sym_yes_247' : 'sym_no_clinic');
        hEmerDisplay.textContent = isEmergency ? 'Yes - 24/7' : 'No - Clinic Hours';
        
        // Render Doctors
        const doctorsContainer = document.getElementById('h-detail-doctors');
        doctorsContainer.innerHTML = '';
        if (h.doctors && h.doctors.length > 0) {
            let doctorsToRender = [...h.doctors];
            if (prefFemaleCheckbox && prefFemaleCheckbox.checked) {
                doctorsToRender = doctorsToRender.filter(doc => doc.gender === 'Female');
            }

            doctorsToRender.forEach((doc, idx) => {
                const docCard = document.createElement('div');
                docCard.className = 'doctor-card';
                docCard.innerHTML = `
                    <div class="doctor-img">${doc.emoji}</div>
                    <div class="doctor-info">
                        <div class="doctor-name" data-i18n="${h.hospital_id}_doc_${idx}_name">${doc.name}</div>
                        <div class="doctor-spec" data-i18n="${h.hospital_id}_doc_${idx}_spec">${doc.spec}</div>
                        <div class="doctor-rating">⭐ ${doc.rating}</div>
                    </div>
                `;
                doctorsContainer.appendChild(docCard);
            });
        }
        
        // Map Link Generation
        const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.hospital_name + " " + h.city)}`;
        document.getElementById('h-map-link').href = mapUrl;
        
        if (typeof changeLanguage === 'function') {
            changeLanguage(localStorage.getItem('medassist_lang') || 'en');
        }
    }

    closeDetailBtn.addEventListener('click', () => {
        detailView.classList.add('hidden');
        listView.style.display = 'block';
    });
});
