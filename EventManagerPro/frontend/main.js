/* File: EventManagerPro/frontend/main.js - STABLE VERSION - Before Pagination */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// --- ROUTER ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.endsWith('/') || path.endsWith('index.html')) {
        setupEventSearch();
        loadEvents();
    } else if (path.endsWith('add_event.html')) {
        populateAddEventForm();
        setupAddEventForm();
    } else if (path.endsWith('edit-event.html')) {
        loadEventForEditing();
    } else if (path.endsWith('event.html')) {
        loadEventDetails();
    } else if (path.endsWith('edit-venue.html')) {
        loadVenueForEditing();
    } else if (path.endsWith('venues.html')) {
        loadVenues();
        setupAddVenueForm();
    } else if (path.endsWith('organizer-details.html')) {
        loadOrganizerDetails();
    } else if (path.endsWith('edit-organizer.html')) {
        loadOrganizerForEditing();
    } else if (path.endsWith('organizers.html')) {
        loadOrganizers();
    } else if (path.endsWith('attendee-details.html')) {
        loadAttendeeDetails();
    } else if (path.endsWith('edit-attendee.html')) {
        loadAttendeeForEditing();
    } else if (path.endsWith('attendees.html')) {
        setupAttendeeSearch();
        loadAttendees();
        setupAddAttendeeForm();
    }
});

// --- HELPER FUNCTIONS ---
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset();
    const correctedDate = new Date(date.getTime() + (offset * 60 * 1000));
    return correctedDate.toISOString().split('T')[0];
}
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    });
}
function formatCurrency(amount) {
    if (amount === null || isNaN(amount)) return '$0.00';
    return '$' + parseFloat(amount).toFixed(2);
}

