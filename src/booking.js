import './style.css';

// State
let currentStartDate = new Date();
let selectedDate = null;

// DOM Elements
const weekCarousel = document.querySelector('.week-carousel');
const prevBtn = document.getElementById('prevWeek');
const nextBtn = document.getElementById('nextWeek');
const currentMonthYear = document.getElementById('currentMonthYear');
const timeSlotsContainer = document.getElementById('time-slots-container');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const slotsGrid = document.getElementById('slotsGrid');

// Initialization
function init() {
    renderWeek(currentStartDate);

    prevBtn.addEventListener('click', () => {
        currentStartDate.setDate(currentStartDate.getDate() - 7);
        renderWeek(currentStartDate);
    });

    nextBtn.addEventListener('click', () => {
        currentStartDate.setDate(currentStartDate.getDate() + 7);
        renderWeek(currentStartDate);
    });
}

// Logic to get the start of the week (assuming Monday start ?? Or just current day?)
// Let's stick to simple "7 days starting from current viewing date"
// Or align to Sunday/Monday? Let's simply show 7 days from `currentStartDate`.

function renderWeek(startDate) {
    weekCarousel.innerHTML = '';

    // Update Header (Month Year of the first day)
    const options = { month: 'long', year: 'numeric' };
    currentMonthYear.textContent = startDate.toLocaleDateString('en-US', options);

    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
            dayCard.classList.add('selected');
        }

        // Format
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = date.getDate();

        dayCard.innerHTML = `
            <span class="day-name">${dayName}</span>
            <span class="day-number">${dayNumber}</span>
        `;

        dayCard.addEventListener('click', () => {
            selectDate(date);
        });

        weekCarousel.appendChild(dayCard);
    }
}

function selectDate(date) {
    selectedDate = date;

    // update graphical selection
    const allCards = document.querySelectorAll('.day-card');
    allCards.forEach(card => card.classList.remove('selected'));

    // We need to find the card we just clicked, but simpler to just re-scan or pass 'this'
    // Re-rendering implies partial update, but for simplicity let's just update classes manually matching text or re-render.
    // Let's just re-render to be safe and clean, or simpler: find index. 
    // Actually, finding by text content is brittle. Let's just re-render the Carousel status.
    renderWeek(currentStartDate);

    showTimeSlots(date);
}

const API_URL = 'http://localhost:8000';

async function showTimeSlots(date) {
    timeSlotsContainer.classList.remove('hidden');
    selectedDateDisplay.textContent = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    slotsGrid.innerHTML = '<p style="color:white">Loading slots...</p>';

    try {
        // Format date YYYY-MM-DD
        const dateStr = date.toISOString().split('T')[0];
        const res = await fetch(`${API_URL}/slots/${dateStr}`);
        const slots = await res.json();

        slotsGrid.innerHTML = '';

        if (slots.length === 0) {
            slotsGrid.innerHTML = '<p style="color:var(--illusion-300)">No availability for this day.</p>';
            return;
        }

        slots.forEach(slot => {
            if (slot.is_booked) return; // Skip booked slots

            const chip = document.createElement('button');
            chip.className = 'time-slot';
            chip.textContent = slot.time;
            chip.addEventListener('click', () => {
                // Determine actual datetime for calendar
                handleBookingClick(date, slot);
            });
            slotsGrid.appendChild(chip);
        });
    } catch (e) {
        slotsGrid.innerHTML = '<p style="color:red">Error loading slots.</p>';
    }

    timeSlotsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Modal Elements
const bookingModal = document.getElementById('booking-modal');
const closeModalBtn = document.querySelector('.close-modal');
const bookingForm = document.getElementById('booking-form');
const modalDateSpan = document.getElementById('modal-date');
const modalTimeSpan = document.getElementById('modal-time');
const bookingStatus = document.getElementById('booking-status');
const clientNameInput = document.getElementById('clientName');
const clientEmailInput = document.getElementById('clientEmail');

let pendingBooking = {
    date: null,
    slot: null
};

function handleBookingClick(date, slot) {
    // Open Modal instead of direct confirm
    pendingBooking = { date, slot };

    modalDateSpan.textContent = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    modalTimeSpan.textContent = slot.time;
    bookingStatus.textContent = '';
    clientNameInput.value = '';
    clientEmailInput.value = '';

    bookingModal.classList.remove('hidden');
}

// Modal Close Logic
closeModalBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));
window.addEventListener('click', (e) => {
    if (e.target === bookingModal) bookingModal.classList.add('hidden');
});

// Form Submission
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = clientNameInput.value;
    const email = clientEmailInput.value;

    if (!pendingBooking.slot || !name || !email) return;

    bookingStatus.textContent = 'Processing...';
    bookingStatus.style.color = 'var(--text-light)';

    try {
        const res = await fetch(`${API_URL}/book/${pendingBooking.slot.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_name: name,
                client_email: email
            })
        });

        if (res.ok) {
            bookingStatus.textContent = 'Confirmed! Opening Calendar...';
            bookingStatus.style.color = '#4ade80';

            // Open Calendar Link
            const calendarUrl = generateGoogleCalendarLink(pendingBooking.date, pendingBooking.slot.time);
            window.open(calendarUrl, '_blank');

            // Close and Refresh
            setTimeout(() => {
                bookingModal.classList.add('hidden');
                showTimeSlots(pendingBooking.date);
            }, 1000);
        } else {
            const data = await res.json();
            bookingStatus.textContent = 'Error: ' + data.detail;
            bookingStatus.style.color = '#f87171';
        }
    } catch (error) {
        console.error(error);
        bookingStatus.textContent = 'Network Error.';
        bookingStatus.style.color = '#f87171';
    }
});

function generateGoogleCalendarLink(dateObj, timeStr) {
    // Construct Start/End Time in ISO format
    // timeStr is "10:00"
    const [hours, mins] = timeStr.split(':');

    const start = new Date(dateObj);
    start.setHours(parseInt(hours), parseInt(mins), 0);

    const end = new Date(start);
    end.setHours(start.getHours() + 1); // 1 hour duration

    const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, ""); // Format: YYYYMMDDTHHMMSSZ

    const title = encodeURIComponent("Turno Uñas - Glaze Studio");
    const details = encodeURIComponent("Reserva confirmada en Glaze Studio.");
    const location = encodeURIComponent("Glaze Studio");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
}

init();
