/* File: EventManagerPro/frontend/main.js - STABLE VERSION - Before Pagination
 * Frontend controller for admin and participant views; routes per-page logic,
 * calls REST API, handles auth headers, and renders tables/cards with actions.
 * Key: router below picks page, then each setup/load function renders DOM.
 */

// Base URL for all API endpoints - all requests to backend go through this URL
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Global flag to prevent duplicate submissions
let isSubmitting = false;

// Function to add auth header to all API calls
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Phone number formatter - auto formats as ####-####-####
function formatPhoneNumber(input) {
    // Remove all non-digits
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 12 digits
    if (value.length > 12) {
        value = value.slice(0, 12);
    }
    
    // Format as ####-####-#### (4-4-4)
    let formatted = '';
    if (value.length > 0) {
        formatted = value.slice(0, 4);
        if (value.length > 4) {
            formatted += '-' + value.slice(4, 8);
            if (value.length > 8) {
                formatted += '-' + value.slice(8, 12);
            }
        }
    }
    
    input.value = formatted;
}

// Apply phone formatter to all phone inputs
function setupPhoneFormatters() {
    const phoneInputs = document.querySelectorAll('input[type="tel"], input[id*="Phone"], input[id*="phone"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', () => formatPhoneNumber(input));
        input.addEventListener('paste', () => {
            setTimeout(() => formatPhoneNumber(input), 10);
        });
    });
}

// --- LOGOUT FUNCTION (GLOBAL) ---
// Define this function in the global scope so onclick can access it
window.logout = function() {
    const token = localStorage.getItem('authToken');
    fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
    }).then(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userType');
        localStorage.removeItem('userName');
        window.location.href = 'login.html';
    }).catch(error => {
        console.error('Logout error:', error);
        // Even if API fails, clear local storage and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('userType');
        localStorage.removeItem('userName');
        window.location.href = 'login.html';
    });
}

