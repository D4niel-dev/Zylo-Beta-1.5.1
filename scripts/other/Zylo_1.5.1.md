# Zylo v1.5.1 Plan 🏗

This update focuses on remaking the message input box to mirror the Gemini UI and integrating the new **Diszi** and **Zily** specialized modes.

Also, some small bug fixes. 🛠

## 1. Frontend UI Update (`mainapp.html`)
- Replace existing message input container in the AI Chat and remake it to use a pill-shaped container and includes a new dropdown menu for AI modes.

**Concept Code :**
```html
<div class="ai-input-wrapper">
    <div class="ai-input-container">
        <div class="mode-dropdown" id="modeDropdown">
            <button class="mode-toggle" id="modeToggle">
                <span id="currentModeDisplay">Diszi: Thinking</span>
                <i class="fas fa-chevron-up"></i>
            </button>
            <div class="mode-menu" id="modeMenu">
                <div class="mode-section">
                    <p class="section-label">Diszi</p>
                    <button class="mode-item" data-persona="Diszi" data-mode="Thinking">Thinking</button>
                    <button class="mode-item" data-persona="Diszi" data-mode="Planning">Planning</button>
                    <button class="mode-item" data-persona="Diszi" data-mode="Code">Code</button>
                </div>
                <div class="mode-section">
                    <p class="section-label">Zily</p>
                    <button class="mode-item" data-persona="Zily" data-mode="Thinking">Thinking</button>
                    <button class="mode-item" data-persona="Zily" data-mode="Explain">Explain</button>
                    <button class="mode-item" data-persona="Zily" data-mode="Review">Review</button>
                </div>
            </div>
        </div>

        <textarea 
            id="aiUserInput" 
            placeholder="Ask Zylo anything..." 
            rows="1"
            oninput="autoResize(this)"
        ></textarea>

        <button id="sendAiBtn" class="send-btn">
            <i class="fas fa-paper-plane"></i>
        </button>
    </div>
</div>
```

## 2. New AI UI/UX Design (`global.css`)
- Redesign the AI Chat UI with a translucent, rounded, and clean look.

**Concept Code :**
```css
:root {
    --ai-bg: rgba(255, 255, 255, 0.08);
    --ai-border: rgba(255, 255, 255, 0.1);
    --ai-accent: #8ab4f8; /* Gemini Blue */
}

.ai-input-wrapper {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 800px;
    z-index: 100;
}

.ai-input-container {
    background: var(--ai-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--ai-border);
    border-radius: 28px;
    padding: 10px 20px;
    display: flex;
    align-items: flex-end;
    gap: 12px;
    transition: box-shadow 0.3s ease;
}

.ai-input-container:focus-within {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    border-color: var(--ai-accent);
}

#aiUserInput {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-size: 16px;
    line-height: 24px;
    resize: none;
    max-height: 200px;
    padding: 8px 0;
}

.send-btn {
    background: transparent;
    border: none;
    color: var(--ai-accent);
    padding: 8px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: opacity 0.2s;
}

.send-btn:disabled {
    opacity: 0.3;
}

/* Dropdown Menu Styles */
.mode-dropdown {
    position: relative;
}

.mode-toggle {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 15px;
    padding: 5px 12px;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
}

.mode-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 15px;
    background: #1e1e1e;
    border: 1px solid var(--ai-border);
    border-radius: 12px;
    width: 180px;
    display: none; /* Hidden by default */
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
}

.mode-menu.active { display: block; }

.mode-section { padding: 8px 0; }
.section-label { 
    font-size: 10px; 
    text-transform: uppercase; 
    color: #777; 
    padding: 0 12px; 
    margin-bottom: 4px;
}

.mode-item {
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #eee;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
}

.mode-item:hover { background: rgba(255,255,255,0.05); color: var(--ai-accent); }
```

## 3. Frontend Logic Update (`ai-chat.js`)
- Update the logic so it can handles auto-resize, dropdown menu selection, and passing AI modes to Backend.

