# MedAssist 360

**MedAssist 360** is a premium, futuristic, AI-powered multilingual emergency triage, prescription understanding, and hospital navigation platform. Built as a world-class AI health product landing page for a hackathon-winning demo.

## Key Features
- **Intelligent Symptoms Checker**: Seamlessly embedded interactive symptom diagnosis featuring:
  - Real-time **Voice Input** utilizing the native Web Speech API.
  - Contextual AI analysis offering professional urgency categorization.
  - Dynamically filtering nearby medical facilities with integrated Hospital maps and real-time list of available specialist Doctors.
  - **Gender-based Doctor Filtering**: Strictly filters hospital results to show only preferred doctors based on gender selection (e.g., exclusively showing female doctors when "Prefer Female Doctor" is selected).
- **Snapshot Assistant**: Upload or capture medical documents, prescriptions, or medicine packaging for instant AI analysis. Integrated directly into the homepage.
- **Cinematic Scroll Animation**: A 300+ frame 3D object explosion rendered smoothly via a custom HTML5 `<canvas>` integration and interpolation (lerp).
- **Anti-gravity visual style** with elegant depth, layered motion, and ultra-minimal typography.
- **Glassmorphism** and deeply integrated CSS3 animations for a weightless, premium dark-mode user experience.
- Fully responsive on all devices without utilizing any external frameworks like Tailwind or Bootstrap. Pure HTML5, CSS3, and Vanilla JavaScript.

## Setup Instructions

1. Clone or download this repository.
2. Ensure the folder structure is intact:
   ```text
   medassist-360/
   │── index.html
   │── login.html
   │── register.html
   │── snapshot-assistant.html
   │── symptoms-checker.html
   │── css/
   │   ├── style.css
   │   └── snapshot.css
   │── js/
   │   ├── script.js
   │   ├── snapshot.js
   │   └── symptoms.js
   │── finalframes/      <-- Background tracking sequences
   │── assets/
   └── README.md
   ```
3. Open a local development server for the `Web Speech API` to correctly acquire microphone permissions:
   ```bash
   python3 -m http.server 8000
   ```
4. Access `http://localhost:8000/` in a modern browser (Google Chrome works best for the Web Speech API).

## Technologies Used
- **HTML5 & Web Speech API**: Semantic tags, accessible structure, `<canvas>` 2D context for image sequence, and microphone speech-to-text recognition.
- **CSS3**: Custom properties (Variables) for color theming (Deep Red/Black/Emerald), Grid, Flexbox, Keyframe Animations, Backdrop-filter for glassmorphism.
- **Vanilla JavaScript**: High-performance `requestAnimationFrame` scrubbing, mathematical lerp inertia, DOM Manipulation, and simulated AI clinical processing delays.

## Concept
The platform aims to solve critical gaps in emergency care:
- Symptom confusion
- Hard-to-read reports
- Delayed decisions
- Wrong hospital selection

Designed and built for startup impact.
