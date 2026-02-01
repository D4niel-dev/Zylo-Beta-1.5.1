/**
 * moments.js - Logic for the Moments/Explore feed
 */

async function loadMomentsFeed() {
    const container = document.getElementById('momentsFeed');
    if (!container) {
        console.warn('momentsFeed container not found');
        return;
    }
    
    // Set user avatar
    const me = localStorage.getItem('username');
    if (me && typeof getUserAvatarUrl === 'function') {
        getUserAvatarUrl(me).then(url => {
            const el = document.getElementById('momentsMyAvatar');
            if (el) el.src = url;
        });
    }

    container.innerHTML = '<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-2 border-discord-blurple border-t-transparent rounded-full mx-auto"></div></div>';

    try {
        const res = await fetch('/api/moments');
        const data = await res.json();

        if (data.success) {
            if (!data.moments || data.moments.length === 0) {
                container.innerHTML = '<div class="text-center text-discord-gray-500 py-10">No moments yet. Share yours!</div>';
                return;
            }
            container.innerHTML = data.moments.map(post => renderMomentCard(post)).join('');
            
            // Load avatars for posts
            container.querySelectorAll('.moment-user-avatar').forEach(async img => {
                const user = img.dataset.username;
                if (user && window.getUserAvatarUrl) {
                   const url = await window.getUserAvatarUrl(user);
                   img.src = url;
                }
            });

            if (typeof feather !== 'undefined') feather.replace();
        } else {
            container.innerHTML = '<div class="text-center text-red-400">Failed to load feed</div>';
        }
    } catch (err) {
        console.error('Failed to load moments:', err);
        container.innerHTML = '<div class="text-center text-red-400">Failed to load feed</div>';
    }
}

function renderMomentCard(post) {
    const currentUser = localStorage.getItem('username');
    const isLiked = post.likes && post.likes.includes(currentUser);
    const likeCount = post.likes ? post.likes.length : 0;
    const timestamp = post.timestamp ? new Date(post.timestamp * 1000).toLocaleString() : 'Just now';

    const commentSectionId = `comments-${post.id}`;

    return `
    <div class="bg-discord-gray-800/40 backdrop-blur-md border border-discord-gray-700/50 rounded-2xl p-6 shadow-xl animate-fadeIn hover:border-discord-gray-600/50 transition duration-300">
      <div class="flex items-center gap-4 mb-4">
        <div class="relative group cursor-pointer">
            <div class="absolute inset-0 bg-gradient-to-tr from-discord-blurple to-purple-500 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
            <img src="/images/default_avatar.png" class="moment-user-avatar relative w-12 h-12 rounded-full object-cover border-2 border-discord-gray-800" data-username="${post.username || 'Anonymous'}">
        </div>
        <div>
          <div class="font-bold text-white text-lg leading-tight hover:text-discord-blurple cursor-pointer transition">${post.username || 'Anonymous'}</div>
          <div class="text-xs text-discord-gray-400 font-medium">${timestamp}</div>
        </div>
      </div>
      
      <div class="mb-4 text-discord-gray-100 whitespace-pre-wrap text-[15px] leading-relaxed">${(post.content || '').replace(/</g, '&lt;')}</div>
      
      ${post.image ? `<div class="mb-4 rounded-xl overflow-hidden bg-black/50 max-h-[500px] flex items-center justify-center border border-discord-gray-800 shadow-lg">
        <img src="${post.image}" class="max-w-full max-h-[500px] object-contain hover:scale-[1.01] transition duration-500" loading="lazy">
      </div>` : ''}
      
      <div class="flex items-center gap-6 border-t border-discord-gray-700/50 pt-4">
        <button id="like-btn-${post.id}" onclick="toggleLikeMoment('${post.id}')" class="group flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-discord-gray-400 hover:text-red-400'} transition">
          <div class="p-2 rounded-full group-hover:bg-red-500/10 transition">
             <i data-feather="heart" class="${isLiked ? 'fill-current' : ''} w-5 h-5 transition-transform group-active:scale-125"></i>
          </div>
          <span id="like-count-${post.id}" class="font-medium text-sm">${likeCount || 'Like'}</span>
        </button>
        <button onclick="toggleComments('${post.id}')" class="group flex items-center gap-2 text-discord-gray-400 hover:text-white transition">
          <div class="p-2 rounded-full group-hover:bg-gray-100/10 transition">
             <i data-feather="message-square" class="w-5 h-5"></i>
          </div>
          <span class="font-medium text-sm">Comment</span>
        </button>
        <button class="ml-auto text-discord-gray-500 hover:text-white transition" title="Share">
             <i data-feather="share-2" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Comments Section -->
      <div id="${commentSectionId}" class="hidden mt-4 pt-4 border-t border-discord-gray-700/30 animate-fadeIn">
          <div id="comments-list-${post.id}" class="space-y-3 mb-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-discord-gray-900">
              <!-- Comments will load here -->
              <div class="text-center text-xs text-discord-gray-500">Loading comments...</div>
          </div>
          <div class="flex gap-2">
              <input type="text" id="comment-input-${post.id}" class="flex-1 bg-discord-gray-900 border border-discord-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-discord-blurple focus:outline-none transition" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') postComment('${post.id}')">
              <button onclick="postComment('${post.id}')" class="p-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-lg transition">
                  <i data-feather="send" class="w-4 h-4"></i>
              </button>
          </div>
      </div>
    </div>
  `;
}