**Concept Code :**
```javascript
let selectedPersona = "Diszi";
let selectedMode = "Thinking";

// 1. Auto-resize textarea like Gemini
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// 2. Dropdown Toggle Logic
const modeToggle = document.getElementById('modeToggle');
const modeMenu = document.getElementById('modeMenu');

modeToggle.addEventListener('click', () => {
    modeMenu.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!document.getElementById('modeDropdown').contains(e.target)) {
        modeMenu.classList.remove('active');
    }
});

// 3. Handle Mode Selection
document.querySelectorAll('.mode-item').forEach(item => {
    item.addEventListener('click', () => {
        selectedPersona = item.getAttribute('data-persona');
        selectedMode = item.getAttribute('data-mode');
        
        document.getElementById('currentModeDisplay').innerText = `${selectedPersona}: ${selectedMode}`;
        modeMenu.classList.remove('active');
    });
});

// 4. Update Send Logic
async function sendAiMessage() {
    const input = document.getElementById('aiUserInput');
    const message = input.value.trim();
    
    if (!message) return;

    // Build payload with new features
    const payload = {
        message: message,
        persona: selectedPersona, // Diszi or Zily
        mode: selectedMode,       // Thinking, Planning, etc.
        timestamp: new Date().toISOString()
    };

    // --- Your existing Fetch logic to backend/ai ---
    // Example:
    // fetch('/api/ai/chat', { method: 'POST', body: JSON.stringify(payload) })
    
    console.log("Sending to Backend:", payload);
    
    // Clear and reset UI
    input.value = '';
    input.style.height = 'auto';
}

document.getElementById('sendAiBtn').addEventListener('click', sendAiMessage);
```

## 4. Backend Strategy (`backend/ai`)
- Update the prompt engineering to reflect selected modes.

**Concept :**
- **If Diszi + Planning** : Append "You are in planning mode. Break this down into actionable steps." to the system instructions.
- **If Zily + Review** : Append "You are in review mode. Critically analyze the following content." to the system instructions.

## 5. New icons
### Changing from `feather-icons` to `heroicons`:

1.  **Layout:** Add a new dropdown menu in `Appearance` settings name `Icons`, users can select which style of icons they want.

2.  **UI/UX:** Replace all of the old `feather-icons` to `heroicons` for a more modern look to the app.

3.  **Context:** The `heroicons` style will be set to be the default icons, if users want to change to the OG icons, they can change it in `Settings > Appearance > Icons`.

---

## 6. Additional Optimizations 🚀

### 6.1 HTML/Accessibility Improvements
**Add ARIA labels and keyboard navigation :**
```html
<div class="ai-input-wrapper" role="search" aria-label="AI Chat Interface">
    <div class="ai-input-container">
        <div class="mode-dropdown" id="modeDropdown">
            <button 
                class="mode-toggle" 
                id="modeToggle"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="modeMenu"
                aria-label="Select AI mode"
            >
                <span id="currentModeDisplay">Diszi: Thinking</span>
                <i class="fas fa-chevron-up" aria-hidden="true"></i>
            </button>
            <div 
                class="mode-menu" 
                id="modeMenu" 
                role="menu"
                aria-labelledby="modeToggle"
            >
                <div class="mode-section" role="group" aria-labelledby="diszi-label">
                    <p class="section-label" id="diszi-label">Diszi</p>
                    <button class="mode-item" data-persona="Diszi" data-mode="Thinking" role="menuitem" tabindex="0">
                        <i class="fas fa-brain"></i> Thinking
                    </button>
                    <button class="mode-item" data-persona="Diszi" data-mode="Planning" role="menuitem" tabindex="-1">
                        <i class="fas fa-tasks"></i> Planning
                    </button>
                    <button class="mode-item" data-persona="Diszi" data-mode="Code" role="menuitem" tabindex="-1">
                        <i class="fas fa-code"></i> Code
                    </button>
                </div>
                <div class="mode-section" role="group" aria-labelledby="zily-label">
                    <p class="section-label" id="zily-label">Zily</p>
                    <button class="mode-item" data-persona="Zily" data-mode="Thinking" role="menuitem" tabindex="-1">
                        <i class="fas fa-lightbulb"></i> Thinking
                    </button>
                    <button class="mode-item" data-persona="Zily" data-mode="Explain" role="menuitem" tabindex="-1">
                        <i class="fas fa-info-circle"></i> Explain
                    </button>
                    <button class="mode-item" data-persona="Zily" data-mode="Review" role="menuitem" tabindex="-1">
                        <i class="fas fa-check-circle"></i> Review
                    </button>
                </div>
            </div>
        </div>

        <textarea 
            id="aiUserInput" 
            placeholder="Ask Zylo anything..." 
            rows="1"
            maxlength="4000"
            aria-label="Message input"
            aria-describedby="charCount"
        ></textarea>
        
        <span id="charCount" class="char-counter" aria-live="polite">0/4000</span>

        <button 
            id="sendAiBtn" 
            class="send-btn"
            aria-label="Send message"
            disabled
        >
            <i class="fas fa-paper-plane"></i>
        </button>
    </div>
</div>
```

