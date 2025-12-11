// Login/registration flows for organizers and attendees. Stores auth token in localStorage.
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Show/hide registration form
function toggleRegisterForm() {
    const form = document.getElementById('register-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

// Show message
function showMessage(messageText, isSuccess, elementId) {
    const msgDiv = document.getElementById(elementId);
    if (!msgDiv) return;
    msgDiv.textContent = messageText;
    msgDiv.className = 'message';
    msgDiv.classList.add(isSuccess ? 'success' : 'error');
    msgDiv.style.display = 'block';
    setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
}

// Admin Login
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                userType: 'ORGANIZER'
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userType', data.userType);
            localStorage.setItem('userName', data.userName);
            localStorage.setItem('userEmail', email);
            window.location.href = 'index.html';
        } else {
            showMessage(data.error || 'Login failed', false, 'admin-message');
        }
    } catch (error) {
        showMessage('Error connecting to server', false, 'admin-message');
    }
});

// Participant Login
document.getElementById('participant-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('participant-email').value;
    const password = document.getElementById('participant-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                userType: 'ATTENDEE'
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userType', data.userType);
            localStorage.setItem('userName', data.userName);
            localStorage.setItem('userEmail', email);
            window.location.href = 'participant-dashboard.html';
        } else {
            showMessage(data.error || 'Login failed', false, 'participant-message');
        }
    } catch (error) {
        showMessage('Error connecting to server', false, 'participant-message');
    }
});

// Register Participant
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password !== passwordConfirm) {
        showMessage('Passwords do not match', false, 'register-message');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName,
                email,
                phone,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Registration successful! Please log in.', true, 'register-message');
            setTimeout(() => {
                document.getElementById('register-form').reset();
                toggleRegisterForm();
                document.getElementById('participant-email').value = email;
                document.getElementById('participant-password').focus();
            }, 2000);
        } else {
            showMessage(data.error || 'Registration failed', false, 'register-message');
        }
    } catch (error) {
        showMessage('Error connecting to server', false, 'register-message');
    }
});

// Check if already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        const userType = localStorage.getItem('userType');
        if (userType === 'ORGANIZER') {
            window.location.href = 'index.html';
        } else if (userType === 'ATTENDEE') {
            window.location.href = 'participant-dashboard.html';
        }
    }
});