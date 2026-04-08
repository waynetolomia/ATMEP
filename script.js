let currentSection = 1;
const totalSections = 4;
let answers = {};
let studentId = '';
const questionsPerSection = 30;

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
                <div class="audio-controls" style="margin-bottom: 15px; padding: 10px; background-color: #f8fafc; border-radius: 5px; border: 1px solid #e6f0ff;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #001f3f;">Listen to the audio:</p>
                    <audio controls style="width: 100%;" data-audio-id="${q.id}">
                        <source src="${q.audio}" type="audio/mpeg">
                        <source src="${q.audio.replace('.mp3', '.wav')}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                    <p id="audio-limit-${q.id}" style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Click play to listen, then answer the question below.</p>
                </div>
            `;
        }

        let passageHtml = '';
        if (q.passage) {
            passageHtml = `
                <div class="reading-passage" style="text-align: justify;">
                    <strong>${sectionNum === 3 ? 'Reading Passage:' : 'Writing Passage:'}</strong>
                    <p>${q.passage}</p>
                </div>
            `;
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
        const bg = isAnswered ? '#4ade80' : '#ffffff';
        const color = isAnswered ? '#ffffff' : '#333333';
        const border = isAnswered ? '#4ade80' : '#cbd5e1';
        navHtml += `<button id="nav-btn-${q.id}" type="button" onclick="showQuestion('question-container-${q.id}')" style="background-color: ${bg}; color: ${color}; border: 1px solid ${border}; border-radius: 4px; padding: 5px 10px; cursor: pointer; min-width: 35px; font-weight: bold;">${index + 1}</button>`;
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
            buttons.forEach(btn => btn.style.outline = 'none');

            const activeBtn = document.getElementById(`nav-btn-${qId}`);
            if (activeBtn) {
                activeBtn.style.outline = '3px solid #3b82f6';
                activeBtn.style.outlineOffset = '2px';
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

            if (audioPlayCounts[audioId] >= 2) {
                audioEl.pause();
                audioEl.currentTime = 0;
                const statusEl = document.getElementById(`audio-limit-${audioId}`);
                if (statusEl) {
                    statusEl.textContent = 'Audio play limit reached.';
                }
                alert('This audio can only be played twice.');
                return;
            }

            audioPlayCounts[audioId] += 1;
            const statusEl = document.getElementById(`audio-limit-${audioId}`);
            if (statusEl) {
                if (audioPlayCounts[audioId] === 1) {
                    statusEl.textContent = 'Played 1 of 2 times.';
                } else if (audioPlayCounts[audioId] === 2) {
                    statusEl.textContent = 'Last allowed play. One more time only.';
                }
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
        const btn = document.getElementById(`nav-btn-${qId}`);
        if (btn) {
            btn.style.backgroundColor = '#4ade80';
            btn.style.color = '#ffffff';
            btn.style.border = '1px solid #4ade80';
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
    await generateQuestions();
    renderSection(1); // Render first section
});

// 1. Handle Login
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    studentId = document.getElementById('student-id').value;
    
    // Switch UI
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('exam-container').classList.remove('hidden');
    document.getElementById('student-display').innerText += studentId;
    
    loadAnswers(); // Load any previously saved answers
    startTimer(120); // Start a 120-minute timer
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
    let seconds = minutes * 60;
    const timerEl = document.getElementById('timer');
    
    const countdown = setInterval(() => {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        timerEl.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        
        if (seconds <= 0) {
            clearInterval(countdown);
            alert("Time is up! Your exam will be submitted automatically.");
            submitExam();
        }
        seconds--;
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

function submitExam() {
    collectAnswers();
    saveAnswers();
    
    let score = 0;
    let totalQuestions = 0;
    
    Object.values(sectionQuestions).forEach(section => {
        section.forEach(question => {
            totalQuestions++;
            if (answers[question.id] === question.correct) {
                score++;
            }
        });
    });
    
    const percentage = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
    const resultMessage = `Exam submitted successfully!\n\nStudent ID: ${studentId}\nScore: ${score}/${totalQuestions} (${percentage}%)\n\nThank you for completing the examination.`;
    
    alert(resultMessage);
    localStorage.removeItem('exam_answers');
    location.reload();
}