### 6.2 Enhanced CSS with Animations & Responsive Design

```css
:root {
    --ai-bg: rgba(255, 255, 255, 0.08);
    --ai-border: rgba(255, 255, 255, 0.1);
    --ai-accent: #8ab4f8;
    --ai-hover: #a8c7fa;
    --ai-danger: #f28b82;
    --transition-speed: 0.3s;
}

/* Improved container with better mobile support */
.ai-input-wrapper {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 800px;
    z-index: 100;
    animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

.ai-input-container {
    background: var(--ai-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px); /* Safari support */
    border: 1px solid var(--ai-border);
    border-radius: 28px;
    padding: 10px 20px;
    display: flex;
    align-items: flex-end;
    gap: 12px;
    transition: box-shadow var(--transition-speed) ease, 
                border-color var(--transition-speed) ease;
    will-change: box-shadow, border-color;
}

.ai-input-container:focus-within {
    box-shadow: 0 4px 20px rgba(138, 180, 248, 0.3);
    border-color: var(--ai-accent);
}

#aiUserInput {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-size: 16px;
    line-height: 24px;
    resize: none;
    max-height: 200px;
    min-height: 24px;
    padding: 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    scrollbar-width: thin;
    scrollbar-color: var(--ai-accent) transparent;
}

#aiUserInput::placeholder {
    color: rgba(255, 255, 255, 0.4);
    transition: color var(--transition-speed);
}

#aiUserInput:focus::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

/* Custom scrollbar for webkit browsers */
#aiUserInput::-webkit-scrollbar {
    width: 6px;
}

#aiUserInput::-webkit-scrollbar-track {
    background: transparent;
}

#aiUserInput::-webkit-scrollbar-thumb {
    background: var(--ai-accent);
    border-radius: 3px;
}

/* Character counter */
.char-counter {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    padding: 0 4px;
    align-self: center;
    min-width: 60px;
    text-align: right;
}

.char-counter.warning {
    color: #ffa726;
}

.char-counter.danger {
    color: var(--ai-danger);
    font-weight: 600;
}

.send-btn {
    background: transparent;
    border: none;
    color: var(--ai-accent);
    padding: 8px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: opacity var(--transition-speed), 
                transform var(--transition-speed),
                color var(--transition-speed);
    border-radius: 50%;
}

.send-btn:hover:not(:disabled) {
    opacity: 1;
    transform: scale(1.1);
    color: var(--ai-hover);
    background: rgba(138, 180, 248, 0.1);
}

.send-btn:active:not(:disabled) {
    transform: scale(0.95);
}

.send-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.send-btn.loading {
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

/* Enhanced Dropdown Styles */
.mode-dropdown {
    position: relative;
    z-index: 10;
}

.mode-toggle {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid transparent;
    border-radius: 15px;
    padding: 6px 12px;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    transition: background var(--transition-speed), 
                border-color var(--transition-speed),
                color var(--transition-speed);
}

.mode-toggle:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--ai-accent);
    color: #fff;
}

.mode-toggle i {
    transition: transform var(--transition-speed);
}

.mode-toggle[aria-expanded="true"] i {
    transform: rotate(180deg);
}

.mode-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 15px;
    background: #1e1e1e;
    border: 1px solid var(--ai-border);
    border-radius: 12px;
    width: 200px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(10px);
    transition: opacity var(--transition-speed), 
                visibility var(--transition-speed),
                transform var(--transition-speed);
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
}

.mode-menu.active {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.mode-section {
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.mode-section:last-child {
    border-bottom: none;
}

.section-label {
    font-size: 10px;
    text-transform: uppercase;
    color: #777;
    padding: 0 12px;
    margin-bottom: 4px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.mode-item {
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: #eee;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background var(--transition-speed), 
                color var(--transition-speed);
}

.mode-item:hover,
.mode-item:focus {
    background: rgba(255,255,255,0.08);
    color: var(--ai-accent);
    outline: none;
}

.mode-item.active {
    background: rgba(138, 180, 248, 0.15);
    color: var(--ai-accent);
    font-weight: 600;
}

.mode-item i {
    font-size: 12px;
    opacity: 0.7;
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
    .ai-input-wrapper {
        width: 95%;
        bottom: 10px;
    }
    
    .ai-input-container {
        padding: 8px 15px;
        border-radius: 24px;
    }
    
    #aiUserInput {
        font-size: 14px;
    }
    
    .mode-toggle {
        font-size: 11px;
        padding: 5px 10px;
    }
    
    .mode-menu {
        width: 180px;
    }
}

@media (max-width: 480px) {
    .char-counter {
        display: none; /* Hide on very small screens */
    }
}

/* Dark mode support */
@media (prefers-color-scheme: light) {
    :root {
        --ai-bg: rgba(0, 0, 0, 0.05);
        --ai-border: rgba(0, 0, 0, 0.1);
        --ai-accent: #1a73e8;
    }
    
    #aiUserInput {
        color: #000;
    }
    
    .mode-menu {
        background: #f8f9fa;
    }
    
    .mode-item {
        color: #202124;
    }
}
```

