# Zylo App — Update, Bug Fix, and Improvement Plan (v1.2.1)

## Objective
This document defines concrete improvements, confirmed bugs, and technical fixes for `Zylo v1.2.1` based on direct inspection of the current frontend and backend codebase.  
This file is the **authoritative update specification**.
Any other improvements will be move to `Zylo v1.3.0`.

---

## 1. Codebase Overview (Reference)

**Frontend**
- `/frontend/js/` — core UI logic, navigation, runtime behavior
- `/frontend/files/style.css` — base UI styles
- `/frontend/files/light-theme-overrides.css` — partial theme overrides
- `/frontend/files/backup_functions.js` — legacy / fallback logic
- HTML-driven view switching (no centralized router)

**Backend**
- `/backend/app.py` — main API + app entry
- `/backend/database.py` — user data, settings persistence
- Start-location logic handled indirectly via frontend state

---

## 2. Planned Improvements

### 2.1 Replying Display System (Discord × Zalo Style)

**Current State**
- Messages render flat with no reply context
- No message-to-message relationship model exists

**Improvement Scope**
- Add reply metadata to message objects:
  - `replyToMessageId`
  - `replyToAuthor`
  - `replyPreviewText`
- Render reply preview block above message body
- Support:
  - Self-replies
  - Replies to other users
- Click reply preview → scroll & highlight original message

**UI Behavior**
- Left-side vertical indicator (reply thread cue)
- Compact preview for mobile
- Fallback UI if original message is deleted

**Affected Areas**
- Message render logic in `/frontend/js/`
- Message schema (frontend only for now)

---

### 2.2 Collapsible Secondary Sidebar (PC & Mobile)

**Clarification**
This applies to the **second sidebar column**  
(not the primary navigation containing DMs, Groups, Moments, Cloud).

**Current Issues**
- Sidebar is always mounted
- No responsive behavior
- Layout breaks on small screens

**Planned Behavior**
- Toggle button to collapse/expand
- Smooth CSS transition
- Persist state per session (localStorage)

**Mobile**
- Default collapsed
- Overlay instead of fixed width

**Affected Files**
- `/frontend/files/style.css`
- Sidebar layout JS in `/frontend/js/`

---

### 2.3 UI Consistency & Performance Improvements

- Normalize spacing between sidebar sections
- Reduce unnecessary DOM re-creation when switching views
- Prevent full UI resets on internal navigation
- Improve keyboard navigation and focus states

---

### 2.4 New Settings & Profile Feature Expansion

> **2.4 - 1. Settings Tab Restructure**

**Current Situation**

- Theme changer is located inside the General settings

- Settings are becoming crowded and harder to scale

**Planned Changes**

- Move Theme Changer into its own dedicated tab (e.g. Appearance or Themes)

- Expand this tab to include:

    - Theme presets management

    - Custom theme editor access

    - Live preview toggle

    - Reset to default theme option

**Benefits**

- Cleaner separation of concerns

- Easier future expansion of visual settings

- More intuitive UX for customization-heavy users

---

> **2.4 - 2. Profile Tab – Secondary Sidebar Expansion**

**Current Situation**

- Profile tab second sidebar only contains My Profile

- Underutilized space and limited navigation

**Planned Changes**

- Expand the profile tab secondary sidebar to include:

   - My Profile

   - My Cloud (relocated entry, functionality unchanged)

   - Activity / Overview (future-ready)

   - Saved Media (optional, future)

**Notes**

- The main Cloud tab will remain functional and unchanged

- This change is primarily a navigation and organization enhancement

**Benefits**

- Better information architecture

- Profile-related features are grouped logically

- Scales well for future profile features

---

> **2.4 - 3. Additional Feature**

- Profile Quick Actions Panel
- *Add a small action panel in the profile sidebar:*
    - Edit Profile
    - Change Avatar / Banner
    - Privacy Settings shortcut
    - Rationale
    - Reduces navigation friction
    - Matches UX patterns seen in Discord-like applications

- Profile Frames
- *Add pre-made profile franes*

---

### 2.5 Mobile UI Update

