// API Base URL
const API_URL = 'http://localhost:5000/api';

// Current state
let selectedFile = null;
let currentUserId = null;
let preferredLanguage = localStorage.getItem('preferredLanguage') || null;
let pendingAnalysisData = null;

// ========== AUTH FUNCTIONS ==========

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('message').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('message').style.display = 'none';
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userId', data.user_id);
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = 'main.html';
            }, 1000);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Account created! Please login.', 'success');
            setTimeout(() => {
                showLoginForm();
            }, 1500);
        } else {
            showMessage(data.error || 'Signup failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Signup error:', error);
    }
}

function handleGoogleLogin() {
    // Simulated Google login - creates a guest account
    localStorage.setItem('userToken', 'guest_token_' + Date.now());
    localStorage.setItem('userId', 'guest');
    window.location.href = 'main.html';
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
}

function handleLogout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('preferredLanguage');
    window.location.href = 'login.html';
}

// ========== MAIN PAGE FUNCTIONS ==========

// Check authentication on main page load
if (window.location.pathname.includes('main.html')) {
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'login.html';
    } else {
        currentUserId = localStorage.getItem('userId');
        loadChatHistory();
        loadUserProfile(); // Load profile on start
        applyTheme();
    }
}

// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function startNewChat() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to Verify with AI!</h2>
            <p>Upload a video, PDF, or image, or paste a YouTube link to analyze content for truthfulness.</p>
        </div>
    `;
    document.getElementById('textInput').value = '';
    clearFileSelection();
    toggleSidebar();
}

// User Profile Functions
function openProfileModal() {
    loadUserProfile();
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('sidebar').classList.remove('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    document.getElementById('profileMessage').style.display = 'none';
}

async function loadUserProfile() {
    try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`${API_URL}/user/profile?user_id=${userId}`);
        const user = await response.json();

        if (response.ok) {
            // Update modal
            document.getElementById('profileName').value = user.name;
            document.getElementById('profileEmail').value = user.email;

            // Update avatars
            updateAvatarDisplays(user.profile_pic, user.name);

            // Update sidebar
            document.getElementById('sidebarUserName').textContent = user.name;
            document.getElementById('sidebarUserEmail').textContent = user.email;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function updateAvatarDisplays(profilePic, name) {
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const modalAvatar = document.getElementById('profileAvatarLarge');

    const avatarHtml = profilePic
        ? `<img src="${profilePic}" alt="${name}">`
        : `<i class="fas fa-user"></i>`;

    sidebarAvatar.innerHTML = avatarHtml;
    modalAvatar.innerHTML = avatarHtml;
}

async function handleAvatarSelect() {
    const input = document.getElementById('avatarInput');
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Image = e.target.result;
        // Show preview in modal
        document.getElementById('profileAvatarLarge').innerHTML = `<img src="${base64Image}">`;
    };
    reader.readAsDataURL(file);
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('saveProfileBtn');
    const msgEl = document.getElementById('profileMessage');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const avatarImg = document.getElementById('profileAvatarLarge').querySelector('img');
    const profile_pic = avatarImg ? avatarImg.src : null;

    try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`${API_URL}/user/profile/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                name: name,
                email: email,
                profile_pic: profile_pic
            })
        });

        const data = await response.json();

        if (response.ok) {
            msgEl.textContent = 'Profile updated successfully!';
            msgEl.className = 'message success';
            msgEl.style.display = 'block';

            // Update local displays
            document.getElementById('sidebarUserName').textContent = name;
            document.getElementById('sidebarUserEmail').textContent = email;
            if (profile_pic) {
                document.getElementById('sidebarAvatar').innerHTML = `<img src="${profile_pic}">`;
            }

            setTimeout(closeProfileModal, 1500);
        } else {
            msgEl.textContent = data.error || 'Update failed';
            msgEl.className = 'message error';
            msgEl.style.display = 'block';
        }
    } catch (error) {
        msgEl.textContent = 'Network error. Please try again.';
        msgEl.className = 'message error';
        msgEl.style.display = 'block';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// Theme functions
function toggleTheme() {
    const isDark = document.getElementById('themeToggle').checked;
    if (isDark) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
}

function applyTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeToggle').checked = true;
    }
}

// File handling
function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    selectedFile = fileInput.files[0];

    if (selectedFile) {
        showFilePreview(selectedFile);
    }
}

