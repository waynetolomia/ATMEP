let currentSection = 1;
const totalSections = 4;
let answers = {};
let studentId = '';
let studentName = '';
let currentAccessKey = '';
let examStartTime = null;
let isSubmitting = false;
let examTimerInterval = null;
const questionsPerSection = 30;

let validAccessKeys = [];

// Load access keys from Firebase (fallback to keys.json for initialization)
async function loadAccessKeys() {
    try {
        const keysDoc = await db.collection('settings').doc('keys').get();
        if (keysDoc.exists) {
            validAccessKeys = keysDoc.data().valid_access_keys || [];
        } else {
            const response = await fetch('keys.json');
            if (response.ok) {
                const data = await response.json();
                validAccessKeys = data.access_keys || [];
                await db.collection('settings').doc('keys').set({ valid_access_keys: validAccessKeys, used_keys: [] });
            }
        }
    } catch (error) {
        console.warn('Could not load keys from Firebase:', error);
    }
}

// Raw JSON question data and converted section questions
let questionsData = {};
let sectionQuestions = {
    1: [],
    2: [],
    3: [],
    4: []
};

const audioPlayCounts = JSON.parse(localStorage.getItem('exam_audio_counts')) || {};

// Load questions from external JSON file
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        questionsData = await response.json();
        console.log('Questions loaded successfully');
    } catch (error) {
        console.error('Error loading questions:', error);
        questionsData = {
            listening: [],
            speaking: [],
            reading: [],
            writing: []
        };
    }
}

// Utility function to shuffle an array in-place (Fisher-Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Generate questions for each section
async function generateQuestions() {
    await loadQuestions();

    sectionQuestions = {
        1: [],
        2: [],
        3: [],
        4: []
    };

    // Section 1: Listening (Randomize all 30)
    const listeningQuestions = shuffle([...questionsData.listening]);
    listeningQuestions.forEach((q, index) => {
        const qNum = index + 1;
        sectionQuestions[1].push({
            id: `q${qNum}`,
            question: `Question ${qNum}: ${q.question}`,
            options: q.options,
            correct: q.correct,
            audio: q.audio
        });
    });

    // Section 2: Speaking (Randomize first 12)
    const speakingToShuffle = questionsData.speaking.slice(0, 12);
    const speakingToKeep = questionsData.speaking.slice(12);
    const finalSpeakingOrder = shuffle(speakingToShuffle).concat(speakingToKeep);
    finalSpeakingOrder.forEach((q, index) => {
        const qNum = index + 1 + questionsPerSection;
        sectionQuestions[2].push({
            id: `q${qNum}`,
            question: `Question ${qNum - questionsPerSection}: ${q.question}`,
            options: q.options,
            correct: q.correct,
            context: q.context
        });
    });

    // Section 3: Reading (No change)
    questionsData.reading.forEach((q, index) => {
        const qNum = index + 1 + (questionsPerSection * 2);
        sectionQuestions[3].push({
            id: `q${qNum}`,
            question: `Question ${qNum - (questionsPerSection * 2)}: ${q.question}`,
            options: q.options,
            correct: q.correct,
            passage: q.passage
        });
    });

    // Section 4: Writing (Randomize first 12)
    const writingToShuffle = questionsData.writing.slice(0, 12);
    const writingToKeep = questionsData.writing.slice(12);
    const finalWritingOrder = shuffle(writingToShuffle).concat(writingToKeep);
    finalWritingOrder.forEach((q, index) => {
        const qNum = index + 1 + (questionsPerSection * 3);
        sectionQuestions[4].push({
            id: `q${qNum}`,
            question: `Question ${qNum - (questionsPerSection * 3)}: ${q.question}`,
            options: q.options,
            correct: q.correct,
            passage: q.passage
        });
    });
}

