
/**
 * stickers.js
 * Handles sticker definitions, picker UI, and sending sticker messages.
 */

// Available stickers
var AVAILABLE_STICKERS = [
    { id: 'bear_crying', name: 'Bear Crying', src: '/files/stickers/bear_crying.png' },
    { id: 'bear_laughing', name: 'Bear Laughing', src: '/files/stickers/bear_laughing.png' },
    { id: 'bear_like', name: 'Bear Like', src: '/files/stickers/bear_like.png' },
    { id: 'boy_crying', name: 'Boy Crying', src: '/files/stickers/boy_crying.png' },
    { id: 'boy_excited', name: 'Boy Excited', src: '/files/stickers/boy_excited.png' },
    { id: 'cat_celebrate', name: 'Cat Celebrate', src: '/files/stickers/cat_celebrate.png' },
    { id: 'cat_laughing', name: 'Cat Laughing', src: '/files/stickers/cat_laughing.png' },
    { id: 'crying', name: 'Crying', src: '/files/stickers/crying.png' },
    { id: 'girl_crying', name: 'Girl Crying', src: '/files/stickers/girl_crying.png' },
    { id: 'girl_excited', name: 'Girl Excited', src: '/files/stickers/girl_excited.png' },
    { id: 'girl_happy', name: 'Girl Happy', src: '/files/stickers/girl_happy.png' },
    { id: 'good_job', name: 'Good Job', src: '/files/stickers/good_job.png' },
    { id: 'great_job', name: 'Great Job', src: '/files/stickers/great_job.png' },
    { id: 'hand_heart', name: 'Hand Heart', src: '/files/stickers/hand_heart.png' },
    { id: 'happy', name: 'Happy', src: '/files/stickers/happy.png' },
    { id: 'happy_cat', name: 'Happy Cat', src: '/files/stickers/happy_cat.png' },
    { id: 'heart', name: 'Heart', src: '/files/stickers/heart.png' },
    { id: 'heart_bubble', name: 'Heart Bubble', src: '/files/stickers/heart_bubble.png' },
    { id: 'heart_smile', name: 'Heart Smile', src: '/files/stickers/heart_smile.png' },
    { id: 'kola_like', name: 'Kola Like', src: '/files/stickers/kola_like.png' },
    { id: 'laugh', name: 'Laugh', src: '/files/stickers/laugh.png' },
    { id: 'star', name: 'Star', src: '/files/stickers/star.png' },
    { id: 'star_happy', name: 'Star Happy', src: '/files/stickers/star_happy.png' },
    { id: 'thumbs_up', name: 'Thumbs Up', src: '/files/stickers/thumbs_up.png' }
];

// Current active sticker picker (to track which input to send to)
var activeStickerPickerId = null;

