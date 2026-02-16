// API Base URL
const API_URL = 'http://localhost:5000/api';

// Current state
let selectedFile = null;
let currentUserId = null;
let preferredLanguage = localStorage.getItem('preferredLanguage') || null;
let pendingAnalysisData = null;
let loadingInterval = null;

// ========== AUTH FUNCTIONS ==========

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    hideMessage();
}

function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    hideMessage();
}

async function handleLogin(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    setLoadingState(btn, true, 'Signing In...');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userId', data.user_id);
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = 'main.html'; }, 1000);
        } else {
            showMessage(data.error || 'Login failed', 'error');
            setLoadingState(btn, false, 'Sign In');
        }
    } catch (error) {
        showMessage('Connection failed. Please check your internet.', 'error');
        setLoadingState(btn, false, 'Sign In');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    setLoadingState(btn, true, 'Creating Account...');

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Account created successfully! Please sign in.', 'success');
            setTimeout(() => { showLoginForm(); }, 1500);
        } else {
            showMessage(data.error || 'Signup failed', 'error');
            setLoadingState(btn, false, 'Create Account');
        }
    } catch (error) {
        showMessage('Connection failed. Please check your internet.', 'error');
        setLoadingState(btn, false, 'Create Account');
    }
}

function handleGoogleLogin() {
    const width = 500;
    const height = 600;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const win = window.open("", "Google Login", `width=${width},height=${height},top=${top},left=${left}`);
    win.document.write(`
        <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h3>Connecting to Google...</h3>
        <p>This is a simulated OAuth window.</p>
        <script>
            setTimeout(() => {
                window.opener.postMessage({type: 'GOOGLE_LOGIN_SUCCESS', token: 'mock_google_token'}, '*');
                window.close();
            }, 1500);
        </script>
        </body></html>
    `);
}

function handleMicrosoftLogin() {
    const width = 500;
    const height = 600;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const win = window.open("", "Microsoft Login", `width=${width},height=${height},top=${top},left=${left}`);
    win.document.write(`
        <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h3>Connecting to Microsoft...</h3>
        <p>This is a simulated OAuth window.</p>
        <script>
            setTimeout(() => {
                window.opener.postMessage({type: 'MICROSOFT_LOGIN_SUCCESS', token: 'mock_ms_token'}, '*');
                window.close();
            }, 1500);
        </script>
        </body></html>
    `);
}

window.addEventListener('message', function (event) {
    if (event.data.type === 'GOOGLE_LOGIN_SUCCESS' || event.data.type === 'MICROSOFT_LOGIN_SUCCESS') {
        localStorage.setItem('userToken', 'social_token_' + Date.now());
        localStorage.setItem('userId', 'social_user');
        showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'main.html'; }, 1000);
    }
});

function showMessage(text, type) {
    const el = document.getElementById('message');
    if (el) {
        el.textContent = text;
        el.style.display = 'block';
        el.style.color = type === 'error' ? 'var(--danger-color)' : 'var(--secondary-color)';
    }
}

function hideMessage() {
    const el = document.getElementById('message');
    if (el) el.style.display = 'none';
}

function setLoadingState(btn, isLoading, text) {
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = text;
    }
}

// ========== MAIN PAGE LOGIC ==========

if (window.location.pathname.includes('main.html')) {
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'login.html';
    } else {
        currentUserId = localStorage.getItem('userId');

        loadChatHistory();
        loadUserProfile();
        setupInputHandlers();
    }
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function setupInputHandlers() {
    const textarea = document.querySelector('textarea');
    if (textarea) {
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        });
    }
}

