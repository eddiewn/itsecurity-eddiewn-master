import { getMessages, sendMessage, searchUsers } from './api.js';
import { getCurrentUser, isAuthenticated } from './auth.js';
import { logError, sanitizeHtml } from './utils.js';

let selectedUserId = null;
let selectedUserName = null;

export async function renderDashboard(container) {
    if (!isAuthenticated()) {
        window.location.hash = '/login';
        return;
    }

    const currentUser = getCurrentUser();

    container.innerHTML = `
        <div class="dashboard">
            <div class="card">
                <h3>Hitta användare</h3>
                <div class="search-bar">
                    <input type="text" id="user-search" minlength="1" maxlength="12" placeholder="Sök användare..." autocomplete="off">
                    <button id="search-btn" class="btn btn-secondary">Sök</button>
                </div>
                <div id="user-results" class="user-list"></div>
            </div>
            
            <div class="card">
                <h3>Skicka meddelande</h3>
                <div id="selected-user-info" style="margin-bottom: 1rem; color: #666;">
                    Välj en användare för att skicka meddelande
                </div>
                <form id="send-message-form" class="send-message-form">
                    <textarea 
                        id="message-text" 
                        placeholder="Skriv ditt meddelande här..."
                        required
                        minlength="1"
                        maxlength="50"
                    ></textarea>
                    <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem;" id="send-btn" disabled>
                        Skicka
                    </button>
                </form>
            </div>
            
            <div class="card full-width">
                <h3>Dina meddelanden</h3>
                <div id="loading-messages" class="loading">Laddar meddelanden...</div>
                <div id="message-list" class="message-list"></div>
            </div>
        </div>
    `;

    document.getElementById('search-btn').addEventListener('click', handleUserSearch);
    
    let searchTimeout;
    document.getElementById('user-search').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(handleUserSearch, 500);
    });

    document.getElementById('send-message-form').addEventListener('submit', handleSendMessage);

    await loadMessages();
}

async function handleUserSearch() {
    const searchInput = document.getElementById('user-search');
    const resultsDiv = document.getElementById('user-results');
    const searchTerm = searchInput.value.trim();

    if (searchTerm.length < 1 ||searchTerm.length > 12) {
        resultsDiv.innerHTML = '<p style="color: #666;">Skriv mellan 1 till 12 tecken för att söka</p>';
        return;
    }


    resultsDiv.innerHTML = '<div class="loading" style="padding: 1rem;">Söker...</div>';

    try {
        const response = await searchUsers(searchTerm);

        if (response.users && response.users.length > 0) {
            resultsDiv.innerHTML = response.users.map(user => `
                <div class="user-item">
                    <span>${sanitizeHtml(user.username)}</span>
                    <button class="btn btn-secondary"
                            onclick="selectUser(${user.id}, '${sanitizeHtml(user.username)}')">
                        Välj
                    </button>
                </div>
            `).join('');
        } else {
            resultsDiv.innerHTML = '<p style="color: #666;">Inga användare hittades</p>';
        }
    } catch (error) {
        resultsDiv.innerHTML = '<p style="color: #e74c3c;">Sökning misslyckades. Försök igen.</p>';
        logError('User Search', error);
    }
}

window.selectUser = function(userId, username) {
    selectedUserId = userId;
    selectedUserName = username;
    
    const infoDiv = document.getElementById('selected-user-info');
    const sendBtn = document.getElementById('send-btn');
    
    const sendsToText = document.createTextNode(`Skickar till: `)
    const boldUsername = document.createElement("strong");
    boldUsername.textContent = username;
    infoDiv.replaceChildren(sendsToText, boldUsername);
    sendBtn.disabled = false;
    
    document.getElementById('message-text').focus();
};

async function handleSendMessage(event) {
    event.preventDefault();

    const messageInput = document.getElementById('message-text');
    const sendBtn = document.getElementById('send-btn');
    const currentUser = getCurrentUser();

    if (!selectedUserId) {
        alert('Vänligen välj en mottagare först.');
        return;
    }

    const messageText = messageInput.value.trim();

    if (messageText.length < 1 || messageText.length > 50) {
        alert("Skicka något mellan 1 och 50 tecken")
        return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Skickar...';

    try {
        const response = await sendMessage(currentUser.id, selectedUserId, messageText);

        if (response.status === 'SUCCESS') {
            messageInput.value = '';
            await loadMessages();
        } else {
            alert(response.message || 'Meddelandet kunde inte skickas.');
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('Ett fel uppstod vid skickandet av meddelandet.');
        logError('Send Message', error);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Skicka';
    }
}

async function loadMessages() {
    const loadingDiv = document.getElementById('loading-messages');
    const messageListDiv = document.getElementById('message-list');
    const currentUser = getCurrentUser();

    try {
        const response = await getMessages();

        loadingDiv.style.display = 'none';

        if (!response.messages || response.messages.length === 0) {
            messageListDiv.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">Inga meddelanden än.</p>';
            return;
        }

        messageListDiv.innerHTML = response.messages.map(msg => {
            const isOwnMessage = msg.from === currentUser.id;
            const senderName = isOwnMessage ? 'Du' : msg.fromUsername;
            
            return `
                <div class="message-item" style="${isOwnMessage ? 'border-left-color: #2ecc71;' : ''}">
                    <div class="sender">${sanitizeHtml(senderName)} ${isOwnMessage ? '(du)' : ''}</div>
                    <div class="text">${sanitizeHtml(msg.message)}</div>
                </div>
            `;
        }).reverse().join(''); 

    } catch (error) {
        loadingDiv.style.display = 'none';
        messageListDiv.innerHTML = '<p style="color: #e74c3c; text-align: center;">Kunde inte ladda meddelanden.</p>';
        logError('Load Messages', error);
    }
}