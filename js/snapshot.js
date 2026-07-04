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

        if (!checkImageQuality(previewImage)) {
            renderErrorState();
            switchStep(stepResults);
            return;
        }

        const statusText = document.getElementById('processing-text');
        statusText.innerText = 'Initializing MedAssist AI Vision...';

        // Wait for DB
        await DB.loadPromise;

        setTimeout(() => { statusText.innerText = 'Reading document structure...'; }, 900);
        setTimeout(() => { statusText.innerText = 'Querying healthcare knowledge base...'; }, 2000);

        const docType = docTypeSelect ? docTypeSelect.value : 'prescription';

        let result;
        if (docType === 'lab_report') {
            result = DB_getRandomLabReport();
            setTimeout(() => {
                renderLabReportResult(result);
                switchStep(stepResults);
                statusText.innerText = 'Analyzing Document...';
            }, 3200);
        } else {
            // prescription or medicine_scan
            result = DB_getRandomPrescription();
            setTimeout(() => {
                renderPrescriptionResult(result);
                switchStep(stepResults);
                statusText.innerText = 'Analyzing Document...';
            }, 3200);
        }
    }

    // ── Dataset-Driven Prescription Result Renderer ──────────────────────────
    function renderPrescriptionResult(result) {
        const titleSpan    = document.getElementById('res-title');
        const mainContent  = document.getElementById('res-extracted-content');
        const safetyContent = document.getElementById('res-safety-content');
        const timelineCard = document.getElementById('card-timeline');
        const timelineContent = document.getElementById('res-timeline');
        const nearbyContent = document.getElementById('res-nearby');
        const dietCard     = document.getElementById('card-diet');
        const dietContent  = document.getElementById('res-diet-content');

        if (timelineCard) timelineCard.classList.remove('hidden');
        if (dietCard) dietCard.classList.remove('hidden');

        if (!result || !result.medicine) {
            renderErrorState(); return;
        }

        const { prescription: p, medicine: med, doctor: doc, disease: dis } = result;
        const rxRequired = med.requires_prescription === 'True';
        const trustBadge = rxRequired
            ? `<span style="font-size:0.7rem; background:rgba(255,165,0,0.1); color:#fbbf24; padding:2px 6px; border-radius:10px; margin-left:10px; border:1px solid rgba(251,191,36,0.3);">Prescription Required</span>`
            : `<span style="font-size:0.7rem; background:rgba(0,255,0,0.1); color:#4ade80; padding:2px 6px; border-radius:10px; margin-left:10px; border:1px solid rgba(74,222,128,0.3);">OTC Verified</span>`;

        titleSpan.innerHTML = `Prescription Analysis ${trustBadge}`;

        mainContent.innerHTML = `
            <div class="info-row"><span class="info-label">Prescribing Physician:</span> <span class="info-value">${doc ? doc.full_name : 'Unknown'} ${doc ? '(' + doc.specialization + ')' : ''}</span></div>
            <div class="info-row"><span class="info-label">Medication:</span> <span class="info-value highlight-value">${med.brand_name} (${med.generic_name} ${med.strength_mg}mg ${med.dosage_form})</span></div>
            <div class="info-row"><span class="info-label">Drug Class:</span> <span class="info-value">${med.drug_class}</span></div>
            <div class="info-row"><span class="info-label">Common Use:</span> <span class="info-value">${med.common_use}</span></div>
            <div class="info-row"><span class="info-label">Condition:</span> <span class="info-value">${dis ? dis.disease_name : 'General'}</span></div>
            <div class="info-row"><span class="info-label">Price:</span> <span class="info-value">₹${med.price_inr}</span></div>
        `;

        safetyContent.innerHTML = `
            <div class="info-row" style="border:none;">
                <span class="info-label">Dosage:</span>
                <span class="info-value alert-value" style="font-size:0.9rem;">${p.dosage_frequency} for ${p.duration} (Status: ${p.status})</span>
            </div>
            <div class="info-row" style="border:none;">
                <span class="info-label">Notes:</span>
                <span class="info-value" style="font-size:0.88rem;">${p.notes || 'Follow your physician\'s guidance.'}</span>
            </div>`;

        timelineContent.innerHTML = `
            <div class="timeline-item">
                <span class="time-label">Prescription Date</span>
                <div class="time-action"><span>${p.prescription_date}</span></div>
            </div>
            <div class="timeline-item">
                <span class="time-label">Frequency</span>
                <div class="time-action"><span>${med.brand_name}</span> <span class="food-note">${p.dosage_frequency}</span></div>
            </div>`;

        // Health tips from disease category
        const tips = DB_getHealthTips(dis ? dis.category : 'General', 2);
        dietContent.innerHTML = tips.map(t =>
            `<div class="info-row"><span class="info-label">Tip:</span> <span class="info-value" style="font-size:0.88rem;">${t.tip_text}</span></div>`
        ).join('') || '<div class="info-row"><span class="info-value">Maintain a balanced diet and follow your doctor\'s dietary advice.</span></div>';

        nearbyContent.innerHTML = getDatasetHospitals(dis ? dis.category : 'General');

        if (typeof changeLanguage === 'function') changeLanguage(localStorage.getItem('medassist_lang') || 'en');
    }

    // ── Dataset-Driven Lab Report Result Renderer ────────────────────────────
    function renderLabReportResult(result) {
        const titleSpan    = document.getElementById('res-title');
        const mainContent  = document.getElementById('res-extracted-content');
        const safetyContent = document.getElementById('res-safety-content');
        const timelineCard = document.getElementById('card-timeline');
        const nearbyContent = document.getElementById('res-nearby');
        const dietCard     = document.getElementById('card-diet');
        const dietContent  = document.getElementById('res-diet-content');
        const timelineContent = document.getElementById('res-timeline');

        if (timelineCard) timelineCard.classList.remove('hidden');
        if (dietCard) dietCard.classList.remove('hidden');

        if (!result || !result.report) { renderErrorState(); return; }

        const { report: lab, doctor: doc } = result;
        const isAbnormal = lab.status === 'Abnormal';
        const statusBadge = isAbnormal
            ? `<span style="font-size:0.7rem; background:rgba(255,165,0,0.1); color:#fbbf24; padding:2px 6px; border-radius:10px; margin-left:10px; border:1px solid rgba(251,191,36,0.3);">Review Required</span>`
            : `<span style="font-size:0.7rem; background:rgba(0,255,0,0.1); color:#4ade80; padding:2px 6px; border-radius:10px; margin-left:10px; border:1px solid rgba(74,222,128,0.3);">Normal</span>`;

        titleSpan.innerHTML = `Lab Report Analysis ${statusBadge}`;

        mainContent.innerHTML = `
            <div class="info-row"><span class="info-label">Test:</span> <span class="info-value highlight-value">${lab.test_name}</span></div>
            <div class="info-row"><span class="info-label">Result:</span> <span class="info-value ${isAbnormal ? 'alert-value' : ''}">${lab.result_value} ${lab.unit}</span></div>
            <div class="info-row"><span class="info-label">Reference Range:</span> <span class="info-value">${lab.reference_range} ${lab.unit}</span></div>
            <div class="info-row"><span class="info-label">Status:</span> <span class="info-value ${isAbnormal ? 'alert-value' : ''}">${lab.status}</span></div>
            <div class="info-row"><span class="info-label">Report Date:</span> <span class="info-value">${lab.report_date}</span></div>
            <div class="info-row"><span class="info-label">Ordered By:</span> <span class="info-value">${doc ? doc.full_name + ' (' + doc.specialization + ')' : 'Unknown'}</span></div>`;

        safetyContent.innerHTML = `
            <div class="info-row" style="border:none;">
                <span class="info-label">${isAbnormal ? 'Advisory:' : 'Result:'}</span>
                <span class="info-value ${isAbnormal ? 'alert-value' : ''}" style="font-size:0.9rem;">
                    ${isAbnormal ? 'Result is outside normal reference range. Schedule a follow-up with your physician promptly.' : 'All values are within normal clinical range. Continue regular health monitoring.'}
                </span>
            </div>`;

        timelineContent.innerHTML = `
            <div class="timeline-item">
                <span class="time-label">Report Date</span>
                <div class="time-action"><span>${lab.report_date}</span></div>
            </div>`;

        const tips = DB_getHealthTips('General', 2);
        dietContent.innerHTML = tips.map(t =>
            `<div class="info-row"><span class="info-label">Tip:</span> <span class="info-value" style="font-size:0.88rem;">${t.tip_text}</span></div>`
        ).join('');

        nearbyContent.innerHTML = getDatasetHospitals('General');
        if (typeof changeLanguage === 'function') changeLanguage(localStorage.getItem('medassist_lang') || 'en');
    }

    // ── Dataset Hospital Nearby Section ──────────────────────────────────────
    function getDatasetHospitals(category) {
        if (!DB.loaded) return '';
        const hospitals = DB_getHospitalsForCategory(category, 2);
        return hospitals.map(h => `
            <div class="nearby-item">
                <div class="stock-badge">⭐ ${h.rating}</div>
                <div class="place-info">
                    <h4>${h.hospital_name}</h4>
                    <div class="place-meta">${h.hospital_type} • ${h.city}, ${h.state}</div>
                    <div class="place-meta" style="color:var(--primary);">${h.specialty_focus}</div>
                </div>
                <div class="place-action">
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.hospital_name + ' ' + h.city)}" target="_blank" class="btn btn-outline btn-micro">Directions</a>
                </div>
            </div>`).join('');
    }

    // ── Error State ───────────────────────────────────────────────────────────
    function renderErrorState() {
        const titleSpan    = document.getElementById('res-title');
        const mainContent  = document.getElementById('res-extracted-content');
        const safetyContent = document.getElementById('res-safety-content');
        const timelineCard = document.getElementById('card-timeline');
        const nearbyContent = document.getElementById('res-nearby');
        const dietCard     = document.getElementById('card-diet');

        if (titleSpan) titleSpan.innerHTML = 'Scan Failed <span style="font-size:0.7rem; background:rgba(239,68,68,0.1); color:#ef4444; padding:2px 6px; border-radius:10px; margin-left:10px; border:1px solid rgba(239,68,68,0.3);">Error</span>';
        if (mainContent) mainContent.innerHTML = '<div class="info-row"><span class="info-label">Error:</span> <span class="info-value alert-value">Image quality too low or too dark.</span></div>';
        if (safetyContent) safetyContent.innerHTML = '<div class="info-row" style="border:none;"><span class="info-label">Resolution:</span> <span class="info-value">Please ensure good lighting and try again.</span></div>';
        if (timelineCard) timelineCard.classList.add('hidden');
        if (dietCard) dietCard.classList.add('hidden');
        if (nearbyContent) nearbyContent.innerHTML = '';
        if (typeof changeLanguage === 'function') changeLanguage(localStorage.getItem('medassist_lang') || 'en');
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