// --- [EVENT FUNCTIONS] ---
function setupEventSearch() {
    const searchBtn = document.getElementById('event-search-btn');
    const searchInput = document.getElementById('event-search-input');
    if (!searchBtn || !searchInput) return;
    searchBtn.addEventListener('click', () => loadEvents());
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadEvents(); });
}
async function loadEvents() {
    const grid = document.getElementById('events-grid');
    const searchInput = document.getElementById('event-search-input');
    const searchTerm = searchInput ? searchInput.value : '';
    let url = `${API_BASE_URL}/events`;
    if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;

    try {
        const response = await fetch(url);
        const events = await response.json();
        grid.innerHTML = '';
        if (events.length === 0) { grid.innerHTML = '<p>No events found.</p>'; return; }
        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<h3>${event.EventName}</h3><p><strong>Date:</strong> ${formatDate(event.StartDate)}</p><p><strong>Location:</strong> ${event.City}</p>`;
            card.onclick = () => { window.location.href = `event.html?id=${event.EventID}`; };
            grid.appendChild(card);
        });
    } catch (error) { grid.innerHTML = '<p>Error loading events. Please try again later.</p>'; }
}
async function loadEventDetails() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) { window.location.href = 'index.html'; return; }

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`);
        if (!response.ok) throw new Error('Event not found');
        const data = await response.json();
        const details = data.details;
        document.getElementById('event-name-title').textContent = details.EventName;
        const detailsContainer = document.getElementById('event-details-container');
        detailsContainer.innerHTML = `
            <p><strong>Type:</strong> ${details.EventType}</p>
            <p><strong>Dates:</strong> ${formatDate(details.StartDate)} to ${formatDate(details.EndDate)}</p>
            <p><strong>Ticket Price (Regular):</strong> ${formatCurrency(details.Price)}</p>
            <p><strong>Venue:</strong> ${details.VenueName} (${details.Address}, ${details.City})</p>
            <p><strong>Organizer:</strong> <a href="organizer-details.html?id=${details.OrganizerID}">${details.OrganizerName}</a> (<a href="mailto:${details.ContactEmail}">${details.ContactEmail}</a>)</p>
            <div class="action-buttons">
                <button class="btn btn-edit" onclick="window.location.href='edit-event.html?id=${eventId}'">Edit Event</button>
                <button class="btn btn-danger" onclick="deleteEvent(${eventId})">Delete Event</button>
            </div>`;
        renderSchedule(data.schedule);
        renderAttendeesForEvent(data.attendees);
        setupAddScheduleForm(eventId);
        setupRegisterForm(eventId, details.Price);
    } catch (error) { document.getElementById('event-details-container').innerHTML = `<p>${error.message}</p>`; }
}
function renderSchedule(schedule) {
    const scheduleBody = document.getElementById('schedule-table-body');
    scheduleBody.innerHTML = '';
    if (schedule && schedule.length > 0) {
        schedule.forEach(item => {
            const row = scheduleBody.insertRow();
            row.innerHTML = `
                <td data-label="Activity">${item.ActivityName}</td>
                <td data-label="Speaker">${item.Speaker || 'N/A'}</td>
                <td data-label="Start Time">${formatTime(item.StartTime)}</td>
                <td data-label="End Time">${formatTime(item.EndTime)}</td>
                <td data-label="Actions"><button class="btn-delete" data-id="${item.ScheduleID}">Delete</button></td>`;
        });
        document.querySelectorAll('#schedule-table-body .btn-delete').forEach(button => {
            button.onclick = (e) => deleteScheduleItem(e.target.dataset.id);
        });
    } else { scheduleBody.innerHTML = '<tr><td colspan="5">No schedule available for this event.</td></tr>'; }
}
function renderAttendeesForEvent(attendees) {
    const attendeesBody = document.getElementById('attendees-table-body');
    attendeesBody.innerHTML = '';
    if (attendees && attendees.length > 0) {
        attendees.forEach(attendee => {
            const row = attendeesBody.insertRow();
            row.innerHTML = `
                <td data-label="Name"><a href="attendee-details.html?id=${attendee.AttendeeID}">${attendee.FullName}</a></td>
                <td data-label="Email">${attendee.Email}</td>
                <td data-label="Ticket Type">${attendee.TicketType}</td>
                <td data-label="Price">${formatCurrency(attendee.Price)}</td>
                <td data-label="Purchase Date">${formatDate(attendee.PurchaseDate)}</td>
                <td data-label="Actions"><button class="btn-delete" data-id="${attendee.TicketID}">Delete</button></td>`;
        });
        document.querySelectorAll('#attendees-table-body .btn-delete').forEach(button => {
            button.onclick = (e) => deleteRegistration(e.target.dataset.id);
        });
    } else { attendeesBody.innerHTML = '<tr><td colspan="6">No attendees have registered yet.</td></tr>'; }
}
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event and all its registrations/schedules? This cannot be undone.')) return;
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) { alert(result.error); return; }
    alert(result.message);
    window.location.href = 'index.html';
}
function setupAddScheduleForm(eventId) {
    const form = document.getElementById('add-schedule-form');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { ActivityName: document.getElementById('activityName').value, Speaker: document.getElementById('speaker').value, StartTime: document.getElementById('startTime').value, EndTime: document.getElementById('endTime').value };
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showMessage(await response.json(), response.ok, 'schedule-form-message');
            if (response.ok) { form.reset(); loadEventDetails(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}
async function deleteScheduleItem(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule item?')) return;
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, { method: 'DELETE' });
    showMessage(await response.json(), response.ok, 'schedule-list-message');
    if (response.ok) loadEventDetails();
}
function setupRegisterForm(eventId, basePrice) {
    const form = document.getElementById('register-form');
    if (!form) return;
    const ticketTypeSelect = document.getElementById('regTicketType');
    const priceDisplay = document.getElementById('calculated-price');
    const updatePrice = () => {
        const type = ticketTypeSelect.value;
        let finalPrice = parseFloat(basePrice);
        if (type === 'VIP') finalPrice *= 1.5;
        priceDisplay.textContent = formatCurrency(finalPrice);
    };
    updatePrice();
    ticketTypeSelect.addEventListener('change', updatePrice);
    if (!form.dataset.listenerAttached) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const finalPrice = parseFloat(priceDisplay.textContent.replace('$', ''));
            const data = { EventID: eventId, FullName: document.getElementById('regFullName').value, Email: document.getElementById('regEmail').value, Phone: document.getElementById('regPhone').value, TicketType: ticketTypeSelect.value, Price: finalPrice };
            const response = await fetch(`${API_BASE_URL}/tickets/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showMessage(await response.json(), response.ok, 'register-form-message');
            if (response.ok) { form.reset(); loadEventDetails(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}
async function deleteRegistration(ticketId) {
    if (!confirm('Are you sure you want to cancel this registration?')) return;
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, { method: 'DELETE' });
    showMessage(await response.json(), response.ok, 'attendee-list-message');
    if (response.ok) loadEventDetails();
}
async function populateAddEventForm() {
    const venueSelect = document.getElementById('venue');
    const organizerSelect = document.getElementById('organizer');
    try {
        const venuesRes = await fetch(`${API_BASE_URL}/venues`);
        const venues = await venuesRes.json();
        venueSelect.innerHTML = '<option value="">Select a Venue</option>';
        venues.forEach(v => { venueSelect.innerHTML += `<option value="${v.VenueID}">${v.VenueName}</option>`; });
        const organizersRes = await fetch(`${API_BASE_URL}/organizers`);
        const organizers = await organizersRes.json();
        organizerSelect.innerHTML = '<option value="">Select an Organizer</option>';
        organizers.forEach(o => { organizerSelect.innerHTML += `<option value="${o.OrganizerID}">${o.OrganizerName}</option>`; });
    } catch (error) { console.error("Failed to populate dropdowns:", error); }
}
function setupAddEventForm() {
    const form = document.getElementById('add-event-form');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const response = await fetch(`${API_BASE_URL}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showMessage(await response.json(), response.ok, 'form-message');
            if (response.ok) form.reset();
        });
        form.dataset.listenerAttached = 'true';
    }
}
async function loadEventForEditing() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) { window.location.href = 'index.html'; return; }
    const eventRes = await fetch(`${API_BASE_URL}/events/${eventId}`);
    const eventData = await eventRes.json();
    const details = eventData.details;
    document.getElementById('eventName').value = details.EventName;
    document.getElementById('eventType').value = details.EventType;
    document.getElementById('startDate').value = formatDate(details.StartDate);
    document.getElementById('endDate').value = formatDate(details.EndDate);
    document.getElementById('price').value = parseFloat(details.Price).toFixed(2);
    const venueSelect = document.getElementById('venue');
    const organizerSelect = document.getElementById('organizer');
    const venuesRes = await fetch(`${API_BASE_URL}/venues`);
    const venues = await venuesRes.json();
    venues.forEach(v => { venueSelect.innerHTML += `<option value="${v.VenueID}">${v.VenueName}</option>`; });
    const organizersRes = await fetch(`${API_BASE_URL}/organizers`);
    const organizers = await organizersRes.json();
    organizers.forEach(o => { organizerSelect.innerHTML += `<option value="${o.OrganizerID}">${o.OrganizerName}</option>`; });
    venueSelect.value = details.VenueID;
    organizerSelect.value = details.OrganizerID;
    setupEditEventForm(eventId);
}
function setupEditEventForm(eventId) {
    const form = document.getElementById('edit-event-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        showMessage(await response.json(), response.ok, 'form-message');
        if (response.ok) setTimeout(() => window.location.href = `event.html?id=${eventId}`, 1500);
    });
}