// Render questions for a section
function renderSection(sectionNum) {
    const sectionEl = document.getElementById(`sec-${sectionNum}`);
    const sectionData = sectionQuestions[sectionNum] || [];

    if (!sectionData.length) {
        sectionEl.innerHTML = `<h3>Section ${sectionNum}: ${getSectionTitle(sectionNum)}</h3><p class="error-message">No questions available for this section. Please make sure the page is served over a local web server and that <code>questions.json</code> is reachable.</p>`;
        return;
    }

    const questionsHtml = sectionData.map((q, index) => {
        const questionNum = index + 1;
        let audioHtml = '';

        if (sectionNum === 1 && q.audio) {
            let audioStatusText = 'Click play to listen, then answer the question below.';
            let statusColor = 'var(--secondary)';
            let controlsAttr = 'controls';
            
            if (audioPlayCounts[q.id] === 1) {
                audioStatusText = '1 play remaining';
            } else if (audioPlayCounts[q.id] >= 2) {
                audioStatusText = 'Limit reached';
                statusColor = '#ef4444';
                controlsAttr = ''; // Remove controls entirely if limit reached
            }
            audioHtml = `
                <div class="audio-controls" style="margin: 0 auto 15px auto; padding: 10px; border-radius: 16px;">
                    <p style="margin: 0 0 10px 0; font-weight: bold;">Listen to the audio:</p>
                    <audio ${controlsAttr} style="width: 100%;" data-audio-id="${q.id}">
                        <source src="${q.audio}" type="audio/mpeg">
                        <source src="${q.audio.replace('.mp3', '.wav')}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                    <p id="audio-limit-${q.id}" style="margin: 10px 0 0 0; font-size: 14px; color: ${statusColor};">${audioStatusText}</p>
                </div>
            `;
        }

        let passageHtml = '';
        if (q.passage) {
            passageHtml = `
                <div class="reading-passage" style="text-align: justify; border-radius: 16px;">
                    <strong>${sectionNum === 3 ? 'Reading Passage:' : 'Writing Passage:'}</strong>
                    <p>${q.passage}</p>
                </div>
            `;
        }

        let contextHtml = '';
        if (q.context) {
            contextHtml = `
                <div class="reading-passage" style="text-align: justify; border-radius: 16px;">
                    <strong>Dialogue / Context:</strong>
                    <p>${q.context}</p>
                </div>
            `;
        }

        let nextBtnHtml = '';
        if (index < sectionData.length - 1) {
            const nextQ = sectionData[index + 1];
            nextBtnHtml = `<div style="text-align: right; margin-top: 15px;"><button type="button" class="btn-secondary" style="padding: 8px 16px; font-size: 13px;" onclick="handleNextQuestion('${q.id}', '${nextQ.id}')">Next Question ➔</button></div>`;
        }

        const optionsHtml = q.options.map((option, optIndex) => {
            const value = String.fromCharCode(65 + optIndex);
            const checked = answers[q.id] === value ? 'checked' : '';
            return `<label><input type="radio" name="${q.id}" value="${value}" ${checked} onchange="markAnswered('${q.id}')"> ${option}</label><br>`;
        }).join('');

        let innerContent = '';
        if (q.passage || q.context) {
            innerContent = `
            <div class="split-layout">
                <div class="split-left">
                    ${passageHtml}
                    ${contextHtml}
                </div>
                <div class="split-right">
                    <p>${q.question}</p>
                    <div class="options">
                        ${optionsHtml}
                    </div>
                </div>
            </div>
            `;
        } else {
            innerContent = `
            ${audioHtml}
            <p>${q.question}</p>
            <div class="options">
                ${optionsHtml}
            </div>
            `;
        }

        return `
        <div class="question" id="question-container-${q.id}" style="display: none;">
            ${innerContent}
            ${nextBtnHtml}
        </div>
    `;
    }).join('');

    sectionEl.innerHTML = `<h3>Section ${sectionNum}: ${getSectionTitle(sectionNum)}</h3>${questionsHtml}`;
    setupAudioLimits(sectionNum);
    renderQuestionNav(sectionNum);

    if (sectionData.length > 0) {
        let firstUnansweredIndex = sectionData.findIndex(q => !answers[q.id]);
        if (firstUnansweredIndex === -1) firstUnansweredIndex = 0; // If all answered, start at the first
        showQuestion(`question-container-${sectionData[firstUnansweredIndex].id}`);
    }
}