### 6.3 Enhanced JavaScript with Performance Optimizations

```javascript
// Configuration object for better maintainability
const AI_CONFIG = {
    MAX_CHARS: 4000,
    WARNING_THRESHOLD: 3500,
    DEBOUNCE_DELAY: 150,
    AUTO_SAVE_DELAY: 2000,
    STORAGE_KEY: 'zylo_draft_message',
    MODES: {
        Diszi: ['Thinking', 'Planning', 'Code'],
        Zily: ['Thinking', 'Explain', 'Review']
    }
};

// State management
const aiState = {
    selectedPersona: 'Diszi',
    selectedMode: 'Thinking',
    isLoading: false,
    lastMessage: '',
};

// Utility functions
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// DOM elements cache
const elements = {
    input: null,
    sendBtn: null,
    modeToggle: null,
    modeMenu: null,
    currentModeDisplay: null,
    charCount: null,
    modeItems: null
};

// Initialize DOM cache
function initializeElements() {
    elements.input = document.getElementById('aiUserInput');
    elements.sendBtn = document.getElementById('sendAiBtn');
    elements.modeToggle = document.getElementById('modeToggle');
    elements.modeMenu = document.getElementById('modeMenu');
    elements.currentModeDisplay = document.getElementById('currentModeDisplay');
    elements.charCount = document.getElementById('charCount');
    elements.modeItems = document.querySelectorAll('.mode-item');
}

// Auto-resize with performance optimization
function autoResize(textarea) {
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
    });
}

// Character counter with visual feedback
function updateCharCount() {
    const length = elements.input.value.length;
    const counter = elements.charCount;
    
    counter.textContent = `${length}/${AI_CONFIG.MAX_CHARS}`;
    
    counter.classList.remove('warning', 'danger');
    if (length >= AI_CONFIG.MAX_CHARS) {
        counter.classList.add('danger');
    } else if (length >= AI_CONFIG.WARNING_THRESHOLD) {
        counter.classList.add('warning');
    }
    
    // Enable/disable send button
    elements.sendBtn.disabled = length === 0 || length > AI_CONFIG.MAX_CHARS || aiState.isLoading;
}

// Auto-save draft to localStorage
const saveDraft = debounce(() => {
    const message = elements.input.value.trim();
    if (message) {
        localStorage.setItem(AI_CONFIG.STORAGE_KEY, JSON.stringify({
            message,
            persona: aiState.selectedPersona,
            mode: aiState.selectedMode,
            timestamp: Date.now()
        }));
    } else {
        localStorage.removeItem(AI_CONFIG.STORAGE_KEY);
    }
}, AI_CONFIG.AUTO_SAVE_DELAY);

// Restore draft on page load
function restoreDraft() {
    const draft = localStorage.getItem(AI_CONFIG.STORAGE_KEY);
    if (draft) {
        try {
            const data = JSON.parse(draft);
            // Only restore if less than 24 hours old
            if (Date.now() - data.timestamp < 86400000) {
                elements.input.value = data.message;
                aiState.selectedPersona = data.persona || 'Diszi';
                aiState.selectedMode = data.mode || 'Thinking';
                updateModeDisplay();
                autoResize(elements.input);
                updateCharCount();
            }
        } catch (e) {
            console.error('Failed to restore draft:', e);
        }
    }
}

// Dropdown toggle with ARIA support
function toggleDropdown() {
    const isOpen = elements.modeMenu.classList.toggle('active');
    elements.modeToggle.setAttribute('aria-expanded', isOpen);
    
    if (isOpen) {
        // Focus first menu item
        const firstItem = elements.modeMenu.querySelector('.mode-item');
        firstItem?.focus();
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('modeDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        elements.modeMenu.classList.remove('active');
        elements.modeToggle.setAttribute('aria-expanded', 'false');
    }
});

// Keyboard navigation for dropdown
function handleKeyboardNavigation(e) {
    if (!elements.modeMenu.classList.contains('active')) return;
    
    const items = Array.from(elements.modeItems);
    const currentIndex = items.findIndex(item => item === document.activeElement);
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % items.length;
            items[nextIndex].focus();
            break;
        case 'ArrowUp':
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + items.length) % items.length;
            items[prevIndex].focus();
            break;
        case 'Escape':
            e.preventDefault();
            elements.modeMenu.classList.remove('active');
            elements.modeToggle.setAttribute('aria-expanded', 'false');
            elements.modeToggle.focus();
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            if (currentIndex !== -1) {
                items[currentIndex].click();
            }
            break;
    }
}

// Update mode display
function updateModeDisplay() {
    elements.currentModeDisplay.textContent = `${aiState.selectedPersona}: ${aiState.selectedMode}`;
    
    // Update active state for menu items
    elements.modeItems.forEach(item => {
        const isActive = item.getAttribute('data-persona') === aiState.selectedPersona &&
                        item.getAttribute('data-mode') === aiState.selectedMode;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
}

// Handle mode selection
function handleModeSelection(e) {
    const item = e.target.closest('.mode-item');
    if (!item) return;
    
    aiState.selectedPersona = item.getAttribute('data-persona');
    aiState.selectedMode = item.getAttribute('data-mode');
    
    updateModeDisplay();
    elements.modeMenu.classList.remove('active');
    elements.modeToggle.setAttribute('aria-expanded', 'false');
    elements.input.focus();
    
    // Analytics (optional)
    trackModeChange(aiState.selectedPersona, aiState.selectedMode);
}

// Send message with error handling and retry logic
async function sendAiMessage() {
    const message = elements.input.value.trim();
    
    if (!message || message.length > AI_CONFIG.MAX_CHARS || aiState.isLoading) {
        return;
    }
    
    // Prevent duplicate sends
    if (message === aiState.lastMessage) {
        console.warn('Duplicate message prevented');
        return;
    }

    aiState.isLoading = true;
    aiState.lastMessage = message;
    
    // UI feedback
    elements.sendBtn.disabled = true;
    elements.sendBtn.classList.add('loading');
    elements.input.disabled = true;

    const payload = {
        message: message,
        persona: aiState.selectedPersona,
        mode: aiState.selectedMode,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId()
    };

    try {
        const response = await fetchWithRetry('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        handleAiResponse(data);
        
        // Clear draft after successful send
        localStorage.removeItem(AI_CONFIG.STORAGE_KEY);
        
        // Clear and reset UI
        elements.input.value = '';
        elements.input.style.height = 'auto';
        updateCharCount();
        
    } catch (error) {
        console.error('Failed to send message:', error);
        handleError(error);
    } finally {
        aiState.isLoading = false;
        elements.sendBtn.disabled = false;
        elements.sendBtn.classList.remove('loading');
        elements.input.disabled = false;
        elements.input.focus();
    }
}

// Fetch with retry logic
async function fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

// Handle AI response
function handleAiResponse(data) {
    // Your logic to display AI response
    console.log('AI Response:', data);
    // Example: appendMessageToChat(data);
}

// Error handling with user feedback
function handleError(error) {
    // Show user-friendly error message
    const errorMsg = error.message || 'Failed to send message. Please try again.';
    showNotification(errorMsg, 'error');
}

// Simple notification system
function showNotification(message, type = 'info') {
    // Implement your notification UI here
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Session management
function getSessionId() {
    let sessionId = sessionStorage.getItem('zylo_session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('zylo_session_id', sessionId);
    }
    return sessionId;
}

// Analytics tracking (optional)
function trackModeChange(persona, mode) {
    // Implement your analytics here
    console.log(`Mode changed to: ${persona} - ${mode}`);
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendAiMessage();
    }
    
    // Escape to clear input
    if (e.key === 'Escape' && !elements.modeMenu.classList.contains('active')) {
        elements.input.value = '';
        elements.input.style.height = 'auto';
        updateCharCount();
    }
}

// Initialize everything
function initializeAiChat() {
    initializeElements();
    
    // Event listeners
    elements.input.addEventListener('input', (e) => {
        autoResize(e.target);
        updateCharCount();
        saveDraft();
    });
    
    elements.input.addEventListener('keydown', handleKeyboardShortcuts);
    
    elements.sendBtn.addEventListener('click', sendAiMessage);
    
    elements.modeToggle.addEventListener('click', toggleDropdown);
    
    elements.modeItems.forEach(item => {
        item.addEventListener('click', handleModeSelection);
    });
    
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Restore draft if available
    restoreDraft();
    
    // Initial UI state
    updateModeDisplay();
    updateCharCount();
    
    console.log('AI Chat initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAiChat);
} else {
    initializeAiChat();
}

// Export for testing (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendAiMessage,
        autoResize,
        updateCharCount,
        aiState
    };
}
```

