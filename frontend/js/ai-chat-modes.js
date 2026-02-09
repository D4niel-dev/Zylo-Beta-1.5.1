
// Configuration object for better maintainability
const AI_CONFIG = {
    MAX_CHARS: 4000,
    WARNING_THRESHOLD: 3500,
    DEBOUNCE_DELAY: 150,
    AUTO_SAVE_DELAY: 2000,
    STORAGE_KEY: 'zylo_draft_message',
    MODES: {
        Diszi: ['Thinking', 'Planning', 'Fast'],
        Zily: ['Thinking', 'Writer', 'Fast']
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

// DOM elements cache
const elements = {
    input: null,
    sendBtn: null,
    modeToggle: null,
    modeMenu: null,
    currentModeDisplay: null,
    charCount: null,
    modeItems: null,
    wrapper: null
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
    elements.wrapper = document.querySelector('.ai-input-wrapper');
}

// Auto-resize with performance optimization
function autoResize(textarea) {
    if (!textarea) return;
    requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
    });
}

// Character counter with visual feedback
function updateCharCount() {
    if (!elements.input || !elements.charCount) return;
    
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
    if (elements.sendBtn) {
        elements.sendBtn.disabled = length === 0 || length > AI_CONFIG.MAX_CHARS || aiState.isLoading;
    }
}

// Auto-save draft to localStorage
const saveDraft = debounce(() => {
    if (!elements.input) return;
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
    if (draft && elements.input) {
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
    if (!elements.modeMenu) return;
    const isOpen = elements.modeMenu.classList.toggle('active');
    if (elements.modeToggle) {
        elements.modeToggle.setAttribute('aria-expanded', isOpen);
    }
    
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
        if (elements.modeMenu) elements.modeMenu.classList.remove('active');
        if (elements.modeToggle) elements.modeToggle.setAttribute('aria-expanded', 'false');
    }
});

// Keyboard navigation for dropdown
function handleKeyboardNavigation(e) {
    if (!elements.modeMenu || !elements.modeMenu.classList.contains('active')) return;
    
    const items = Array.from(elements.modeItems || []);
    const currentIndex = items.findIndex(item => item === document.activeElement);
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % items.length;
            items[nextIndex]?.focus();
            break;
        case 'ArrowUp':
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + items.length) % items.length;
            items[prevIndex]?.focus();
            break;
        case 'Escape':
            e.preventDefault();
            elements.modeMenu.classList.remove('active');
            elements.modeToggle?.setAttribute('aria-expanded', 'false');
            elements.modeToggle?.focus();
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

// Update mode visibility based on selected persona
function updateModeVisibility() {
    if (!elements.modeMenu) return;
    
    // Clean up persona name (e.g., "Diszi" from "Diszi: Thinking")
    // or use aiState.selectedPersona directly which is cleaner
    const currentPersona = aiState.selectedPersona;
    
    const sections = elements.modeMenu.querySelectorAll('.mode-section');
    sections.forEach(section => {
        // Find the label to determine which persona this section belongs to
        const label = section.querySelector('.section-label');
        if (label) {
            const labelText = label.textContent.toLowerCase();
            if (labelText.includes(currentPersona.toLowerCase())) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        }
    });
}

// Update mode display
function updateModeDisplay() {
    if (elements.currentModeDisplay) {
        // Only show Mode name if simpler display requested, but "Persona: Mode" is clearer
        // User asked: "show only the mode in each of the ai's" - this likely refers to the dropdown list
        elements.currentModeDisplay.textContent = `${aiState.selectedPersona}: ${aiState.selectedMode}`;
    }
    
    // Update active state for menu items
    if (elements.modeItems) {
        elements.modeItems.forEach(item => {
            const isActive = item.getAttribute('data-persona') === aiState.selectedPersona &&
                            item.getAttribute('data-mode') === aiState.selectedMode;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    }
    
    updateModeVisibility();
}

// Handle mode selection
function handleModeSelection(e) {
    const item = e.target.closest('.mode-item');
    if (!item) return;
    
    aiState.selectedPersona = item.getAttribute('data-persona');
    aiState.selectedMode = item.getAttribute('data-mode');
    
    updateModeDisplay();
    if (elements.modeMenu) elements.modeMenu.classList.remove('active');
    if (elements.modeToggle) elements.modeToggle.setAttribute('aria-expanded', 'false');
    if (elements.input) elements.input.focus();
}

// Send message
async function sendAiMessage() {
    if (!elements.input) return;
    const message = elements.input.value.trim();
    
    if (!message || message.length > AI_CONFIG.MAX_CHARS || aiState.isLoading) {
        return;
    }
    
    // Prevent duplicate sends
    if (message === aiState.lastMessage) {
        return;
    }

    aiState.isLoading = true;
    aiState.lastMessage = message;
    
    // UI feedback
    if (elements.sendBtn) {
        elements.sendBtn.disabled = true;
        elements.sendBtn.classList.add('loading');
    }
    elements.input.disabled = true;

    try {
        if (window.aiManager && window.aiManager.handleUserMessage) {
            await window.aiManager.handleUserMessage(message, aiState.selectedPersona, aiState.selectedMode);
        } else {
            console.error('AI Manager not found or handleUserMessage missing');
            alert('AI System is initializing, please try again.');
        }
        
        // Clear draft after successful send
        localStorage.removeItem(AI_CONFIG.STORAGE_KEY);
        
        // Clear and reset UI
        elements.input.value = '';
        elements.input.style.height = 'auto';
        updateCharCount();
        
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to send message: ' + error.message);
    } finally {
        aiState.isLoading = false;
        if (elements.sendBtn) {
            elements.sendBtn.disabled = false;
            elements.sendBtn.classList.remove('loading');
        }
        elements.input.disabled = false;
        elements.input.focus();
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (!elements.input) return;
    
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendAiMessage();
    }
    
    // Escape to clear input or close menu
    if (e.key === 'Escape') {
        if (elements.modeMenu && elements.modeMenu.classList.contains('active')) {
            elements.modeMenu.classList.remove('active');
        } else {
             // Optional: clear input on escape? maybe not user friendly
        }
    }
}

// Initialize everything
function initializeAiChat() {
    initializeElements();
    
    if (elements.input) {
        elements.input.addEventListener('input', (e) => {
            autoResize(e.target);
            updateCharCount();
            saveDraft();
        });
        
        elements.input.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    if (elements.sendBtn) {
        elements.sendBtn.addEventListener('click', sendAiMessage);
    }
    
    if (elements.modeToggle) {
        elements.modeToggle.addEventListener('click', toggleDropdown);
    }
    
    if (elements.modeItems) {
        elements.modeItems.forEach(item => {
            item.addEventListener('click', handleModeSelection);
        });
    }
    
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Restore draft if available
    restoreDraft();
    
    // Initial UI state
    updateModeDisplay();
    updateCharCount();
    
    console.log('AI Chat Mode System initialized');
}

// External API to update persona (e.g., from sidebar)
window.setAiPersona = function(persona) {
    if (!persona || !AI_CONFIG.MODES[persona]) return;
    
    aiState.selectedPersona = persona;
    // Default to first mode for that persona if current mode is invalid
    const modes = AI_CONFIG.MODES[persona];
    if (!modes.includes(aiState.selectedMode)) {
        aiState.selectedMode = modes[0];
    }
    
    updateModeDisplay();
};

// Expose initialization to window
window.initializeAiChat = initializeAiChat;

// Auto-init if DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAiChat);
} else {
    // If loaded dynamically, might need manual trigger
    // initializeAiChat(); 
}