function renderQuestionNav(sectionNum) {
    const navContainer = document.getElementById('question-nav-container');
    if (!navContainer) return;
    
    const sectionData = sectionQuestions[sectionNum] || [];
    let navHtml = '<strong style="display: flex; align-items: center;">Questions:</strong> ';
    
    let firstUnansweredIndex = sectionData.findIndex(q => !answers[q.id]);
    if (firstUnansweredIndex === -1) firstUnansweredIndex = sectionData.length;

    sectionData.forEach((q, index) => {
        const isAnswered = !!answers[q.id];
        const isUnlocked = index <= firstUnansweredIndex;
        const disabledAttr = isUnlocked ? '' : 'disabled';
        const opacityStyle = isUnlocked ? '' : 'opacity: 0.5; cursor: not-allowed;';
        
        navHtml += `<button id="nav-btn-${q.id}" class="q-nav-btn ${isAnswered ? 'answered' : ''}" type="button" ${disabledAttr} style="${opacityStyle}" onclick="showQuestion('question-container-${q.id}')">${index + 1}</button>`;
    });
    
    navContainer.innerHTML = navHtml;

    // Re-apply active class to the visible question after re-rendering
    const visibleQId = getVisibleQuestionId();
    if (visibleQId) {
        const activeBtn = document.getElementById(`nav-btn-${visibleQId}`);
        if (activeBtn) activeBtn.classList.add('active-q');
    }
}

function getVisibleQuestionId() {
    const sectionEl = document.getElementById(`sec-${currentSection}`);
    if (!sectionEl) return null;
    const visibleQ = Array.from(sectionEl.querySelectorAll('.question')).find(q => q.style.display === 'block');
    return visibleQ ? visibleQ.id.replace('question-container-', '') : null;
}

function showQuestion(id) {
    const el = document.getElementById(id);
    if (el) {
        // Pause any currently playing audio when switching questions
        document.querySelectorAll('audio').forEach(audio => {
            if (!audio.paused) {
                audio.pause();
            }
        });

        const parentSection = el.closest('.exam-section');
        if (parentSection) {
            const questions = parentSection.querySelectorAll('.question');
            questions.forEach(q => q.style.display = 'none');
        }
        el.style.display = 'block';

        // Update active indicator in the question navigator
        const qId = id.replace('question-container-', '');
        const navContainer = document.getElementById('question-nav-container');
        if (navContainer) {
            const buttons = navContainer.querySelectorAll('button');
            buttons.forEach(btn => btn.classList.remove('active-q'));

            const activeBtn = document.getElementById(`nav-btn-${qId}`);
            if (activeBtn) {
                activeBtn.classList.add('active-q');
            }
        }

        // Expand container for split-layout questions
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            if (el.querySelector('.split-layout')) {
                mainContainer.classList.add('expanded-container');
            } else {
                mainContainer.classList.remove('expanded-container');
            }
        }
    }
}

function handleNextQuestion(currentId, nextId) {
    if (!answers[currentId]) {
        showCustomAlert("Action Required", "Please answer the current question before proceeding to the next one.");
        return;
    }
    showQuestion('question-container-' + nextId);
}