### 6.4 Backend Optimization Suggestions
**Create a dedicated mode configuration system :**

```python
# backend/ai/mode_config.py

from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class ModeConfig:
    """Configuration for AI persona modes"""
    persona: str
    mode: str
    system_prompt: str
    temperature: float
    max_tokens: int
    top_p: float = 0.9
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0

class ModeRegistry:
    """Registry for managing AI modes"""
    
    _modes: Dict[str, Dict[str, ModeConfig]] = {}
    
    @classmethod
    def register(cls, config: ModeConfig):
        """Register a new mode configuration"""
        if config.persona not in cls._modes:
            cls._modes[config.persona] = {}
        cls._modes[config.persona][config.mode] = config
    
    @classmethod
    def get(cls, persona: str, mode: str) -> Optional[ModeConfig]:
        """Retrieve mode configuration"""
        return cls._modes.get(persona, {}).get(mode)
    
    @classmethod
    def list_modes(cls, persona: str) -> List[str]:
        """List all modes for a persona"""
        return list(cls._modes.get(persona, {}).keys())

# Register Diszi modes
ModeRegistry.register(ModeConfig(
    persona="Diszi",
    mode="Thinking",
    system_prompt="""You are Diszi in Thinking mode. Your role is to engage in deep, 
    analytical reasoning. Break down complex problems, explore multiple perspectives, 
    and provide thoughtful insights.""",
    temperature=0.7,
    max_tokens=2048
))

ModeRegistry.register(ModeConfig(
    persona="Diszi",
    mode="Planning",
    system_prompt="""You are Diszi in Planning mode. Your role is to create actionable, 
    step-by-step plans. Break tasks into clear, executable steps with timelines and 
    dependencies. Focus on practical implementation.""",
    temperature=0.5,
    max_tokens=2048
))

ModeRegistry.register(ModeConfig(
    persona="Diszi",
    mode="Code",
    system_prompt="""You are Diszi in Code mode. Your role is to write clean, efficient, 
    well-documented code. Follow best practices, include error handling, and explain 
    your implementation choices. Prioritize maintainability and performance.""",
    temperature=0.3,
    max_tokens=4096
))

# Register Zily modes
ModeRegistry.register(ModeConfig(
    persona="Zily",
    mode="Thinking",
    system_prompt="""You are Zily in Thinking mode. Your role is to provide creative, 
    intuitive insights. Think outside the box, make connections between seemingly 
    unrelated concepts, and offer fresh perspectives.""",
    temperature=0.8,
    max_tokens=2048
))

ModeRegistry.register(ModeConfig(
    persona="Zily",
    mode="Explain",
    system_prompt="""You are Zily in Explain mode. Your role is to make complex topics 
    accessible and engaging. Use analogies, examples, and clear language. Break down 
    difficult concepts into understandable chunks.""",
    temperature=0.6,
    max_tokens=2048
))

ModeRegistry.register(ModeConfig(
    persona="Zily",
    mode="Review",
    system_prompt="""You are Zily in Review mode. Your role is to provide constructive, 
    detailed feedback. Identify strengths and areas for improvement. Offer specific, 
    actionable suggestions backed by reasoning.""",
    temperature=0.5,
    max_tokens=3072
))
```

