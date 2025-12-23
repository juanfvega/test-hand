const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

// Base URL for API
const API_URL = `http://${window.location.hostname}:8000`;

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    errorMsg.textContent = "Verifying...";

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Login successful
            sessionStorage.setItem('admin_token', data.token);
            window.location.href = '/admin.html';
        } else {
            // Login failed
            errorMsg.textContent = data.detail || "Invalid credentials.";
        }
    } catch (error) {
        console.error("Login Error:", error);
        errorMsg.textContent = "Server error. Is backend running?";
    }
});
