
// === Group Settings Modal Logic ===

function openGroupSettings() {
    if (!currentGroupId) return;
    const group = groupsData.find(g => g.id === currentGroupId);
    if (!group) return;

    const modal = document.getElementById('groupSettingsModal');
    const nameInput = document.getElementById('editGroupName');
    const descInput = document.getElementById('editGroupDesc');
    const iconInput = document.getElementById('editGroupIconInput');
    const iconPreview = document.getElementById('editGroupIconPreview');
    const initialSpan = document.getElementById('editGroupIconInitial');

    if (modal && nameInput && descInput) {
        nameInput.value = group.name || '';
        descInput.value = group.description || '';

        // Reset icon input
        if (iconInput) iconInput.value = '';

        // Set icon preview
        if (group.icon) {
            iconPreview.style.backgroundImage = `url(${group.icon})`;
            iconPreview.style.backgroundSize = 'cover';
            iconPreview.style.backgroundPosition = 'center';
            initialSpan.textContent = '';
        } else {
            iconPreview.style.backgroundImage = '';
            iconPreview.style.backgroundColor = getGroupColor(group.name);
            initialSpan.textContent = getGroupInitial(group.name);
        }

        modal.classList.remove('hidden');
    }
}

function closeGroupSettings() {
    const modal = document.getElementById('groupSettingsModal');
    if (modal) modal.classList.add('hidden');
}

function previewEditGroupIcon(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('editGroupIconPreview');
            const initial = document.getElementById('editGroupIconInitial');
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            initial.textContent = '';
        }
        reader.readAsDataURL(file);
    }
}

async function saveGroupSettings() {
    if (!currentGroupId) return;

    const name = document.getElementById('editGroupName').value.trim();
    const description = document.getElementById('editGroupDesc').value.trim();
    const iconInput = document.getElementById('editGroupIconInput');
    const username = localStorage.getItem('username');

    if (!name) return alert('Group name cannot be empty');

    let iconData = null;
    if (iconInput && iconInput.files[0]) {
        iconData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(iconInput.files[0]);
        });
    }

    try {
        const res = await fetch('/api/groups/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                groupId: currentGroupId,
                name,
                description,
                iconData
            })
        });

        const data = await res.json();
        if (data.success) {
            closeGroupSettings();
            await loadGroups(); // Reload to refresh sidebar and active view
            selectGroup(currentGroupId); // Reselect to update header info
        } else {
            alert(data.error || 'Failed to update group');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred');
    }
}

async function deleteGroup() {
    if (!currentGroupId) return;
    if (!confirm("Are you sure you want to delete this group? This cannot be undone.")) return;

    const username = localStorage.getItem('username');
    try {
        const res = await fetch('/api/groups/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                groupId: currentGroupId
            })
        });

        const data = await res.json();
        if (data.success) {
            closeGroupSettings();
            await loadGroups();
            // Switch to friends view or another group
            document.getElementById('sub-panel-group').classList.add('hidden');
            document.getElementById('tab-group').classList.add('hidden');
            activeFriendChat = null;
            renderFriendsDashboard();
        } else {
            alert(data.error || 'Failed to delete group');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred');
    }
}
