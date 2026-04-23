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
    tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">Loading records...</td></tr>';
    
    // Inject bulk actions UI dynamically
    let actionsContainer = document.getElementById('bulk-actions-container');
    if (!actionsContainer) {
        const table = tbody.closest('table');
        if (table) {
            actionsContainer = document.createElement('div');
            actionsContainer.id = 'bulk-actions-container';
            actionsContainer.style.marginBottom = '15px';
            actionsContainer.style.display = 'flex';
            actionsContainer.style.gap = '10px';
            actionsContainer.style.alignItems = 'center';
            actionsContainer.style.flexWrap = 'wrap';
            actionsContainer.innerHTML = `
                <input type="checkbox" id="select-all-cb" style="margin-right: 5px; transform: scale(1.2); cursor: pointer;" onchange="toggleSelectAll()">
                <label for="select-all-cb" style="margin-right: 15px; cursor: pointer; color: #f8fafc; font-weight: bold;">Select All</label>
                <button class="btn-secondary" style="padding: 8px 15px; font-size: 13px;" onclick="exportSelectedCSV()">Export Selected (CSV)</button>
                <button class="btn-secondary" style="padding: 8px 15px; font-size: 13px;" onclick="exportSelectedJSON()">Export Selected (JSON)</button>
                <button class="btn-secondary" style="padding: 8px 15px; font-size: 13px; background: #dc2626;" onclick="deleteSelected()">Delete Selected</button>
            `;
            table.parentNode.insertBefore(actionsContainer, table);
            
            const theadRow = table.querySelector('thead tr');
            if (theadRow && !document.getElementById('th-select')) {
                const th = document.createElement('th');
                th.id = 'th-select';
                th.innerText = 'Select';
                theadRow.insertBefore(th, theadRow.firstChild);
            }
        }
    }

    try {
        const snapshot = await db.collection('exam_records').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">No exam records found yet.</td></tr>';
            if (actionsContainer) actionsContainer.style.display = 'none';
            return;
        }
        
        if (actionsContainer) actionsContainer.style.display = 'flex';
        
        let html = '';
        snapshot.forEach(doc => {
            const r = doc.data();
            const recordData = encodeURIComponent(JSON.stringify(r));
            const secScores = r.sectionScores || {};
            html += `<tr>
                <td><input type="checkbox" class="record-chk" value="${doc.id}" data-record="${recordData}" style="transform: scale(1.2); cursor: pointer;"></td>
                <td>${r.date}</td><td><strong>${r.studentId}</strong></td>
                <td>${r.studentName}</td><td>${r.accessKey || 'N/A'}</td><td><strong>${r.score}</strong></td>
                <td>${r.percentage}</td>
                <td>${secScores.listening || 'N/A'}</td>
                <td>${secScores.speaking || 'N/A'}</td>
                <td>${secScores.reading || 'N/A'}</td>
                <td>${secScores.writing || 'N/A'}</td>
                <td>${r.duration}</td>
            </tr>`;
        });
        tbody.innerHTML = html;

        const selectAllCb = document.getElementById('select-all-cb');
        if (selectAllCb) selectAllCb.checked = false;
    } catch (error) {
        console.error("Error loading records:", error);
        tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Error loading records.</td></tr>';
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
    showCustomConfirm('Delete All Records', 'Are you sure you want to delete ALL student records? This cannot be undone.', async () => {
        try {
            const snapshot = await db.collection('exam_records').get();
            const batches = [];
            let currentBatch = db.batch();
            let operationCount = 0;

            snapshot.forEach(doc => {
                currentBatch.delete(doc.ref);
                operationCount++;
                if (operationCount === 500) {
                    batches.push(currentBatch.commit());
                    currentBatch = db.batch();
                    operationCount = 0;
                }
            });

            if (operationCount > 0) batches.push(currentBatch.commit());

            await Promise.all(batches);
            await loadRecords();
        } catch (error) {
            console.error("Error clearing records:", error);
            showCustomAlert('Error', 'Failed to clear records.');
        }
    });
}