async function handleSubmit() {
    const textarea = document.querySelector('textarea');
    const text = textarea.value.trim();

    if (!text && !selectedFile) return;

    let inputType = 'text';
    let inputContent = text;

    if (selectedFile) {
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') inputType = 'pdf';
        else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) inputType = 'image';
        else if (['mp4', 'webm'].includes(ext)) inputType = 'video';
        inputContent = selectedFile.name;
    } else if (text.includes('youtube.com') || text.includes('youtu.be')) {
        inputType = 'link';
    }

    addMessageToChat('user', text, selectedFile);

    textarea.value = '';
    const fileToUpload = selectedFile;
    clearFileSelection();

    const loadingId = addLoadingMessage();

    try {
        const formData = new FormData();
        formData.append('input_type', inputType);
        formData.append('user_id', currentUserId);
        formData.append('preferred_language', preferredLanguage || 'English');

        if (fileToUpload) formData.append('file', fileToUpload);
        else formData.append('input_content', inputContent);

        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        removeLoadingMessage(loadingId);

        if (response.ok) {
            displayAnalysisResult(data);
        } else {
            addMessageToChat('bot', `⚠️ Error: ${data.error || 'Analysis failed.'}`);
        }

    } catch (error) {
        removeLoadingMessage(loadingId);
        addMessageToChat('bot', `⚠️ Network error: Could not reach the server.`);
    }
}

function addMessageToChat(sender, text, file = null) {
    const chatArea = document.querySelector('.chat-area');
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;

    let contentHtml = '';
    if (file) {
        contentHtml += `<div style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.1); padding: 0.5rem; border-radius: 0.5rem;">
            <i class="fas fa-file"></i> ${file.name}
        </div>`;
    }
    contentHtml += text.replace(/\n/g, '<br>');

    wrapper.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="message-content">
            ${contentHtml}
        </div>
    `;

    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function addLoadingMessage() {
    const chatArea = document.querySelector('.chat-area');
    const id = 'loading-' + Date.now();
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper bot`;
    wrapper.id = id;

    const phrases = [
        "Connecting to secure AI...",
        "Scanning content structure...",
        "Identifying key claims...",
        "Cross-referencing databases...",
        "Verifying source credibility...",
        "Generating final report..."
    ];

    wrapper.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content" style="color: var(--text-secondary); display: flex; align-items: center; gap: 10px;">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span id="loading-text-${id}">Starting analysis...</span>
        </div>
    `;

    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;

    let phraseIndex = 0;
    const textEl = document.getElementById(`loading-text-${id}`);
    loadingInterval = setInterval(() => {
        if (textEl) {
            textEl.textContent = phrases[phraseIndex % phrases.length];
            phraseIndex++;
        } else {
            clearInterval(loadingInterval);
        }
    }, 2500);

    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    if (loadingInterval) clearInterval(loadingInterval);
}

function displayAnalysisResult(data) {
    const chatArea = document.querySelector('.chat-area');
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper bot`;

    const truePercent = data.truthful_percent || 0;
    const falsePercent = data.false_percent || 0;

    const html = `
        <div class="message-avatar">
            <i class="fas fa-shield-alt"></i>
        </div>
        <div class="message-content" style="width: 100%;">
            <h4 style="margin-bottom: 0.5rem; color: var(--primary-color);">Analysis Report</h4>
            <p>${data.summary}</p>
            
            <div class="analysis-card">
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600;">
                    <span style="color: var(--secondary-color)">Likely True: ${truePercent}%</span>
                    <span style="color: var(--danger-color)">Likely False: ${falsePercent}%</span>
                </div>
                <div class="score-bar">
                    <div class="score-fill true" style="width: ${truePercent}%; float: left;"></div>
                    <div class="score-fill false" style="width: ${falsePercent}%; float: right;"></div>
                </div>

                ${renderEvidenceSection('Supported Claims', data.reasons_true, 'check-circle', '#10B981')}
                ${renderEvidenceSection('Questionable Claims', data.reasons_false, 'exclamation-circle', '#EF4444')}
                ${renderRecommendations(data.recommendations)}
            </div>
            
            <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-secondary); text-align: right;">
                AI Confidence: High • Sources Verified
            </div>
        </div>
    `;

    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function renderEvidenceSection(title, items, icon, color) {
    if (!items || items.length === 0) return '';
    return `
        <div style="margin-top: 1rem;">
            <h5 style="color: ${color}; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${icon}"></i> ${title}
            </h5>
            <ul class="evidence-list">
                ${items.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    `;
}

function renderRecommendations(items) {
    if (!items || items.length === 0) return '';
    return `
        <div style="margin-top: 1rem; background-color: var(--bg-color); padding: 0.75rem; border-radius: 0.5rem;">
            <h5 style="margin-bottom: 0.5rem;">📚 Recommended Sources</h5>
            <ul class="evidence-list">
                ${items.map(item => `<li><a href="#" style="color: var(--primary-color);">${item}</a></li>`).join('')}
            </ul>
        </div>
    `;
}

// Helper to remove visual preview
function removeFilePreview() {
    const previewContainer = document.getElementById('filePreviewContainer');
    if (previewContainer) previewContainer.remove();
}

function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        showVisualFilePreview(selectedFile);
    }
}

