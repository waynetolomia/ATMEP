document.addEventListener('DOMContentLoaded', async () => {
    // Check if the user is authenticated as an admin
    if (sessionStorage.getItem('atmep_admin_auth') !== 'true') {
        window.location.replace('index.html');
        return;
    }

    await loadRecords();
    await syncKeysWithJSON();
    await loadKeys();
    setupSmoothVideoLoop();
});

async function syncKeysWithJSON() {
    try {
        const keysDoc = await db.collection('settings').doc('keys').get();
        if (!keysDoc.exists || !(keysDoc.data().valid_access_keys?.length)) {
            const response = await fetch('keys.json');
            if (response.ok) {
                const data = await response.json();
                await db.collection('settings').doc('keys').set({
                    valid_access_keys: data.access_keys || [],
                    used_keys: []
                }, { merge: true });
            }
        }
    } catch (error) {
        console.warn('Could not sync with keys.json:', error);
    }
}

function switchTab(tab) {
    document.getElementById('records-section').classList.add('hidden');
    document.getElementById('keys-section').classList.add('hidden');
    document.getElementById('tab-records').classList.remove('active');
    document.getElementById('tab-keys').classList.remove('active');

    document.getElementById(`${tab}-section`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

function adminLogout() {
    sessionStorage.removeItem('atmep_admin_auth');
    window.location.replace('index.html');
}

async function loadRecords() {
    const tbody = document.getElementById('records-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading records...</td></tr>';
    
    try {
        const snapshot = await db.collection('exam_records').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No exam records found yet.</td></tr>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const r = doc.data();
            html += `<tr>
                <td>${r.date}</td><td><strong>${r.studentId}</strong></td>
                <td>${r.studentName}</td><td><strong>${r.score}</strong></td>
                <td>${r.percentage}</td><td>${r.duration}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (error) {
        console.error("Error loading records:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading records.</td></tr>';
    }
}

async function loadKeys() {
    const container = document.getElementById('keys-container');
    container.innerHTML = '<p>Loading keys...</p>';
    try {
        const keysDoc = await db.collection('settings').doc('keys').get();
        const validKeys = keysDoc.exists ? (keysDoc.data().valid_access_keys || []) : [];
        const usedKeys = keysDoc.exists ? (keysDoc.data().used_keys || []) : [];

        document.getElementById('total-keys').innerText = validKeys.length;
        document.getElementById('used-keys').innerText = usedKeys.length;
        document.getElementById('available-keys').innerText = validKeys.length - usedKeys.length;

        if (validKeys.length === 0) {
            container.innerHTML = '<p>No keys generated yet.</p>';
            return;
        }

        container.innerHTML = validKeys.map(key => {
            const isUsed = usedKeys.includes(key);
            const statusClass = isUsed ? 'key-used' : 'key-available';
            return `<div class="key-badge ${statusClass}">${key}</div>`;
        }).join('');
    } catch (error) {
        console.error("Error loading keys:", error);
        container.innerHTML = '<p style="color:red;">Error loading keys.</p>';
    }
}

async function clearRecords() {
    if (confirm('Are you sure you want to delete ALL student records? This cannot be undone.')) {
        try {
            const snapshot = await db.collection('exam_records').get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            await loadRecords();
        } catch (error) {
            console.error("Error clearing records:", error);
        }
    }
}

async function generateMoreKeys() {
    try {
        const keysDoc = await db.collection('settings').doc('keys').get();
        let validKeys = keysDoc.exists ? (keysDoc.data().valid_access_keys || []) : [];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const startIndex = validKeys.length;
        
        for (let i = 0; i < 10; i++) {
            let randomPart = '';
            const currentIndex = startIndex + i;
            for (let j = 0; j < 6; j++) {
                let seed = currentIndex * 10 + j + 1;
                let x = Math.sin(seed) * 10000;
                let rand = x - Math.floor(x);
                randomPart += chars.charAt(Math.floor(rand * chars.length));
            }
            validKeys.push(`ATMEP${randomPart}`);
        }
        
        await db.collection('settings').doc('keys').set({ valid_access_keys: validKeys }, { merge: true });
        await loadKeys();
    } catch (error) {
        console.error("Error generating keys:", error);
    }
}

async function exportToCSV() {
    try {
        const snapshot = await db.collection('exam_records').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) {
            alert('No records available to export.');
            return;
        }
        const headers = ['Date', 'Student ID', 'Name', 'Score', 'Percentage', 'Duration'];
        const rows = snapshot.docs.map(doc => {
            const r = doc.data();
            return `"${r.date}","${r.studentId}","${r.studentName}","${r.score}","${r.percentage}","${r.duration}"`;
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ATMEP_Student_Records.csv';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Export error:", error);
    }
}

async function exportKeysToJSON() {
    try {
        const keysDoc = await db.collection('settings').doc('keys').get();
        const validKeys = keysDoc.exists ? (keysDoc.data().valid_access_keys || []) : [];
        if (validKeys.length === 0) {
            alert('No keys available to export.');
            return;
        }
        const dataStr = JSON.stringify({ access_keys: validKeys }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'keys.json';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Export keys error:", error);
    }
}

async function exportRecordsToJSON() {
    try {
        const snapshot = await db.collection('exam_records').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) {
            alert('No records available to export.');
            return;
        }
        const records = snapshot.docs.map(doc => doc.data());
        const dataStr = JSON.stringify({ exam_records: records }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ATMEP_Student_Records.json';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Export records error:", error);
    }
}

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