async function generateMoreKeys() {
    try {
        const keysDoc = await db.collection('settings').doc('keys').get();
        let validKeys = keysDoc.exists ? (keysDoc.data().valid_access_keys || []) : [];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        let newKeysCount = 0;
        while (newKeysCount < 10) {
            let randomPart = '';
            for (let j = 0; j < 6; j++) {
                randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const newKey = `ATMEP${randomPart}`;
            if (!validKeys.includes(newKey)) {
                validKeys.push(newKey);
                newKeysCount++;
            }
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
            showCustomAlert('Export Failed', 'No records available to export.');
            return;
        }
        const headers = ['Date', 'Student ID', 'Name', 'Access Key', 'Score', 'Percentage', 'Listening', 'Speaking', 'Reading', 'Writing', 'Duration'];
        const rows = snapshot.docs.map(doc => {
            const r = doc.data();
            const safeName = (r.studentName || '').replace(/"/g, '""');
            const secScores = r.sectionScores || {};
            return `"${r.date}","${r.studentId}","${safeName}","${r.accessKey || 'N/A'}","${r.score}","${r.percentage}","${secScores.listening || 'N/A'}","${secScores.speaking || 'N/A'}","${secScores.reading || 'N/A'}","${secScores.writing || 'N/A'}","${r.duration}"`;
        });
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
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
            showCustomAlert('Export Failed', 'No keys available to export.');
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
            showCustomAlert('Export Failed', 'No records available to export.');
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

// --- Bulk Action Functions ---
function toggleSelectAll() {
    const isChecked = document.getElementById('select-all-cb').checked;
    const checkboxes = document.querySelectorAll('.record-chk');
    checkboxes.forEach(cb => cb.checked = isChecked);
}

async function deleteSelected() {
    const selected = Array.from(document.querySelectorAll('.record-chk:checked')).map(cb => cb.value);
    if (selected.length === 0) {
        showCustomAlert('Action Required', 'No records selected to delete.');
        return;
    }
    
    showCustomConfirm('Delete Selected', `Are you sure you want to delete ${selected.length} selected record(s)? This cannot be undone.`, async () => {
        try {
            const batches = [];
            let currentBatch = db.batch();
            let operationCount = 0;

            selected.forEach(id => {
                currentBatch.delete(db.collection('exam_records').doc(id));
                operationCount++;
                if (operationCount === 500) {
                    batches.push(currentBatch.commit());
                    currentBatch = db.batch();
                    operationCount = 0;
                }
            });

            if (operationCount > 0) batches.push(currentBatch.commit());

            await Promise.all(batches);
            await loadRecords(); // Reload the table
        } catch (error) {
            console.error("Error deleting selected records:", error);
            showCustomAlert('Error', 'Failed to delete records.');
        }
    });
}

function exportSelectedCSV() {
    const selected = Array.from(document.querySelectorAll('.record-chk:checked'));
    if (selected.length === 0) return showCustomAlert('Action Required', 'No records selected to export.');
    
    const headers = ['Date', 'Student ID', 'Name', 'Access Key', 'Score', 'Percentage', 'Listening', 'Speaking', 'Reading', 'Writing', 'Duration'];
    const rows = selected.map(cb => {
        const r = JSON.parse(decodeURIComponent(cb.dataset.record));
        const safeName = (r.studentName || '').replace(/"/g, '""');
        const secScores = r.sectionScores || {};
        return `"${r.date}","${r.studentId}","${safeName}","${r.accessKey || 'N/A'}","${r.score}","${r.percentage}","${secScores.listening || 'N/A'}","${secScores.speaking || 'N/A'}","${secScores.reading || 'N/A'}","${secScores.writing || 'N/A'}","${r.duration}"`;
    });
    
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Selected_Student_Records.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportSelectedJSON() {
    const selected = Array.from(document.querySelectorAll('.record-chk:checked'));
    if (selected.length === 0) return showCustomAlert('Action Required', 'No records selected to export.');
    
    const records = selected.map(cb => JSON.parse(decodeURIComponent(cb.dataset.record)));
    const blob = new Blob([JSON.stringify({ exam_records: records }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Selected_Student_Records.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Custom Alert & Confirm Modals ---
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

function showCustomConfirm(title, message, onConfirm) {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-modal';
    modalOverlay.className = 'modal-overlay';

    let contentHtml = `<h3 style="margin-top: 0; color: #f8fafc;">${title}</h3>`;
    contentHtml += `<div class="warning-text"><strong>⚠️ ${message}</strong></div>`;
    contentHtml += `
        <div class="modal-buttons">
            <button id="modal-cancel-btn" class="btn-secondary">Cancel</button>
            <button id="modal-confirm-btn" class="btn-success">Confirm</button>
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
        if (onConfirm) onConfirm();
    });
}