**Enhanced backend handler with caching and rate limiting :**

```python
# backend/ai/chat_handler.py

import asyncio
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Dict, Optional
import hashlib
import json

from .mode_config import ModeRegistry

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, session_id: str) -> bool:
        """Check if request is allowed"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)
        
        # Clean old requests
        if session_id in self.requests:
            self.requests[session_id] = [
                req_time for req_time in self.requests[session_id]
                if req_time > cutoff
            ]
        else:
            self.requests[session_id] = []
        
        # Check limit
        if len(self.requests[session_id]) >= self.max_requests:
            return False
        
        self.requests[session_id].append(now)
        return True

class ResponseCache:
    """Simple response cache for identical queries"""
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache: Dict[str, tuple] = {}  # key: (response, timestamp)
    
    def _get_cache_key(self, message: str, persona: str, mode: str) -> str:
        """Generate cache key"""
        content = f"{message}:{persona}:{mode}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def get(self, message: str, persona: str, mode: str) -> Optional[dict]:
        """Get cached response if available and not expired"""
        key = self._get_cache_key(message, persona, mode)
        
        if key in self.cache:
            response, timestamp = self.cache[key]
            if datetime.now() - timestamp < timedelta(seconds=self.ttl_seconds):
                return response
            else:
                del self.cache[key]
        
        return None
    
    def set(self, message: str, persona: str, mode: str, response: dict):
        """Cache response"""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
        
        key = self._get_cache_key(message, persona, mode)
        self.cache[key] = (response, datetime.now())

# Global instances
rate_limiter = RateLimiter()
response_cache = ResponseCache()

async def handle_ai_request(payload: dict) -> dict:
    """
    Handle AI chat request with mode-specific configuration
    
    Args:
        payload: Request payload containing message, persona, mode, sessionId
        
    Returns:
        AI response dictionary
    """
    message = payload.get('message', '').strip()
    persona = payload.get('persona', 'Diszi')
    mode = payload.get('mode', 'Thinking')
    session_id = payload.get('sessionId', 'unknown')
    
    # Validation
    if not message:
        raise ValueError("Message cannot be empty")
    
    if len(message) > 4000:
        raise ValueError("Message exceeds maximum length")
    
    # Rate limiting
    if not rate_limiter.is_allowed(session_id):
        raise Exception("Rate limit exceeded. Please wait before sending more messages.")
    
    # Check cache
    cached_response = response_cache.get(message, persona, mode)
    if cached_response:
        cached_response['cached'] = True
        return cached_response
    
    # Get mode configuration
    mode_config = ModeRegistry.get(persona, mode)
    if not mode_config:
        raise ValueError(f"Invalid persona/mode combination: {persona}/{mode}")
    
    # Prepare AI request
    ai_request = {
        'messages': [
            {
                'role': 'system',
                'content': mode_config.system_prompt
            },
            {
                'role': 'user',
                'content': message
            }
        ],
        'temperature': mode_config.temperature,
        'max_tokens': mode_config.max_tokens,
        'top_p': mode_config.top_p,
        'frequency_penalty': mode_config.frequency_penalty,
        'presence_penalty': mode_config.presence_penalty
    }
    
    # Call AI API (replace with your actual AI service)
    try:
        response = await call_ai_service(ai_request)
        
        result = {
            'response': response,
            'persona': persona,
            'mode': mode,
            'timestamp': datetime.now().isoformat(),
            'cached': False
        }
        
        # Cache the response
        response_cache.set(message, persona, mode, result)
        
        return result
        
    except Exception as e:
        # Log error and re-raise
        print(f"AI Service Error: {str(e)}")
        raise

async def call_ai_service(request: dict) -> str:
    """
    Call your AI service (OpenAI, Anthropic, etc.)
    This is a placeholder - implement with your actual AI provider
    """
    # Example implementation
    # response = await openai.ChatCompletion.create(**request)
    # return response.choices[0].message.content
    
    await asyncio.sleep(0.1)  # Simulate API call
    return "This is a placeholder response. Implement your AI service here."
```

