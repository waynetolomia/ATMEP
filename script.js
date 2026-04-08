let currentSection = 1;
const totalSections = 4;

// 1. Handle Login
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const studentId = document.getElementById('student-id').value;
    
    // Switch UI
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('exam-container').classList.remove('hidden');
    document.getElementById('student-display').innerText += studentId;
    
    startTimer(30); // Start a 30-minute timer
});

// 2. Navigation Logic
function goToSection(secNum) {
    // Hide all sections
    document.querySelectorAll('.exam-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    // Show selected
    document.getElementById(`sec-${secNum}`).classList.remove('hidden');
    document.querySelectorAll('.nav-tab')[secNum - 1].classList.add('active');
    
    currentSection = secNum;
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
            // Add submission logic here
        }
        seconds--;
    }, 1000);
}