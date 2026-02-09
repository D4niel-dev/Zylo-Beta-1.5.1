/**
 * ai-chat-modes.js
 * Handles AI Persona and Mode selection logic.
 */

const AIModeManager = {
    selectedPersona: 'Diszi',
    selectedMode: 'Thinking',
    
    // DOM Elements
    elements: {},

    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.updateDisplay();
        
        // Auto-resize logic from plan
        if (this.elements.input) {
            this.elements.input.addEventListener('input', () => this.autoResize(this.elements.input));
        }
    },

    cacheElements() {
        this.elements = {
            modeToggle: document.getElementById('modeToggle'),
            modeMenu: document.getElementById('modeMenu'),
            currentModeDisplay: document.getElementById('currentModeDisplay'),
            modeItems: document.querySelectorAll('.mode-item'),
            input: document.getElementById('aiUserInput'),
            dropdown: document.getElementById('modeDropdown')
        };
    },

    setupEventListeners() {
        // Toggle Dropdown
        if (this.elements.modeToggle) {
            this.elements.modeToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (this.elements.dropdown && !this.elements.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Mode Selection
        this.elements.modeItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const persona = item.getAttribute('data-persona');
                const mode = item.getAttribute('data-mode');
                this.setMode(persona, mode);
                this.closeDropdown();
            });
        });
    },

    toggleDropdown() {
        if (!this.elements.modeMenu) return;
        const isActive = this.elements.modeMenu.classList.toggle('active');
        this.elements.modeToggle.setAttribute('aria-expanded', isActive);
        
        // Rotate arrow is handled by CSS based on aria-expanded or class?
        // CSS: .mode-toggle[aria-expanded="true"] i { transform: rotate(180deg); }
    },

    closeDropdown() {
        if (this.elements.modeMenu) {
            this.elements.modeMenu.classList.remove('active');
            if (this.elements.modeToggle) {
                this.elements.modeToggle.setAttribute('aria-expanded', 'false');
            }
        }
    },

    setMode(persona, mode) {
        this.selectedPersona = persona;
        this.selectedMode = mode;
        this.updateDisplay();
    },

    setAiPersona(persona) {
        this.selectedPersona = persona;
        // Default modes per persona
        if (persona === 'Diszi') {
            this.selectedMode = 'Thinking';
        } else {
            this.selectedMode = 'Thinking';
        }
        
        this.updateDisplay();
        
        // Filter mode sections in dropdown
        const sections = document.querySelectorAll('.mode-section');
        sections.forEach(section => {
            const label = section.querySelector('.section-label');
            if (label && label.textContent.includes(persona)) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    },

    updateDisplay() {
        if (this.elements.currentModeDisplay) {
            this.elements.currentModeDisplay.textContent = this.selectedMode;
        }
        
        // Update active state in menu
        this.elements.modeItems.forEach(item => {
            const p = item.getAttribute('data-persona');
            const m = item.getAttribute('data-mode');
            if (p === this.selectedPersona && m === this.selectedMode) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update AIChatManager if it exists
        if (window.aiManager) {
            // Check if we need to switch tabs or start new session?
            // The plan says "Update the logic so it can handles... dropdown menu selection"
            // And "Update Send Logic"
            // Actual switching might happen on SEND or explicit "New Chat"
            // But let's keep selectedPersona in sync with aiManager's active session model?
            // Or vice versa?
            
            // Actually, `ai-chat.js` has `updateUI()` which sets checks `activeSession.model`.
            // ModeManager is for NEXT message or NEW session configuration.
        }
    },

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    },

    // Public getter for send logic
    getCurrentConfig() {
        return {
            persona: this.selectedPersona,
            mode: this.selectedMode
        };
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    AIModeManager.init();
    // Expose globally
    window.AIModeManager = AIModeManager;
    // Helper for ai-chat.js
    window.setAiPersona = (p) => AIModeManager.setAiPersona(p);
});
