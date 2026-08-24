import { setAuthToken, setCurrentUser, isAuthenticated } from './auth.js';
import { login, getCurrentUser } from './api.js';
import { logError } from './utils.js';

export function renderLoginPage(container) {
    container.innerHTML = `
        <div class="auth-page">
            <h2>Logga in</h2>
            <div id="login-error" class="error-message" style="display: none;"></div>
            <form id="login-form">
                <div class="form-group">
                    <label for="login-username">Användarnamn</label>
                    <input 
                        type="text" 
                        id="login-username" 
                        name="username" 
                        required 
                        minlength="3"
                        maxlength="12"
                        autocomplete="username"
                    >
                </div>
                <div class="form-group">
                    <label for="login-password">Lösenord</label>
                    <input 
                        type="password" 
                        id="login-password" 
                        name="password" 
                        required 
                        minlength="8"
                        maxlength="50"
                        autocomplete="current-password"
                    >
                </div>
                <button type="submit" class="btn btn-primary">Logga in</button>
            </form>
            <div class="auth-link">
                <p>Har du inget konto? <a href="#/register">Registrera dig</a></p>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError(errorDiv, 'Användarnamn och lösenord krävs');
        return;
    }

    if (username.length < 3 || username.length > 12) {
    showError(errorDiv, 'Ogiltiga inloggningsuppgifter.');
    return;
    }

    if (password.length < 8 || password.length > 50) {
        showError(errorDiv, 'Ogiltiga inloggningsuppgifter.');
        return;
    }

    try {
        const response = await login(username, password);

        if (response.status === 'SUCCESS') {
            setAuthToken(response.message);

            const userData = await getCurrentUser();
            if (userData.users && userData.users.length > 0) {
                setCurrentUser(userData.users[0]);
            }

            window.location.hash = '/dashboard';
        } else {
            showError(errorDiv, response.message || 'Inloggning misslyckades');
        }
    } catch (error) {
        showError(errorDiv, 'Något gick fel. Försök igen.');
        logError('Login', error);
    }
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}