// Check authentication on page load
window.addEventListener('load', () => {
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    const path = window.location.pathname;

    // If not logged in at all, redirect to login (except on login page itself)
    if (!token && !path.endsWith('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    // If logged in as ATTENDEE
    if (userType === 'ATTENDEE') {
        // Allow access to participant pages
        const participantPages = ['participant-dashboard.html', 'my-events.html', 'event.html', 'payment.html', 'profile.html'];
        const isParticipantPage = participantPages.some(page => path.endsWith(page));
        
        if (isParticipantPage) {
            // They're on a valid participant page, allow it
            return;
        }
        
        // Restrict access to admin-only pages
        const adminPages = ['index.html', 'add_event.html', 'edit-event.html', 'edit-venue.html', 'venues.html', 'organizers.html', 'edit-organizer.html', 'attendees.html', 'edit-attendee.html', 'attendee-details.html', 'organizer-details.html'];
        if (adminPages.some(page => path.endsWith(page)) || path.endsWith('/')) {
            window.location.href = 'participant-dashboard.html';
            return;
        }
    }

    // If logged in as ORGANIZER (admin)
    if (userType === 'ORGANIZER') {
        // Redirect from participant pages to admin dashboard
        const participantPages = ['participant-dashboard.html', 'my-events.html'];
        if (participantPages.some(page => path.endsWith(page))) {
            window.location.href = 'index.html';
            return;
        }
    }
});

// --- ROUTER ---
// Main entry point: runs when the DOM is fully loaded
// Detects current page and initializes appropriate functions
document.addEventListener('DOMContentLoaded', () => {
    // Setup phone formatters on all pages
    setupPhoneFormatters();
    
    // Get current page path from browser URL
    const path = window.location.pathname;

    // Determine which page is being visited and call appropriate setup functions
    // Each condition checks for a specific HTML file and initializes that page
    if (path.endsWith('/') || path.endsWith('index.html')) {
        // Home page: event listing with search functionality
        setupEventSearch();  // Initialize search input listener
        loadEvents();        // Load and display all events
    } else if (path.endsWith('add_event.html')) {
        // Create new event page: populate dropdown menus and setup form submission
        populateAddEventForm();  // Fill venue and organizer dropdowns from database
        setupAddEventForm();     // Setup event creation form submission handler
    } else if (path.endsWith('edit-event.html')) {
        // Edit existing event page: load event data into form for modification
        loadEventForEditing();
    } else if (path.endsWith('event.html')) {
        // Event detail page: show full event info, schedule, and attendees
        loadEventDetails();
    } else if (path.endsWith('edit-venue.html')) {
        // Edit existing venue page
        loadVenueForEditing();
    } else if (path.endsWith('venues.html')) {
        // Venues listing page: show all venues and form to add new ones
        loadVenues();         // Load and display all venues in a table
        setupAddVenueForm();  // Setup form for creating new venue
    } else if (path.endsWith('organizer-details.html')) {
        // Organizer detail page: show organizer info and their events
        loadOrganizerDetails();
    } else if (path.endsWith('edit-organizer.html')) {
        // Edit existing organizer page
        loadOrganizerForEditing();
    } else if (path.endsWith('organizers.html')) {
        // Organizers listing page: show all organizers and form to add new ones
        loadOrganizers();
    } else if (path.endsWith('attendee-details.html')) {
        // Attendee detail page: show attendee info and their registered events
        loadAttendeeDetails();
    } else if (path.endsWith('attendees.html')) {
        // Attendees listing page: show all attendees with search and add form
        setupAttendeeSearch();    // Initialize search input listener
        loadAttendees();          // Load and display all attendees
        setupAddAttendeeForm();   // Setup form for creating new attendee
    } else if (path.endsWith('profile.html')) {
        // Participant profile page
        loadProfilePage();
    }
});

// --- HELPER FUNCTIONS ---
// These utility functions format data for display and handle common operations

/**
 * Formats a date string to YYYY-MM-DD format for display
 * Handles timezone offset to show correct date
 * 
 * @param {string} dateString - ISO date string from backend
 * @returns {string} Formatted date as YYYY-MM-DD or 'N/A' if empty
 */
function formatDate(dateString) {
    // Return placeholder if no date provided
    if (!dateString) return 'N/A';
    
    // Parse the date string
    const date = new Date(dateString);
    
    // Get timezone offset and apply correction to avoid timezone shift
    const offset = date.getTimezoneOffset();
    const correctedDate = new Date(date.getTime() + (offset * 60 * 1000));
    
    // Return ISO string format and extract just the date part (before 'T')
    return correctedDate.toISOString().split('T')[0];
}

/**
 * Formats a datetime string to readable format with local timezone
 * Example output: "Dec 15, 2024 14:30"
 * 
 * @param {string} timeString - ISO datetime string from backend
 * @returns {string} Formatted datetime or 'N/A' if empty
 */
function formatTime(timeString) {
    // Return placeholder if no time provided
    if (!timeString) return 'N/A';
    
    // Convert to local date string with specified format
    return new Date(timeString).toLocaleString('en-US', {
        year: 'numeric',      // Show full year (2024)
        month: 'short',       // Show abbreviated month (Jan, Feb, etc.)
        day: 'numeric',       // Show day number
        hour: '2-digit',      // Show hour with leading zero
        minute: '2-digit',    // Show minute with leading zero
        hour12: false,        // Use 24-hour format
        timeZone: 'UTC'       // Use UTC timezone for consistency
    });
}

/**
 * Formats a number as US currency
 * Example: 49.5 becomes "$49.50"
 * 
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string or "$0.00" if invalid
 */
function formatCurrency(amount) {
    // Return default if amount is null or not a valid number
    if (amount === null || isNaN(amount)) return '$0.00';
    
    // Convert to float and format with 2 decimal places
    return '$' + parseFloat(amount).toFixed(2);
}

// --- [EVENT FUNCTIONS] ---
// Functions related to event management: listing, searching, creating, editing, deleting

/**
 * Sets up event search functionality
 * Attaches event listeners to search button and input field
 * Allows search on button click or Enter key press
 */
function setupEventSearch() {
    // Get DOM elements for search button and input
    const searchBtn = document.getElementById('event-search-btn');
    const searchInput = document.getElementById('event-search-input');
    
    // Exit if elements don't exist on current page
    if (!searchBtn || !searchInput) return;
    
    // When search button clicked, reload events with search filter
    searchBtn.addEventListener('click', () => loadEvents());
    
    // When Enter key pressed in search input, trigger search
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadEvents(); });
}

