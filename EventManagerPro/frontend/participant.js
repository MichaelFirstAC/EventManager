// Participant-facing interactions: browse events, view own tickets, cancel/confirm flows.
// Relies on API_BASE_URL and getAuthHeaders() defined in main.js.

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Route participant pages: dashboard lists events, my-events shows own tickets
    if (path.endsWith('participant-dashboard.html') || path.endsWith('/')) {
        setupEventSearch();
        loadParticipantEvents();
    } else if (path.endsWith('my-events.html')) {
        loadMyEvents();
    }
});

function setupEventSearch() {
    const searchBtn = document.getElementById('event-search-btn');
    const searchInput = document.getElementById('event-search-input');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => loadParticipantEvents());
        searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadParticipantEvents(); });
    }
}

async function loadParticipantEvents() {
    const grid = document.getElementById('events-grid');
    const searchInput = document.getElementById('event-search-input');
    const searchTerm = searchInput ? searchInput.value : '';
    
    // Build API URL with optional search term
    let url = `${API_BASE_URL}/events`;
    if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;

    try {
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        const events = await response.json();
        
        grid.innerHTML = '';
        
        if (events.length === 0) {
            grid.innerHTML = '<p>No events found.</p>';
            return;
        }
        
        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const startDate = new Date(event.StartDate).toISOString().split('T')[0];
            
            // Simple card layout; button navigates to detail page
            card.innerHTML = `
                <h3>${event.EventName}</h3>
                <p><strong>Date:</strong> ${startDate}</p>
                <p><strong>Location:</strong> ${event.City}</p>
                <button class="btn" onclick="window.location.href='event.html?id=${event.EventID}'">View Details</button>
            `;
            
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = '<p>Error loading events. Please try again later.</p>';
    }
}

async function loadMyEvents() {
    const tableBody = document.getElementById('my-events-body');
    
    try {
        const response = await fetch(`${API_BASE_URL}/my-events`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            document.getElementById('my-events-message').textContent = 'Failed to load events.';
            return;
        }
        
        const events = await response.json();
        tableBody.innerHTML = '';
        
        if (events.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7">You have not registered for any events yet.</td></tr>';
            return;
        }
        
        events.forEach(event => {
            const row = tableBody.insertRow();
            const startDate = new Date(event.StartDate).toISOString().split('T')[0];
            
            // Determine status badge and action button
            let statusBadge = '';
            let actionButton = '';
            
            if (event.RegistrationStatus === 'PENDING') {
                statusBadge = '<span style="background: #ffc107; color: #000; padding: 3px 8px; border-radius: 4px; font-size: 12px;">PENDING</span>';
                actionButton = `<button class="btn" style="background: #28a745;" onclick="window.location.href='payment.html?ticketId=${event.TicketID}'">Confirm Payment</button>`;
            } else if (event.RegistrationStatus === 'CONFIRMED') {
                statusBadge = '<span style="background: #28a745; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 12px;">✓ CONFIRMED</span>';
                actionButton = `<button class="btn-delete" onclick="cancelRegistration(${event.TicketID})">Cancel</button>`;
            } else {
                statusBadge = '<span style="background: #6c757d; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 12px;">CANCELLED</span>';
                actionButton = '';
            }
            
            row.innerHTML = `
                <td data-label="Event"><a href="event.html?id=${event.EventID}">${event.EventName}</a></td>
                <td data-label="Date">${startDate}</td>
                <td data-label="Location">${event.City}</td>
                <td data-label="Ticket Type">${event.TicketType}</td>
                <td data-label="Price">$${parseFloat(event.Price).toFixed(2)}</td>
                <td data-label="Status">${statusBadge}</td>
                <td data-label="Actions">${actionButton}</td>
            `;
        });
    } catch (error) {
        document.getElementById('my-events-message').textContent = 'Error loading your events.';
    }
}

async function cancelRegistration(ticketId) {
    if (!confirm('Are you sure you want to cancel this registration? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Registration cancelled successfully.');
            loadMyEvents();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to cancel registration.');
        }
    } catch (error) {
        alert('Error canceling registration: ' + error.message);
    }
}