**Cureent Issue**
- There is only one sidebar for mobile users can get to `Settings` or their `Profile`
- Some UI's may break if ran on mobile

**Planned Changes**
- Add a seperate sidebar for mobile users (like how discrod and zalo did)
- The layout should be like this how discord did the sidebar :
          | DMs/Home | Cloud | Settings | Profile |
*(if Home is disable then only the DMs)*

---

## 3. Confirmed Bugs

### 3.1 "Where to Start" Settings Bug (Critical)

**Observed Behavior**
- Selecting a start location (Profile, Settings, etc.):
  - Displays blank UI
  - No active component is mounted
- Same issue occurs even when selecting Settings itself

**Root Cause (Likely)**
- Start location sets display state only
- Does NOT invoke the same navigation logic as actual UI clicks
- Navigation and view initialization are decoupled

**Affected Areas**
- Settings logic (frontend)
- Navigation functions in `/frontend/js/`
- Start value loaded from backend without trigger

---

### 3.2 Incomplete Custom Theme Application

**Observed**
Theme selector does not affect:
- Primary sidebar container
- Secondary sidebar container
- Profile card (secondary sidebar)
- Additional nested UI blocks

**Root Cause**
- `light-theme-overrides.css` is incomplete
- Many UI components still rely on hardcoded colors in `style.css`
- No centralized theme variable system

---

### 3.3 Sidebar State Reset Bug

**Observed**
- Sidebar collapses or resets on:
  - Page refresh
  - Section change
- Mobile/desktop transitions cause layout inconsistencies

---

### 3.4 Theme Changes Not Fully Reactive

**Observed**
- Some UI components require reload to reflect theme change
- Theme updates are not propagated to all mounted elements
- The *"Midnight"* preset theme in the custom theme modal, still need to be fixed because some of the UI components are still using the light mode color.

---

## 4. Proposed Fixes

### 4.1 Navigation & Start Location Fix

**Fix Strategy**
- Centralize navigation into a single handler:
  - `navigateTo(viewName)`
- Ensure:
  - Sidebar clicks
  - Start location settings
  - Programmatic navigation
  all call the same function

**Implementation Notes**
- Replace "set display only" logic
- Trigger full view initialization on load
- Prevent empty UI states

---

### 4.2 Theme System Completion

**Fix Strategy**
- Introduce CSS variables for all theme colors:
  - `--sidebar-primary-bg`
  - `--sidebar-secondary-bg`
  - `--profile-card-bg`
  - etc.
- Refactor `style.css` to consume variables
- Expand `light-theme-overrides.css` to override variables only

**Benefits**
- Full theme coverage
- Live theme switching
- Easier future theme additions

---

### 4.3 Sidebar State Persistence

**Fix Strategy**
- Store sidebar state in `localStorage`
- Restore state on load
- Sync behavior across breakpoints

---

### 4.4 Reply System Integration

**Fix Strategy**
- Extend message object structure
- Modify message renderer to detect replies
- Add scroll-to-message utility
- Guard against missing/deleted message references

---

## 5. Implementation Order (Recommended)

1. Fix navigation & start location bug
2. Complete theme system (variables first)
3. Stabilize sidebar behavior
4. Implement reply system
5. UI polish & performance cleanup

---

## 6. Other improvements, bugs and fixes:

### 6.1 WebSocket Connection Management (Critical)

**Issue**
- Socket.IO connection not properly handled when user goes offline
- No reconnection logic when connection drops
- Potential memory leaks from duplicate socket listeners

**Proposed Fix**
- Add connection state management
- Implement automatic reconnection with exponential backoff
- Clean up listeners on disconnect
- Add connection status indicator in UI

```javascript
// Add to socket initialization
socket.on('disconnect', () => {
  updateConnectionStatus('disconnected');
  attemptReconnection();
});

socket.on('reconnect', () => {
  updateConnectionStatus('connected');
  rejoinActiveRooms();
});
```

---

### 6.2 Message Deduplication (Critical)

**Issue**
- Optimistic rendering + socket events can cause duplicate messages
- No message ID tracking to prevent duplicates
- User sees same message appear twice