/**
 * Loads and displays all events (or filtered by search term)
 * Fetches events from API, then creates and displays event cards
 */
async function loadEvents() {
    // Get the container where event cards will be displayed
    const grid = document.getElementById('events-grid');
    
    // Get the search input value (if any search was performed)
    const searchInput = document.getElementById('event-search-input');
    const searchTerm = searchInput ? searchInput.value : '';
    
    // Build API URL with optional search parameter
    let url = `${API_BASE_URL}/events`;
    if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;

    try {
        // Fetch events from backend API
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const events = await response.json();  // Parse JSON response
        
        // Clear previous content
        grid.innerHTML = '';
        
        // Handle case where no events found
        if (events.length === 0) { 
            grid.innerHTML = '<p>No events found.</p>'; 
            return; 
        }
        
        // Create and display a card for each event
        events.forEach(event => {
            // Create card container div
            const card = document.createElement('div');
            card.className = 'card';
            
            // Populate card with event information
            card.innerHTML = `<h3>${event.EventName}</h3><p><strong>Date:</strong> ${formatDate(event.StartDate)}</p><p><strong>Location:</strong> ${event.City}</p>`;
            
            // When clicked, navigate to event details page
            card.onclick = () => { window.location.href = `event.html?id=${event.EventID}`; };
            
            // Add card to grid
            grid.appendChild(card);
        });
    } catch (error) { 
        // Show error message if fetch fails
        grid.innerHTML = '<p>Error loading events. Please try again later.</p>'; 
    }
}

async function loadEventDetails() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) { window.location.href = 'index.html'; return; }

    const userType = localStorage.getItem('userType');
    const isParticipant = userType === 'ATTENDEE';

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Event not found');
        const data = await response.json();
        const details = data.details;
        document.getElementById('event-name-title').textContent = details.EventName;
        const detailsContainer = document.getElementById('event-details-container');
        
        if (isParticipant) {
            // Participant view - read-only with registration button
            detailsContainer.innerHTML = `
                <p><strong>Type:</strong> ${details.EventType}</p>
                <p><strong>Dates:</strong> ${formatDate(details.StartDate)} to ${formatDate(details.EndDate)}</p>
                <p><strong>Ticket Price (Regular):</strong> ${formatCurrency(details.Price)}</p>
                <p><strong>Venue:</strong> ${details.VenueName} (${details.Address}, ${details.City})</p>
                <p><strong>Organizer:</strong> ${details.OrganizerName} (${details.ContactEmail})</p>`;
        } else {
            // Admin view - full controls
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
        }
        
        if (isParticipant) {
            // Show schedule in read-only mode for participants
            renderSchedule(data.schedule, true); // true = read-only mode
            
            // Hide admin sections for participants
            const addScheduleForm = document.querySelector('.form-container');
            const attendeesSection = document.querySelectorAll('.list-container')[1];
            if (addScheduleForm) addScheduleForm.style.display = 'none';
            if (attendeesSection) attendeesSection.style.display = 'none';
            
            // Update navigation for participants
            const nav = document.querySelector('header nav ul');
            if (nav) {
                nav.innerHTML = `
                    <li><a href="participant-dashboard.html">Browse Events</a></li>
                    <li><a href="my-events.html">My Events</a></li>
                    <li><a href="profile.html">Profile</a></li>
                    <li style="margin-left: auto;"><a href="#" onclick="logout()">Logout</a></li>
                `;
            }
            
            // Update logo link
            const logo = document.querySelector('.logo');
            if (logo) logo.href = 'participant-dashboard.html';
            
            // Show registration form for participants
            setupRegisterForm(eventId, details.Price, isParticipant);
        } else {
            // Admin view
            renderSchedule(data.schedule, false); // false = admin mode with delete buttons
            renderAttendeesForEvent(data.attendees);
            setupAddScheduleForm(eventId);
            
            // Hide registration form for admins
            const registerSection = document.getElementById('register-section');
            if (registerSection) registerSection.style.display = 'none';
        }
    } catch (error) { document.getElementById('event-details-container').innerHTML = `<p>${error.message}</p>`; }
}

