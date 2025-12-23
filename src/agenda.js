
const API_URL = 'http://localhost:8000';
const agendaList = document.getElementById('agendaList');
const notificationContainer = document.getElementById('notification-container');
const refreshBtn = document.getElementById('refreshBtn');

// Load Data
async function loadAgenda() {
    try {
        const res = await fetch(`${API_URL}/slots/`);
        const data = await res.json();
        renderAgenda(data);
    } catch (e) {
        console.error("Failed to load agenda", e);
    }
}

function renderAgenda(slots) {
    agendaList.innerHTML = '';
    const booked = slots.filter(s => s.is_booked);

    if (booked.length === 0) {
        agendaList.innerHTML = '<p style="color:var(--illusion-300)">No confirmed bookings found.</p>';
        return;
    }

    // Sort by Date Descending (Newest first? Or Oldest first for schedule?)
    // Usually Agenda is chronological: Oldest date first to Newest
    booked.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    booked.forEach(slot => {
        const div = document.createElement('div');
        div.className = 'booking-card';
        div.innerHTML = `
            <div class="booking-time">
                ${slot.date}<br>
                <span style="font-size:1.5rem; color:var(--illusion-100)">${slot.time}</span>
            </div>
            <div class="booking-client">
                <div><span class="client-label">Client Name</span><br>${slot.client_name || 'N/A'}</div>
                <div><span class="client-label">Email</span><br>${slot.client_email || 'N/A'}</div>
            </div>
            <div>
                 <span style="background:rgba(74, 222, 128, 0.1); color:#4ade80; padding:4px 8px; border-radius:4px;">Confirmed</span>
            </div>
        `;
        agendaList.appendChild(div);
    });
}

// WebSocket Setup
let ws;
function connectWebSocket() {
    // Dynamic host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8000'; // Backend port
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'refresh') {
            loadAgenda();
        }
        else if (msg.type === 'new_booking') {
            loadAgenda(); // Reload list
            showNotification(msg.data); // Show Popup
        }
    };

    ws.onclose = () => setTimeout(connectWebSocket, 3000);
}

function showNotification(data) {
    const toast = document.createElement('div');
    toast.className = 'toast-card';
    toast.innerHTML = `
        <div class="toast-header">
            <span>New Booking</span>
            <span style="cursor:pointer" onclick="this.parentElement.parentElement.remove()">✕</span>
        </div>
        <div class="toast-body">
            <h4>${data.client_name}</h4>
            <div style="font-size:0.9rem; color:var(--illusion-200); margin-bottom:0.5rem;">
                ${data.date} @ ${data.time}
            </div>
            <div style="font-size:0.8rem; color:#888;">${data.client_email}</div>
        </div>
    `;
    notificationContainer.appendChild(toast);

    // Auto remove after 10s
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 10000);
}

refreshBtn.addEventListener('click', loadAgenda);

// Init
loadAgenda();
connectWebSocket();