// Available GIFs (Reliable Giphy Replacements)
var AVAILABLE_GIFS = [
    { url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', name: 'Thumbs Up' },
    { url: 'https://media.giphy.com/media/l41YkxvU8c7J7BwPQ/giphy.gif', name: 'Party' },
    { url: 'https://media.giphy.com/media/9D7Jr7o9TjKta/giphy.gif', name: 'Laughing' },
    { url: 'https://media.giphy.com/media/7SF5scGB2AFrgsXP63/giphy.gif', name: 'Sad' },
    { url: 'https://media.giphy.com/media/yr7n0u3qzO9nG/giphy.gif', name: 'Fire' },
    { url: 'https://media.giphy.com/media/l3q2t2KAyvxy9x80I/giphy.gif', name: 'OK' },
    { url: 'https://media.giphy.com/media/oF5oUYTOhvFnO/giphy.gif', name: 'Excited' },
    { url: 'https://media.giphy.com/media/hEc4k5pNJP7mnZ2I1f/giphy.gif', name: 'Confused' },
    // New Additions
    { url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPDa/giphy.gif', name: 'Applause' },
    { url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif', name: 'Facepalm' },
    { url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif', name: 'Thinking' },
    { url: 'https://media.giphy.com/media/xT4uQulXaVJDg78WwU/giphy.gif', name: 'Heart' },
    { url: 'https://media.giphy.com/media/3o7TKsWZBKD5per98k/giphy.gif', name: 'Shocked' },
    { url: 'https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif', name: 'Dance' },
];

// Initialize sticker pickers with content
function initStickerPickers() {
    console.log("Initializing Sticker & GIF Pickers...");
    const pickerIds = ['communityStickerPicker', 'friendsStickerPicker', 'groupStickerPicker'];

    pickerIds.forEach(pickerId => {
        const picker = document.getElementById(pickerId);
        if (!picker) return;

        // Build Tabbed Interface
        let html = `
            <div class="flex border-b border-discord-gray-600 mb-2">
                <button onclick="switchPickerTab('${pickerId}', 'stickers')" class="flex-1 py-1 text-sm font-medium hover:bg-discord-gray-700 rounded-t text-white border-b-2 border-discord-blurple sticker-tab-btn" data-tab="stickers">Stickers</button>
                <button onclick="switchPickerTab('${pickerId}', 'gifs')" class="flex-1 py-1 text-sm font-medium hover:bg-discord-gray-700 rounded-t text-gray-400 border-b-2 border-transparent sticker-tab-btn" data-tab="gifs">GIFs</button>
            </div>
        `;

        // Stickers Grid
        html += `<div id="${pickerId}-stickers" class="sticker-grid picker-content">`;
        AVAILABLE_STICKERS.forEach(sticker => {
            html += `
            <div class="sticker-item" onclick="sendSticker('${sticker.id}', '${sticker.src}')" title="${sticker.name}">
              <img src="${sticker.src}" alt="${sticker.name}" loading="lazy">
            </div>
          `;
        });
        html += '</div>';

        // GIFs Grid
        // Removed inline grid-template-columns to match sticker grid style
        html += `<div id="${pickerId}-gifs" class="sticker-grid picker-content hidden">`;
        AVAILABLE_GIFS.forEach(gif => {
            html += `
            <div class="sticker-item h-24" onclick="event.stopPropagation(); sendGif('${gif.url}')" title="${gif.name}">
              <img src="${gif.url}" alt="${gif.name}" loading="lazy" class="w-full h-full object-cover rounded">
            </div>
          `;
        });
        html += '</div>';

        picker.innerHTML = html;
    });
}

function switchPickerTab(pickerId, tab) {
    // Prevent event bubbling if called from onclick
    if (window.event) window.event.stopPropagation();

    const picker = document.getElementById(pickerId);
    if (!picker) return;

    // Toggle Content
    picker.querySelectorAll('.picker-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`${pickerId}-${tab}`);
    if (target) target.classList.remove('hidden');

    // Update Tabs
    picker.querySelectorAll('.sticker-tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('text-white', 'border-discord-blurple');
            btn.classList.remove('text-gray-400', 'border-transparent');
        } else {
            btn.classList.remove('text-white', 'border-discord-blurple');
            btn.classList.add('text-gray-400', 'border-transparent');
        }
    });
}
window.switchPickerTab = switchPickerTab;

// Toggle sticker picker visibility
function toggleStickerPicker(pickerId) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    // Close all other pickers first
    const allPickers = document.querySelectorAll('.sticker-picker');
    allPickers.forEach(p => {
        if (p.id !== pickerId) p.classList.add('hidden');
    });

    // Close emoji pickers too
    const emojiPickers = document.querySelectorAll('[id$="EmojiPicker"]');
    emojiPickers.forEach(p => p.classList.add('hidden'));

    // Toggle this picker
    picker.classList.toggle('hidden');
    activeStickerPickerId = picker.classList.contains('hidden') ? null : pickerId;
}

// Send a sticker message
function sendSticker(stickerId, stickerSrc) {
    // Determine which chat we're in based on active picker
    let chatType = 'community';
    if (activeStickerPickerId === 'friendsStickerPicker') {
        chatType = 'friends';
    } else if (activeStickerPickerId === 'groupStickerPicker') {
        chatType = 'group';
    }

    // Close the picker
    if (activeStickerPickerId) {
        document.getElementById(activeStickerPickerId)?.classList.add('hidden');
        activeStickerPickerId = null;
    }

    // Send sticker based on chat type
    if (chatType === 'friends') {
        sendFriendSticker(stickerId, stickerSrc);
    } else if (chatType === 'group') {
        sendGroupSticker(stickerId, stickerSrc);
    } else {
        sendCommunitySticker(stickerId, stickerSrc);
    }
}

// Helper for unique IDs (if not already in utils)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Send sticker to community chat
async function sendCommunitySticker(stickerId, stickerSrc) {
    const username = localStorage.getItem('username') || 'Anonymous';
    const tempId = generateUUID();

    const payload = {
        id: tempId,
        username,
        message: `[sticker:${stickerId}]`,
        type: 'sticker',
        sticker_src: stickerSrc,
        room: 'community',
        ts: Date.now() / 1000
    };

    // Optimistic Render
    const container = document.getElementById('chatMessagesCommunity');
    if (container) {
        // Provided createDiscordMessage is globally available
        if (typeof createDiscordMessage === 'function') {
            const el = await createDiscordMessage(payload);
            el.setAttribute('data-msg-id', tempId);
            container.appendChild(el);
            container.scrollTop = container.scrollHeight;
        }
    }

    // Send to backend
    try {
        await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Failed to send sticker:', err);
    }
}

// Send sticker to friend DM
async function sendFriendSticker(stickerId, stickerSrc) {
    // Depends on global activeFriendChat
    if (typeof activeFriendChat === 'undefined' || !activeFriendChat) return;

    const username = localStorage.getItem('username') || 'Anonymous';

    const payload = {
        from: username,
        to: activeFriendChat,
        message: `[sticker:${stickerId}]`,
        type: 'sticker',
        sticker_src: stickerSrc,
        ts: Date.now() / 1000
    };

    // Optimistic Render
    const container = document.getElementById('friendsChatMessages');
    if (container) {
        if (typeof createDiscordMessage === 'function') {
            const el = await createDiscordMessage({ ...payload, username: username });
            container.appendChild(el);
            container.scrollTop = container.scrollHeight;
        }
    }

    // Send to backend
    try {
        await fetch('/api/dm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Failed to send friend sticker:', err);
    }
}

// Send sticker to group chat
async function sendGroupSticker(stickerId, stickerSrc) {
    const channelName = document.getElementById('groupChatChannelName')?.textContent || 'general';
    // Depends on global currentGroupId
    if (typeof currentGroupId === 'undefined' || !currentGroupId) return;

    const username = localStorage.getItem('username') || 'Anonymous';

    const payload = {
        groupId: currentGroupId,
        channel: channelName,
        username,
        message: `[sticker:${stickerId}]`,
        type: 'sticker',
        sticker_src: stickerSrc,
        ts: Date.now() / 1000
    };

    // Optimistic Render
    const container = document.getElementById('groupChatMessages');
    if (container) {
        if (typeof createDiscordMessage === 'function') {
            const el = await createDiscordMessage(payload);
            container.appendChild(el);
            container.scrollTop = container.scrollHeight;
        }
    }

    // Send to backend
    try {
        await fetch('/api/groups/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Failed to send group sticker:', err);
    }

}

// Send GIF
function sendGif(url) {
    // Determine which chat we're in based on active picker
    let chatType = 'community';
    if (activeStickerPickerId === 'friendsStickerPicker') {
        chatType = 'friends';
    } else if (activeStickerPickerId === 'groupStickerPicker') {
        chatType = 'group';
    }

    // Close picker
    if (activeStickerPickerId) {
        document.getElementById(activeStickerPickerId)?.classList.add('hidden');
        activeStickerPickerId = null;
    }
    
    const username = localStorage.getItem('username') || 'Anonymous';
    const payload = {
        username: username,
        message: url,
        type: 'text', // Standard text message processing will pick up the URL
        ts: Date.now() / 1000
    };
    
    if (chatType === 'friends') {
        // Friend logic
         if (typeof activeFriendChat === 'undefined' || !activeFriendChat) return;
         payload.to = activeFriendChat;
         payload.from = username;
         // Send via API
         fetch('/api/dm', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
         });
         // Optimistic
         const container = document.getElementById('friendsChatMessages');
         if (container && window.createDiscordMessage) {
             window.createDiscordMessage(payload).then(el => {
                 container.appendChild(el); 
                 container.scrollTop = container.scrollHeight;
             });
         }
    } else if (chatType === 'group') {
        // Group logic
        if (!currentGroupId) return;
        channelName = document.getElementById('groupChatChannelName')?.textContent || 'general';
        payload.groupId = currentGroupId;
        payload.channel = channelName;
        
        fetch('/api/groups/message', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        // Optimistic
        const container = document.getElementById('groupChatMessages');
        if (container && window.createDiscordMessage) {
             window.createDiscordMessage(payload).then(el => {
                 container.appendChild(el); 
                 container.scrollTop = container.scrollHeight;
             });
        }
    } else {
        // Community logic
        payload.room = 'community';
        payload.id = (window.generateUUID || generateUUID)();
        
        fetch('/api/messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        // Optimistic
        const container = document.getElementById('chatMessagesCommunity');
        if (container && window.createDiscordMessage) {
            window.createDiscordMessage(payload).then(el => {
                 container.appendChild(el); 
                 container.scrollTop = container.scrollHeight;
             });
        }
    }
}
window.sendGif = sendGif;

// Close sticker picker when clicking outside
document.addEventListener('click', function (e) {
    const pickers = document.querySelectorAll('.sticker-picker');
    const stickerBtns = document.querySelectorAll('[onclick*="toggleStickerPicker"]');

    let clickedInsidePicker = false;
    pickers.forEach(p => {
        if (p.contains(e.target)) clickedInsidePicker = true;
    });
    stickerBtns.forEach(btn => {
        if (btn.contains(e.target)) clickedInsidePicker = true;
    });

    if (!clickedInsidePicker) {
        pickers.forEach(p => p.classList.add('hidden'));
        activeStickerPickerId = null;
    }
});

// Initialize sticker pickers on DOM ready
document.addEventListener('DOMContentLoaded', initStickerPickers);