function renderSchedule(schedule, isReadOnly = false) {
    const scheduleBody = document.getElementById('schedule-table-body');
    scheduleBody.innerHTML = '';
    
    // Hide the Actions column header for participants
    const scheduleTable = document.querySelector('#schedule-table-body').closest('table');
    const actionsHeader = scheduleTable.querySelector('thead th:last-child');
    if (actionsHeader && isReadOnly) {
        actionsHeader.style.display = 'none';
    }
    
    if (schedule && schedule.length > 0) {
        schedule.forEach(item => {
            const row = scheduleBody.insertRow();
            if (isReadOnly) {
                // Participant view - no actions column
                row.innerHTML = `
                    <td data-label="Activity">${item.ActivityName}</td>
                    <td data-label="Speaker">${item.Speaker || 'N/A'}</td>
                    <td data-label="Start Time">${formatTime(item.StartTime)}</td>
                    <td data-label="End Time">${formatTime(item.EndTime)}</td>`;
            } else {
                // Admin view - with delete button
                row.innerHTML = `
                    <td data-label="Activity">${item.ActivityName}</td>
                    <td data-label="Speaker">${item.Speaker || 'N/A'}</td>
                    <td data-label="Start Time">${formatTime(item.StartTime)}</td>
                    <td data-label="End Time">${formatTime(item.EndTime)}</td>
                    <td data-label="Actions"><button class="btn-delete" data-id="${item.ScheduleID}">Delete</button></td>`;
            }
        });
        
        if (!isReadOnly) {
            document.querySelectorAll('#schedule-table-body .btn-delete').forEach(button => {
                button.onclick = (e) => deleteScheduleItem(e.target.dataset.id);
            });
        }
    } else { 
        const colspan = isReadOnly ? '4' : '5';
        scheduleBody.innerHTML = `<tr><td colspan="${colspan}">No schedule available for this event.</td></tr>`; 
    }
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
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    });
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
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/schedule`, { 
                method: 'POST', 
                headers: getAuthHeaders(), 
                body: JSON.stringify(data) 
            });
            showMessage(await response.json(), response.ok, 'schedule-form-message');
            if (response.ok) { form.reset(); loadEventDetails(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}

async function deleteScheduleItem(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule item?')) return;
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    showMessage(await response.json(), response.ok, 'schedule-list-message');
    if (response.ok) loadEventDetails();
}

function setupRegisterForm(eventId, basePrice, isParticipant) {
    const form = document.getElementById('register-form');
    if (!form) return;
    
    // If already set up, just return
    if (form.dataset.listenerAttached === 'true') {
        return;
    }
    
    const ticketTypeSelect = document.getElementById('regTicketType');
    const priceDisplay = document.getElementById('calculated-price');
    const fullNameInput = document.getElementById('regFullName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    
    // Auto-fill and lock fields for participants
    if (isParticipant) {
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        
        if (fullNameInput && userName) {
            fullNameInput.value = userName;
            fullNameInput.readOnly = true;
            fullNameInput.style.backgroundColor = '#f0f0f0';
        }
        
        if (emailInput && userEmail) {
            emailInput.value = userEmail;
            emailInput.readOnly = true;
            emailInput.style.backgroundColor = '#f0f0f0';
        }
        
        // Hide phone field for participants (optional)
        if (phoneInput) {
            phoneInput.parentElement.style.display = 'none';
        }
    }
    
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
            
            // Prevent double submission with global flag
            if (isSubmitting) {
                console.log('Already submitting, ignoring duplicate request');
                return;
            }
            
            isSubmitting = true;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn.disabled) {
                isSubmitting = false;
                return;
            }
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Processing...';
            
            console.log('Starting registration submission...');
            
            const finalPrice = parseFloat(priceDisplay.textContent.replace('$', ''));
            const data = { 
                EventID: eventId, 
                FullName: fullNameInput.value, 
                Email: emailInput.value, 
                Phone: phoneInput ? phoneInput.value : '', 
                TicketType: ticketTypeSelect.value, 
                Price: finalPrice 
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/tickets/register`, { 
                    method: 'POST', 
                    headers: getAuthHeaders(), 
                    body: JSON.stringify(data) 
                });
                const result = await response.json();
                showMessage(result, response.ok, 'register-form-message');
                
                if (response.ok) { 
                    if (isParticipant) {
                        // Redirect to payment page for participants
                        const ticketId = result.ticketId;
                        if (confirm('Registration initiated! Click OK to proceed to payment.')) {
                            window.location.href = `payment.html?ticketId=${ticketId}`;
                        } else {
                            window.location.href = 'my-events.html';
                        }
                    } else {
                        form.reset(); 
                        loadEventDetails();
                    }
                } else {
                    // Re-enable button on error
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    isSubmitting = false;
                }
            } catch (error) {
                console.error('Registration error:', error);
                showMessage({error: error.message}, false, 'register-form-message');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                isSubmitting = false;
            }
        });
        form.dataset.listenerAttached = 'true';
    }
}