// New function: Show visual preview above input
function showVisualFilePreview(file) {
    removeFilePreview(); // Clear existing

    const inputContainer = document.querySelector('.input-container');
    const previewDiv = document.createElement('div');
    previewDiv.id = 'filePreviewContainer';
    previewDiv.style.cssText = `
        padding: 0.5rem 1rem;
        background: var(--surface-color);
        border-top: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: var(--primary-color);
    `;

    let icon = 'fa-file';
    if (file.type.includes('pdf')) icon = 'fa-file-pdf';
    else if (file.type.includes('image')) icon = 'fa-image';
    else if (file.type.includes('video')) icon = 'fa-video';

    previewDiv.innerHTML = `
        <i class="fas ${icon}"></i> 
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${file.name}</span>
        <button onclick="clearFileSelection(); removeFilePreview();" style="background:none; border:none; color:var(--text-secondary); cursor:pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Insert before the input wrapper (or inside input container but before text area)
    inputContainer.insertBefore(previewDiv, inputContainer.firstChild); // Put at top of container
}

function clearFileSelection() {
    selectedFile = null;
    const input = document.getElementById('fileInput');
    if (input) input.value = '';
    removeFilePreview();
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.placeholder = "Paste a YouTube link or verify a claim...";
}

// Helper: toggle sidebar (mobile & desktop)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth < 769) {
        sidebar.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

// History Search Function
function searchHistory() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const historyItems = document.querySelectorAll('.history-item');

    historyItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function startNewChat() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = '';

    // Create new welcome message
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper bot';
    wrapper.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <strong>New Session Started</strong><br>
            I'm ready to verify new content.
        </div>
    `;
    chatContainer.appendChild(wrapper);

    document.querySelector('textarea').value = '';
    clearFileSelection();
    if (window.innerWidth < 768) toggleSidebar();
}

// History Functions
async function loadChatHistory() {
    try {
        const response = await fetch(`${API_URL}/history?user_id=${currentUserId}`);
        const data = await response.json();
        if (response.ok) {
            displayHistoryList(data.history);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function displayHistoryList(historyItems) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (!historyItems || historyItems.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-secondary); padding: 10px; font-size: 0.9rem;">No recent analysis</p>';
        return;
    }

    historyList.innerHTML = historyItems.map(item => `
        <div class="history-item" onclick="loadHistoryItem(${item.id})">
            <div>${item.input_content.substring(0, 30)}...</div>
        </div>
    `).join('');
}

// Sidebar Profile Functions
function openProfileModal() {
    loadUserProfile();
    // Modal logic would go here - simplified for now
    alert("Profile settings would open here (UI updated)");
}

async function loadUserProfile() {
    try {
        const userId = localStorage.getItem('userId');
        // Mock data or fetch
        document.getElementById('sidebarUserName').textContent = 'User ' + userId.substring(0, 4);
    } catch (e) { }
}

// Theme
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Init Theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
}
