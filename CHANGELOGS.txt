# **Zylo Changelogs**

> **Zylo-Beta-1.0**
- Initial beta release.
- Core auth pages (login, signup, forgot/reset).
- Basic community chat with Socket.IO (text + files).
- User profile card with avatar and banner.
- Theme toggle (light/dark) and basic settings.

> **Zylo-Beta-1.1**

*[NEW]:*
- Added Friends and Groups basics in UI.
- Community room stats on Home (users, messages, rooms).
- Initial settings structure and quick panel.

*[IMPROVEMENTS]:*
- Updated the Login and Sign Up mechanic.
- Polished The main page of the app.

*[FIXS]:*
- Fix some UI functions


> **Zylo-Beta-v1.2**

*[NEW]:*
- Profile editing: avatar/banner upload preview and persistence.
- Explore section scaffold.
- Build artifacts distributed, download cards with progress estimator.
- Offline banner and queued send support groundwork.
- Direct Messages (DMs): API + sockets for 1:1 chats with history.

*[IMPROVEMENTS]:*
- Smaller bundle and assets refactor.
- Improved settings UX and language labels.
- Additional UI polish, animations and audio effects.
- Friends API: request, accept, decline, remove, UI wiring.
- Groups API: create, join/leave, group chat and file share.
- Navbar cleanup: separate Friends and Groups into distinct tabs.

*[FIXS]:*
- Stability fixes to chat send/file receive.
- Fixed shareActivity listener resilience and settings sync.
- Fixed signup eye icon toggle with Feather icons.
- Theme: Solid BG works for all modes; improved avatar fallbacks in chats.
- Backend cleanup: removed duplicates/unreachable code, added migrations.
- Signup : fix the bug with the icon not changing to the right version when toggle.
- Performance tweaks and minor bug fixes.


> **Zylo-Beta-v1.2.1** *(Latest)*

*[NEW]:*
- Theme Editor: Added "Main Background" color picker for granular UI customization.
- Theme Editor: Added "Reset to Default" button to restore original settings.
- Theme Editor: New "Midnight" preset theme with cyan accents.

*[IMPROVEMENTS]:*
- Theme Editor: Implemented custom high-visibility scrollbars for the modal.
- Theme Editor: Restructured modal layout for better accessibility.

*[FIXES]:*
- DM Chat: Removed redundant border-top from the message input container.
- Mobile: Restored standard sidebar navigation and fixed structural glitches.