async function deleteRegistration(ticketId) {
    if (!confirm('Are you sure you want to cancel this registration?')) return;
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    showMessage(await response.json(), response.ok, 'attendee-list-message');
    if (response.ok) loadEventDetails();
}

async function populateAddEventForm() {
    const venueSelect = document.getElementById('venue');
    const organizerSelect = document.getElementById('organizer');
    try {
        const venuesRes = await fetch(`${API_BASE_URL}/venues`, {
            headers: getAuthHeaders()
        });
        const venues = await venuesRes.json();
        venueSelect.innerHTML = '<option value="">Select a Venue</option>';
        venues.forEach(v => { venueSelect.innerHTML += `<option value="${v.VenueID}">${v.VenueName}</option>`; });
        const organizersRes = await fetch(`${API_BASE_URL}/organizers`, {
            headers: getAuthHeaders()
        });
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
            const response = await fetch(`${API_BASE_URL}/events`, { 
                method: 'POST', 
                headers: getAuthHeaders(), 
                body: JSON.stringify(data) 
            });
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
    const eventRes = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        headers: getAuthHeaders()
    });
    const eventData = await eventRes.json();
    const details = eventData.details;
    document.getElementById('eventName').value = details.EventName;
    document.getElementById('eventType').value = details.EventType;
    document.getElementById('startDate').value = formatDate(details.StartDate);
    document.getElementById('endDate').value = formatDate(details.EndDate);
    document.getElementById('price').value = parseFloat(details.Price).toFixed(2);
    const venueSelect = document.getElementById('venue');
    const organizerSelect = document.getElementById('organizer');
    const venuesRes = await fetch(`${API_BASE_URL}/venues`, {
        headers: getAuthHeaders()
    });
    const venues = await venuesRes.json();
    venues.forEach(v => { venueSelect.innerHTML += `<option value="${v.VenueID}">${v.VenueName}</option>`; });
    const organizersRes = await fetch(`${API_BASE_URL}/organizers`, {
        headers: getAuthHeaders()
    });
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
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, { 
            method: 'PUT', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(data) 
        });
        showMessage(await response.json(), response.ok, 'form-message');
        if (response.ok) setTimeout(() => window.location.href = `event.html?id=${eventId}`, 1500);
    });
}

