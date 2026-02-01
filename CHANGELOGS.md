<div align="center">
  <img src="frontend/images/zylo/Zylo_changelogs.png" 
    width="100%"
    height="100%"/>
  <p><strong><i>Updates • Improvements • Fixes</i></strong></p>
</div>

---

## **Zylo-Beta-1.0.0**

- Initial beta release.
- Core auth pages (login, signup, forgot/reset).
- Basic community chat with Socket.IO (text + files).
- User profile card with avatar and banner.
- Theme toggle (light/dark) and basic settings.

---

## **Zylo-Beta-1.1.0**

### NEW :
- Added Friends and Groups basics in UI.
- Community room stats on Home (users, messages, rooms).
- Initial settings structure and quick panel.

### IMPROVEMENT :
- Updated the Login and Sign Up mechanic.
- Polished The main page of the app.

### FIX :
- Fix some UI functions

---

## **Zylo-Beta-v1.2.0**

### NEW :
- **Profile editing**: avatar/banner upload preview and persistence.
- Explore section scaffold.
- Build artifacts distributed, download cards with progress estimator.
- Offline banner and queued send support groundwork.
- **Direct Messages (DMs)**: API + sockets for 1:1 chats with history.

### IMPROVEMENT :
- Smaller bundle and assets refactor.
- Improved settings UX and language labels.
- Additional UI polish, animations and audio effects.
- **Friends API**: request, accept, decline, remove, UI wiring.
- **Groups API**: create, join/leave, group chat and file share.
- **Navbar cleanup**: separate Friends and Groups into distinct tabs.

### FIX :
- Stability fixes to chat send/file receive.
- Fixed ``shareActivity`` listener resilience and settings sync.
- Fixed signup eye icon toggle with Feather icons.
- **Theme**: Solid BG works for all modes; improved avatar fallbacks in chats.
- **Backend cleanup**: removed duplicates/unreachable code, added migrations.
- **Signup**: fix the bug with the icon not changing to the right version when toggle.
- Performance tweaks and minor bug fixes.

---

## **Zylo-Beta-v1.2.1**

### NEW :
- **UI/UX**: Completely change the UI with a more modern look.
- **Groups/Servers Icon**: Now when you make a new group/server, you can choose a image to be your group/server icon.
- **DMs file share**: Now you can upload files and images.
- **Emojis everywhere!**: Implemented emoji picker for every chats.
- **Theme Editor**: Added "Main Background" color picker for granular UI customization.
- **Theme Editor**: Added "Reset to Default" button to restore original settings.
- **Theme Editor**: New "Midnight" preset theme with cyan accents.

### IMPROVEMENT :
- **Groups/Servers**: Completely change how the groups/server works, now you can create a new group/server by via **(+)** button under the DM's button.
- **Group Channels**: Rework how they work and improve it so that's more *user-friendly*.
- **Settings**: Rework the settings, now they work fine without any bugs.
- **Theme Editor**: Implemented custom high-visibility scrollbars for the modal.
- **Theme Editor**: Restructured modal layout for better accessibility.
- **Backend Stability**: Improved the backend server so that it x2 times faster with the processing.

### FIX :
- **DM Chat**: Removed redundant border-top from the message input container.
- **Mobile**: Restored standard sidebar navigation and fixed structural glitches.
- **Profile**: Fix the ``aboutMe`` and ``profileBio`` after saving.

---

## **Zylo-Beta-v1.3.0**

### NEW :
- **Integrated Content**: Home page now directly includes QnA and What's New sections for immediate access.
- **Anchor Navigation**: Sidebar links now use smooth scrolling to specific sections on the Home page.
- **Improved Sidebar**: Added "Quick Actions" to the profile sidebar for faster avatar and banner updates.
- **Consolidated Navigation**: Refactored the core navigation system into a unified `navigateTo` function.

### IMPROVEMENT :
- **Home UX**: Removed redundant stats cards to prioritize useful QnA and Updates.
- **Profile UX**: Inlined Activity, Media, and Cloud into the Profile tab for a more seamless experience.
- **Documentation**: Major professional overhaul of README.md with detailed setup guides and features.
- **QnA**: Expanded with 15+ comprehensive questions covering all major features.

### FIX :
- **Profile Navigation**: Fixed a bug where profile sub-items would reload the entire view unnecessarily.
- **UI Consistency**: Corrected various typos and improved alignment in mobile view.
- **Button Highlighting**: Fixed "ghost focus" in the profile sidebar where multiple items appeared active simultaneously.

---

## **Zylo-Beta-v1.3.2** — *The Visual Polish*

### NEW :
- **Visual Overhaul**: Major refinements to sidebar navigation, tab transitions, and overall UI responsiveness.
- **Zylo Moments**: A clean, modern social feed interface for sharing photo updates.
- **Avatar Sync**: Seamless avatar synchronization across Profile, Chat, and Moments.

### FIX :
- **Sidebar Glitches**: Fixed overlap and logout button visibility issues.
- **Tab Rendering**: Solved "ghost tabs" where content wouldn't load properly on switch.

---

## **Zylo-Beta-v1.4.2** — *The Intelligents Update*

### NEW :
- **Dual AI Persona System**: Choose between **Diszi** (Analytical) and **Zily** (Creative) assistants.
- **Smart Chat Interface**: Model switching, typing indicators, and comprehensive history management.
- **Voice & Video UI**: New interface elements supporting future call features.
- **Sidebar Optimization**: Logout button now intelligently hides when sidebar is collapsed.

### FIX :
- **Logout Button**: Fixed visibility bug in collapsed sidebar state.
- **Avatar Loading**: Fixed avatar display issues in Moments feed.

---

## **Zylo-Beta-v1.5.0** — *The Stability & Polish Update* *(Latest)*

### NEW :
- **Global Sidebar Toggle**: Added expand/collapse button to ALL specific headers (Home, Friends, Settings, Groups, Cloud, Profile) for consistent navigation control.
- **Cloud "Download All"**: Added ability to zip and download all cloud files at once.
- **Moments Comments**: Fully implemented commenting system with backend support (GET/POST) and expandable UI.
- **New GIFs**: Added 6 new reaction GIFs (Applause, Facepalm, Thinking, Heart, Shocked, Dance).

### IMPROVEMENT :
- **Sidebar Persistence**: Sidebar now maintains its collapsed/expanded state when switching between tabs.
- **Cloud Search**: Added real-time filtering for cloud files.
- **Cloud Uploads**: Implemented debounce logic to prevent duplicate file uploads.
- **Optimistic UI**: Implemented instant feedback for "Like" and "Comment" actions in Moments to prevent feed reloads.

### FIX :
- **Asset Loading**: Replaced broken Tenor GIF URLs with reliable Giphy links to fix the Sticker Picker.
- **Sticker Picker**: Fixed grid alignment and tab switching bugs in the sticker menu.
- **Moments Disappearing**: Fixed a critical bug where posts would vanish upon interaction (like/comment).
- **Settings Tab**: Fixed the 'General' settings tab not rendering correctly due to nesting issues.
- **Backend Stability**: Fixed multiple endpoint issues in `app.py` related to cloud and social features.
- **Friends/Groups Lists**: Fixed layout and visibility issues in the secondary sidebar.