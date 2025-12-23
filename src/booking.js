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

function showTimeSlots(date) {
    timeSlotsContainer.classList.remove('hidden');
    selectedDateDisplay.textContent = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    // Mock Slots logic
    slotsGrid.innerHTML = '';
    const slots = generateMockSlots();

    slots.forEach(time => {
        const chip = document.createElement('button');
        chip.className = 'time-slot';
        chip.textContent = time;
        chip.addEventListener('click', () => {
            alert(`Booking requested for ${date.toDateString()} at ${time}`);
        });
        slotsGrid.appendChild(chip);
    });

    // Smooth scroll to slots
    timeSlotsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateMockSlots() {
    // Generate hourly slots from 10:00 to 18:00
    const times = [];
    for (let h = 10; h <= 18; h++) {
        times.push(`${h}:00 hs`);
    }
    return times;
}

init();