async function toggleLikeMoment(postId) {
    const username = localStorage.getItem('username');
    if (!username) return;

    // Optimistic Update
    const btn = document.getElementById(`like-btn-${postId}`);
    const countSpan = document.getElementById(`like-count-${postId}`);
    
    if (btn) {
        const icon = btn.querySelector('i');
        const isLiked = btn.classList.contains('text-red-500');
        
        // Toggle UI immediately
        if (isLiked) {
            btn.classList.remove('text-red-500');
            btn.classList.add('text-discord-gray-400');
            if(icon) icon.classList.remove('fill-current');
            if(countSpan) {
                let count = parseInt(countSpan.textContent) || 0;
                count = Math.max(0, count - 1);
                countSpan.textContent = count === 0 ? 'Like' : count;
            }
        } else {
            btn.classList.add('text-red-500');
            btn.classList.remove('text-discord-gray-400');
             if(icon) icon.classList.add('fill-current');
             if(countSpan) {
                let count = parseInt(countSpan.textContent) || 0;
                if(isNaN(count)) count = 0;
                countSpan.textContent = count + 1;
             }
        }
    }

    try {
        const res = await fetch('/api/moments/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: postId, username })
        });
        const data = await res.json();
        if (!data.success) {
            // Revert on failure (simplified: just reload or warn)
            console.error('Like failed, reverting');
             // Optionally reload feed to correct state
             // loadMomentsFeed(); 
        }
    } catch (e) { console.error(e); }
}

async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (!section) return;
    
    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden')) {
        // Load comments
        loadComments(postId);
    }
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;
    
    list.innerHTML = '<div class="text-center text-xs text-discord-gray-500 py-2">Loading...</div>';
    
    try {
        // Assuming backend endpoint exists or we mock it
        // For now, let's assume /api/moments/{id}/comments logic
        // But looking at existing code, maybe explore/posts returns comments?
        // Let's call a generic endpoint or mock for now as backend might need update
        // Using existing generic fetch for now
        
        // MOCKING FOR ROBUSTNESS until we confirm backend
        // Actually, let's try to fetch from explorer API if it supports it
        // Or checking if 'post' object had comments. It wasn't passed.
        // Let's implement a fetch.
        
        // If backend doesn't support comments yet, this will fail gracefully.
        // We'll update backend next.
        const res = await fetch(`/api/moments/${postId}/comments`);
        if(res.ok) {
             const data = await res.json();
             if(data.success && data.comments) {
                 if(data.comments.length === 0) list.innerHTML = '<div class="text-center text-xs text-discord-gray-500 py-2">No comments yet.</div>';
                 else {
                     list.innerHTML = data.comments.map(c => `
                        <div class="flex gap-2 items-start text-sm">
                            <span class="font-bold text-white shrink-0">${c.username}</span>
                            <span class="text-discord-gray-300 break-words">${c.content}</span>
                        </div>
                     `).join('');
                 }
             }
        } else {
             // Fallback mock if 404
             list.innerHTML = '<div class="text-center text-xs text-discord-gray-500 py-2">No comments yet (feature pending backend).</div>';
        }
    } catch(e) {
        console.error(e);
        list.innerHTML = '<div class="text-center text-xs text-red-400 py-2">Error loading comments.</div>';
    }
}

async function postComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input ? input.value.trim() : '';
    const username = localStorage.getItem('username');
    
    if(!text || !username) return;
    
    // Optimistic append
    const list = document.getElementById(`comments-list-${postId}`);
    if(list) {
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-start text-sm opacity-50'; // Grey out until confirmed
        div.innerHTML = `<span class="font-bold text-white shrink-0">${username}</span><span class="text-discord-gray-300 break-words">${text}</span>`;
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    }
    
    if(input) input.value = '';

    try {
        const res = await fetch(`/api/moments/${postId}/comments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, content: text })
        });
        const data = await res.json();
        
        if(data.success) {
            // Reload comments to confirm
            loadComments(postId);
        }
    } catch(e) { console.error(e); }
}

// Add these to window
window.toggleComments = toggleComments;
window.postComment = postComment;


async function postNewMoment() {
    const caption = document.getElementById('momentsCaption');
    const fileInput = document.getElementById('momentInputImage');
    const username = localStorage.getItem('username');

    if (!username) return alert('Please log in');
    
    const text = caption ? caption.value.trim() : '';
    const file = fileInput && fileInput.files[0];
    
    if (!text && !file) return; // Empty

    const payload = {
        username,
        content: text,
        image: null
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            payload.image = e.target.result;
            await sendMomentPost(payload);
        };
        reader.readAsDataURL(file);
    } else {
        await sendMomentPost(payload);
    }
}

async function sendMomentPost(payload) {
    try {
        const res = await fetch('/api/moments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            const caption = document.getElementById('momentsCaption');
            const fileInput = document.getElementById('momentInputImage');
            const preview = document.getElementById('momentImagePreview');
            
            if (caption) caption.value = '';
            if (fileInput) fileInput.value = '';
            if (preview) preview.classList.add('hidden');
            
            loadMomentsFeed();
        } else {
            alert('Failed: ' + data.error);
        }
    } catch (e) {
        console.error(e);
        alert('Error posting');
    }
}

function handleMomentImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        const preview = document.getElementById('momentPreviewImg');
        const container = document.getElementById('momentImagePreview');
        if (preview) preview.src = evt.target.result;
        if (container) container.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearMomentImage() {
    const fileInput = document.getElementById('momentInputImage');
    const preview = document.getElementById('momentImagePreview');
    if (fileInput) fileInput.value = '';
    if (preview) preview.classList.add('hidden');
}

// Global function aliases
window.refreshMoments = loadMomentsFeed;
window.loadMomentsFeed = loadMomentsFeed;
window.postMoment = postNewMoment;
window.toggleLike = toggleLikeMoment;
window.toggleLikeMoment = toggleLikeMoment;
window.handleMomentImageSelect = handleMomentImageSelect;
window.clearMomentImage = clearMomentImage;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Moments module loaded');
});
