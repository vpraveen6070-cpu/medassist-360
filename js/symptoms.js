/**
 * Symptoms Checker Modal Logic
 * Handles multi-step flow, mock AI analysis, and hospital discovery
 */

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

        // Expose to window for starting/stopping
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

            // Auto-play the frames slowly
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
    const modalOverlay = document.getElementById('symptoms-modal');
    const closeBtn = document.getElementById('close-symptoms-btn');
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

    // Mock Data
    const hospitalsData = [
        { 
            id: "hosp_1", name: "City General Hospital", spec: "General / Emergency", dist: 1.2, rating: 4.8, address: "100 Med Center Dr, City", phone: "555-0101", emergency: true, coords: "40.7128,-74.0060",
            doctors: [
                { name: "Dr. Ananya Sharma", spec: "Lead Cardiologist", rating: "4.9", emoji: "👩‍⚕️" },
                { name: "Dr. Rajesh Kumar", spec: "ER Specialist", rating: "4.7", emoji: "👨‍⚕️" }
            ]
        },
        { 
            id: "hosp_2", name: "Heart & Neuro Center", spec: "Cardiology / Neurology", dist: 3.4, rating: 4.9, address: "400 Specialist Way, City", phone: "555-0202", emergency: true, coords: "40.7306,-73.9352",
            doctors: [
                { name: "Dr. Vikram Singh", spec: "Neurologist", rating: "5.0", emoji: "👨‍⚕️" },
                { name: "Dr. Kavita Reddy", spec: "Cardiothoracic Surgeon", rating: "4.8", emoji: "👩‍⚕️" }
            ]
        },
        { 
            id: "hosp_3", name: "Community Care Clinic", spec: "Urgent Care", dist: 0.8, rating: 4.2, address: "50 Local Rd, Suburb", phone: "555-0303", emergency: false, coords: "40.7488,-73.9857",
            doctors: [
                { name: "Dr. Priya Desai", spec: "General Physician", rating: "4.5", emoji: "👩‍⚕️" },
                { name: "Dr. Rahul Verma", spec: "Pediatrician", rating: "4.6", emoji: "👨‍⚕️" }
            ]
        },
        { 
            id: "hosp_4", name: "Mercy Trauma Center", spec: "Level 1 Trauma", dist: 5.1, rating: 4.6, address: "999 Rescue Blvd, City", phone: "555-9111", emergency: true, coords: "40.7580,-73.9855",
            doctors: [
                { name: "Dr. Sanjay Gupta", spec: "Trauma Surgeon", rating: "4.9", emoji: "👨‍⚕️" },
                { name: "Dr. Meera Patel", spec: "Anesthesiologist", rating: "4.8", emoji: "👩‍⚕️" }
            ]
        }
    ];

    // Functions
    function scrollToSymptoms(e) {
        if(e) e.preventDefault();
        const checkerSection = document.getElementById('checker');
        if(checkerSection) {
            checkerSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // (Modal close removed)

    function showStep(stepElement) {
        [step1, step2, step3, step4].forEach(s => s.classList.add('hidden'));
        stepElement.classList.remove('hidden');
        
        // Smooth scrolling animation reset
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
    
    // Auto-init visible flow
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
            // Shake effect or slight warning
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
        recognition.continuous = false; // Stops automatically when user pauses
        recognition.interimResults = true; // Shows text in real-time without delay

        recognition.onstart = () => {
            recording = true;
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '<span class="icon">⏹️</span> Listening... (Speak now)';
            textInput.placeholder = "Listening...";
            
            // Remember what was typed/spoken before so we can append cleanly
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
            // Do NOT clear textInput.value here, so it appends automatically
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

    // Analysis Logic
    const validKeywords = ['pain', 'ache', 'fever', 'cough', 'cold', 'bleed', 'breath', 'chest', 'head', 'stomach', 'nausea', 'vomit', 'dizzy', 'tired', 'fatigue', 'rash', 'itch', 'swell', 'burn', 'tingl', 'numb', 'weak', 'chill', 'sweat', 'sore', 'hurt', 'cramp', 'lump', 'blood', 'heart', 'muscle', 'joint', 'skin', 'migraine', 'flu', 'infection', 'vision', 'hearing', 'throat', 'sick', 'ill'];

    analyzeBtn.addEventListener('click', () => {
        const symptoms = textInput.value.toLowerCase();
        const hasValidKeyword = validKeywords.some(kw => symptoms.includes(kw));
        
        // Validation check for random text or empty inputs
        if (!hasValidKeyword && symptoms.trim().split(/\\s+/).length < 4) {
            alert('Invalid input: We could not detect any recognizable medical symptoms. Please describe your condition with more specific symptom keywords (e.g., pain, fever, cough) or provide more context.');
            return;
        }

        showStep(step3);
        
        // Reset states
        loadingState.classList.remove('hidden');
        resultsState.classList.add('hidden');
        
        const severity = parseInt(severityInput.value);

        // Analyze after delay
        setTimeout(() => {
            renderAnalysis(symptoms, severity);
            loadingState.classList.add('hidden');
            resultsState.classList.remove('hidden');
        }, 2000); // 2 second mock delay
    });

    function renderAnalysis(symptoms, severity) {
        const isEmergency = symptoms.includes('chest') || symptoms.includes('breath') || symptoms.includes('bleed') || severity > 7;
        const levelDisplay = document.getElementById('risk-level-display');
        const descDisplay = document.getElementById('risk-desc-display');
        const emergencyWarning = document.getElementById('emergency-warning');
        const conditionsList = document.getElementById('conditions-list');
        
        // Reset styles
        levelDisplay.className = 'risk-level';
        conditionsList.innerHTML = '';

        if (isEmergency) {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_high_lvl');
            levelDisplay.classList.add('risk-danger');
            descDisplay.setAttribute('data-i18n', 'sym_risk_high_desc');
            emergencyWarning.classList.remove('hidden');
            
            conditionsList.innerHTML = `
                <li style="margin-bottom:12px; line-height: 1.4;">
                    <strong style="color: #ef4444;" data-i18n="sym_cond_high1_title">🔴 Suspected Deep Tissue / Cardiac Anomaly</strong><br>
                    <span style="font-size: 0.9em; opacity: 0.85;" data-i18n="sym_cond_high1_desc">Symptoms match critical cardiopulmonary distress markers. Immediate stabilization recommended.</span>
                </li>
                <li style="margin-bottom:12px; line-height: 1.4;">
                    <strong style="color: #ef4444;" data-i18n="sym_cond_high2_title">🔴 Acute Respiratory / Vascular Event</strong><br>
                    <span style="font-size: 0.9em; opacity: 0.85;" data-i18n="sym_cond_high2_desc">High probability of severe systemic disruption requiring specialized emergent intervention.</span>
                </li>
            `;
        } else if (severity > 4) {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_med_lvl');
            levelDisplay.classList.add('risk-medium');
            descDisplay.setAttribute('data-i18n', 'sym_risk_med_desc');
            emergencyWarning.classList.add('hidden');
            
            conditionsList.innerHTML = `
                <li style="margin-bottom:12px; line-height: 1.4;">
                    <strong style="color: #f59e0b;" data-i18n="sym_cond_med1_title">🟠 Probable Viral/Bacterial Infection</strong><br>
                    <span style="font-size: 0.9em; opacity: 0.85;" data-i18n="sym_cond_med1_desc">Consistent with upper-respiratory or localized infectious profiles. Requires physician diagnosis.</span>
                </li>
                <li style="margin-bottom:12px; line-height: 1.4;">
                    <strong style="color: #f59e0b;" data-i18n="sym_cond_med2_title">🟠 Moderate Inflammatory Response</strong><br>
                    <span style="font-size: 0.9em; opacity: 0.85;" data-i18n="sym_cond_med2_desc">Localized swelling or systemic immune reactions detected based on pain scale and symptom description.</span>
                </li>
            `;
        } else {
            levelDisplay.setAttribute('data-i18n', 'sym_risk_low_lvl');
            levelDisplay.classList.add('risk-low');
            descDisplay.setAttribute('data-i18n', 'sym_risk_low_desc');
            emergencyWarning.classList.add('hidden');
            
            conditionsList.innerHTML = `
                <li style="margin-bottom:12px; line-height: 1.4;">
                    <strong style="color: #22c55e;" data-i18n="sym_cond_low1_title">🟢 Benign Systemic Fatigue</strong><br>
                    <span style="font-size: 0.9em; opacity: 0.85;" data-i18n="sym_cond_low1_desc">Matches profiles of standard sleep deficit or mild physiological stress.</span>
                </li>
                <li style="margin-bottom:12px; line-height: 1.4;">
                    <strong style="color: #22c55e;" data-i18n="sym_cond_low2_title">🟢 Uncomplicated Seasonal Immunity Response</strong><br>
                    <span style="font-size: 0.9em; opacity: 0.85;" data-i18n="sym_cond_low2_desc">Symptoms resemble standard common cold or brief allergic reactive markers. Expected to clear shortly.</span>
                </li>
            `;
        }

        if (typeof changeLanguage === 'function') {
            changeLanguage(localStorage.getItem('medassist_lang') || 'en');
        }
    }

    // Hospitals Render
    findHospitalsBtn.addEventListener('click', () => {
        showStep(step4);
        const container = document.getElementById('hospital-list-container');
        container.innerHTML = '';
        
        // Sort by distance roughly for simulation
        hospitalsData.forEach(h => {
            const el = document.createElement('div');
            el.className = 'hospital-item';
            el.innerHTML = `
                <h5><span data-i18n="${h.id}_name">${h.name}</span> <span class="h-dist">${h.dist} km</span></h5>
                <p data-i18n="${h.id}_spec">${h.spec}</p>
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
        hNameDisplay.setAttribute('data-i18n', h.id + '_name');
        hNameDisplay.textContent = h.name;
        
        const hSpecDisplay = document.getElementById('h-detail-spec');
        hSpecDisplay.setAttribute('data-i18n', h.id + '_spec');
        hSpecDisplay.textContent = h.spec;
        
        document.getElementById('h-detail-dist').textContent = `${h.dist} km`;
        document.getElementById('h-detail-rating').textContent = `⭐ ${h.rating}`;
        
        const hAddrDisplay = document.getElementById('h-detail-address');
        hAddrDisplay.setAttribute('data-i18n', h.id + '_addr');
        hAddrDisplay.textContent = h.address;
        
        document.getElementById('h-detail-phone').textContent = h.phone;
        
        const hEmerDisplay = document.getElementById('h-detail-emergency');
        hEmerDisplay.setAttribute('data-i18n', h.emergency ? 'sym_yes_247' : 'sym_no_clinic');
        hEmerDisplay.textContent = h.emergency ? 'Yes - 24/7' : 'No - Clinic Hours';
        
        // Render Doctors
        const doctorsContainer = document.getElementById('h-detail-doctors');
        doctorsContainer.innerHTML = '';
        if (h.doctors && h.doctors.length > 0) {
            let doctorsToRender = [...h.doctors];
            if (prefFemaleCheckbox && prefFemaleCheckbox.checked) {
                doctorsToRender = doctorsToRender.filter(doc => doc.emoji.includes('👩'));
            }

            doctorsToRender.forEach((doc, idx) => {
                const docCard = document.createElement('div');
                docCard.className = 'doctor-card';
                docCard.innerHTML = `
                    <div class="doctor-img">${doc.emoji}</div>
                    <div class="doctor-info">
                        <div class="doctor-name" data-i18n="${h.id}_doc_${idx}_name">${doc.name}</div>
                        <div class="doctor-spec" data-i18n="${h.id}_doc_${idx}_spec">${doc.spec}</div>
                        <div class="doctor-rating">⭐ ${doc.rating}</div>
                    </div>
                `;
                doctorsContainer.appendChild(docCard);
            });
        }
        
        // Map Link Generation
        const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.name + " " + h.address)}`;
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
