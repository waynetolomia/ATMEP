document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
    loadKeys();
});

function switchTab(tab) {
    document.getElementById('records-section').classList.add('hidden');
    document.getElementById('keys-section').classList.add('hidden');
    document.getElementById('tab-records').classList.remove('active');
    document.getElementById('tab-keys').classList.remove('active');

    document.getElementById(`${tab}-section`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

function loadRecords() {
    const records = JSON.parse(localStorage.getItem('exam_records') || '[]');
    const tbody = document.getElementById('records-body');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No exam records found yet.</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(r => `
        <tr>
            <td>${r.date}</td>
            <td><strong>${r.studentId}</strong></td>
            <td>${r.studentName}</td>
            <td><strong>${r.score}</strong></td>
            <td>${r.percentage}</td>
            <td>${r.duration}</td>
        </tr>
    `).reverse().join(''); // Reverse to show newest first
}

function loadKeys() {
    const validKeys = JSON.parse(localStorage.getItem('valid_access_keys') || '[]');
    const usedKeys = JSON.parse(localStorage.getItem('used_keys') || '[]');
    const container = document.getElementById('keys-container');

    document.getElementById('total-keys').innerText = validKeys.length;
    document.getElementById('used-keys').innerText = usedKeys.length;
    document.getElementById('available-keys').innerText = validKeys.length - usedKeys.length;

    if (validKeys.length === 0) {
        container.innerHTML = '<p>No keys generated yet. Please visit the student login page once to automatically generate the key batch.</p>';
        return;
    }

    container.innerHTML = validKeys.map(key => {
        const isUsed = usedKeys.includes(key);
        const statusClass = isUsed ? 'key-used' : 'key-available';
        return `<div class="key-badge ${statusClass}">${key}</div>`;
    }).join('');
}

function clearRecords() {
    if (confirm('Are you sure you want to delete ALL student records? This cannot be undone.')) {
        localStorage.removeItem('exam_records');
        loadRecords();
    }
}

function generateMoreKeys() {
    let validKeys = JSON.parse(localStorage.getItem('valid_access_keys') || '[]');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < 10; i++) {
        let randomPart = '';
        for (let j = 0; j < 6; j++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        validKeys.push(`ATMEP${randomPart}`);
    }
    
    localStorage.setItem('valid_access_keys', JSON.stringify(validKeys));
    loadKeys(); // Refresh the UI
}

function exportToCSV() {
    const records = JSON.parse(localStorage.getItem('exam_records') || '[]');
    if (records.length === 0) {
        alert('No records available to export.');
        return;
    }

    const headers = ['Date', 'Student ID', 'Name', 'Score', 'Percentage', 'Duration'];
    const rows = records.map(r => 
        `"${r.date}","${r.studentId}","${r.studentName}","${r.score}","${r.percentage}","${r.duration}"`
    );
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = 'ATMEP_Student_Records.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}