function setupAudioLimits(sectionNum) {
    const sectionEl = document.getElementById(`sec-${sectionNum}`);
    const audioEls = sectionEl.querySelectorAll('audio[data-audio-id^="q"]'); // Only apply limits to actual exam questions

    audioEls.forEach(audioEl => {
        const audioId = audioEl.dataset.audioId;

        let lastTime = 0;
        let isResetting = false;

        // Anti-skip logic
        audioEl.addEventListener('timeupdate', function () {
            if (!audioEl.seeking && !isResetting) {
                lastTime = audioEl.currentTime;
            }
        });

        audioEl.addEventListener('seeking', function () {
            if (isResetting) return;
            if (Math.abs(audioEl.currentTime - lastTime) > 0.5) {
                isResetting = true;
                audioEl.currentTime = lastTime;
                setTimeout(() => { isResetting = false; }, 50);
            }
        });

        audioEl.addEventListener('play', function () {
            audioPlayCounts[audioId] = audioPlayCounts[audioId] || 0;

            // Only count as a new play if starting from the beginning
            if (audioEl.currentTime === 0) {
                if (audioPlayCounts[audioId] >= 2) {
                    audioEl.pause();
                    audioEl.removeAttribute('controls');
                    const statusEl = document.getElementById(`audio-limit-${audioId}`);
                    if (statusEl) {
                        statusEl.textContent = 'Limit reached';
                        statusEl.style.color = '#ef4444';
                    }
                    showCustomAlert("Audio Limit Reached", "This audio can only be played twice.");
                    return;
                }
                audioPlayCounts[audioId] += 1;
                localStorage.setItem('exam_audio_counts', JSON.stringify(audioPlayCounts));
            }

            const statusEl = document.getElementById(`audio-limit-${audioId}`);
            if (statusEl) {
                if (audioPlayCounts[audioId] === 1) {
                    statusEl.textContent = '1 play remaining';
                } else if (audioPlayCounts[audioId] === 2) {
                    statusEl.textContent = 'Last play';
                    statusEl.style.color = '#f59e0b'; // Warning orange
                }
            }
        });

        audioEl.addEventListener('ended', function () {
            if (audioPlayCounts[audioId] >= 2) {
                const statusEl = document.getElementById(`audio-limit-${audioId}`);
                if (statusEl) {
                    statusEl.textContent = 'Limit reached';
                    statusEl.style.color = '#ef4444';
                }
                audioEl.removeAttribute('controls'); // Completely disable the player
            } else {
                // Reset current time to 0 so next play counts as a new play
                isResetting = true;
                audioEl.currentTime = 0;
                lastTime = 0;
                setTimeout(() => { isResetting = false; }, 50);
            }
        });
    });
}

function getSectionTitle(sectionNum) {
    const titles = {
        1: "Listening",
        2: "Speaking", 
        3: "Reading",
        4: "Writing"
    };
    return titles[sectionNum] || `Section ${sectionNum}`;
}

function markAnswered(qId) {
    const selected = document.querySelector(`input[name="${qId}"]:checked`);
    if (selected) {
        answers[qId] = selected.value;
        saveAnswers();
        renderQuestionNav(currentSection); // Re-render nav to instantly unlock the next question
        updateOverallProgress();
    }
}

// Load answers from localStorage if available
function loadAnswers() {
    const saved = localStorage.getItem('exam_answers');
    if (saved) {
        answers = JSON.parse(saved);
        // Restore selected radio buttons
        Object.keys(answers).forEach(question => {
            const radio = document.querySelector(`input[name="${question}"][value="${answers[question]}"]`);
            if (radio) radio.checked = true;
        });
        renderQuestionNav(currentSection);
    }
}

// Save answers to localStorage
function saveAnswers() {
    localStorage.setItem('exam_answers', JSON.stringify(answers));
}

// Collect answers from current section
function collectAnswers() {
    const currentSectionEl = document.getElementById(`sec-${currentSection}`);
    const radios = currentSectionEl.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
        answers[radio.name] = radio.value;
    });
}

// Initialize questions on page load
document.addEventListener('DOMContentLoaded', async function() {
    await loadAccessKeys();
    await generateQuestions();
    renderSection(1); // Render first section
    setupSmoothVideoLoop();
    setupTutorialAudio(); // NEW: Setup tutorial audio separately
});

