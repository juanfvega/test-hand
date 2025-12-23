
const API_URL = 'http://localhost:8000'; // FastAPI default port

const dateInput = document.getElementById('dateInput');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const addSlotsBtn = document.getElementById('addSlotsBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const slotsList = document.getElementById('slotsList');
const statusMsg = document.getElementById('statusMsg');

// Set default date to today
dateInput.valueAsDate = new Date();

deleteAllBtn.addEventListener('click', async () => {
    if (!confirm('WARNING: This will delete ALL slots from the database. Are you sure?')) return;

    try {
        const res = await fetch(`${API_URL}/slots_all/`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            alert(`Deleted ${data.deleted} slots.`);
            loadSlots();
        }
    } catch (e) {
        alert('Error deleting slots.');
    }
});

addSlotsBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    const start = parseInt(startTimeInput.value.split(':')[0]);
    const end = parseInt(endTimeInput.value.split(':')[0]);

    if (!date || isNaN(start) || isNaN(end) || start >= end) {
        statusMsg.textContent = "Invalid inputs.";
        statusMsg.style.color = "red";
        return;
    }

    statusMsg.textContent = "Generating...";

    // Generate hourly slots
    let createdCount = 0;
    for (let h = start; h < end; h++) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        try {
            const res = await fetch(`${API_URL}/slots/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: date,
                    time: timeStr,
                    is_booked: false
                })
            });
            if (res.ok) createdCount++;
        } catch (e) {
            console.error(e);
        }
    }

    statusMsg.textContent = `Created ${createdCount} slots for ${date}.`;
    statusMsg.style.color = "green";
    loadSlots();
});

async function loadSlots() {
    try {
        const res = await fetch(`${API_URL}/slots/`); // Get all for admin
        const data = await res.json();
        renderSlots(data);
    } catch (e) {
        slotsList.textContent = "Failed to load slots. Is backend running?";
    }
}

function renderSlots(slots) {
    slotsList.innerHTML = '';
    // Sort by date then time
    slots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    slots.forEach(slot => {
        const div = document.createElement('div');
        div.className = 'slot-item';
        div.innerHTML = `
            <div>
                <strong>${slot.date}</strong> - ${slot.time} 
                ${slot.is_booked ? '<span style="color:orange">(Booked)</span>' : '<span style="color:green">(Open)</span>'}
            </div>
            <button class="delete-btn" data-id="${slot.id}">Delete</button>
        `;
        slotsList.appendChild(div);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            await deleteSlot(id);
        });
    });
}

async function deleteSlot(id) {
    if (!confirm('Delete this slot?')) return;
    await fetch(`${API_URL}/slots/${id}`, { method: 'DELETE' });
    loadSlots();
}

// Initial load
loadSlots();