// --- [VENUE FUNCTIONS] ---
async function loadVenues() {
    const tableBody = document.getElementById('venues-table-body');
    const response = await fetch(`${API_BASE_URL}/venues`, {
        headers: getAuthHeaders()
    });
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
            const response = await fetch(`${API_BASE_URL}/venues`, { 
                method: 'POST', 
                headers: getAuthHeaders(), 
                body: JSON.stringify(data) 
            });
            showMessage(await response.json(), response.ok, 'form-message');
            if (response.ok) { form.reset(); loadVenues(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}

async function deleteVenue(venueId) {
    if (!confirm('Are you sure you want to delete this venue?')) return;
    const response = await fetch(`${API_BASE_URL}/venues/${venueId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    const result = await response.json();
    showMessage(result, response.ok, 'list-message');
    if (response.ok) loadVenues();
}

async function loadVenueForEditing() {
    const params = new URLSearchParams(window.location.search);
    const venueId = params.get('id');
    if (!venueId) { window.location.href = 'venues.html'; return; }
    const response = await fetch(`${API_BASE_URL}/venues/${venueId}`, {
        headers: getAuthHeaders()
    });
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
        const response = await fetch(`${API_BASE_URL}/venues/${venueId}`, { 
            method: 'PUT', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(data) 
        });
        showMessage(await response.json(), response.ok, 'form-message');
        if (response.ok) setTimeout(() => window.location.href = 'venues.html', 1500);
    });
}

// --- [ORGANIZER FUNCTIONS] ---
async function loadOrganizers() {
    const tableBody = document.getElementById('organizers-table-body');
    const response = await fetch(`${API_BASE_URL}/organizers`, {
        headers: getAuthHeaders()
    });
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
            const response = await fetch(`${API_BASE_URL}/organizers`, { 
                method: 'POST', 
                headers: getAuthHeaders(), 
                body: JSON.stringify(data) 
            });
            showMessage(await response.json(), response.ok, 'form-message');
            if (response.ok) { form.reset(); loadOrganizers(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}

async function deleteOrganizer(organizerId) {
    if (!confirm('Are you sure you want to delete this organizer?')) return;
    const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    const result = await response.json();
    showMessage(result, response.ok, 'list-message');
    if (response.ok) loadOrganizers();
}

async function loadOrganizerForEditing() {
    const params = new URLSearchParams(window.location.search);
    const organizerId = params.get('id');
    if (!organizerId) { window.location.href = 'organizers.html'; return; }
    const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`, {
        headers: getAuthHeaders()
    });
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
        const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`, { 
            method: 'PUT', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(data) 
        });
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
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
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
            const response = await fetch(`${API_BASE_URL}/attendees`, { 
                method: 'POST', 
                headers: getAuthHeaders(), 
                body: JSON.stringify(data) 
            });
            showMessage(await response.json(), response.ok, 'form-message');
            if (response.ok) { form.reset(); loadAttendees(); }
        });
        form.dataset.listenerAttached = 'true';
    }
}

async function deleteAttendee(attendeeId) {
    if (!confirm('Are you sure you want to delete this attendee? This will remove them from the system but not their past tickets.')) return;
    const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    const result = await response.json();
    showMessage(result, response.ok, 'list-message');
    if (response.ok) loadAttendees();
}

// Participant profile (self-service update)
async function loadProfilePage() {
    const form = document.getElementById('profile-form');
    const messageEl = document.getElementById('profile-message');
    if (!form) return;

    try {
        const meResp = await fetch(`${API_BASE_URL}/me`, { headers: getAuthHeaders() });
        if (!meResp.ok) throw new Error('Unable to load profile');
        const me = await meResp.json();

        // Only attendees have a profile page
        if (me.userType !== 'ATTENDEE') {
            window.location.href = 'index.html';
            return;
        }

        const attendeeId = me.userId;
        const detailsResp = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, { headers: getAuthHeaders() });
        const attendee = await detailsResp.json();
        const details = attendee.details || attendee;

        document.getElementById('profileFullName').value = details.FullName || '';
        document.getElementById('profileEmail').value = details.Email || '';
        document.getElementById('profilePhone').value = details.Phone || '';
        form.dataset.attendeeId = attendeeId;

        if (!form.dataset.listenerAttached) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    FullName: document.getElementById('profileFullName').value,
                    Email: document.getElementById('profileEmail').value,
                    Phone: document.getElementById('profilePhone').value
                };

                const resp = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(data)
                });
                const result = await resp.json();
                showMessage(result, resp.ok, 'profile-message');

                if (resp.ok) {
                    // Keep local storage in sync for auto-fill on registration
                    localStorage.setItem('userName', data.FullName);
                    localStorage.setItem('userEmail', data.Email);
                }
            });
            form.dataset.listenerAttached = 'true';
        }
    } catch (error) {
        showMessage({ error: error.message }, false, 'profile-message');
    }
}

async function loadAttendeeForEditing() {
    const params = new URLSearchParams(window.location.search);
    const attendeeId = params.get('id');
    if (!attendeeId) { window.location.href = 'attendees.html'; return; }
    const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, {
        headers: getAuthHeaders()
    });
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
        const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, { 
            method: 'PUT', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(data) 
        });
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
        const response = await fetch(`${API_BASE_URL}/attendees/${attendeeId}`, {
            headers: getAuthHeaders()
        });
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
        const response = await fetch(`${API_BASE_URL}/organizers/${organizerId}`, {
            headers: getAuthHeaders()
        });
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