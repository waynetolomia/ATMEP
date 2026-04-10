let currentSection = 1;
const totalSections = 4;
let answers = {};
let studentId = '';
let studentName = '';
let currentAccessKey = '';
let examStartTime = null;
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

const audioPlayCounts = {};

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

// Generate questions for each section
async function generateQuestions() {
    await loadQuestions();

    sectionQuestions = {
        1: [],
        2: [],
        3: [],
        4: []
    };

    // Section 1: Listening
    questionsData.listening.forEach((q, index) => {
        const qNum = index + 1;
        sectionQuestions[1].push({
            id: `q${qNum}`,
            question: `Question ${qNum}: ${q.question}`,
            options: q.options,
            correct: q.correct,
            audio: q.audio
        });
    });

    // Section 2: Speaking
    questionsData.speaking.forEach((q, index) => {
        const qNum = index + 1 + questionsPerSection;
        sectionQuestions[2].push({
            id: `q${qNum}`,
            question: `Question ${qNum - questionsPerSection}: ${q.question}`,
            options: q.options,
            correct: q.correct
        });
    });

    // Section 3: Reading
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

    // Section 4: Writing
    questionsData.writing.forEach((q, index) => {
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
            audioHtml = `
                <div class="audio-controls" style="margin-bottom: 15px; padding: 10px; border-radius: 16px;">
                    <p style="margin: 0 0 10px 0; font-weight: bold;">Listen to the audio:</p>
                    <audio controls style="width: 100%;" data-audio-id="${q.id}">
                        <source src="${q.audio}" type="audio/mpeg">
                        <source src="${q.audio.replace('.mp3', '.wav')}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                    <p id="audio-limit-${q.id}" style="margin: 10px 0 0 0; font-size: 14px; color: var(--secondary);">Click play to listen, then answer the question below.</p>
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

        let nextBtnHtml = '';
        if (index < sectionData.length - 1) {
            const nextQ = sectionData[index + 1];
            nextBtnHtml = `<div style="text-align: right; margin-top: 15px;"><button type="button" class="btn-secondary" style="padding: 8px 16px; font-size: 13px;" onclick="showQuestion('question-container-${nextQ.id}')">Next Question ➔</button></div>`;
        }

        return `
        <div class="question" id="question-container-${q.id}" style="display: none;">
            ${audioHtml}
            ${passageHtml}
            <p>${q.question}</p>
            <div class="options">
                ${q.options.map((option, optIndex) => {
                    const value = String.fromCharCode(65 + optIndex);
                    const checked = answers[q.id] === value ? 'checked' : '';
                    return `<label><input type="radio" name="${q.id}" value="${value}" ${checked} onchange="markAnswered('${q.id}')"> ${option}</label><br>`;
                }).join('')}
            </div>
            ${nextBtnHtml}
        </div>
    `;
    }).join('');

    sectionEl.innerHTML = `<h3>Section ${sectionNum}: ${getSectionTitle(sectionNum)}</h3>${questionsHtml}`;
    setupAudioLimits(sectionNum);
    renderQuestionNav(sectionNum);

    if (sectionData.length > 0) {
        showQuestion(`question-container-${sectionData[0].id}`);
    }
}

function renderQuestionNav(sectionNum) {
    const navContainer = document.getElementById('question-nav-container');
    if (!navContainer) return;
    
    const sectionData = sectionQuestions[sectionNum] || [];
    let navHtml = '<strong style="display: flex; align-items: center;">Questions:</strong> ';
    
    sectionData.forEach((q, index) => {
        const isAnswered = !!answers[q.id];
        navHtml += `<button id="nav-btn-${q.id}" class="q-nav-btn ${isAnswered ? 'answered' : ''}" type="button" onclick="showQuestion('question-container-${q.id}')">${index + 1}</button>`;
    });
    
    navContainer.innerHTML = navHtml;
}

function showQuestion(id) {
    const el = document.getElementById(id);
    if (el) {
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
    }
}

function setupAudioLimits(sectionNum) {
    const sectionEl = document.getElementById(`sec-${sectionNum}`);
    const audioEls = sectionEl.querySelectorAll('audio[data-audio-id]');

    audioEls.forEach(audioEl => {
        const audioId = audioEl.dataset.audioId;

        audioEl.addEventListener('play', function () {
            audioPlayCounts[audioId] = audioPlayCounts[audioId] || 0;

            // Only count as a new play if starting from the beginning
            if (audioEl.currentTime === 0) {
                if (audioPlayCounts[audioId] >= 2) {
                    audioEl.pause();
                    const statusEl = document.getElementById(`audio-limit-${audioId}`);
                    if (statusEl) {
                        statusEl.textContent = 'Limit reached';
                        statusEl.style.color = '#ef4444';
                    }
                    const btn = document.getElementById(`play-btn-${audioId}`);
                    if (btn) btn.innerHTML = '▶';
                    alert('This audio can only be played twice.');
                    return;
                }
                audioPlayCounts[audioId] += 1;
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
            const btn = document.getElementById(`play-btn-${audioId}`);
            if (btn) btn.innerHTML = '▶';
            
            // Reset current time to 0 so next play counts as a new play
            audioEl.currentTime = 0;

            if (audioPlayCounts[audioId] >= 2) {
                const statusEl = document.getElementById(`audio-limit-${audioId}`);
                if (statusEl) {
                    statusEl.textContent = 'Limit reached';
                    statusEl.style.color = '#ef4444';
                }
            }
        });
    });
}

// --- Custom Audio Player Logic ---
function toggleAudio(id) {
    const audio = document.getElementById(`audio-${id}`);
    const btn = document.getElementById(`play-btn-${id}`);
    
    if (audio.paused) {
        if (audioPlayCounts[id] >= 2 && audio.currentTime === 0) {
            alert('This audio can only be played twice.');
            return;
        }
        audio.play();
        btn.innerHTML = '⏸'; // Pause icon
    } else {
        audio.pause();
        btn.innerHTML = '▶'; // Play icon
    }
}

function updateProgress(id) {
    const audio = document.getElementById(`audio-${id}`);
    const progress = document.getElementById(`progress-${id}`);
    const timeDisplay = document.getElementById(`time-${id}`);
    
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progress.style.width = `${percent}%`;
        timeDisplay.innerText = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
}

function setTotalTime(id) {
    const audio = document.getElementById(`audio-${id}`);
    const timeDisplay = document.getElementById(`time-${id}`);
    timeDisplay.innerText = `0:00 / ${formatTime(audio.duration)}`;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
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
        const btn = document.getElementById(`nav-btn-${qId}`);
        if (btn) {
            btn.classList.add('answered');
        }
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
        alert('Invalid Access Key! Please check and try again. (Make sure you use a valid ATMEP****** key)');
        return;
    }
    if (!isMasterKey && usedKeys.includes(enteredKey)) {
        alert('This Access Key has already been used to complete an exam.');
        return;
    }

    studentId = document.getElementById('student-id').value;
    studentName = document.getElementById('student-name').value;
    currentAccessKey = enteredKey;
    
    document.getElementById('login-container').classList.add('hidden');
    
    // Check if resuming an already started exam
    let savedStartTime = localStorage.getItem(`exam_start_${currentAccessKey}`);
    if (savedStartTime) {
        examStartTime = parseInt(savedStartTime, 10);
        document.getElementById('exam-container').classList.remove('hidden');
        document.getElementById('student-display').innerText = `Student: ${studentName} (${studentId})`;
        loadAnswers();
        const elapsedSeconds = (Date.now() - examStartTime) / 1000;
        const remainingMinutes = Math.max(0, (7200 - elapsedSeconds) / 60);
        startTimer(remainingMinutes); 
    } else {
        // Fresh exam, show introduction page first
        document.getElementById('headphone-test-container').classList.remove('hidden');
    }
});

// Proceed from Headphone Test to Intro
document.getElementById('proceed-to-intro-btn').addEventListener('click', function() {
    // Stop any audio that might be playing from the test
    const testAudio = document.getElementById('headphone-test-audio');
    if (testAudio) {
        testAudio.pause();
        testAudio.currentTime = 0;
    }
    document.getElementById('headphone-test-container').classList.add('hidden');
    document.getElementById('intro-container').classList.remove('hidden');
});

// Proceed to Exam from Intro Page
document.getElementById('proceed-btn').addEventListener('click', function() {
    examStartTime = Date.now();
    localStorage.setItem(`exam_start_${currentAccessKey}`, examStartTime);
    
    document.getElementById('intro-container').classList.add('hidden');
    document.getElementById('exam-container').classList.remove('hidden');
    document.getElementById('student-display').innerText = `Student: ${studentName} (${studentId})`;
    
    loadAnswers();
    startTimer(120); 
});

// 2. Navigation Logic
function goToSection(secNum) {
    collectAnswers(); // Save current answers before switching
    saveAnswers(); // Persist to localStorage
    
    // Hide all sections
    document.querySelectorAll('.exam-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    // Show selected and render questions
    document.getElementById(`sec-${secNum}`).classList.remove('hidden');
    document.querySelectorAll('.nav-tab')[secNum - 1].classList.add('active');
    
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
function startTimer(minutes) {
    let seconds = Math.floor(minutes * 60);
    const timerEl = document.getElementById('timer');
    
    function updateDisplay() {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        timerEl.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    updateDisplay(); // Call immediately to remove the static 120:00 text
    
    const countdown = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(countdown);
            timerEl.innerText = "0:00";
            alert("Time is up! Your exam will be submitted automatically.");
            submitExam();
        } else {
            updateDisplay();
        }
    }, 1000);
}

// 4. Submission Logic
document.getElementById('submit-btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
        collectAnswers(); // Collect final answers
        saveAnswers(); // Save final answers
        submitExam();
    }
});

async function submitExam() {
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
    } catch (error) {
        console.error("Firebase save error: ", error);
    }

    localStorage.removeItem('exam_answers');
    localStorage.removeItem(`exam_start_${currentAccessKey}`);

    // Display the Results UI
    document.getElementById('result-student-info').innerText = `${studentName} (${studentId})`;
    document.getElementById('score-overall').innerText = `${percentage}%`;
    document.getElementById('score-fraction').innerText = `${score} / ${totalQuestions} Correct | Time: ${durationStr}`;
    
    document.getElementById('exam-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
}

function downloadResult() {
    const resultCard = document.getElementById('result-card');
    const originalBg = resultCard.style.background;
    const originalBackdrop = resultCard.style.backdropFilter;
    
    // Solidify background for clean image capture
    resultCard.style.background = '#ffffff';
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