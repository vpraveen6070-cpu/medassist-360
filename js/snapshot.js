/**
 * Snapshot Assistant Logic for MedAssist 360
 * Handles Camera/Upload, AI Simulation Flow, and Results Rendering
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Step References ---
    const stepInput = document.getElementById('step-input');
    const stepCamera = document.getElementById('step-camera');
    const stepProcessing = document.getElementById('step-processing');
    const stepResults = document.getElementById('step-results');

    // --- Buttons & Inputs ---
    const docTypeSelect = document.getElementById('doc-type-select');
    const btnCamera = document.getElementById('btn-camera');
    const fileUpload = document.getElementById('file-upload');
    const closeCameraBtn = document.getElementById('close-camera');
    const capturePhotoBtn = document.getElementById('capture-photo');
    const btnRestart = document.getElementById('btn-restart');

    // --- Camera Elements ---
    const videoFeed = document.getElementById('camera-feed');
    const canvas = document.getElementById('snapshot-canvas');
    let stream = null;

    // --- Display Elements ---
    const previewImage = document.getElementById('preview-image');
    
    // --- Event Listeners ---

    btnCamera.addEventListener('click', async () => {
        const errorMsg = document.getElementById('camera-error-msg');
        if (errorMsg) errorMsg.style.display = 'none';

        // Enforce Mobile View Only
        if (window.innerWidth > 768) {
            if (errorMsg) {
                errorMsg.innerText = 'The "Take Photo" feature is only available in mobile view. Please use the "Upload Image" option on desktop.';
                errorMsg.style.display = 'block';
                setTimeout(() => errorMsg.style.display = 'none', 5000);
            }
            return;
        }

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
            videoFeed.srcObject = stream;
            // Explicitly call play for iframe & mobile robustness
            try {
                await videoFeed.play();
            } catch (playErr) {
                console.warn('Video auto-play prevented. User interaction required.', playErr);
            }
            switchStep(stepCamera);
        } catch (err) {
            if (errorMsg) {
                errorMsg.innerText = 'Camera access denied or unavailable. Please use the upload feature instead.';
                errorMsg.style.display = 'block';
                setTimeout(() => errorMsg.style.display = 'none', 5000);
            }
            console.error('Camera error:', err);
        }
    });

    // 2. Close Camera
    closeCameraBtn.addEventListener('click', () => {
        stopCamera();
        switchStep(stepInput);
    });

    // 3. Capture Photo
    capturePhotoBtn.addEventListener('click', () => {
        if (!stream) return;
        
        // Draw to canvas
        canvas.width = videoFeed.videoWidth;
        canvas.height = videoFeed.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);
        
        // Convert to data target
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        previewImage.onload = () => {
            startProcessing();
            previewImage.onload = null;
        };
        previewImage.src = imageDataUrl;
        
        stopCamera();
    });

    // 4. Upload File
    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            previewImage.onload = () => {
                startProcessing();
                previewImage.onload = null;
            };
            previewImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 5. Restart flow
    btnRestart.addEventListener('click', () => {
        fileUpload.value = '';
        switchStep(stepInput);
    });


    // --- Helper Functions ---

    const navbar = document.getElementById('navbar');

    function switchStep(targetStep) {
        // Hide all steps
        [stepInput, stepCamera, stepProcessing, stepResults].forEach(step => {
            step.classList.add('hidden');
            step.classList.remove('active');
        });
        
        // Show target
        targetStep.classList.remove('hidden');
        // Small delay to allow CSS display block to apply before opacity fade-in
        setTimeout(() => {
            targetStep.classList.add('active');
        }, 50);

        // Hide navigation bar when capturing
        if (navbar) {
            if (targetStep === stepCamera) {
                navbar.classList.add('hidden');
            } else {
                navbar.classList.remove('hidden');
            }
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            videoFeed.srcObject = null;
            stream = null;
        }
    }

    async function startProcessing() {
        switchStep(stepProcessing);
        
        // Validate Image
        if (!checkImageQuality(previewImage)) {
            renderErrorState();
            switchStep(stepResults);
            return;
        }
        
        // Simulate Google Lens Processing Flow
        const statusText = document.getElementById('processing-text');
        statusText.innerText = 'Initializing Google Lens Vision API...';
        
        setTimeout(() => { statusText.innerText = 'Extracting OCR text and identifying objects...'; }, 1000);
        setTimeout(() => { statusText.innerText = 'Querying Global Web Database...'; }, 2200);
        
        // Simulating Google Lens confidentially extracting a medication name from the image
        const possibleScans = ['Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Lisinopril', 'Aspirin', 'Metformin', 'Atorvastatin', 'Omeprazole', 'Amlodipine', 'Cetirizine', 'Azithromycin'];
        const query = possibleScans[Math.floor(Math.random() * possibleScans.length)];
        
        let desc = "";
        let foundTitle = query;
        let isRecommended = true;

        try {
            // Live Background API Fetch simulating Google's knowledge graph natively
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.query.search.length > 0) {
                    foundTitle = searchData.query.search[0].title;
                    const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(foundTitle)}`;
                    const pageRes = await fetch(pageUrl);
                    if (pageRes.ok) {
                        const pageData = await pageRes.json();
                        desc = pageData.extract;
                        
                        // Parse live data for warnings
                        const descLower = desc.toLowerCase();
                        if (descLower.includes("prescription") || descLower.includes("antibiotic") || descLower.includes("controlled") || descLower.includes("rx-only") || descLower.includes("doctor")) {
                            isRecommended = false;
                        }
                        if (descLower.includes("over-the-counter") || descLower.includes("otc") || descLower.includes("supplement")) {
                            isRecommended = true;
                        }
                    }
                }
            }
        } catch(e) {
            console.error("Lens Simulation Fetch Error:", e);
        }
        
        if (!desc) {
            desc = `Background extraction identified "${foundTitle}", but detailed public documentation was not immediately available over the network connection.`;
        }
        
        setTimeout(() => {
            renderDynamicResults(foundTitle, desc, isRecommended);
            switchStep(stepResults);
            statusText.innerText = 'Analyzing Document...'; // reset for next time
        }, 3600);
    }

    // --- Mock Data Rendering based on Type ---
    let scenarioPool = [];
    
    function getNextScenario() {
        if (scenarioPool.length === 0) {
            scenarioPool = [
                {
                    title: '<span data-i18n="snap_s0_title">Prescription Analysis</span> <span style="font-size: 0.7rem; background: rgba(0,255,0,0.1); color: #4ade80; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(74, 222, 128, 0.3);" data-i18n="snap_s0_conf">98% Confidence</span>',
                    main: `<div class="info-row"><span class="info-label" data-i18n="snap_lbl_phys">Prescribing Physician:</span> <span class="info-value" data-i18n="snap_s0_dr">Dr. Sarah Jenkins, MD</span></div>
                           <div style="margin-top: 15px;"><strong data-i18n="snap_lbl_meds">Medications:</strong><br><span data-i18n="snap_s0_med">1. Amoxicillin 500mg (3x daily)</span></div>`,
                    safety: `<div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_lbl_adv">Advisory:</span> <span class="info-value alert-value" style="font-size: 0.9rem;" data-i18n="snap_s0_adv">Complete the full 7-day course.</span></div>`,
                    diet: `<div class="info-row"><span class="info-label" data-i18n="snap_diet_veg">Vegetables:</span> <span class="info-value" data-i18n="snap_s0_veg">Spinach, Carrots</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_diet_nonveg">Non-Veg/Egg:</span> <span class="info-value" data-i18n="snap_s0_nonveg">Boiled Eggs</span></div>
                           <div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_diet_avoid">Avoid:</span> <span class="info-value alert-value" style="font-size: 0.85rem;" data-i18n="snap_s0_avoid">Excess dairy, highly spiced foods</span></div>`,
                    hasTimeline: true,
                    timeline: `<div class="timeline-item"><span class="time-label" data-i18n="snap_time_morn">Morning</span><div class="time-action"><span data-i18n="snap_s0_med_name">Amoxicillin 500mg</span> <span class="food-note" data-i18n="snap_s0_med_note">After Breakfast</span></div></div>`,
                    type: 'pharmacy'
                },
                {
                    title: '<span data-i18n="snap_s1_title">Medication Intelligence</span> <span style="font-size: 0.7rem; background: rgba(0,255,0,0.1); color: #4ade80; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(74, 222, 128, 0.3);" data-i18n="snap_s1_conf">Verified</span>',
                    main: `<div class="info-row"><span class="info-label" data-i18n="snap_lbl_com">Commercial Name:</span> <span class="info-value highlight-value" data-i18n="snap_s1_name">Crocin Advance</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_lbl_act">Active Ingredient:</span> <span class="info-value" data-i18n="snap_s1_act">Paracetamol 500mg</span></div>`,
                    safety: `<div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_lbl_contra">Contraindications:</span> <span class="info-value alert-value" style="font-size:0.9rem;" data-i18n="snap_s1_adv">High risk of hepatotoxicity if daily dosage exceeds 4000mg.</span></div>`,
                    diet: `<div class="info-row"><span class="info-label" data-i18n="snap_diet_veg">Vegetables:</span> <span class="info-value" data-i18n="snap_s1_veg">Light green soups, Broccoli</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_diet_nonveg">Non-Veg/Egg:</span> <span class="info-value" data-i18n="snap_s1_nonveg">Clear chicken broth</span></div>
                           <div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_diet_avoid">Avoid:</span> <span class="info-value alert-value" style="font-size: 0.85rem;" data-i18n="snap_s1_avoid">Alcohol, Excess caffeine</span></div>`,
                    hasTimeline: false,
                    timeline: '',
                    type: 'pharmacy'
                },
                {
                    title: '<span data-i18n="snap_s2_title">Lab Report Analysis</span> <span style="font-size: 0.7rem; background: rgba(255,165,0,0.1); color: #fbbf24; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(251, 191, 36, 0.3);" data-i18n="snap_s2_conf">Review Required</span>',
                    main: `<div class="info-row"><span class="info-label" data-i18n="snap_lbl_ldl">LDL Cholesterol:</span> <span class="info-value alert-value" data-i18n="snap_s2_ldl">Elevated (160 mg/dL)</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_lbl_hdl">HDL Cholesterol:</span> <span class="info-value" data-i18n="snap_s2_hdl">Normal (45 mg/dL)</span></div>`,
                    safety: `<div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_lbl_diet_note">Dietary Note:</span> <span class="info-value alert-value" style="font-size:0.9rem;" data-i18n="snap_s2_adv">Reduce intake of saturated fats and schedule a cardiologist review.</span></div>`,
                    diet: `<div class="info-row"><span class="info-label" data-i18n="snap_diet_veg">Vegetables:</span> <span class="info-value" data-i18n="snap_s2_veg">Oats, Beans, Spinach</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_diet_nonveg">Non-Veg/Egg:</span> <span class="info-value" data-i18n="snap_s2_nonveg">Salmon, Grilled chicken</span></div>
                           <div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_diet_avoid">Avoid:</span> <span class="info-value alert-value" style="font-size: 0.85rem;" data-i18n="snap_s2_avoid">Red meat, Fried foods</span></div>`,
                    hasTimeline: false,
                    timeline: '',
                    type: 'hospital'
                },
                {
                    title: '<span data-i18n="snap_s3_title">Prescription Analysis</span> <span style="font-size: 0.7rem; background: rgba(0,255,0,0.1); color: #4ade80; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(74, 222, 128, 0.3);" data-i18n="snap_s3_conf">97% Confidence</span>',
                    main: `<div class="info-row"><span class="info-label" data-i18n="snap_lbl_med">Medication:</span> <span class="info-value highlight-value" data-i18n="snap_s3_med">Amlodipine 5mg</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_lbl_inst">Instructions:</span> <span class="info-value" data-i18n="snap_s3_inst">1x daily for Hypertension</span></div>`,
                    safety: `<div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_lbl_adv">Advisory:</span> <span class="info-value alert-value" style="font-size:0.9rem;" data-i18n="snap_s3_adv">Monitor blood pressure regularly. Swelling of ankles may occur.</span></div>`,
                    diet: `<div class="info-row"><span class="info-label" data-i18n="snap_diet_veg">Vegetables:</span> <span class="info-value" data-i18n="snap_s3_veg">Potatoes, Bananas, Leafy greens</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_diet_nonveg">Non-Veg/Egg:</span> <span class="info-value" data-i18n="snap_s3_nonveg">Lean poultry</span></div>
                           <div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_diet_avoid">Avoid:</span> <span class="info-value alert-value" style="font-size: 0.85rem;" data-i18n="snap_s3_avoid">High sodium foods, Pickles</span></div>`,
                    hasTimeline: true,
                    timeline: `<div class="timeline-item"><span class="time-label" data-i18n="snap_s3_time">Morning</span><div class="time-action"><span data-i18n="snap_s3_med_name">Amlodipine 5mg</span> <span class="food-note" data-i18n="snap_s3_med_note">Take at the same time daily</span></div></div>`,
                    type: 'pharmacy'
                },
                {
                    title: '<span data-i18n="snap_s4_title">Prescription Analysis</span> <span style="font-size: 0.7rem; background: rgba(0,255,0,0.1); color: #4ade80; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(74, 222, 128, 0.3);" data-i18n="snap_s4_conf">99% Confidence</span>',
                    main: `<div class="info-row"><span class="info-label" data-i18n="snap_lbl_med">Medication:</span> <span class="info-value highlight-value" data-i18n="snap_s4_med">Metformin 500mg</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_lbl_inst">Instructions:</span> <span class="info-value" data-i18n="snap_s4_inst">2x daily with meals</span></div>`,
                    safety: `<div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_lbl_adv">Advisory:</span> <span class="info-value alert-value" style="font-size:0.9rem;" data-i18n="snap_s4_adv">Always take with food to avoid gastrointestinal issues. Monitor blood sugar levels.</span></div>`,
                    diet: `<div class="info-row"><span class="info-label" data-i18n="snap_diet_veg">Vegetables:</span> <span class="info-value" data-i18n="snap_s4_veg">Bitter gourd, Leafy greens</span></div>
                           <div class="info-row"><span class="info-label" data-i18n="snap_diet_nonveg">Non-Veg/Egg:</span> <span class="info-value" data-i18n="snap_s4_nonveg">Lean meat, Fish</span></div>
                           <div class="info-row" style="border:none;"><span class="info-label" data-i18n="snap_diet_avoid">Avoid:</span> <span class="info-value alert-value" style="font-size: 0.85rem;" data-i18n="snap_s4_avoid">Sugary sweets, White rice</span></div>`,
                    hasTimeline: true,
                    timeline: `<div class="timeline-item"><span class="time-label" data-i18n="snap_s4_time1">Morning</span><div class="time-action"><span data-i18n="snap_s4_med">Metformin 500mg</span> <span class="food-note" data-i18n="snap_s4_med_note1">During Breakfast</span></div></div>
                               <div class="timeline-item"><span class="time-label" data-i18n="snap_s4_time2">Evening</span><div class="time-action"><span data-i18n="snap_s4_med">Metformin 500mg</span> <span class="food-note" data-i18n="snap_s4_med_note2">During Dinner</span></div></div>`,
                    type: 'pharmacy'
                }
            ];
            // Shuffle pool
            scenarioPool.sort(() => Math.random() - 0.5);
        }
        return scenarioPool.pop();
    }

    function renderErrorState() {
        const titleSpan = document.getElementById('res-title');
        const mainContent = document.getElementById('res-extracted-content');
        const safetyContent = document.getElementById('res-safety-content');
        const timelineCard = document.getElementById('card-timeline');
        const nearbyContent = document.getElementById('res-nearby');
        const dietCard = document.getElementById('card-diet');

        titleSpan.innerHTML = 'Scan Failed <span style="font-size: 0.7rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(239, 68, 68, 0.3);">Error</span>';
        mainContent.innerHTML = `<div class="info-row"><span class="info-label">Error:</span> <span class="info-value alert-value">Image quality too low or too dark.</span></div>`;
        safetyContent.innerHTML = `<div class="info-row" style="border:none;"><span class="info-label">Resolution:</span> <span class="info-value">Please ensure good lighting and try capturing again.</span></div>`;

        if (timelineCard) timelineCard.classList.add('hidden');
        if (dietCard) dietCard.classList.add('hidden');
        nearbyContent.innerHTML = '';
        
        if (typeof changeLanguage === 'function') {
            changeLanguage(localStorage.getItem('medassist_lang') || 'en');
        }
    }

    function renderDynamicResults(title, desc, isRecommended) {
        const titleSpan = document.getElementById('res-title');
        const mainContent = document.getElementById('res-extracted-content');
        const safetyContent = document.getElementById('res-safety-content');
        const timelineCard = document.getElementById('card-timeline');
        const timelineContent = document.getElementById('res-timeline');
        const nearbyContent = document.getElementById('res-nearby');
        const safetyCard = document.getElementById('card-safety');
        const dietCard = document.getElementById('card-diet');
        const dietContent = document.getElementById('res-diet-content');

        // Reset visibility
        if (timelineCard) timelineCard.classList.remove('hidden');
        if (safetyCard) safetyCard.classList.remove('hidden');
        if (dietCard) dietCard.classList.remove('hidden');
        nearbyContent.innerHTML = '';

        const trustBadge = isRecommended ? 
            `<span style="font-size: 0.7rem; background: rgba(0,255,0,0.1); color: #4ade80; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(74, 222, 128, 0.3);">OTC Verified</span>` :
            `<span style="font-size: 0.7rem; background: rgba(255,165,0,0.1); color: #fbbf24; padding: 2px 6px; border-radius: 10px; margin-left: 10px; border: 1px solid rgba(251, 191, 36, 0.3);">Prescription Required</span>`;

        titleSpan.innerHTML = `<span style="display:flex; align-items:center; gap:8px;">Google Lens Match <span style="font-size: 1.2rem;">🔍</span></span> ${trustBadge}`;
        
        mainContent.innerHTML = `
            <div class="info-row"><span class="info-label">Identified Object:</span> <span class="info-value highlight-value" style="font-size:1.15rem">${title}</span></div>
            <div class="info-row" style="flex-direction:column; align-items:flex-start; text-align:left; border:none; padding-top:15px;">
                <span class="info-label" style="margin-bottom:8px; color: #cbd5e1; font-weight: 500;">Live Web Knowledge Graph:</span> 
                <span class="info-value" style="text-align:left; max-width:100%; font-size:0.95rem; line-height:1.6; color:#94a3b8; font-weight: normal;">${desc}</span>
            </div>
        `;

        if (isRecommended) {
            safetyContent.innerHTML = `<div class="info-row" style="border:none;"><span class="info-label">Advisory:</span> <span class="info-value" style="font-size:0.9rem; color:#4ade80;">Generally safe for over-the-counter use. Follow packaging limits.</span></div>`;
            dietContent.innerHTML = `
                <div class="info-row"><span class="info-label">Recommended Pairing:</span> <span class="info-value">Take with plain water</span></div>
                <div class="info-row" style="border:none;"><span class="info-label">Avoid:</span> <span class="info-value alert-value" style="font-size: 0.85rem;">Excessive alcohol consumption</span></div>
            `;
            timelineContent.innerHTML = `<div class="timeline-item"><span class="time-label">Dosage Routine</span><div class="time-action"><span>${title}</span> <span class="food-note">Do not exceed maximum daily limits as per box</span></div></div>`;
        } else {
            safetyContent.innerHTML = `<div class="info-row" style="border:none;"><span class="info-label">Advisory:</span> <span class="info-value alert-value" style="font-size:0.9rem;">Strict adherence to physician prescription required.</span></div>`;
            dietContent.innerHTML = `
                <div class="info-row"><span class="info-label">Important Note:</span> <span class="info-value">Consult doctor for dietary restrictions</span></div>
                <div class="info-row" style="border:none;"><span class="info-label">Avoid:</span> <span class="info-value alert-value" style="font-size: 0.85rem;">Grapefruit juice or specific vitamins that may interact</span></div>
            `;
            timelineContent.innerHTML = `<div class="timeline-item"><span class="time-label">Schedule</span><div class="time-action"><span>${title}</span> <span class="food-note">Take strictly according to your physician's schedule</span></div></div>`;
        }

        nearbyContent.innerHTML = getMockPharmacies(); 
        
        // Let the language script replace tags if needed
        if (typeof changeLanguage === 'function') {
            changeLanguage(localStorage.getItem('medassist_lang') || 'en');
        }
    }

    // --- Mock Data Generators ---
    function getMockPharmacies() {
        return `
            <div class="nearby-item">
                <div class="stock-badge" data-i18n="snap_stock_92">Stock: 92%</div>
                <div class="place-info">
                    <h4 data-i18n="snap_pharm_apollo">Apollo Pharmacy</h4>
                    <div class="place-meta" data-i18n="snap_pharm_apollo_meta">⭐ 4.8 • 0.3 miles away • Open Now</div>
                </div>
                <div class="place-action">
                    <a href="https://maps.google.com" target="_blank" class="btn btn-outline btn-micro" data-i18n="snap_btn_dir">Directions</a>
                </div>
            </div>
            <div class="nearby-item">
                <div class="stock-badge" style="background: rgba(234, 179, 8, 0.15); color: #eab308; border-color: rgba(234, 179, 8, 0.3);" data-i18n="snap_stock_65">Stock: 65%</div>
                <div class="place-info">
                    <h4 data-i18n="snap_pharm_wellness">Wellness Medicos</h4>
                    <div class="place-meta" data-i18n="snap_pharm_wellness_meta">⭐ 4.2 • 0.8 miles away • Open Now</div>
                </div>
                <div class="place-action">
                    <a href="https://maps.google.com" target="_blank" class="btn btn-outline btn-micro" data-i18n="snap_btn_dir">Directions</a>
                </div>
            </div>
        `;
    }

    function getMockHospitals() {
        return `
            <div class="nearby-item">
                <div class="stock-badge">Beds: 12 Open</div>
                <div class="place-info">
                    <h4>City General Hospital</h4>
                    <div class="place-meta">⭐ 4.6 • 1.2 miles away • 24/7 ER</div>
                    <div class="place-meta" style="color: var(--primary);">General Medicine, Pathology</div>
                </div>
                <div class="place-action">
                    <a href="https://maps.google.com" target="_blank" class="btn btn-outline btn-micro">Directions</a>
                </div>
            </div>
            <div class="nearby-item">
                <div class="stock-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">Wait: 45m</div>
                <div class="place-info">
                    <h4>Lifeline Diagnostic Center</h4>
                    <div class="place-meta">⭐ 4.5 • 2.5 miles away • Open till 9 PM</div>
                </div>
                <div class="place-action">
                    <a href="https://maps.google.com" target="_blank" class="btn btn-outline btn-micro">Directions</a>
                </div>
            </div>
        `;
    }
    
    function checkImageQuality(imgElement) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgElement.naturalWidth || imgElement.width || 100;
        tempCanvas.height = imgElement.naturalHeight || imgElement.height || 100;
        if (tempCanvas.width === 0 || tempCanvas.height === 0) return true;
        
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0, tempCanvas.width, tempCanvas.height);
        
        try {
            const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
            let totalBrightness = 0;
            let step = 4 * 10; // Check every 10th pixel for performance
            let sampled = 0;
            
            for (let i = 0; i < imageData.length; i += step) {
                // Perceptual brightness calculation
                let brightness = (imageData[i] * 299 + imageData[i+1] * 587 + imageData[i+2] * 114) / 1000;
                totalBrightness += brightness;
                sampled++;
            }
            
            let avgBrightness = totalBrightness / sampled;
            // If the average brightness is < 15 out of 255, it's essentially pitch black
            return avgBrightness >= 15;
        } catch(e) {
            console.error('Canvas error:', e);
            return true; // Fallback to assumed good if CORS blocks pixel reading
        }
    }
});
