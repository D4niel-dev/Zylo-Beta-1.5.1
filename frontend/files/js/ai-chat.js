class AIChatManager {
    constructor() {
        this.activeSessionId = null; 
        this.activeSessions = new Map(); 
        this.allSessions = []; 
        this.pendingAttachments = []; 
        
        this.sessions = {
            diszi: { container: document.getElementById('aiTabContent_diszi') },
            zily: { container: document.getElementById('aiTabContent_zily') }
        };

        this.chatContainerWrapper = document.getElementById('chatMessagesAI');
        this.tabBar = document.getElementById('aiTabBar');
        this.input = document.getElementById('aiUserInput'); // New ID
        this.sendBtn = document.getElementById('sendAiBtn'); // New ID
        this.controls = document.getElementById('aiControls');
        
        // Bind methods
        this.sendMessage = this.sendMessage.bind(this);
        this.handleUiSend = this.handleUiSend.bind(this); // New handler
        this.switchTab = this.switchTab.bind(this);
        this.openSettingsModal = this.openSettingsModal.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.closeTab = this.closeTab.bind(this);
        this.openHistoryModal = this.openHistoryModal.bind(this);
        
        this.init();
    }

    init() {
        console.log('AIChatManager initialized (Multi-Session)');
        this.loadHistory(); 
        this.updateUI();
        this.checkStatus();
        
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', this.handleUiSend);
        }
        
        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleUiSend();
                }
            });
        }
    }

    // Phase 4: Attachment Handling
    async addAttachment(file) {
        if (!file) return;
        
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert("File too large (Max 50MB)");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        
        try {
            // Show loading state if needed
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                this.pendingAttachments.push({
                    url: data.url,
                    filename: data.filename,
                    fileType: data.fileType,
                    originalName: data.originalName
                });
                this.renderAttachments();
            } else {
                alert("Upload failed: " + data.error);
            }
        } catch (e) {
            console.error("Upload error", e);
            alert("Upload failed");
        }
    }

    removeAttachment(index) {
        this.pendingAttachments.splice(index, 1);
        this.renderAttachments();
    }

    renderAttachments() {
        const preview = document.getElementById('aiAttachmentPreview');
        if (!preview) return;
        
        if (this.pendingAttachments.length === 0) {
            preview.classList.add('hidden');
            preview.innerHTML = '';
            return;
        }
        
        preview.classList.remove('hidden');
        preview.innerHTML = '';
        
        this.pendingAttachments.forEach((att, index) => {
            const el = document.createElement('div');
            el.className = 'relative group flex-shrink-0';
            
            let content = '';
            if (att.fileType === 'image') {
                content = `<img src="${att.url}" class="h-20 w-auto rounded-md object-cover border border-discord-gray-600">`;
            } else {
                content = `
                    <div class="h-20 w-20 bg-discord-gray-800 rounded-md flex flex-col items-center justify-center border border-discord-gray-600 p-2">
                        <i data-feather="file" class="w-6 h-6 text-gray-400 mb-1"></i>
                        <span class="text-[10px] text-gray-300 truncate w-full text-center" title="${att.originalName}">${att.originalName}</span>
                    </div>
                `;
            }
            
            el.innerHTML = `
                ${content}
                <button onclick="window.aiManager.removeAttachment(${index})" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md transition hover:scale-110">
                    <i data-feather="x" class="w-3 h-3"></i>
                </button>
            `;
            preview.appendChild(el);
        });
        
        if (window.feather) feather.replace();
    }

    getStorageKey() {
        const user = localStorage.getItem('username') || localStorage.getItem('savedUsername') || 'guest';
        return 'ai_sessions_v2_' + user;
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem(this.getStorageKey());
            if (saved) {
                this.allSessions = JSON.parse(saved);
            }
        } catch (e) { console.error('Error loading history', e); }
    }

    saveSession(session) {
        // Update timestamp
        session.timestamp = Date.now();
        
        // Update/Add to allSessions
        const idx = this.allSessions.findIndex(s => s.id === session.id);
        if (idx >= 0) {
            this.allSessions[idx] = session;
        } else {
            this.allSessions.push(session);
        }
        
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.allSessions));
    }

    async handleUiSend() {
        if (!this.input) return;
        const text = this.input.value.trim();
        
        let persona = 'Diszi';
        let mode = 'Thinking';
        
        if (window.AIModeManager) {
            const config = window.AIModeManager.getCurrentConfig();
            persona = config.persona;
            mode = config.mode;
        }
        
        if (!text && this.pendingAttachments.length === 0) return;
        
        this.input.value = '';
        if (window.AIModeManager && window.AIModeManager.autoResize) {
            window.AIModeManager.autoResize(this.input);
        }
        
        await this.handleUserMessage(text, persona, mode);
    }

    startNewSession(modelType) {
        if (!modelType && this.activeSessionId) {
             const current = this.activeSessions.get(this.activeSessionId);
             modelType = (current && current.model === 'diszi') ? 'zily' : 'diszi';
        } else if (!modelType) {
            modelType = 'diszi'; // Default
        }

        const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newSession = {
            id: id,
            model: modelType, // 'diszi' or 'zily' (lowercase)
            messages: [],
            timestamp: Date.now(),
            name: `New ${modelType} Chat`
        };
        
        this.activeSessions.set(id, newSession);
        this.switchTab(id);
        this.saveSession(newSession);
    }

    switchTab(sessionId) {
        if (!this.activeSessions.has(sessionId)) {
            // Must be restoring from history
            const historical = this.allSessions.find(s => s.id === sessionId);
            if (historical) {
                this.activeSessions.set(sessionId, historical);
            } else {
                return; // Error
            }
        }

        this.activeSessionId = sessionId;
        const session = this.activeSessions.get(sessionId);
        const modelKey = session.model;

        // Show correct container
        Object.keys(this.sessions).forEach(key => {
            const container = this.sessions[key].container;
            if (key === modelKey) {
                container.classList.remove('hidden');
                // Render session messages into this container
                this.renderSessionContent(session, container);
            } else {
                container.classList.add('hidden');
            }
        });

        this.renderTabBar();
        this.updateUI();
    }

    renderSessionContent(session, container) {
        container.innerHTML = ''; // Clear current view
        
        if (session.messages.length === 0) {
            this.renderWelcomeScreen(session.model, container);
        } else {
            session.messages.forEach(msg => {
                if (msg.role === 'assistant' && /<think>/.test(msg.content)) {
                    // Extract thinking block and render above message
                    const thinkMatch = msg.content.match(/<think>([\s\S]*?)<\/think>/);
                    if (thinkMatch) {
                        const thinkEl = document.createElement('div');
                        thinkEl.className = 'mb-2 max-w-[85%] ml-[45px]';
                        thinkEl.innerHTML = `<details class="ai-thought"><summary class="ai-thought-header"><i data-feather="cpu" class="w-4 h-4"></i> Thinking Process</summary><div class="ai-thought-content">${this.simpleMarkdown(thinkMatch[1])}</div></details>`;
                        container.appendChild(thinkEl);
                    }
                    const cleanContent = msg.content.replace(/<think>[\s\S]*?<\/think>\s*/, '');
                    this.appendMessageToDOM(session.model, msg.role, cleanContent, container, msg.attachments);
                } else {
                    this.appendMessageToDOM(session.model, msg.role, msg.content, container, msg.attachments);
                }
            });
            this.scrollToBottom(container);
        }
    }

    renderTabBar() {
        if (this.activeSessions.size === 0) {
            this.tabBar.classList.add('hidden');
            return;
        }
        
        this.tabBar.classList.remove('hidden');
        this.tabBar.innerHTML = '';
        
        this.activeSessions.forEach((session, id) => {
            const isActive = id === this.activeSessionId;
            const model = session.model;
            const name = model === 'diszi' ? 'Diszi' : 'Zily';
            const colorClass = model === 'diszi' ? 'text-blue-400' : 'text-purple-400';
            const bgClass = isActive ? 'bg-discord-gray-600' : 'hover:bg-discord-gray-800';
            
            const btn = document.createElement('button');
            btn.className = `flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${bgClass}`;
            // Use session ID suffix or timestamp for display name? Or just "Diszi"
            // If multiple Diszi, we need differentiation.
            const displayName = session.messages.length > 0 
                ? (session.messages[0].content.substring(0, 10) + '...') 
                : `${name}`;
            
            btn.innerHTML = `
                <span class="${colorClass}">●</span>
                <span class="text-white max-w-[100px] truncate">${displayName}</span>
                <span onclick="event.stopPropagation(); window.aiManager.closeTab('${id}')" 
                      class="ml-2 text-discord-gray-400 hover:text-white cursor-pointer px-1">×</span>
            `;
            btn.onclick = () => this.switchTab(id);
            this.tabBar.appendChild(btn);
        });
    }

    closeTab(id) {
        this.activeSessions.delete(id);
        if (this.activeSessionId === id) {
            this.activeSessionId = null;
            if (this.activeSessions.size > 0) {
                this.switchTab(this.activeSessions.keys().next().value); // Switch to first available
            } else {
                // No tabs left. Clear view.
                Object.values(this.sessions).forEach(s => s.container.classList.add('hidden'));
                this.renderTabBar();
                this.updateUI();
            }
        } else {
            this.renderTabBar();
        }
    }

    updateUI() {
        if (!this.activeSessionId) {
            this.input.placeholder = "Select or Start a Chat...";
            return;
        }
        
        const session = this.activeSessions.get(this.activeSessionId);
        const model = session.model;
        
        this.controls.setAttribute('data-ai-model', model);
        
        // Update toggles to act as "New Chat" buttons
        document.getElementById('btnDiszi').classList.remove('active');
        document.getElementById('btnZily').classList.remove('active');
        // We don't really have an "active" model toggle state anymore if they are just "New" buttons.
        // Or we can highlight the one matching current session.
        if (model === 'diszi') document.getElementById('btnDiszi').classList.add('active');
        if (model === 'zily') document.getElementById('btnZily').classList.add('active');
        
        const placeholder = model === 'diszi' 
            ? 'Message Diszi...' 
            : 'Message Zily...';
        if (this.input) this.input.placeholder = placeholder;
        
        // Sync with ai-chat-modes.js
        if (window.setAiPersona) {
            window.setAiPersona(model === 'diszi' ? 'Diszi' : 'Zily');
        }
    }

    // --- History Logic ---

    openHistoryModal() {
        const modal = document.getElementById('aiHistoryModal');
        const list = document.getElementById('aiHistoryList');
        if (!modal || !list) return;

        modal.classList.remove('hidden');
        list.innerHTML = '';
        
        const sorted = [...this.allSessions].sort((a, b) => b.timestamp - a.timestamp);
        
        if (sorted.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-500">No history found.</div>';
            return;
        }

        sorted.forEach(s => {
            const el = document.createElement('div');
            el.className = 'p-3 bg-discord-gray-900/50 rounded hover:bg-discord-gray-700 cursor-pointer flex justify-between items-center group';
            const date = new Date(s.timestamp).toLocaleString();
            const preview = s.messages.length > 0 ? s.messages[0].content.substring(0, 40) + '...' : '(Empty Chat)';
            const color = s.model === 'diszi' ? 'text-blue-400' : 'text-purple-400';
            
            el.innerHTML = `
                <div>
                    <div class="flex items-center gap-2">
                         <span class="text-xs font-bold uppercase ${color}">${s.model}</span>
                         <span class="text-gray-400 text-xs">${date}</span>
                    </div>
                    <div class="text-white text-sm mt-1">${preview}</div>
                </div>
                <button class="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-2"
                        onclick="event.stopPropagation(); window.aiManager.deleteSession('${s.id}')">
                    <i data-feather="trash-2" class="w-4 h-4"></i>
                </button>
            `;
            el.onclick = () => {
                this.activeSessions.set(s.id, s);
                this.switchTab(s.id);
                modal.classList.add('hidden');
                if(window.feather) feather.replace();
            };
            list.appendChild(el);
        });
        if(window.feather) feather.replace();
    }

    deleteSession(id) {
        this.allSessions = this.allSessions.filter(s => s.id !== id);
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.allSessions));
        this.openHistoryModal(); // Refresh list
        this.closeTab(id); // Close if open
    }

    clearAllHistory() {
        this.allSessions = [];
        this.activeSessions.clear();
        this.activeSessionId = null;
        localStorage.removeItem(this.getStorageKey());
        
        Object.values(this.sessions).forEach(s => s.container.innerHTML = '');
        
        document.getElementById('aiSettingsModal').classList.add('hidden');
        this.renderTabBar();
        this.updateUI();
        alert('History Cleared.');
    }
    
    // --- Existing Helper Methods (Modified) ---

    async handleUserMessage(text, persona, mode) {
        const targetModel = persona.toLowerCase(); // 'diszi' or 'zily'
        
        // Ensure active session exists and matches target model
        if (!this.activeSessionId || (this.activeSessions.get(this.activeSessionId)?.model !== targetModel)) {
            // Check if we have ANY open session of this type to switch to?
            // For now, simpler: Start new session if mismatch or none.
            // But if we have one open, better to switch.
            const existing = Array.from(this.activeSessions.values()).find(s => s.model === targetModel);
            if (existing) {
                this.switchTab(existing.id);
            } else {
                this.startNewSession(targetModel);
            }
        }
        
        // Phase 4: Include attachments
        await this.sendMessage(text, { 
            mode: mode, 
            persona: persona, 
            attachments: [...this.pendingAttachments] 
        });
        
        // Clear attachments after sending
        this.pendingAttachments = [];
        this.renderAttachments();
    }

    async sendMessage(text, options = {}) {
        if (!text && (!options.attachments || options.attachments.length === 0)) return;
        
        const session = this.activeSessions.get(this.activeSessionId);
        if (!session) return;
        
        // Ensure messages array exists
        if (!session.messages) session.messages = [];

        // User Message with Attachments
        const userMsg = {
            role: 'user',
            content: text,
            attachments: options.attachments || [],
            timestamp: Date.now()
        };
        
        session.messages.push(userMsg);
        
        // If this is the first message, clear the welcome screen with animation
        const container = this.sessions[session.model].container;
        if (session.messages.length === 1) {
            const welcome = container.querySelector('.ai-welcome-screen');
            if (welcome) {
                welcome.classList.add('fade-out');
                // Wait for animation then remove
                setTimeout(() => {
                    welcome.remove();
                }, 500); 
            } else {
                 container.innerHTML = '';
            }
        }

        // Append to DOM (New Signature: model, role, content, container, attachments)
        const userMsgEl = this.appendMessageToDOM(session.model, 'user', text, container, options.attachments);
        
        // Auto-scroll to user message
        userMsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        container.scrollTop = container.scrollHeight;
        
        this.saveSession(session);

        // Construct prompt with attachments
        let promptWithAttachments = text;
        if (options.attachments && options.attachments.length > 0) {
            const atts = options.attachments.map(a => `[Attachment: ${a.originalName} (${a.url})]`).join('\n');
            promptWithAttachments = `${atts}\n\n${text}`;
        }
        this.showTyping(container, session.model);

        try {
            // Get selected sub-model
            const modelKey = session.model;
            const selectedSubModel = localStorage.getItem(`ai_model_${modelKey}`) || 'gemma:1b';
            
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('session_token')}`
                },
                body: JSON.stringify({
                    model: selectedSubModel,
                    messages: session.messages.map(m => ({
                        role: m.role,
                        content: m.role === 'user' && m.attachments && m.attachments.length > 0 
                            ? `${m.attachments.map(a => `[Attachment: ${a.originalName}]`).join('\n')}\n\n${m.content}`
                            : m.content
                    })), // Send full history with attachment context
                    persona: options.persona || modelKey,
                    mode: options.mode || 'Thinking',
                    sessionId: session.id
                })
            });
            
            const data = await response.json();
            
            this.hideTyping(container);
            
            if (data.success) {
                const reply = data.reply || data.response?.content || 'Empty response';
                session.messages.push({ role: 'assistant', content: reply });
                this.saveSession(session);
                
                // Animated Typewriter Effect for Assistant
                let displayReply = reply;
                this._skipTypewriter = false;
                
                // Extract <think> blocks and insert ABOVE the message bubble
                const thinkMatch = reply.match(/<think>([\s\S]*?)<\/think>/);
                if (thinkMatch) {
                    const thinkEl = document.createElement('div');
                    thinkEl.className = 'mb-2 max-w-[85%] ml-[54px] flex items-start gap-3';
                    thinkEl.innerHTML = `<details class="ai-thought" style="flex:1"><summary class="ai-thought-header"><i data-feather="cpu" class="w-4 h-4"></i> Thinking Process</summary><div class="ai-thought-content">${this.simpleMarkdown(thinkMatch[1])}</div></details><button class="answer-now-btn" title="Skip to answer"><i data-feather="skip-forward" class="w-3.5 h-3.5"></i> Answer Now</button>`;
                    container.appendChild(thinkEl);
                    displayReply = reply.replace(/<think>[\s\S]*?<\/think>\s*/, '');
                    
                    // Wire up Answer Now button
                    const answerBtn = thinkEl.querySelector('.answer-now-btn');
                    if (answerBtn) {
                        answerBtn.onclick = () => {
                            this._skipTypewriter = true;
                            answerBtn.style.display = 'none';
                        };
                    }
                    if(window.feather) feather.replace();
                }
                
                const msgEl = this.appendMessageToDOM(session.model, 'assistant', '', container);
                const proseEl = msgEl.querySelector('.prose');
                if (proseEl) {
                    // Typewrite only the non-thinking portion
                    const formattedHtml = this.simpleMarkdown(displayReply);
                    await this.typeWriterHtml(proseEl, formattedHtml);
                    
                    // Hide Answer Now button after typewriter completes
                    const answerBtn = container.querySelector('.answer-now-btn');
                    if (answerBtn) answerBtn.style.display = 'none';
                    
                    if(window.feather) feather.replace();
                }
            } else {
                const err = 'Error: ' + (data.error || 'Unknown error');
                session.messages.push({ role: 'assistant', content: err });
                this.renderSessionContent(session, container);
            }
        } catch (e) {
            this.hideTyping(container);
            session.messages.push({ role: 'assistant', content: 'Error: Connection failed.' });
            this.renderSessionContent(session, container);
        }
    }

    appendMessageToDOM(model, role, content, container, attachments = []) {
        const div = document.createElement('div');
        const isUser = role === 'user';
        
        let avatarUrl = '/images/default_avatar.png';
        const imgId = `avatar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (isUser) {
            // Try to use cached window.currentUser first
            if (window.currentUser && window.currentUser.avatar) {
                avatarUrl = window.currentUser.avatar;
            } else {
                // Async fetch
                const username = localStorage.getItem('username');
                if (username) {
                     if (window.getUserAvatarUrl) {
                        window.getUserAvatarUrl(username).then(url => {
                            const img = document.getElementById(imgId);
                            if (img) img.src = url;
                        });
                     } else {
                         avatarUrl = `/uploads/${username}/avatar.png`;
                     }
                }
            }
        } else {
            avatarUrl = model === 'diszi' ? '/images/ai/Dizel/Diszi_beta2.png' : '/images/ai/Zylia/Zily_beta2.png';
        }
            
        // Styling classes
        const baseClass = "flex gap-3 mb-6 max-w-[90%]";
        const alignClass = isUser ? "ml-auto flex-row-reverse" : "mr-auto";
        const bubbleClass = isUser 
            ? "bg-white dark:bg-discord-gray-600 text-gray-900 dark:text-white border border-gray-200 dark:border-transparent rounded-2xl rounded-tr-sm p-4 shadow-sm" 
            : (model === 'diszi' 
                ? "bg-blue-50 dark:bg-discord-gray-700 border-l-4 border-blue-500 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm p-4 shadow-sm" 
                : "bg-purple-50 dark:bg-discord-gray-700 border-l-4 border-purple-500 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm p-4 shadow-sm");

        div.className = `${baseClass} ${alignClass}`;
        
        // Attachment HTML
        let attachmentHtml = '';
        if (attachments && attachments.length > 0) {
            attachmentHtml = '<div class="flex flex-wrap gap-2 mb-2">';
            attachments.forEach(att => {
                if (att.fileType === 'image') {
                    attachmentHtml += `<img src="${att.url}" class="max-w-[200px] max-h-[200px] h-auto rounded-lg border border-gray-600 cursor-pointer hover:opacity-90 transition" onclick="window.open('${att.url}', '_blank')">`;
                } else {
                    attachmentHtml += `
                        <a href="${att.url}" target="_blank" class="flex items-center gap-2 bg-discord-gray-800 p-2 rounded border border-gray-600 hover:bg-discord-gray-700 transition">
                            <i data-feather="file" class="w-4 h-4 text-gray-400"></i>
                            <span class="text-sm text-blue-400 underline truncate max-w-[150px]" title="${att.originalName}">${att.originalName}</span>
                        </a>`;
                }
            });
            attachmentHtml += '</div>';
        }
        
        // Animation class
        div.classList.add('message-enter');

        div.innerHTML = `
            <img id="${imgId}" src="${avatarUrl}" class="w-10 h-10 rounded-full flex-shrink-0 object-cover border-2 ${isUser ? 'border-gray-500' : (model === 'diszi' ? 'border-blue-500' : 'border-purple-500')}" alt="${role}">
            <div class="${bubbleClass} overflow-hidden">
                ${!isUser ? `<div class="text-xs font-bold mb-1 ${model === 'diszi' ? 'text-blue-400' : 'text-purple-400'} uppercase tracking-wide">${model}</div>` : ''}
                ${attachmentHtml}
                <div class="prose prose-invert max-w-none text-sm leading-relaxed">
                    ${this.formatContent(content)}
                </div>
            </div>
        `;
        container.appendChild(div);
        
        // Inject Actions for AI messages (excluding error messages)
        if (!isUser && !content.startsWith('Error:')) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'ai-msg-actions';
            actionsDiv.innerHTML = `
                <button class="ai-action-btn copy" onclick="window.aiManager.copyToClipboard(this)" title="Copy">
                    <i data-feather="copy"></i> Copy
                </button>
                <button class="ai-action-btn reload" onclick="window.aiManager.regenerateLastMessage()" title="Regenerate">
                    <i data-feather="refresh-cw"></i> Reload
                </button>
                <div class="h-3 w-px bg-gray-700 mx-1"></div>
                <button class="ai-action-btn like" onclick="window.aiManager.handleFeedback(this, 'like')" title="Good response">
                    <i data-feather="thumbs-up"></i>
                </button>
                <button class="ai-action-btn dislike" onclick="window.aiManager.handleFeedback(this, 'dislike')" title="Bad response">
                    <i data-feather="thumbs-down"></i>
                </button>
            `;
            container.appendChild(actionsDiv);
            if(window.feather) feather.replace();
        }

        if(window.feather) feather.replace();
        


        return div; // Return the element for further manipulation
    }

    async typeWriterHtml(element, html, speed = 10) {
        return new Promise(resolve => {
            element.classList.add('typing-cursor');
            
            // Regex to split HTML tags from text
            // Captures tags like <b>, </b>, <br/>, <span ...>...</span>
            const segments = html.split(/(<[^>]*>)/g);
            
            let currentSegmentIndex = 0;
            let currentCharIndex = 0;
            
            const type = () => {
                // Skip check: dump all remaining content instantly
                if (this._skipTypewriter) {
                    const remaining = segments.slice(currentSegmentIndex).join('');
                    element.innerHTML += remaining;
                    element.classList.remove('typing-cursor');
                    const ctr = element.closest('.sub-panel-content') || element.closest('.overflow-y-auto');
                    if (ctr) ctr.scrollTop = ctr.scrollHeight;
                    resolve();
                    return;
                }
                if (currentSegmentIndex < segments.length) {
                    const segment = segments[currentSegmentIndex];
                    
                    if (segment.startsWith('<')) {
                        // It's a tag, append instantly and move on
                        element.innerHTML += segment;
                        currentSegmentIndex++;
                        type();
                    } else {
                        // It's text, type character by character
                        if (currentCharIndex < segment.length) {
                            const char = segment.charAt(currentCharIndex);
                            
                            // Check for HTML entity start (e.g. &nbsp;)
                            if (char === '&') {
                                const end = segment.indexOf(';', currentCharIndex);
                                if (end !== -1) {
                                    const entity = segment.substring(currentCharIndex, end + 1);
                                    element.innerHTML += entity;
                                    currentCharIndex = end + 1;
                                } else {
                                     element.innerHTML += char;
                                     currentCharIndex++;
                                }
                            } else {
                                element.innerHTML += char;
                                currentCharIndex++;
                            }
                            
                            // Variable speed
                            const delay = speed + Math.random() * 15;
                            setTimeout(type, delay);
                            
                            // Auto scroll
                            const container = element.closest('.sub-panel-content') || element.closest('.overflow-y-auto');
                            if (container) container.scrollTop = container.scrollHeight;
                        } else {
                            // End of text segment
                            currentCharIndex = 0;
                            currentSegmentIndex++;
                            type();
                        }
                    }
                } else {
                    element.classList.remove('typing-cursor');
                    resolve();
                }
            };
            
            type();
        });
    }
    

    
    // REDEFINING showTyping to accept model
    showTyping(container, model = 'zily') {
        const div = document.createElement('div');
        div.id = `aiTyping`;
        div.className = "flex gap-3 mb-6 mr-auto max-w-[90%]";
        const avatarUrl = model === 'diszi' ? '/images/ai/Dizel/Diszi_beta2.png' : '/images/ai/Zylia/Zily_beta2.png';
        
        // Gemini-style spinner
        const spinnerClass = model === 'diszi' ? 'diszi' : 'zily';
        
        div.innerHTML = `
             <img src="${avatarUrl}" class="w-10 h-10 rounded-full flex-shrink-0 object-cover border-2 ${model === 'diszi' ? 'border-blue-500' : 'border-purple-500'} animate-pulse" alt="Typing">
             <div class="bg-transparent flex items-center p-2">
                <div class="ai-spinner ${spinnerClass}"></div>
             </div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    hideTyping(container) {
        const el = container.querySelector('#aiTyping');
        if (el) el.remove();
    }
    
    scrollToBottom(container) {
        if(container) container.scrollTop = container.scrollHeight;
    }

    formatContent(text) {
        // Handle <think> blocks first
        let formatted = text.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
            return `<details class="ai-thought"><summary class="ai-thought-header"><i data-feather="cpu" class="w-4 h-4"></i> Thinking Process</summary><div class="ai-thought-content">${this.simpleMarkdown(content)}</div></details>`;
        });

        return this.simpleMarkdown(formatted);
    }
    
    simpleMarkdown(text) {
        // === Code blocks (``` ... ```) — extract first to protect inner content ===
        const codeBlocks = [];
        text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push(`<pre class="ai-md-codeblock"><code class="language-${lang || 'text'}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</code></pre>`);
            return `%%CODEBLOCK_${idx}%%`;
        });

        // === Tables ===
        text = text.replace(/((?:^\|.+\|\s*$\n?)+)/gm, (tableBlock) => {
            const rows = tableBlock.trim().split('\n').filter(r => r.trim());
            if (rows.length < 2) return tableBlock;
            let html = '<table class="ai-md-table">';
            rows.forEach((row, i) => {
                if (/^\|[\s:-]+\|/.test(row) && /^[|\s:-]+$/.test(row)) return;
                const cells = row.split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                const tag = i === 0 ? 'th' : 'td';
                html += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
            });
            html += '</table>';
            return html + '\n';
        });

        text = text
            // === Headings (h1-h6, largest first to avoid partial matches) ===
            .replace(/^###### (.+)$/gm, '<h6 class="text-xs font-bold mt-2 mb-1 text-gray-500 dark:text-gray-400">$1</h6>')
            .replace(/^##### (.+)$/gm, '<h5 class="text-sm font-bold mt-2 mb-1 text-gray-600 dark:text-gray-300">$1</h5>')
            .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-bold mt-3 mb-1 text-gray-700 dark:text-gray-200">$1</h4>')
            .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1 text-gray-800 dark:text-gray-100">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-3 mb-1 text-gray-900 dark:text-white">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">$1</h1>')
            // === Horizontal rule ===
            .replace(/^---$/gm, '<hr class="border-gray-300 dark:border-gray-600 my-3">')
            .replace(/^\*\*\*$/gm, '<hr class="border-gray-300 dark:border-gray-600 my-3">')
            .replace(/^___$/gm, '<hr class="border-gray-300 dark:border-gray-600 my-3">')
            // === Blockquotes (> text) ===
            .replace(/^> (.+)$/gm, '<blockquote class="ai-md-blockquote text-gray-600 dark:text-gray-400 border-gray-300 dark:border-blue-500 bg-gray-50 dark:bg-blue-500/5">$1</blockquote>')
            // === Task lists ===
            .replace(/^- \[x\] (.+)$/gm, '<div class="flex gap-2 ml-2 items-center"><span class="text-green-500 dark:text-green-400">☑</span><span class="line-through opacity-70 text-gray-500 dark:text-gray-400">$1</span></div>')
            .replace(/^- \[ \] (.+)$/gm, '<div class="flex gap-2 ml-2 items-center"><span class="text-gray-400 dark:text-gray-500">☐</span><span class="text-gray-700 dark:text-gray-300">$1</span></div>')
            // === Ordered lists (1. item) ===
            .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 ml-2"><span class="text-blue-600 dark:text-blue-400 font-mono text-xs min-w-[1.5em] text-right">$1.</span><span class="text-gray-800 dark:text-gray-200">$2</span></div>')
            // === Unordered lists (- item, * item) ===
            .replace(/^[-*] (.+)$/gm, '<div class="flex gap-2 ml-2"><span class="text-blue-600 dark:text-blue-400">\u2022</span><span class="text-gray-800 dark:text-gray-200">$1</span></div>')
            // === Images ![alt](url) — before links ===
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2 border border-gray-200 dark:border-gray-600">')
            // === Links [text](url) ===
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300">$1</a>')
            // === Bold + Italic (***text*** or ___text___) ===
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')
            // === Bold (**text** or __text__) ===
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // === Strikethrough (~~text~~) ===
            .replace(/~~(.*?)~~/g, '<del class="opacity-60">$1</del>')
            // === Italic (*text* or _text_) ===
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
            .replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<em>$1</em>')
            // === Inline code (`text`) ===
            .replace(/`(.*?)`/g, '<code class="ai-md-inline-code bg-gray-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-gray-200 dark:border-blue-500/20">$1</code>')
            // === Newlines ===
            .replace(/\n/g, '<br>');

        // === Restore code blocks ===
        codeBlocks.forEach((block, i) => {
            text = text.replace(`%%CODEBLOCK_${i}%%`, block);
        });

        return text;
    }

    // Settings Modal
    async openSettingsModal() {
        const modal = document.getElementById('aiSettingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            await this.fetchAndPopulateModels();
        }
    }
    
    async fetchAndPopulateModels() {
         const selectDiszi = document.getElementById('selectModel_diszi');
        const selectZily = document.getElementById('selectModel_zily');
        try {
            const res = await fetch('/api/ai/models', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token')}` }
            });
            const data = await res.json();
            const models = data.success ? data.models : [];
            if(models.length === 0) models.push('gemma:2b', 'llama3.2:1b'); 

            [selectDiszi, selectZily].forEach(sel => {
                sel.innerHTML = '';
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    sel.appendChild(opt);
                });
            });
            selectDiszi.value = localStorage.getItem('ai_model_diszi') || 'gemma:2b';
            selectZily.value = localStorage.getItem('ai_model_zily') || 'gemma:2b';
        } catch (e) { console.error(e); }
    }

    saveSettings() {
        localStorage.setItem('ai_model_diszi', document.getElementById('selectModel_diszi').value);
        localStorage.setItem('ai_model_zily', document.getElementById('selectModel_zily').value);
        document.getElementById('aiSettingsModal').classList.add('hidden');
    }
    
    // Legacy welcome screen adapted
    renderWelcomeScreen(model, container) {
        const isDiszi = model === 'diszi';
        const name = isDiszi ? 'Diszi' : 'Zily';
        const description = isDiszi ? 'Your Analytical AI Assistant' : 'Your Creative AI Companion';
        const styleClass = isDiszi ? 'text-blue-400' : 'text-purple-400';
        const suggestionClass = isDiszi ? 'border-blue-500/30 hover:bg-blue-500/10' : 'border-purple-500/30 hover:bg-purple-500/10';

        const suggestions = isDiszi ? [
            "Analyze this code", "Explain OAuth", "Optimize algo", "SQL vs NoSQL"
        ] : [
            "Sci-fi story", "Creative caption", "App ideas", "Coding poem"
        ];

        let suggestionsHtml = suggestions.map(text => `
            <button onclick="window.aiManager.setInputAndFocus('${text}')" 
                class="suggestion-btn p-3 rounded-xl border ${suggestionClass} text-left transition-all group">
                <span class="text-gray-300 group-hover:text-white text-sm">${text}</span>
            </button>
        `).join('');

        container.innerHTML = `
            <div class="ai-welcome-screen flex flex-col items-center justify-center h-full p-8">
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold text-white mb-2">${name}</h1>
                    <p class="${styleClass} text-lg font-medium">${description}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">${suggestionsHtml}</div>
            </div>
        `;
    }
    
    setInputAndFocus(text) {
        if (this.input) {
            this.input.value = text;
            this.input.focus();
        }
    }

    async checkStatus() {
        try {
            const res = await fetch('/api/ai/status', {
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token')}` }
            });
            const data = await res.json();
            if (!data.online) {
                const container = document.getElementById('chatMessagesAI');
                if (container && container.parentElement) {
                    // Check if warning already exists
                    if (container.parentElement.querySelector('.ai-offline-warning')) return;

                    const warning = document.createElement('div');
                    warning.className = "ai-offline-warning bg-red-500/80 backdrop-blur text-white text-xs p-2 text-center absolute top-0 w-full z-50 rounded-b-lg";
                    warning.innerHTML = "<i data-feather='alert-circle' class='w-3 h-3 inline mr-1'></i> AI Service Offline (Ollama)";
                    container.parentElement.style.position = 'relative';
                    container.parentElement.prepend(warning);
                    if(window.feather) feather.replace();
                }
            }
        } catch (e) {
            console.error("AI Status Check Failed", e);
        }
    }

    // === AI Actions Implementation ===
    
    copyToClipboard(btn) {
        const actionsDiv = btn.closest('.ai-msg-actions');
        const msgDiv = actionsDiv.previousElementSibling;
        const prose = msgDiv.querySelector('.prose');
        
        if (prose) {
            const text = prose.innerText; // Use innerText to preserve newlines
            navigator.clipboard.writeText(text).then(() => {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = `<i data-feather="check"></i> Copied`;
                if(window.feather) feather.replace();
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    if(window.feather) feather.replace();
                }, 2000);
            });
        }
    }

    regenerateLastMessage() {
        const session = this.activeSessions.get(this.activeSessionId);
        if (!session || session.messages.length === 0) return;

        const lastMsg = session.messages[session.messages.length - 1];
        if (lastMsg.role === 'assistant') {
            session.messages.pop();
            this.saveSession(session);
            
            const container = this.sessions[session.model].container;
            this.renderSessionContent(session, container);
            
            this.showTyping(container, session.model);
            
            const selectedSubModel = localStorage.getItem(`ai_model_${session.model}`) || 'gemma:2b';
            
            fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('session_token')}`
                },
                body: JSON.stringify({
                    model: selectedSubModel,
                    messages: session.messages,
                    persona: session.model,
                    mode: 'Thinking', 
                    sessionId: session.id
                })
            })
            .then(res => res.json())
            .then(data => {
                this.hideTyping(container);
                if (data.success) {
                    const reply = data.reply || data.response?.content || 'Empty response';
                    session.messages.push({ role: 'assistant', content: reply });
                    this.saveSession(session);
                    this.renderSessionContent(session, container);
                } else {
                    alert('Regeneration failed: ' + data.error);
                }
            })
            .catch(e => {
                this.hideTyping(container);
                alert('Connection error during regeneration.');
            });
        }
    }

    handleFeedback(btn, type) {
        this.showToast("Thank you for your feedback!");
        
        const originalColor = btn.style.color;
        btn.style.color = type === 'like' ? '#22c55e' : '#ef4444';
        
        const group = btn.parentElement;
        const feedbackBtns = group.querySelectorAll('.like, .dislike');
        feedbackBtns.forEach(b => b.style.pointerEvents = 'none');
    }

    showToast(message) {
        let toast = document.getElementById('aiToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'aiToast';
            toast.className = 'ai-toast';
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = `<i data-feather="check-circle"></i> <span>${message}</span>`;
        if(window.feather) feather.replace();
        
        void toast.offsetWidth;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Handle AI File Upload
window.handleAiFileUpload = function(event) {
    const file = event.target.files[0];
    if (window.aiManager) {
        window.aiManager.addAttachment(file);
    }
    event.target.value = '';
};

document.addEventListener('DOMContentLoaded', () => {
    window.aiManager = new AIChatManager();
});