function showFilePreview(file) {
    const preview = document.getElementById('filePreview');
    preview.innerHTML = `
        <div class="file-info">
            <span class="file-name">
                <i class="fas fa-file"></i> ${file.name}
            </span>
            <button class="remove-file" onclick="clearFileSelection()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    preview.classList.add('active');
}

function clearFileSelection() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').classList.remove('active');
}

async function handleSubmit(event) {
    event.preventDefault();

    const textInput = document.getElementById('textInput');
    const text = textInput.value.trim();

    if (!text && !selectedFile) {
        return;
    }

    // Determine input type and content
    let inputType, inputContent;

    if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop().toLowerCase();
        if (fileExt === 'pdf') {
            inputType = 'pdf';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            inputType = 'image';
        } else if (['mp4', 'avi', 'mov', 'webm'].includes(fileExt)) {
            inputType = 'video';
        }
        inputContent = selectedFile.name;
    } else if (text.includes('youtube.com') || text.includes('youtu.be')) {
        inputType = 'link';
        inputContent = text;
    } else {
        inputType = 'text';
        inputContent = text;
    }

    // Add user message to chat
    let displayContent = text;
    if (selectedFile) {
        const fileIcon = inputType === 'image' ? 'fa-image' : (inputType === 'pdf' ? 'fa-file-pdf' : 'fa-file-video');
        const fileHtml = `<div class="file-attachment"><i class="fas ${fileIcon}"></i> ${selectedFile.name}</div>`;
        displayContent = text ? `${text}<br>${fileHtml}` : fileHtml;
    }

    addMessageToChat('user', displayContent);

    // Save file reference and original text before clearing
    const fileToUpload = selectedFile;

    // Clear input
    textInput.value = '';
    clearFileSelection();

    // Show loading
    addLoadingMessage();

    // Send to API
    // If text and file exist, send text as part of input_content
    await analyzeContent(inputType, text || inputContent, fileToUpload);
}

function addMessageToChat(sender, content) {
    const chatContainer = document.getElementById('chatContainer');

    // Remove welcome message if exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    if (sender === 'user') {
        bubble.innerHTML = content;
    } else {
        bubble.innerHTML = content;
    }

    messageDiv.appendChild(bubble);
    chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLoadingMessage() {
    const chatContainer = document.getElementById('chatContainer');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot loading-message';
    messageDiv.id = 'loadingMessage';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = '<div class="loading"></div> Analyzing content...';

    messageDiv.appendChild(bubble);
    chatContainer.appendChild(messageDiv);

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeLoadingMessage() {
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) {
        loadingMsg.remove();
    }
}

async function analyzeContent(inputType, inputContent, fileToUpload = null) {
    try {
        const formData = new FormData();
        formData.append('input_type', inputType);
        formData.append('user_id', currentUserId);

        if (preferredLanguage) {
            formData.append('preferred_language', preferredLanguage);
        }

        if (fileToUpload) {
            formData.append('file', fileToUpload);
        } else {
            formData.append('input_content', inputContent);
        }

        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        removeLoadingMessage();

        if (response.ok) {
            // Check if language prompt is needed
            if (data.language_prompt_needed && !preferredLanguage) {
                pendingAnalysisData = data;
                showLanguageModal(data.detected_language);
            } else {
                displayAnalysisResult(data);
            }
        } else {
            addMessageToChat('bot', `<p style="color: var(--danger-color);">Error: ${data.error || 'Analysis failed'}</p>`);
        }
    } catch (error) {
        removeLoadingMessage();
        addMessageToChat('bot', '<p style="color: var(--danger-color);">Network error. Please check if the server is running.</p>');
        console.error('Analysis error:', error);
    }
}

function displayAnalysisResult(data) {
    let html = `
        <p><strong>Content Summary:</strong><br>${data.summary}</p>
        
        <div class="analysis">
            <div class="percentage-bar">
                <div class="percentage-label true">
                    <span>Truthful Content</span>
                    <span>${data.truthful_percent}%</span>
                </div>
                <div class="bar">
                    <div class="bar-fill true" style="width: ${data.truthful_percent}%"></div>
                </div>
            </div>
            
            <div class="percentage-bar">
                <div class="percentage-label false">
                    <span>False Content</span>
                    <span>${data.false_percent}%</span>
                </div>
                <div class="bar">
                    <div class="bar-fill false" style="width: ${data.false_percent}%"></div>
                </div>
            </div>
    `;

    // Add truthful evidence
    if (data.reasons_true && data.reasons_true.length > 0) {
        html += `
            <div class="evidence-section">
                <h4>✓ Truthful Content - Reasons & Evidence:</h4>
                <ul>
                    ${data.reasons_true.map(reason => `<li>${reason}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (data.evidence_true && data.evidence_true.length > 0) {
        html += `
            <div class="evidence-section">
                <h4>Sources (Truthful):</h4>
                <ul>
                    ${data.evidence_true.map(evidence => `<li>${evidence}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Add false evidence
    if (data.reasons_false && data.reasons_false.length > 0) {
        html += `
            <div class="evidence-section">
                <h4>✗ False Content - Reasons & Evidence:</h4>
                <ul>
                    ${data.reasons_false.map(reason => `<li>${reason}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (data.evidence_false && data.evidence_false.length > 0) {
        html += `
            <div class="evidence-section">
                <h4>Sources (False):</h4>
                <ul>
                    ${data.evidence_false.map(evidence => `<li>${evidence}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Add recommendations
    if (data.recommendations && data.recommendations.length > 0) {
        html += `
            <div class="recommendations">
                <h4>📚 Recommended Truthful Sources:</h4>
                <ul>
                    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    html += '</div>';

    addMessageToChat('bot', html);
}

// Language selection
function showLanguageModal(detectedLang) {
    const modal = document.getElementById('languageModal');
    const promptText = document.getElementById('languagePromptText');
    promptText.textContent = `Detected language: ${detectedLang}. In which language should I generate the response?`;
    modal.classList.add('active');
}

function selectLanguage(language) {
    preferredLanguage = language;
    localStorage.setItem('preferredLanguage', language);

    const modal = document.getElementById('languageModal');
    modal.classList.remove('active');

    // If we have pending analysis, resubmit with language preference
    if (pendingAnalysisData) {
        displayAnalysisResult(pendingAnalysisData);
        pendingAnalysisData = null;
    }
}

// Chat history
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

    if (!historyItems || historyItems.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No history yet</p>';
        return;
    }

    historyList.innerHTML = historyItems.map(item => `
        <div class="history-item" onclick="loadHistoryItem(${item.id})">
            <div>${item.input_content.substring(0, 50)}...</div>
            <div class="history-item-time">${new Date(item.timestamp).toLocaleDateString()}</div>
        </div>
    `).join('');
}

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

async function loadHistoryItem(id) {
    // This would load a specific chat - simplified for now
    toggleSidebar();
}