**Proposed Fix**
- Add unique message IDs (timestamp + username hash)
- Check for existing messages before appending
- Implement message deduplication logic

```javascript
const messageIds = new Set();

function isDuplicateMessage(msgId) {
  if (messageIds.has(msgId)) return true;
  messageIds.add(msgId);
  return false;
}
```

---

### 6.3 File Upload Size Validation (Security)

**Issue**
- No client-side file size limits
- Users can attempt to upload huge files
- Backend may crash or timeout on large files

**Proposed Fix**
- Add 10MB file size limit (configurable)
- Show user-friendly error for oversized files
- Add file size display in upload preview
- Implement chunked upload for large files

---

### 6.4 Scroll Position Management

**Issue**
- Chat scrolls to bottom even when user is reading history
- No "new messages" indicator when not at bottom
- Scroll position lost on tab switch

**Proposed Fix**
- Track user scroll position
- Only auto-scroll if user is near bottom (within 100px)
- Show "New Messages ↓" button when scrolled up
- Restore scroll position on return to chat

---

### 6.5 User Status/Presence System

**Issue**
- No real-time online/offline indicators
- Status dots are static
- No "last seen" timestamps

**Proposed Fix**
- Implement heartbeat system via WebSocket
- Update user status in real-time
- Add "last active" timestamps
- Show typing indicators with timeout

---

### 6.6 Message Editing History (Enhancement)

**Issue**
- Edited messages show "(edited)" but no history
- No way to see what was changed
- Potential for abuse (edit to completely different content)

**Proposed Fix**
- Store edit history in backend
- Add "View Edit History" option (right-click menu)
- Show timestamp of each edit
- Consider edit time limit (e.g., 15 minutes)

---

### 6.7 Reply Threading Improvements

**Issue**
- Reply context is stored but not fully utilized
- Clicking reply preview should jump to original
- No visual thread indicator for multiple replies

**Proposed Fix**
- Implement smooth scroll to referenced message
- Highlight referenced message temporarily
- Add thread view option for complex conversations
- Show reply count on messages that have replies

---

### 6.8 Group Channel Permissions

**Issue**
- All members can see and post in all channels
- No channel-specific permissions
- No private/announcement channels

**Proposed Fix**
- Add channel permission system
- Implement roles (Admin, Moderator, Member)
- Allow read-only announcement channels
- Add channel visibility settings

---

### 6.9 Rate Limiting (Security)

**Issue**
- No rate limiting on message sending
- Users can spam messages
- No flood protection

**Proposed Fix**
- Implement client-side rate limiting (5 msgs/10 sec)
- Add backend rate limiting per user
- Show cooldown timer when limited
- Temporary mute for repeat offenders

---

### 6.10 Link Preview Security

**Issue**
- Link preview fetches any URL without validation
- Potential SSRF vulnerability
- No timeout on preview generation

**Proposed Fix**
- Whitelist allowed domains for previews
- Add request timeout (5 seconds)
- Sanitize preview content (no scripts)
- Cache previews to avoid repeated fetches

---

### 6.11 Emoji Picker Performance

**Issue**
- Emoji picker rebuilds on every open
- Slow on mobile devices
- No search/filter functionality

**Proposed Fix**
- Initialize emoji picker once and reuse
- Add emoji search/filter
- Implement emoji categories with tabs
- Add recently used emoji section

---

### 6.12 Voice Message Quality

**Issue**
- Voice messages use default WebM format
- No compression or quality options
- File sizes can be large

**Proposed Fix**
- Add audio compression
- Allow quality selection (low/medium/high)
- Show file size before sending
- Implement waveform visualization

---

### 6.13 Group Icon Upload Validation

**Issue**
- No validation on group icon uploads
- Accepts any file type
- No size/dimension limits

**Proposed Fix**
- Validate file type (images only)
- Enforce max size (2MB)
- Auto-resize to 512x512px
- Show preview before upload

---

### 6.14 Message Search Functionality

**Issue**
- No way to search message history
- Can't find old conversations
- No keyword filtering