### 6.5 Additional Features to Consider

1. **Voice Input**: Add speech-to-text capability
2. **Message History**: Allow users to browse previous conversations
3. **Export Chat**: Let users export conversations as text/PDF
4. **Markdown Support**: Render AI responses with markdown formatting
5. **Code Highlighting**: Syntax highlighting for code blocks in responses
6. **Typing Indicators**: Show when AI is "thinking"
7. **Message Reactions**: Allow users to rate responses
8. **Keyboard Shortcuts Panel**: Help menu showing available shortcuts
9. **Theme Customization**: Let users customize colors
10. **Offline Support**: Cache conversations for offline viewing

### 6.6 Security Considerations

1. **Input Sanitization**: Always sanitize user input
2. **XSS Prevention**: Use textContent instead of innerHTML
3. **CSRF Protection**: Implement CSRF tokens
4. **Rate Limiting**: Already implemented in backend
5. **Content Security Policy**: Add CSP headers

```javascript
// Security utility
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}
```

### 6.7 Performance Monitoring

```javascript
// utils/performance-monitor.js

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }
    
    startMeasure(name) {
        this.metrics[name] = performance.now();
    }
    
    endMeasure(name) {
        if (this.metrics[name]) {
            const duration = performance.now() - this.metrics[name];
            console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
            delete this.metrics[name];
            return duration;
        }
    }
    
    measureAsync(name, asyncFn) {
        return async (...args) => {
            this.startMeasure(name);
            try {
                const result = await asyncFn(...args);
                this.endMeasure(name);
                return result;
            } catch (error) {
                this.endMeasure(name);
                throw error;
            }
        };
    }
}

const perfMonitor = new PerformanceMonitor();
```
---