// --- [VENUE FUNCTIONS] ---
async function loadVenues() {
    const tableBody = document.getElementById('venues-table-body');
    const response = await fetch(`${API_BASE_URL}/venues`);
    const venues = await response.json();
    tableBody.innerHTML = '';
    venues.forEach(v => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td data-label="Name">${v.VenueName}</td>
            <td data-label="City">${v.City}</td>
            <td data-label="Capacity">${v.Capacity}</td>
            <td data-label="Actions" class="actions-cell">
                <button class="btn-edit" onclick="window.location.href='edit-venue.html?id=${v.VenueID}'">Edit</button>
                <button class="btn-delete" data-id="${v.VenueID}">Delete</button>
            </td>`;
    });
    document.querySelectorAll('#venues-table-body .btn-delete').forEach(button => {
        button.onclick = (e) => deleteVenue(e.target.dataset.id);
    });
}
function setupAddVenueForm() {
    const form = document.getElementById('add-venue-form');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { VenueName: document.getElementById('venueName').value, Address: document.getElementById('address').value, City: document.getElementById('city').value, Capacity: document.getElementById('capacity').value, };
            const response = await fetch(`${API_BASE_URL}/venues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showMessage(await response.json(), response.ok, 'form-message');
            if (response.ok) { form.reset(); loadVenues(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}
async function deleteVenue(venueId) {
    if (!confirm('Are you sure you want to delete this venue?')) return;
    const response = await fetch(`${API_BASE_URL}/venues/${venueId}`, { method: 'DELETE' });
    const result = await response.json();
    showMessage(result, response.ok, 'list-message');
    if (response.ok) loadVenues();
}
async function loadVenueForEditing() {
    const params = new URLSearchParams(window.location.search);
    const venueId = params.get('id');
    if (!venueId) { window.location.href = 'venues.html'; return; }
    const response = await fetch(`${API_BASE_URL}/venues/${venueId}`);
    const venue = await response.json();
    document.getElementById('venueName').value = venue.VenueName;
    document.getElementById('address').value = venue.Address;
    document.getElementById('city').value = venue.City;
    document.getElementById('capacity').value = venue.Capacity;
    setupEditVenueForm(venueId);
}
function setupEditVenueForm(venueId) {
    const form = document.getElementById('edit-venue-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch(`${API_BASE_URL}/venues/${venueId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        showMessage(await response.json(), response.ok, 'form-message');
        if (response.ok) setTimeout(() => window.location.href = 'venues.html', 1500);
    });
}

// --- [ORGANIZER FUNCTIONS] ---
async function loadOrganizers() {
    const tableBody = document.getElementById('organizers-table-body');
    const response = await fetch(`${API_BASE_URL}/organizers`);
    const organizers = await response.json();
    tableBody.innerHTML = '';
    organizers.forEach(o => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td data-label="Name"><a href="organizer-details.html?id=${o.OrganizerID}">${o.OrganizerName}</a></td>
            <td data-label="Email">${o.ContactEmail}</td>
            <td data-label="Phone">${o.ContactPhone || ''}</td>
            <td data-label="Actions" class="actions-cell">
                <button class="btn-edit" onclick="window.location.href='edit-organizer.html?id=${o.OrganizerID}'">Edit</button>
                <button class="btn-delete" data-id="${o.OrganizerID}">Delete</button>
            </td>`;
    });
    document.querySelectorAll('#organizers-table-body .btn-delete').forEach(button => {
        button.onclick = (e) => deleteOrganizer(e.target.dataset.id);
    });
    setupAddOrganizerForm();
}
function setupAddOrganizerForm() {
    const form = document.getElementById('add-organizer-form');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { OrganizerName: document.getElementById('organizerName').value, ContactEmail: document.getElementById('contactEmail').value, ContactPhone: document.getElementById('contactPhone').value, };
            const response = await fetch(`${API_BASE_URL}/organizers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showMessage(await response.json(), response.ok, 'form-message');
            if (response.ok) { form.reset(); loadOrganizers(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}
async function deleteOrganizer(organizerId) {
    if (!confirm('Are you sure you want to delete this organizer?')) return;
    const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`, { method: 'DELETE' });
    const result = await response.json();
    showMessage(result, response.ok, 'list-message');
    if (response.ok) loadOrganizers();
}
async function loadOrganizerForEditing() {
    const params = new URLSearchParams(window.location.search);
    const organizerId = params.get('id');
    if (!organizerId) { window.location.href = 'organizers.html'; return; }
    const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`);
    const organizer = await response.json();
    document.getElementById('organizerName').value = organizer.details.OrganizerName;
    document.getElementById('contactEmail').value = organizer.details.ContactEmail;
    document.getElementById('contactPhone').value = organizer.details.ContactPhone || '';
    setupEditOrganizerForm(organizerId);
}
function setupEditOrganizerForm(organizerId) {
    const form = document.getElementById('edit-organizer-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        showMessage(await response.json(), response.ok, 'form-message');
        if (response.ok) setTimeout(() => window.location.href = 'organizers.html', 1500);
    });
}

// --- [ATTENDEE FUNCTIONS] ---
function setupAttendeeSearch() {
    const searchBtn = document.getElementById('attendee-search-btn');
    const searchInput = document.getElementById('attendee-search-input');
    if (!searchBtn || !searchInput) return;
    searchBtn.addEventListener('click', () => loadAttendees());
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadAttendees(); });
}
async function loadAttendees() {
    const tableBody = document.getElementById('attendees-table-body');
    const searchInput = document.getElementById('attendee-search-input');
    const searchTerm = searchInput ? searchInput.value : '';
    let url = `${API_BASE_URL}/attendees`;
    if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;
    const response = await fetch(url);
    const attendees = await response.json();
    tableBody.innerHTML = '';
    attendees.forEach(a => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td data-label="Name"><a href="attendee-details.html?id=${a.AttendeeID}">${a.FullName}</a></td>
            <td data-label="Email">${a.Email}</td>
            <td data-label="Phone">${a.Phone || ''}</td>
            <td data-label="Registered On">${formatDate(a.RegistrationDate)}</td>
            <td data-label="Actions" class="actions-cell">
                <button class="btn-edit" onclick="window.location.href='edit-attendee.html?id=${a.AttendeeID}'">Edit</button>
                <button class="btn-delete" data-id="${a.AttendeeID}">Delete</button>
            </td>`;
    });
    document.querySelectorAll('#attendees-table-body .btn-delete').forEach(button => {
        button.onclick = (e) => deleteAttendee(e.target.dataset.id);
    });
}
function setupAddAttendeeForm() {
    const form = document.getElementById('add-attendee-form');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { FullName: document.getElementById('fullName').value, Email: document.getElementById('email').value, Phone: document.getElementById('phone').value, };
            const response = await fetch(`${API_BASE_URL}/attendees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showMessage(await response.json(), response.ok, 'form-message');
            if (response.ok) { form.reset(); loadAttendees(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}
async function deleteAttendee(attendeeId) {
    if (!confirm('Are you sure you want to delete this attendee? This will remove them from the system but not their past tickets.')) return;
    const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, { method: 'DELETE' });
    const result = await response.json();
    showMessage(result, response.ok, 'list-message');
    if (response.ok) loadAttendees();
}
async function loadAttendeeForEditing() {
    const params = new URLSearchParams(window.location.search);
    const attendeeId = params.get('id');
    if (!attendeeId) { window.location.href = 'attendees.html'; return; }
    const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`);
    const attendee = await response.json();
    document.getElementById('fullName').value = attendee.details.FullName;
    document.getElementById('email').value = attendee.details.Email;
    document.getElementById('phone').value = attendee.details.Phone || '';
    setupEditAttendeeForm(attendeeId);
}
function setupEditAttendeeForm(attendeeId) {
    const form = document.getElementById('edit-attendee-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        showMessage(await response.json(), response.ok, 'form-message');
        if (response.ok) setTimeout(() => window.location.href = 'attendees.html', 1500);
    });
}

// --- [DETAILS PAGE FUNCTIONS] ---
async function loadAttendeeDetails() {
    const params = new URLSearchParams(window.location.search);
    const attendeeId = params.get('id');
    if (!attendeeId) { window.location.href = 'attendees.html'; return; }
    try {
        const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`);
        if (!response.ok) throw new Error('Attendee not found');
        const data = await response.json();
        const details = data.details;
        const events = data.events;
        document.getElementById('attendee-name-title').textContent = details.FullName;
        document.getElementById('attendee-details-container').innerHTML = `<p><strong>Email:</strong> <a href="mailto:${details.Email}">${details.Email}</a></p><p><strong>Phone:</strong> ${details.Phone || 'N/A'}</p><p><strong>Member Since:</strong> ${formatDate(details.RegistrationDate)}</p>`;
        const eventsBody = document.getElementById('events-table-body');
        eventsBody.innerHTML = '';
        if (events && events.length > 0) {
            events.forEach(event => {
                const row = eventsBody.insertRow();
                row.innerHTML = `
                    <td data-label="Event"><a href="event.html?id=${event.EventID}">${event.EventName}</a></td>
                    <td data-label="Date">${formatDate(event.StartDate)}</td>
                    <td data-label="Ticket Type">${event.TicketType}</td>`;
            });
        } else { eventsBody.innerHTML = '<tr><td colspan="3">This attendee is not registered for any events.</td></tr>'; }
    } catch (error) { document.getElementById('attendee-details-container').innerHTML = `<p>${error.message}</p>`; }
}
async function loadOrganizerDetails() {
    const params = new URLSearchParams(window.location.search);
    const organizerId = params.get('id');
    if (!organizerId) { window.location.href = 'organizers.html'; return; }
    try {
        const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`);
        if (!response.ok) throw new Error('Organizer not found');
        const data = await response.json();
        const details = data.details;
        const events = data.events;
        document.getElementById('organizer-name-title').textContent = details.OrganizerName;
        document.getElementById('organizer-details-container').innerHTML = `<p><strong>Email:</strong> <a href="mailto:${details.ContactEmail}">${details.ContactEmail}</a></p><p><strong>Phone:</strong> ${details.ContactPhone || 'N/A'}</p>`;
        const eventsBody = document.getElementById('events-table-body');
        eventsBody.innerHTML = '';
        if (events && events.length > 0) {
            events.forEach(event => {
                const row = eventsBody.insertRow();
                row.innerHTML = `
                    <td data-label="Event"><a href="event.html?id=${event.EventID}">${event.EventName}</a></td>
                    <td data-label="Date">${formatDate(event.StartDate)}</td>
                    <td data-label="City">${event.City}</td>`;
            });
        } else { eventsBody.innerHTML = '<tr><td colspan="3">This organizer is not hosting any events.</td></tr>'; }
    } catch (error) { document.getElementById('organizer-details-container').innerHTML = `<p>${error.message}</p>`; }
}

// --- UNIVERSAL MESSAGE HANDLER ---
function showMessage(data, isSuccess, elementId) {
    const msgDiv = document.getElementById(elementId);
    if (!msgDiv) { console.error("Message element not found:", elementId); return; }
    msgDiv.textContent = data.message || data.error;
    msgDiv.className = 'message';
    msgDiv.classList.add(isSuccess ? 'success' : 'error');
    msgDiv.style.display = 'block';
    setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
}