**Proposed Fix**
- Add search bar in chat header
- Implement full-text search on messages
- Show search results with context
- Filter by sender, date range, attachments

---

### 6.15 Notification Preferences

**Issue**
- All-or-nothing notification system
- No per-chat notification settings
- Can't mute specific conversations

**Proposed Fix**
- Add mute option for individual chats/groups
- Allow notification customization per chat
- Implement "Do Not Disturb" mode
- Add notification sound selection

---

### 6.16 Message Delivery Status

**Issue**
- No indication if message was delivered
- User doesn't know if recipient saw message
- No "read receipts"

**Proposed Fix**
- Add message status icons (sent/delivered/read)
- Implement read receipts (optional)
- Show timestamp of last read
- Add privacy toggle for read receipts

---

### 6.17 Media Gallery View

**Issue**
- No way to view all media in a chat
- Can't browse shared images easily
- No media download all option

**Proposed Fix**
- Add "View Media" button in chat header
- Grid view of all shared images/videos
- Lightbox for full-screen viewing
- Download all media option

---

### 6.18 Profile Customization Lock

**Issue**
- Profile effects can be applied by anyone
- No premium/achievement system
- All features available to everyone

**Proposed Fix**
- Add level-based feature unlocking
- Premium effects for high-level users
- Achievement system for unlocks
- Badge/trophy display on profile

---

### 6.19 Backup/Export Data

**Issue**
- No way to export chat history
- Users can't backup their data
- Data portability concerns

**Proposed Fix**
- Add "Export Data" in settings
- Generate downloadable JSON/CSV of messages
- Include media files in export
- GDPR compliance for data requests

---

### 6.20 Mobile Keyboard Handling

**Issue**
- Input field hidden when keyboard opens
- Page doesn't resize properly
- Difficult to see what you're typing

**Proposed Fix**
- Adjust viewport when keyboard appears
- Scroll chat to show input
- Add keyboard hide button
- Improve iOS Safari compatibility

---

### 6.21 Sticker Management

**Issue**
- Stickers load every time picker opens
- No custom sticker packs
- Can't add new stickers easily

**Proposed Fix**
- Lazy load sticker images
- Add custom sticker upload
- Organize into packs/categories
- Implement favorite stickers

---

### 6.22 Code Block Syntax Highlighting

**Issue**
- Code blocks render as plain text
- No syntax highlighting
- Difficult to read code snippets

**Proposed Fix**
- Integrate highlight.js or similar
- Auto-detect language
- Add copy code button
- Support multiple languages

---

### 6.23 Message Reactions Limit

**Issue**
- No limit on reactions per message
- UI can overflow with many reactions
- Performance issues with 100+ reactions

**Proposed Fix**
- Limit to 10 unique emojis per message
- Show "+N more" for excess reactions
- Compact view for many reactions
- Group duplicate reactions

---

### 6.24 Offline Message Queue Persistence

**Issue**
- Offline messages only in memory
- Lost on page refresh
- Can't survive app restart

**Proposed Fix**
- Already implemented in code but needs testing
- Ensure localStorage persistence works
- Add UI indicator for queued messages
- Retry failed messages automatically

---

### 6.25 Group Member Management

**Issue**
- No way to kick/ban members
- No member role management
- Owner can't transfer ownership

**Proposed Fix**
- Add kick/ban member options
- Implement role assignment UI
- Allow ownership transfer
- Add banned users list

---

### Implementation Priority:

**For v1.2.1**
- **Critical**: 6.1, 6.2, 6.3, 6.9 (Security & Stability)
- **High**: 6.4, 6.5, 6.14, 6.20 (UX Improvements)

**For v1.3.0**
- **Medium**: 6.6, 6.11, 6.15, 6.16 (Feature Enhancements)
- **Low**: 6.18, 6.21, 6.22, 6.23 (Polish & Nice-to-haves)
- **Planned**: 2.1 ~ 2.5 (UI Enhancements)

---

## 7. Attachments

This plan references the Zylo v1.2.1 and v1.3.0 codebase as provided in the attached ZIP archive or in the project folder.
All files should be treated as implementation references, not specifications.
