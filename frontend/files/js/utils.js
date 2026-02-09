
/**
 * utils.js - Generic Utility Functions
 */

// Toast Notification
window.showToast = function(message, duration = 3000, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-xl text-white transform transition-all duration-300 translate-y-10 opacity-0 z-50 ${isError ? 'bg-red-500' : 'bg-green-600'} font-medium flex items-center gap-2`;
    toast.style.minWidth = '200px';
    
    // Icon
    const icon = isError ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' : 
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// Copy Code Block
function copyCodeBlock(blockId) {
    const codeEl = document.getElementById(blockId);
    if (!codeEl) return;

    const code = codeEl.textContent;
    navigator.clipboard.writeText(code).then(() => {
        // Find the copy button in the parent wrapper
        const wrapper = codeEl.closest('.code-block-wrapper');
        const btn = wrapper?.querySelector('.copy-code-btn');
        if (btn) {
            btn.classList.add('copied');
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            }, 2000);
        }
        if (window.showToast) window.showToast('Code copied to clipboard!'); 
    }).catch(err => {
        console.error('Failed to copy code:', err);
    });
}

// Sidebar Collapse
function toggleSidebarCollapse() {
    const sidebar = document.getElementById('subPanelContainer');
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
    
    // Toggle body class for CSS selectors
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);

    // Update button icon
    const btn = document.getElementById('sidebarCollapseBtn');
    if (btn && window.feather) {
        // Force re-render of button content or rotate
        // CSS handles rotation, we just ensure class is toggled
        // But if we wanted to change icon:
        // btn.innerHTML = isCollapsed ? '<i data-feather="chevron-right"></i>' : '<i data-feather="chevron-left"></i>';
        // feather.replace();
    }
}

// Initialize sidebar state on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        const sidebar = document.getElementById('subPanelContainer');
        if (sidebar) {
            sidebar.classList.add('collapsed');
            document.body.classList.add('sidebar-collapsed');
        }
    }
    
    // Ghost text cleaner
    function cleanGhostText() {
        const patterns = ['Rotate chevron', 'subPanelContainer', 'margin-right: 0'];
        [document.body, document.head].forEach(root => {
            if (!root) return;
            Array.from(root.childNodes).forEach(node => {
                if (node.nodeType === 3) { // Text node
                    const text = node.textContent;
                    if (patterns.some(p => text.includes(p))) {
                        node.remove();
                    }
                }
            });
        });
    }
    cleanGhostText();
});

// Avatar Cache
var avatarCache = new Map();

/**
 * Get User Avatar URL
 * Checks cache, then fetches from API, then falls back to default.
 */
async function getUserAvatarUrl(username) {
    if (!username || username === 'N/A') return '/images/default_avatar.png';
    if (avatarCache.has(username)) {
        return avatarCache.get(username);
    }
    try {
        if (navigator.onLine) {
            const res = await fetch(`/api/get-user?identifier=${encodeURIComponent(username)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user && data.user.avatar) {
                    const avatarUrl = data.user.avatar;
                    avatarCache.set(username, avatarUrl);
                    return avatarUrl;
                }
            }
        }
    } catch (e) {
        console.log('Failed to fetch avatar for', username, e);
    }
    const fallbackUrl = `/uploads/${username}/avatar.png`;
    avatarCache.set(username, fallbackUrl);
    return fallbackUrl;
}
window.getUserAvatarUrl = getUserAvatarUrl; // Expose globally

/**
 * Parse Discord Markdown
 * Converts markdown text to HTML with syntax highlighting and sanitation.
 */
window.parseDiscordMarkdown = function (text) {
    if (!text) return '';
    // 1. Escape HTML first to prevent XSS (critical)
    let parsed = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headers (H1-H3)
    parsed = parsed.replace(/^#\s+(.+)$/gm, '<h1 class="text-3xl font-bold text-white mb-2 border-b border-gray-700 pb-1">$1</h1>');
    parsed = parsed.replace(/^##\s+(.+)$/gm, '<h2 class="text-2xl font-bold text-white mb-2">$1</h2>');
    parsed = parsed.replace(/^###\s+(.+)$/gm, '<h3 class="text-xl font-bold text-white mb-1">$1</h3>');

    // 2. Code blocks with Syntax Highlighting
    if (typeof hljs !== 'undefined') {
        parsed = parsed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
            try {
                const highlighted = hljs.highlight(code, { language: validLang }).value;
                return `<pre><code class="hljs language-${validLang} rounded p-2 text-sm my-2 block overflow-x-auto">${highlighted}</code></pre>`;
            } catch (e) {
                return `<pre><code class="bg-discord-gray-900 rounded p-2 text-sm my-2 block overflow-x-auto">${code}</code></pre>`;
            }
        });
    } else {
        parsed = parsed.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="bg-discord-gray-900 rounded p-2 text-sm my-2 block overflow-x-auto">$2</code></pre>');
    }

    // Fallback for ```code``` (no newline)
    parsed = parsed.replace(/```([^`]+)```/g, '<code class="block bg-discord-gray-900 rounded p-2 text-sm font-mono my-1 whitespace-pre-wrap">$1</code>');

    // 3. Inline code `code`
    parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-discord-gray-900 text-discord-gray-100 rounded px-1.5 py-0.5 text-sm font-mono">$1</code>');

    // Bold **text**
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Strikethrough ~~text~~
    parsed = parsed.replace(/~~([^~]+)~~/g, '<del class="opacity-60">$1</del>');
    // Spoiler ||text||
    parsed = parsed.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler bg-discord-gray-400 text-discord-gray-400 hover:bg-transparent hover:text-white rounded px-1 cursor-pointer transition-all" onclick="this.classList.toggle(\'revealed\')">$1</span>');

    return parsed;
};

/**
 * Generate UUID
 * Generates a random UUID v4 string.
 */
window.generateUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Get Status Icon
 */
window.getStatusIcon = function(status) {
    if (status === 'read') return '<span class="text-blue-400 font-bold" title="Read">✓✓</span>';
    if (status === 'delivered') return '<span class="text-gray-400 font-bold" title="Delivered">✓✓</span>';
    return '<span class="text-discord-gray-500 font-bold" title="Sent">✓</span>';
};
