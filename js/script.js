/* =========================================================================
   MEDASSIST 360 - CINEMATIC CANVAS ENGINES & UI INTERACTIONS
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {

    // =====================================================================
    // 1. CINEMATIC SCROLL CANVAS ANIMATION
    // =====================================================================
    const canvas = document.getElementById('cinematic-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const frameCount = 240;
        const currentFrame = index => `finalframes/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`;

        const images = [];
        let loadedImages = 0;
        let targetFrame = 0;
        let animatedFrame = 0;
        let lastRenderedVal = -1;

        // Resize Canvas and initialize
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            lastRenderedVal = -1; // force render
            render();
        }
        window.addEventListener('resize', resize);

        // Preload Images
        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                loadedImages++;
                // Render first frame as soon as it loads to prevent flash of black
                if (loadedImages === 1) { 
                    resize();
                }
            };
            images.push(img);
        }

        // Draw Image with Object-Fit: Cover style logic
        function render() {
            // Only redraw if the decimal value actually changed to save performance
            const currentVal = animatedFrame.toFixed(3);
            if (currentVal === lastRenderedVal) return;
            lastRenderedVal = currentVal;

            // Use modulo for infinite cinematic looping
            const safeFrame = Math.max(0, animatedFrame);
            const frame1 = Math.floor(safeFrame) % frameCount;
            const frame2 = (frame1 + 1) % frameCount;
            const fraction = safeFrame - Math.floor(safeFrame);
            
            if (images[frame1] && images[frame1].complete) {
                const img = images[frame1];
                const canvasRatio = canvas.width / canvas.height;
                const imgRatio = (img.width || 1920) / (img.height || 1080);
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

                if (canvasRatio > imgRatio) {
                    drawWidth = canvas.width;
                    drawHeight = canvas.width / imgRatio;
                    // Center vertically
                    offsetY = (canvas.height - drawHeight) / 2;
                } else {
                    drawHeight = canvas.height;
                    drawWidth = canvas.height * imgRatio;
                    // Center horizontally
                    offsetX = (canvas.width - drawWidth) / 2;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw Base Frame
                ctx.globalAlpha = 1;
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

                // Smoothly cross-fade to the Next Frame
                if (frame2 !== frame1 && fraction > 0.01 && images[frame2] && images[frame2].complete) {
                    ctx.globalAlpha = fraction;
                    ctx.drawImage(images[frame2], offsetX, offsetY, drawWidth, drawHeight);
                }
                
                // Reset Alpha
                ctx.globalAlpha = 1;
            }
        }

        // Calculate Target Frame based on scroll progress or auto-play
        const isLogin = document.querySelector('.login-section') !== null || document.querySelector('.checker-section') !== null;

        // Custom mousewheel listener for interactive background scrubbing on login page
        window.addEventListener('wheel', (e) => {
            if (isLogin) {
                // Instantly drives targetFrame forward/backward based on scroll wheel force!
                targetFrame += e.deltaY * 0.05; 
            }
        }, { passive: true });

        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
            
            if (maxScrollTop > 0) {
                const scrollFraction = scrollTop / maxScrollTop;
                // Target frame is proportional to scroll (0 to 239)
                targetFrame = Math.min(frameCount - 1, Math.max(0, scrollFraction * (frameCount - 1)));
            }
        }, { passive: true });

        // Smooth Lerp Animation Loop
        window.forceCanvasAutoplay = false; // Expose global toggle
        function animLoop() {
            if (isLogin || window.forceCanvasAutoplay) {
                // Constantly drives the auto-play forward smoothly but at a much quicker pace
                targetFrame += 0.35;
                if(targetFrame >= frameCount) {
                    targetFrame = targetFrame % frameCount;
                    animatedFrame = animatedFrame % frameCount;
                }
            }

            // Apply easing / inertia
            const diff = targetFrame - animatedFrame;
            
            if (Math.abs(diff) > 0.01) {
                animatedFrame += diff * 0.12; // Balanced inertia for buttery smooth transitions
                render();
            } else if (animatedFrame !== targetFrame) {
                animatedFrame = targetFrame; 
                render(); // render the final frame once
            }

            requestAnimationFrame(animLoop);
        }
        
        requestAnimationFrame(animLoop);
    }

    // =====================================================================
    // 2. NAVBAR & MOBILE MENU
    // =====================================================================
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });

    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const spans = mobileToggle.querySelectorAll('span');
        if (navLinks.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const spans = mobileToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });

    // =====================================================================
    // 3. SCROLL REVEAL ANIMATIONS
    // =====================================================================
    const revealElements = document.querySelectorAll('.fade-up');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    revealElements.forEach(el => revealObserver.observe(el));

    // =====================================================================
    // 4. PARALLAX EFFECT FOR HERO MOCKUP
    // =====================================================================
    const heroVisual = document.getElementById('hero-visual');
    const floatingDash = document.querySelector('.floating-dashboard');
    if (heroVisual && floatingDash) {
        heroVisual.addEventListener('mousemove', (e) => {
            const rect = heroVisual.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const xRot = (y / rect.height) * -15; 
            const yRot = (x / rect.width) * 15;   
            floatingDash.style.transform = `rotateX(${xRot}deg) rotateY(${yRot}deg) translateZ(20px)`;
            floatingDash.style.transition = 'transform 0.1s ease-out';
        });
        
        heroVisual.addEventListener('mousedown', (e) => {
            const rect = heroVisual.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const xRot = (y / rect.height) * -25; 
            const yRot = (x / rect.width) * 25;   
            floatingDash.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            floatingDash.style.transform = `rotateX(${xRot}deg) rotateY(${yRot}deg) translateZ(-40px) scale(0.95)`;
        });

        heroVisual.addEventListener('mouseup', (e) => {
            const rect = heroVisual.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const xRot = (y / rect.height) * -15; 
            const yRot = (x / rect.width) * 15;   
            floatingDash.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            floatingDash.style.transform = `rotateX(${xRot}deg) rotateY(${yRot}deg) translateZ(20px)`;
        });

        heroVisual.addEventListener('mouseleave', () => {
            floatingDash.style.transition = 'transform 0.5s ease-out';
            floatingDash.style.transform = 'rotateY(-10deg) rotateX(5deg)';
            setTimeout(() => {
                floatingDash.style.transform = '';
                floatingDash.style.transition = '';
            }, 500);
        });
    }

    // =====================================================================
    // 5. INTERACTIVE DEMO SIMULATION
    // =====================================================================
    const analyzeBtn = document.getElementById('analyze-btn');
    const demoInput = document.getElementById('demo-input');
    const uiWaiting = document.getElementById('demo-waiting');
    const uiLoading = document.getElementById('demo-loading');
    const uiResults = document.getElementById('demo-results');
    const resUrgency = document.getElementById('res-urgency');
    const resDept = document.getElementById('res-dept');
    const resSummary = document.getElementById('res-summary');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            const text = demoInput.value.trim();
            if (text.length < 5) {
                alert("Please describe a symptom first for the AI engine to analyze.");
                return;
            }

            uiWaiting.classList.add('hidden');
            uiResults.classList.add('hidden');
            uiLoading.classList.remove('hidden');
            analyzeBtn.disabled = true;
            analyzeBtn.innerText = "Analyzing...";

            // Simulate Network / AI Processing
            setTimeout(() => {
                const lowerText = text.toLowerCase();
                let urgency = "Level 3: Urgent (Monitor)";
                let dept = "General Urgent Care";
                let critical = false;
                
                if (lowerText.includes('chest') || lowerText.includes('pain') || lowerText.includes('heart')) {
                    urgency = "Level 1: Critical (Suspected Cardiac Event)";
                    dept = "Cardiology ER";
                    critical = true;
                } else if (lowerText.includes('speak') || lowerText.includes('weak') || lowerText.includes('face')) {
                    urgency = "Level 1: Critical (Suspected Stroke)";
                    dept = "Neurology / Stroke Center";
                    critical = true;
                } else if (lowerText.includes('bleed') || lowerText.includes('cut') || lowerText.includes('blood')) {
                    urgency = "Level 2: High (Active Bleeding)";
                    dept = "Trauma Center";
                    critical = true;
                }

                const urgencyCard = document.querySelector('.result-card.urgency');
                if (critical) {
                    urgencyCard.classList.add('critical');
                    urgencyCard.style.borderLeftColor = "";
                    urgencyCard.style.background = "";
                } else {
                    urgencyCard.classList.remove('critical');
                    urgencyCard.style.borderLeftColor = "#ffce00";
                    urgencyCard.querySelector('.r-value').style.color = "#ffce00";
                    urgencyCard.querySelector('.r-value').style.textShadow = "none";
                    urgencyCard.style.background = "rgba(255, 206, 0, 0.1)";
                }

                resUrgency.innerText = urgency;
                resDept.innerText = dept;
                resSummary.innerText = `Automated Summary: Patient reporting "${text.substring(0, 40)}...". Requesting immediate triage routing to ${dept}.`;

                uiLoading.classList.add('hidden');
                uiResults.classList.remove('hidden');
                analyzeBtn.disabled = false;
                analyzeBtn.innerText = "Analyze Symptoms";

                document.getElementById('demo-output-wrapper').scroll({ top: 100, behavior: 'smooth' });

            }, 2500);
        });
    }

    // =====================================================================
    // 6. VIEWPORT SIMULATION (DYNAMIC TOGGLE)
    // =====================================================================
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const mobileViewerOverlay = document.getElementById('mobile-viewer-overlay');
    const closeMobileViewer = document.getElementById('close-mobile-viewer');
    const mobileViewerFrame = document.getElementById('mobile-viewer-frame');

    let isForcedDesktop = false;

    // Initialize button text natively based on actual device width or if we are inside the iframe simulator
    if (viewToggleBtn) {
        if (window.innerWidth < 1024 || window.self !== window.top) {
            viewToggleBtn.innerText = "Desktop View";
        }
    }

    if (viewToggleBtn && mobileViewerOverlay && closeMobileViewer) {
        viewToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Ensure mobile links menu is closed
            const navLinks = document.getElementById('nav-links');
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }

            const currentText = viewToggleBtn.innerText.trim();

            if (currentText === "Mobile View") {
                // Requesting Mobile View
                if (window.innerWidth >= 1024 && !isForcedDesktop && window.self === window.top) {
                    // On Desktop natively, open Simulator
                    setTimeout(() => {
                        mobileViewerFrame.src = window.location.href; // Simulate current page via iframe
                        mobileViewerOverlay.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    }, 300);
                } else {
                    // Restoring native responsive viewport attributes on actual phone
                    let viewport = document.querySelector("meta[name=viewport]");
                    if (viewport) viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
                    isForcedDesktop = false;
                }
                viewToggleBtn.innerText = "Desktop View";
                
            } else {
                // Requesting Desktop View
                
                // 1. If executing INSIDE the iframe mockup, close the Parent's overlay seamlessly
                if (window.self !== window.top) {
                    const parentCloseBtn = window.parent.document.getElementById('close-mobile-viewer');
                    if (parentCloseBtn) parentCloseBtn.click();
                    return; // Stop execution inside the child frame
                }

                // 2. We are requesting Desktop View on a phone or small native window
                if (window.innerWidth < 1024 || isForcedDesktop) {
                    let viewport = document.querySelector("meta[name=viewport]");
                    if (viewport) viewport.setAttribute('content', 'width=1200'); // Force Desktop width
                    isForcedDesktop = true;
                }
                viewToggleBtn.innerText = "Mobile View";
            }
        });

        // Event for the Close Mockup button inside the overlay
        closeMobileViewer.addEventListener('click', () => {
            mobileViewerOverlay.classList.remove('active');
            setTimeout(() => {
                mobileViewerFrame.src = '';
                document.body.style.overflow = '';
            }, 400);
            
            // Revert terminology since we went back to Desktop on closing
            if (viewToggleBtn) {
                viewToggleBtn.innerText = "Mobile View";
            }
        });
    }

    // =====================================================================
    // 7. MEDICINE SEARCH LOGIC (SNAPSHOT ASSISTANT)
    // =====================================================================
    const docTypeSelect = document.getElementById('doc-type-select');
    const snapshotMainActions = document.getElementById('snapshot-main-actions');
    const medicineSearchPanel = document.getElementById('medicine-search-panel');
    const medicineSearchBtn = document.getElementById('medicine-search-btn');
    const medicineSearchInput = document.getElementById('medicine-search-input');
    const medicineSearchLoading = document.getElementById('medicine-search-loading');
    const medicineSearchResults = document.getElementById('medicine-search-results');

    // Custom Glass Dropdown Logic
    const customSelect = document.getElementById('custom-doc-select');
    if (customSelect) {
        const trigger = customSelect.querySelector('.select-trigger');
        const triggerText = customSelect.querySelector('.select-text');
        const optionsContainer = customSelect.querySelector('.custom-options');
        const options = customSelect.querySelectorAll('.custom-option');

        trigger.addEventListener('click', (e) => {
            optionsContainer.style.display = optionsContainer.style.display === 'flex' ? 'none' : 'flex';
            e.stopPropagation();
        });

        options.forEach(option => {
            option.addEventListener('click', () => {
                // Update text and classes
                triggerText.innerText = option.innerText;
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Update hidden select and trigger change
                if (docTypeSelect) {
                    docTypeSelect.value = option.getAttribute('data-value');
                    docTypeSelect.dispatchEvent(new Event('change'));
                }
                
                optionsContainer.style.display = 'none';
            });
        });

        document.addEventListener('click', () => {
            optionsContainer.style.display = 'none';
        });
    }

    if (docTypeSelect && snapshotMainActions && medicineSearchPanel) {
        docTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'medicine_search') {
                snapshotMainActions.style.display = 'none';
                medicineSearchPanel.style.display = 'block';
                medicineSearchResults.style.display = 'none';
                medicineSearchInput.value = '';
            } else {
                snapshotMainActions.style.display = 'flex';
                medicineSearchPanel.style.display = 'none';
            }
        });
    }

    if (medicineSearchBtn && medicineSearchInput) {
        medicineSearchBtn.addEventListener('click', async () => {
            const query = medicineSearchInput.value.trim();
            if (!query) {
                alert("Please enter a medicine name.");
                return;
            }

            // Hide results, show loading
            medicineSearchResults.style.display = 'none';
            medicineSearchLoading.style.display = 'block';
            medicineSearchBtn.disabled = true;

            try {
                // Real Background Search API Fetch (Mimicking Google Search Engine behavior)
                const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
                const searchRes = await fetch(searchUrl);
                let desc = "";
                let usage = "Usage instructions generally depend on patient age, weight, and medical history. Please refer to the packaging or consult a healthcare professional.";
                let details = "Consult your healthcare provider for full medical details and potential side-effects.";
                let isRecommended = true;
                let foundTitle = query;

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.query && searchData.query.search.length > 0) {
                        foundTitle = searchData.query.search[0].title; // Best match from the search engine!
                        
                        // Fetch the detail abstract of the top search result
                        const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(foundTitle)}`;
                        const pageRes = await fetch(pageUrl);
                        if (pageRes.ok) {
                            const pageData = await pageRes.json();
                            desc = pageData.extract; // The actual background search result details
                            
                            // Dynamic real-time heuristics based on actual description
                            const descLower = desc.toLowerCase();
                            if (descLower.includes("prescription") || descLower.includes("antibiotic") || descLower.includes("schedule") || descLower.includes("controlled") || descLower.includes("rx-only") || descLower.includes("doctor")) {
                                isRecommended = false;
                            }
                            if (descLower.includes("over-the-counter") || descLower.includes("otc") || descLower.includes("supplement")) {
                                isRecommended = true;
                            }
                        }
                    }
                }

                if (!desc) {
                    // Fallback if the search engine completely fails or returns zero results
                    const qLower = query.toLowerCase();
                    desc = `We couldn't find extensive public details for "${foundTitle}". It may be a specialized or newly registered medication.`;
                    
                    if (qLower.includes("antibiotic") || qLower.includes("amoxicillin") || qLower.includes("azithromycin")) {
                        isRecommended = false;
                        desc = "A prescription antibiotic used to treat various bacterial infections.";
                    } else if (qLower.includes("syrup") || qLower.includes("cough")) {
                        isRecommended = true;
                        desc = "Cough suppressant and expectorant syrup used for relief of dry cough and throat irritation.";
                    } else if (qLower.includes("insulin") || qLower.includes("metformin")) {
                        isRecommended = false;
                        desc = "Anti-diabetic medication used to control high blood sugar in patients with diabetes.";
                    }
                }

                // Update UI elements
                const nameEl = document.getElementById('med-res-title');
                const recEl = document.getElementById('med-res-rec');
                const descEl = document.getElementById('med-res-desc');
                const usageEl = document.getElementById('med-res-usage');
                const detailsEl = document.getElementById('med-res-details');

                nameEl.innerText = foundTitle.charAt(0).toUpperCase() + foundTitle.slice(1);
                
                if (isRecommended) {
                    recEl.innerHTML = '✅ Recommended for General Use (OTC)';
                    recEl.style.background = 'rgba(0, 255, 100, 0.1)';
                    recEl.style.color = '#00ff64';
                } else {
                    recEl.innerHTML = '⚠️ Prescription Required (Consult Doctor)';
                    recEl.style.background = 'rgba(255, 170, 0, 0.1)';
                    recEl.style.color = '#ffaa00';
                }

                descEl.innerText = desc;
                usageEl.innerText = usage;
                detailsEl.innerText = details;

            } catch (error) {
                console.error("Error fetching medicine data:", error);
                const descEl = document.getElementById('med-res-desc');
                if (descEl) descEl.innerText = "Failed to fetch medicine details. Please try again or check your internet connection.";
            } finally {
                medicineSearchLoading.style.display = 'none';
                medicineSearchBtn.disabled = false;
                medicineSearchResults.style.display = 'block';
            }
        });

        // Trigger search on Enter key
        medicineSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                medicineSearchBtn.click();
            }
        });
    }

});
