
/**
 * cloud.js - Logic for Zylo Cloud file storage
 */

async function loadCloudFiles(searchTerm = '') {
    const username = localStorage.getItem('username');
    if (!username) return;

    const container = document.getElementById('filesListContainer');
    if (!container) return; // Guard
    container.innerHTML = '<div class="col-span-full text-center py-8"><div class="animate-spin w-8 h-8 border-2 border-discord-blurple border-t-transparent rounded-full mx-auto"></div></div>';

    try {
        const res = await fetch(`/api/cloud/files?username=${encodeURIComponent(username)}`);
        const data = await res.json();

        if (data.success && data.files.length > 0) {
            let files = data.files;

            // Client-side filtering
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                files = files.filter(f => f.fileName.toLowerCase().includes(lower));
            }

            if (files.length === 0) {
                 container.innerHTML = `<div class="col-span-full py-12 text-center text-discord-gray-500"><p>No files match your search.</p></div>`;
                 updateCloudUsage(0); // Optional: keep showing usage or zero it? Let's show zero for filtered view or keep global? Better to keep global but logic separate. For now, this is fine.
                 return;
            }

            container.innerHTML = files.map(file => {
                let previewHtml = '';
                const imgSrc = file.url || file.fileData; // url is persistent path, fileData is base64 (if returned)

                if (file.fileType.startsWith('image/') && imgSrc) {
                    previewHtml = `<img src="${imgSrc}" class="w-10 h-10 rounded object-cover border border-discord-gray-600 bg-black">`;
                } else {
                    previewHtml = `<div class="w-10 h-10 rounded bg-discord-gray-700 flex items-center justify-center text-2xl">${getFileIcon(file.fileType)}</div>`;
                }
                
                // Allow direct download link if URL is available
                const downloadLink = file.url ? file.url : '#';
                const downloadAttr = file.url ? `download="${file.fileName}"` : '';

                return `
            <div class="bg-discord-gray-800 p-3 rounded-lg flex items-center gap-3 group hover:bg-discord-gray-700 transition relative">
              ${previewHtml}
              <div class="overflow-hidden flex-1">
                <h4 class="text-sm font-medium text-white truncate" title="${file.fileName}">${file.fileName}</h4>
                <p class="text-xs text-discord-gray-400">${new Date(file.createdAt * 1000).toLocaleDateString()} • ${formatBytes(file.size)}</p>
              </div>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <a href="${downloadLink}" ${downloadAttr} target="_blank" class="p-2 text-discord-gray-400 hover:text-white hover:bg-discord-gray-600 rounded" title="Download">
                    <i data-feather="download" class="w-4 h-4"></i>
                  </a>
                  <button onclick="deleteCloudFile('${file.id}')" class="p-2 text-red-400 hover:bg-discord-gray-600 rounded" title="Delete">
                    <i data-feather="trash-2" class="w-4 h-4"></i>
                  </button>
              </div>
            </div>
          `}).join('');
            if (window.feather) feather.replace();
            
            // Calculate Usage (Always based on ALL files, not just filtered)
            let totalBytes = 0;
            data.files.forEach(f => {
                if (f.size) totalBytes += parseInt(f.size);
                else if (f.fileData) totalBytes += Math.ceil((f.fileData.length * 3) / 4);
                else totalBytes += 500 * 1024; 
            });
            updateCloudUsage(totalBytes);

        } else {
            updateCloudUsage(0);
            container.innerHTML = `
            <div class="col-span-full py-12 text-center text-discord-gray-500">
              <i data-feather="folder" class="w-12 h-12 mx-auto mb-3 opacity-20"></i>
              <p>No files yet. Upload your first file!</p>
            </div>
          `;
            if (window.feather) feather.replace();
        }
    } catch (err) {
        console.error('Failed to load files:', err);
        container.innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to load files.</p>';
    }
}

async function downloadAllCloudFiles() {
    if (!confirm("Are you sure you want to download ALL files as a ZIP? This might take a moment.")) return;
    
    const username = localStorage.getItem('username');
    if (!username) return;

    // Trigger download via anchor
    // We can just open the window to the API endpoint which returns the file
    // Adding timestamp to prevent caching
    window.location.href = `/api/cloud/download-all?username=${encodeURIComponent(username)}&t=${Date.now()}`;
}

function updateCloudUsage(bytes) {
    const max = 10 * 1024 * 1024 * 1024; // 10 GB
    const percent = Math.min(100, (bytes / max) * 100);
    
    const fill = document.getElementById('cloudUsageFill');
    const text = document.getElementById('cloudUsageText');
    
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${formatBytes(bytes)} of 10 GB used`;
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileIcon(type) {
    if (!type) return '❓';
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('zip') || type.includes('compressed')) return '📦';
    return '📁';
}

// Track active uploads to prevent duplicates (double-firing events)
const activeUploads = new Set();

async function uploadCloudFile(files) {
    if (!files || files.length === 0) return;

    const username = localStorage.getItem('username');
    if (!username) return alert("Please log in first.");

    const progress = document.getElementById('cloudUploadProgress');
    if (progress) progress.classList.remove('hidden');

    for (let file of files) {
        // Prevent duplicate uploads of the same file (name+size+date) within the same session
        // This fixes the "double upload on first try" bug if the event fires twice.
        const fileSignature = `${file.name}-${file.size}-${file.lastModified}`;
        if (activeUploads.has(fileSignature)) {
            console.warn("Skipping duplicate upload:", file.name);
            continue;
        }
        activeUploads.add(fileSignature);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await fetch('/api/cloud/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        fileName: file.name,
                        fileType: file.type,
                        fileData: e.target.result
                    })
                });
                loadCloudFiles(); // Refresh list
            } catch (err) {
                console.error('Upload failed:', err);
                alert('Failed to upload ' + file.name);
            } finally {
                // Remove from active tracking after a delay (or immediately)
                // We keep it for a short while to ensure the second event of a double-fire is blocked
                setTimeout(() => activeUploads.delete(fileSignature), 2000);
            }
        };
        reader.readAsDataURL(file);
    }

    if (progress) setTimeout(() => progress.classList.add('hidden'), 2000);
}

async function deleteCloudFile(fileId) {
    if (!confirm("Delete this file?")) return;
    const username = localStorage.getItem('username');
    try {
        const res = await fetch('/api/cloud/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, fileId })
        });
        const data = await res.json();
        if (data.success) {
            loadCloudFiles();
        } else {
            alert("Delete failed: " + data.error);
        }
    } catch (err) {
        alert("Delete failed");
    }
}

// Initialize logic
document.addEventListener('DOMContentLoaded', () => {
    // Add drag-drop listeners
    const dropZone = document.getElementById('cloudUploadArea');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-discord-blurple');
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-discord-blurple');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-discord-blurple');
            uploadCloudFile(e.dataTransfer.files);
        });
    }

    // Helper for legacy calls
    window.refreshFilesList = loadCloudFiles;
});