// Toggle Password Visibility
const togglePasswordBtn = document.getElementById('toggle-password');
const accessKeyInput = document.getElementById('access-key');
if (togglePasswordBtn && accessKeyInput) {
    togglePasswordBtn.addEventListener('click', function() {
        const type = accessKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        accessKeyInput.setAttribute('type', type);
        // Switch between eye and eye-slash/monkey emoji
        this.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

// 1. Handle Login
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const enteredKey = document.getElementById('access-key').value.trim();
    let usedKeys = [];
    try {
        const keysDoc = await db.collection('settings').doc('keys').get();
        if (keysDoc.exists) {
            usedKeys = keysDoc.data().used_keys || [];
            validAccessKeys = keysDoc.data().valid_access_keys || [];
        }
    } catch (error) {
        console.error('Error checking keys on login:', error);
    }

    const inputStudentId = document.getElementById('student-id').value.trim();
    const inputStudentName = document.getElementById('student-name').value.trim();

    // Check for admin credentials
    if (inputStudentId === 'admin01' && inputStudentName === 'admin' && enteredKey === 'admin0701') {
        sessionStorage.setItem('atmep_admin_auth', 'true');
        window.location.href = 'admin.html';
        return;
    }

    const isMasterKey = (enteredKey === 'ATMEPMASTER');

    if (!isMasterKey && !validAccessKeys.includes(enteredKey)) {
        showCustomAlert('Login Failed', 'Invalid Access Key! Please check and try again. (Make sure you use a valid ATMEP****** key)');
        return;
    }
    if (!isMasterKey && usedKeys.includes(enteredKey)) {
        showCustomAlert('Login Failed', 'This Access Key has already been used to complete an exam.');
        return;
    }

    studentId = inputStudentId;
    studentName = inputStudentName;
    currentAccessKey = enteredKey;
    
    document.getElementById('login-container').classList.add('hidden');
    
    // Check if resuming an already started exam
    let savedStartTime = localStorage.getItem(`exam_start_${currentAccessKey}`);
    if (savedStartTime) {
        examStartTime = parseInt(savedStartTime, 10);
        document.getElementById('exam-container').classList.remove('hidden');
        document.getElementById('student-display').innerText = `Student: ${studentName} (${studentId})`;
        loadAnswers();
        document.getElementById('progress-sidebar').classList.remove('hidden');
        updateOverallProgress();
        startTimer(); 
    } else {
        // Fresh exam, show introduction page first
        
        // Prevent data leak: Clear any leftover answers/audio counts from a previous unfinished user
        localStorage.removeItem('exam_answers');
        localStorage.removeItem('exam_audio_counts');
        answers = {};
        for (let key in audioPlayCounts) delete audioPlayCounts[key];

        document.getElementById('headphone-test-container').classList.remove('hidden');
    }
});

// Proceed from Headphone Test to Intro
document.getElementById('proceed-to-tutorial-btn').addEventListener('click', function() {
    // Stop any audio that might be playing from the test
    const testAudio = document.getElementById('headphone-test-audio');
    if (testAudio) {
        testAudio.pause();
        testAudio.currentTime = 0;
    }
    document.getElementById('headphone-test-container').classList.add('hidden');
    document.getElementById('tutorial-container').classList.remove('hidden');
});

// NEW: Proceed from Tutorial to Intro Page
document.getElementById('proceed-from-tutorial-btn').addEventListener('click', function() {
    // Stop any audio that might be playing from the tutorial
    document.querySelectorAll('#tutorial-container audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    document.getElementById('tutorial-container').classList.add('hidden'); // Hide the tutorial page
    document.getElementById('intro-container').classList.remove('hidden');
});

// Proceed to Exam from Intro Page
document.getElementById('proceed-btn').addEventListener('click', function() {
    examStartTime = Date.now();
    localStorage.setItem(`exam_start_${currentAccessKey}`, examStartTime);
    
    document.getElementById('intro-container').classList.add('hidden');
    document.getElementById('exam-container').classList.remove('hidden');
    document.getElementById('student-display').innerText = `Student: ${studentName} (${studentId})`;
    
    document.getElementById('progress-sidebar').classList.remove('hidden');
    updateOverallProgress();
    loadAnswers();
    startTimer(); 
});

// 2. Navigation Logic
function goToSection(secNum) {
    collectAnswers(); // Save current answers before switching
    saveAnswers(); // Persist to localStorage
    
    // Pause any currently playing audio when switching sections
    document.querySelectorAll('audio').forEach(audio => {
        if (!audio.paused) audio.pause();
    });

    // Hide all sections
    document.querySelectorAll('.exam-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('#exam-container .nav-tab').forEach(t => t.classList.remove('active'));

    // Show selected and render questions
    document.getElementById(`sec-${secNum}`).classList.remove('hidden');
    document.querySelectorAll('#exam-container .nav-tab')[secNum - 1].classList.add('active');
    
    currentSection = secNum;
    renderSection(secNum); // Render questions for this section
    updateButtons();
}

function move(step) {
    let target = currentSection + step;
    if (target >= 1 && target <= totalSections) {
        goToSection(target);
    }
}

function updateButtons() {
    // Show/Hide Previous button
    document.getElementById('prev-btn').classList.toggle('hidden', currentSection === 1);
    
    // Switch between Next and Submit button
    if (currentSection === totalSections) {
        document.getElementById('next-btn').classList.add('hidden');
        document.getElementById('submit-btn').classList.remove('hidden');
    } else {
        document.getElementById('next-btn').classList.remove('hidden');
        document.getElementById('submit-btn').classList.add('hidden');
    }
}

// 3. Simple Timer Logic
function startTimer() {
    const timerEl = document.getElementById('timer');
    const durationMs = 120 * 60 * 1000; // 120 minutes
    
    function updateDisplay(remainingMs) {
        let totalSeconds = Math.floor(remainingMs / 1000);
        let m = Math.floor(totalSeconds / 60);
        let s = totalSeconds % 60;
        timerEl.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function checkTime() {
        if (isSubmitting) return;
        const now = Date.now();
        const elapsedMs = now - examStartTime;
        const remainingMs = durationMs - elapsedMs;

        if (remainingMs <= 0) {
            if (examTimerInterval) clearInterval(examTimerInterval);
            timerEl.innerText = "0:00";
            document.getElementById('exam-container').classList.add('hidden'); // Hide exam immediately
            submitExam(); // Submit immediately to prevent data loss if student walks away
            showCustomAlert("Time is Up!", "Your exam time has expired. It has been submitted automatically.");
        } else {
            updateDisplay(remainingMs);
        }
    }

    checkTime(); // Call immediately to initialize
    
    if (examTimerInterval) clearInterval(examTimerInterval);
    examTimerInterval = setInterval(checkTime, 1000);
}

// Add Visibility Change Listener to catch up immediately when returning to a background tab
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && examStartTime && !isSubmitting) {
        const elapsedMs = Date.now() - examStartTime;
        if (elapsedMs >= 120 * 60 * 1000) {
            if (examTimerInterval) clearInterval(examTimerInterval);
            document.getElementById('exam-container').classList.add('hidden');
            submitExam();
            showCustomAlert("Time is Up!", "Your exam time has expired. It has been submitted automatically.");
        }
    }
});

// 4. Submission Logic
document.getElementById('submit-btn').addEventListener('click', function() {
    collectAnswers(); // Collect final answers
    saveAnswers(); // Save final answers
    
    let missingInfo = [];
    Object.keys(sectionQuestions).forEach(secKey => {
        let missingCount = 0;
        sectionQuestions[secKey].forEach(question => {
            if (!answers[question.id]) {
                missingCount++;
            }
        });
        if (missingCount > 0) {
            missingInfo.push(`- ${getSectionTitle(secKey)}: Missed ${missingCount} item(s)`);
        }
    });

    showSubmitModal(missingInfo);
});

function showSubmitModal(missingInfo) {
    const existingModal = document.getElementById('submit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'submit-modal';
    modalOverlay.className = 'modal-overlay';

    let contentHtml = '<h3 style="margin-top: 0; color: #f8fafc;">Confirm Submission</h3>';
    if (missingInfo.length > 0) {
        contentHtml += '<div class="warning-text"><strong>⚠️ WARNING! You have unanswered questions:</strong><br><br>';
        contentHtml += missingInfo.join('<br>') + '</div>';
    }
    contentHtml += '<p style="color: #cbd5e1;">Are you sure you want to submit your exam? This action cannot be undone.</p>';
    contentHtml += `
        <div class="modal-buttons">
            <button id="modal-cancel-btn" class="btn-secondary">Cancel</button>
            <button id="modal-confirm-btn" class="btn-success">Submit Exam</button>
        </div>
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content card';
    modalContent.innerHTML = contentHtml;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    document.getElementById('modal-cancel-btn').addEventListener('click', () => modalOverlay.remove());
    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
        modalOverlay.remove();
        submitExam();
    });
}

async function submitExam() {
    if (isSubmitting) return;
    isSubmitting = true;

    // Pause any playing audio to prevent it from continuing on the results screen
    document.querySelectorAll('audio').forEach(audio => {
        if (!audio.paused) audio.pause();
    });

    collectAnswers();
    saveAnswers();
    
    let score = 0;
    let totalQuestions = 0;
    let sectionScores = { 1: { s: 0, t: 0 }, 2: { s: 0, t: 0 }, 3: { s: 0, t: 0 }, 4: { s: 0, t: 0 } };
    
    Object.keys(sectionQuestions).forEach(secKey => {
        sectionQuestions[secKey].forEach(question => {
            totalQuestions++;
            sectionScores[secKey].t++;
            if (answers[question.id] === question.correct) {
                score++;
                sectionScores[secKey].s++;
            }
        });
    });

    // Update individual section score UI
    for (let i = 1; i <= 4; i++) {
        const secPerc = sectionScores[i].t ? Math.round((sectionScores[i].s / sectionScores[i].t) * 100) : 0;
        document.getElementById(`score-sec-${i}`).innerText = `${secPerc}%`;
    }
    
    // Calculate time duration
    const durationMs = Date.now() - examStartTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const durationStr = `${minutes}m ${seconds}s`;

    const percentage = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
    
    // 1. Save exam record to history
    const examRecord = {
        studentId,
        studentName,
        accessKey: currentAccessKey,
        score: `${score}/${totalQuestions}`,
        percentage: `${percentage}%`,
        duration: durationStr,
        date: new Date().toLocaleString(),
        timestamp: Date.now() // added for reliable sorting in admin view
    };
    try {
        await db.collection('exam_records').add(examRecord);
        
        if (currentAccessKey !== 'ATMEPMASTER') {
            await db.collection('settings').doc('keys').update({
                used_keys: firebase.firestore.FieldValue.arrayUnion(currentAccessKey)
            });
        }
        
        // Clear local storage ONLY on successful submission to prevent data loss
        localStorage.removeItem('exam_answers');
        localStorage.removeItem(`exam_start_${currentAccessKey}`);
        localStorage.removeItem('exam_audio_counts');
    } catch (error) {
        console.error("Firebase save error: ", error);
        showCustomAlert("Network Error", "Failed to sync results to the server. Your answers are safely backed up locally. Please notify the invigilator.");
    }

    // Display the Results UI
    document.getElementById('result-student-info').innerText = `${studentName} (${studentId})`;
    document.getElementById('score-overall').innerText = `${percentage}%`;
    document.getElementById('score-fraction').innerText = `${score} / ${totalQuestions} Correct | Time: ${durationStr}`;
    
    document.getElementById('exam-container').classList.add('hidden');
    document.getElementById('progress-sidebar').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
}

function downloadResult() {
    const resultCard = document.getElementById('result-card');
    const originalBg = resultCard.style.background;
    const originalBackdrop = resultCard.style.backdropFilter;
    
    // Solidify background for clean image capture
    resultCard.style.background = '#0f172a'; // Use dark solid background for text contrast
    resultCard.style.backdropFilter = 'none';
    
    html2canvas(resultCard, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `ATMEP_Result_${studentId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Restore glass styling
        resultCard.style.background = originalBg;
        resultCard.style.backdropFilter = originalBackdrop;
    });
}

// --- Basic Anti-Cheat Measures ---
document.addEventListener('contextmenu', e => e.preventDefault()); // Disable right-click
document.addEventListener('copy', e => e.preventDefault()); // Disable copying text
document.addEventListener('selectstart', e => e.preventDefault()); // Disable text highlighting

// --- Smooth Background Video Loop ---
function setupSmoothVideoLoop() {
    const vid1 = document.getElementById('bg-vid-1');
    const vid2 = document.getElementById('bg-vid-2');
    if (!vid1 || !vid2) return;

    let activeVid = vid1;
    let inactiveVid = vid2;
    const crossfadeDuration = 1.5; // 1.5 seconds crossfade

    function checkTime() {
        if (activeVid.duration && activeVid.currentTime >= activeVid.duration - crossfadeDuration) {
            inactiveVid.currentTime = 0;
            inactiveVid.play();
            inactiveVid.classList.add('active');
            activeVid.classList.remove('active');
            
            const temp = activeVid;
            activeVid = inactiveVid;
            inactiveVid = temp;
        }
        requestAnimationFrame(checkTime);
    }
    
    requestAnimationFrame(checkTime);
}

// Update overall exam progress UI
function updateOverallProgress() {
    let total = 0;
    for (let sec in sectionQuestions) {
        total += sectionQuestions[sec].length;
    }
    if (total === 0) total = 120;
    
    let answeredCount = Object.keys(answers).length;
    let percentage = Math.min(100, Math.round((answeredCount / total) * 100));
    
    const fillEl = document.getElementById('progress-fill-vertical');
    const pctEl = document.getElementById('progress-percentage-text');
    const statsEl = document.getElementById('progress-stats-text');
    
    if (fillEl) fillEl.style.height = `${percentage}%`;
    if (pctEl) pctEl.innerText = `${percentage}%`;
    if (statsEl) statsEl.innerText = `${answeredCount}/${total}`;
}

// Setup tutorial audio to prevent ReferenceError
function setupTutorialAudio() {
    const tutorialAudios = document.querySelectorAll('#tutorial-container audio, #headphone-test-audio');
    tutorialAudios.forEach(audioEl => {
        let lastTime = 0;
        let isResetting = false;

        audioEl.addEventListener('timeupdate', function () {
            if (!audioEl.seeking && !isResetting) {
                lastTime = audioEl.currentTime;
            }
        });

        audioEl.addEventListener('seeking', function () {
            if (isResetting) return;
            if (Math.abs(audioEl.currentTime - lastTime) > 0.5) {
                isResetting = true;
                audioEl.currentTime = lastTime;
                setTimeout(() => { isResetting = false; }, 50);
            }
        });

        audioEl.addEventListener('ended', function () {
            isResetting = true;
            audioEl.currentTime = 0;
            lastTime = 0;
            setTimeout(() => { isResetting = false; }, 50);
        });
    });
}

// Check answers in the tutorial section
function checkTutorialAnswer(radioElement, correctValue) {
    const container = radioElement.closest('.tutorial-section-example');
    let feedbackEl = container.querySelector('.tutorial-feedback');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.className = 'tutorial-feedback';
        feedbackEl.style.marginTop = '10px';
        feedbackEl.style.fontWeight = 'bold';
        container.appendChild(feedbackEl);
    }

    if (radioElement.value === correctValue) {
        feedbackEl.textContent = '✅ Correct!';
        feedbackEl.style.color = '#10b981'; // Emerald green
    } else {
        feedbackEl.textContent = '❌ Incorrect. Try again!';
        feedbackEl.style.color = '#ef4444'; // Red
    }
}

// Disable audio skipping via keyboard globally
document.addEventListener('keydown', function(e) {
    if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === 'audio') {
        if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
        }
    }
}, true);

// --- Custom Alert Popup ---
function showCustomAlert(title, message, callback = null) {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-modal';
    modalOverlay.className = 'modal-overlay';

    let contentHtml = `<h3 style="margin-top: 0; color: #f8fafc;">${title}</h3>`;
    contentHtml += `<div class="warning-text"><strong>⚠️ ${message}</strong></div>`;
    contentHtml += `
        <div class="modal-buttons">
            <button id="modal-ok-btn" class="btn-primary">OK</button>
        </div>
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content card';
    modalContent.innerHTML = contentHtml;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    document.getElementById('modal-ok-btn').addEventListener('click', () => {
        modalOverlay.remove();
        if (callback) callback();
    });
}