## 7. AI Modes 🛫 (IMPORTANT)
*Add new new modes for AI's and modals that run with their modes :*

- Diszi : Thinking/Coder (`qwen3-coder`), Planning (`lfm2.5-thinking`), Debug (`qwen3-coder/glm-ocr`).

- Zily : Thinking (`lfm2.5-thinking`), Writer (`qwen3:4b`), Review (`gemm3:latest/gemma3:1b`).

---

## 8. Performance Benchmarks 📊

**Target metrics for optimal performance:**
- **First Paint**: < 1s
- **Time to Interactive**: < 2s
- **API Response Time**: < 500ms
- **Textarea Resize**: < 16ms (60fps)
- **Dropdown Toggle**: < 100ms
- **Bundle Size**: < 50KB (minified + gzipped)

---

## 9. Implementation Checklist ✅

- [ ] Update HTML with accessibility features
- [ ] Implement enhanced CSS with animations
- [ ] Add character counter and validation
- [ ] Implement auto-save draft functionality
- [ ] Add keyboard navigation for dropdown
- [ ] Create mode configuration system in backend
- [ ] Implement rate limiting
- [ ] Add response caching
- [ ] Write unit tests
- [ ] Add performance monitoring
- [ ] Implement error handling and retry logic
- [ ] Add security measures (sanitization, CSRF)
- [ ] Test on multiple browsers and devices
- [ ] Optimize for mobile responsiveness
- [ ] Add analytics tracking (optional)
- [ ] Document API endpoints
- [ ] Create user guide for new features