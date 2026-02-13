# Zylo Profile Badges — Definitions & Unlock Criteria

_A comprehensive badge catalogue for Zylo. Use this as a reference for product, design, and engineering. Each badge includes a short description, suggested icon, unlock criteria, rarity, visibility, and suggested UX/reward mechanics._

---

## Usage notes
- **Show at most 3 active badges** on the user's profile header. Store the rest in `badges_unlocked`, ban show more with *"Show more >"* next to the 3 shown badges.
- Badges are represented as strings in the DB and mapped to icon + label in the frontend.
- Consider making some badges "hidden" (not displayed publicly until unlocked).
- Provide a toast/animation on unlock and an entry in an "Achievements" page with details.

---

## Badge Categories
1. Skill / Mode Badges — earned by using specific AI modes or features
2. Milestone Badges — earned by cumulative actions or time
3. Personality Badges — reflect user preference or style
4. Trust / Contribution Badges — verification, reporting, support
5. Fun / Discovery Badges — easter eggs and playful achievements
6. System / Tech Badges — indicates how user used the system (local / cloud / offline)
7. Developer & System Authority Badges (hardcoded / manually assigned only)
8. Tiered Grind Badges (Gamification Boost)
9. Hidden / Secret / Ultra Rare Badges (Discover them socially)
10. Competitive / Social Badges

---

## Badges (Detailed)

### 1. Thinker
- **Icon:** 🧠 (brain / idea)
- **Description:** Active user of Thinking / Planning modes; asks deep, multi-step questions.
- **Unlock criteria:** Use Thinking/Planning mode for at least 15 sessions and have 5 messages where the assistant’s reply length ≥ 200 words.
- **Rarity:** Uncommon
- **Visibility:** Public
- **Perk:** "Insightful" highlight on profile; small XP bonus.

---

### 2. Coder
- **Icon:** 💻 (code)
- **Description:** Frequently requests code generation, refactors, or debugging from Diszi.
- **Unlock criteria:** Run the Coder mode 25 times OR request 10 successful code fixes where user marks the fix as helpful.
- **Rarity:** Common → Uncommon
- **Visibility:** Public
- **Perk:** Quick "snippet" sharing option unlocked.

---

### 3. Debugger
- **Icon:** 🐞 (bug)
- **Description:** Uses the debug pipeline (uploading screenshots/code images → OCR → fix) effectively.
- **Unlock criteria:** Upload 10 images that resulted in a meaningful AI-assisted change, or file an accepted bug report with AI-assisted fix.
- **Rarity:** Uncommon
- **Visibility:** Public
- **Perk:** Priority in debug queue (if you implement tiers).

---

### 4. Writer
- **Icon:** ✍️ (pencil/edit)
- **Description:** Uses Zily for creative writing, editing, or long-form content.
- **Unlock criteria:** Generate or edit 10 pieces longer than 300 words, or use "export" for 5 texts.
- **Rarity:** Common
- **Visibility:** Public
- **Perk:** Access to extra writing templates.

---

### 5. Reviewer
- **Icon:** 🔍 (magnify)
- **Description:** Uses the Review mode often to critique or polish text.
- **Unlock criteria:** Submit 20 review requests and accept at least 10 suggestions.
- **Rarity:** Common
- **Visibility:** Public
- **Perk:** "Reviewer" filter in content explorer.

---

### 6. Power User
- **Icon:** ⚡ (zap)
- **Description:** High-frequency user across multiple modes.
- **Unlock criteria:** Use Zylo across 7 consecutive days or perform 200 actions (any).
- **Rarity:** Rare
- **Visibility:** Public
- **Perk:** Small cosmetic flair and badge highlight.

---

### 7. Newcomer
- **Icon:** 🌱 (sprout)
- **Description:** Welcome badge for new accounts.
- **Unlock criteria:** Create account and complete onboarding checklist.
- **Rarity:** Very common
- **Visibility:** Public
- **Perk:** Starter tips and zero-cost credits (if applicable).

---

### 8. Explorer
- **Icon:** 🧭 (compass)
- **Description:** Uses diverse features (Explore, Moments, groups).
- **Unlock criteria:** Use 5 different features (chat, explore, moments, groups, cloud upload).
- **Rarity:** Common
- **Visibility:** Public
- **Perk:** Unlock a special sticker pack.

---

### 9. Veteran
- **Icon:** 🏅 (medal)
- **Description:** Long-term or returning user.
- **Unlock criteria:** Account age ≥ 180 days OR total login days ≥ 60.
- **Rarity:** Rare
- **Visibility:** Public
- **Perk:** "Veteran" accent border on avatar.

---

### 10. Night Owl
- **Icon:** 🌙 (moon)
- **Description:** Frequent activity during late-night hours.
- **Unlock criteria:** 50 actions between 00:00–05:00 local time.
- **Rarity:** Uncommon
- **Visibility:** Public / optional
- **Perk:** Night mode theme unlocked.

---

### 11. Diszi-minded
- **Icon:** 🧊 (cube / logic)
- **Description:** Prefers analytical, structured responses (Diszi).
- **Unlock criteria:** >70% of requests routed to Diszi models over 30 sessions.
- **Rarity:** Uncommon
- **Visibility:** Public
- **Perk:** Priority model routing tip and advanced settings.

---

### 12. Zily-hearted
- **Icon:** 🌈 (rainbow)
- **Description:** Prefers creative, human-sounding responses (Zily).
- **Unlock criteria:** >70% usage of Zily modes for 30 sessions.
- **Rarity:** Uncommon
- **Visibility:** Public
- **Perk:** Extra writing voice presets.

---

### 13. Verified
- **Icon:** ✔️ (check / shield)
- **Description:** Verified email or identity.
- **Unlock criteria:** Email verified OR additional verification steps completed.
- **Rarity:** Common
- **Visibility:** Public
- **Perk:** Trusted tag, higher upload limits, a verified checkmark nexus to username.

---

### 14. Bug Hunter
- **Icon:** 🐛 (bug)
- **Description:** Contributed useful bug reports.
- **Unlock criteria:** File 3 accepted bug reports or help triage issues with useful reproduction steps.
- **Rarity:** Rare
- **Visibility:** Public
- **Perk:** Early access to betas.

---

### 15. Contributor
- **Icon:** 🛠️ (tool)
- **Description:** Contributed code, documentation, or assets to Zylo.
- **Unlock criteria:** Linked GitHub PR merged OR contributed assets adopted in repo.
- **Rarity:** Very rare
- **Visibility:** Public
- **Perk:** Contributor flair + credits in README.

---

### 16. First Chat
- **Icon:** 💬 (speech)
- **Description:** First successful interaction with the AI.
- **Unlock criteria:** Complete first chat (send 1 message & receive reply).
- **Rarity:** Very common
- **Visibility:** Public
- **Perk:** Welcome tutorial unlocked.

---

### 17. 100 Messages
- **Icon:** 💯 (100)
- **Description:** Sent 100 messages.
- **Unlock criteria:** 100 messages sent (DMs + community).
- **Rarity:** Common
- **Visibility:** Public
- **Perk:** Extra sticker pack.

---

### 18. Deep Thinker
- **Icon:** 🧩 (puzzle)
- **Description:** Engages with multi-step complex tasks.
- **Unlock criteria:** Ask 10 multi-step requests where AI returns a plan with ≥5 steps.
- **Rarity:** Uncommon
- **Visibility:** Public
- **Perk:** Access to advanced planning templates.

---

### 19. Idea Spark
- **Icon:** ✨ (sparkle)
- **Description:** Creative prompts that produce notable outputs.
- **Unlock criteria:** Create 5 prompts that are marked "helpful" or "favorite" by the user or others.
- **Rarity:** Common
- **Visibility:** Public
- **Perk:** Special avatar frame.

---

### 20. Offline Survivor
- **Icon:** 🔌 (or something related)
- **Description:** Used Zylo in offline / local fallback mode.
- **Unlock criteria:** Use Strands or local-only mode for 5 sessions or more.
- **Rarity:** Uncommon
- **Visibility:** Public / optional
- **Perk:** Offline tips & cache increase.

---

### 21. Cloud Mind
- **Icon:** ☁️ (cloud)
- **Description:** Frequently uses cloud AI (OpenRouter).
- **Unlock criteria:** >60% of AI sessions routed through cloud models over 30 sessions.
- **Rarity:** Common
- **Visibility:** Public
- **Perk:** Model usage insights dashboard.

---

### 22. Local Mind
- **Icon:** 🖥️ (desktop)
- **Description:** Frequently uses local Ollama models in desktop app.
- **Unlock criteria:** >60% of sessions use local Ollama for 30 sessions.
- **Rarity:** Uncommon
- **Visibility:** Public
- **Perk:** Local-only tips and optimizations.

---

### 23. Architect
- **Icon:** 🏗️ (or something related)
- **Description:** Creator of Zylo.
- **Unlock criteria:** Manual assignment only (```user role = developer```)
- **Rarity:** ???
- **Visibility:** Public
- **Perk:** Gold name highlight + crown aura

---

### 24. Core Maintainer
- **Icon:** 🧬
- **Description:** Maintains core AI or backend systems.
- **Unlock criteria:** Linked GitHub account with merged PRs in core/ directory.
- **Rarity:** Mythic
- **Visibility:** Public
- **Perk:** Special badge glow animation

---

### 25. System Override
- **Icon:** 🛡️⚙️
- **Description:** Has admin-level access.
- **Unlock criteria:** Role = ```admin```
- **Rarity:** Legendary
- **Visibility:** Public (optional hidden)
- **Perk:** Admin flair

---

### 26. Origin
- **Icon:** 🌌
- **Description:** Account created before public launch.
- **Unlock criteria:** ```created_at``` < ```PUBLIC_RELEASE_DATE```
- **Rarity:** Mythic
- **Visibility:** Public
- **Perk:** Massive flex badge.

---

### Message Master Series
27. Chatter I
- **Unlock criteria:** messages sended (In any chats)
- **Rarity:** Uncommon
28. Chatter II
- **Unlock criteria:** 1,000 messages sended (In any chats)
- **Rarity:** Rare
29. Chatter III
- **Unlock criteria:** 5,000 messages sended (In any chats)
- **Rarity:** Epic
30. Chatter IV
- **Unlock criteria:** 10,000 messages sended (In any chats)
- **Rarity:** Legendary

---

### Code Warrior Series
31. Code Apprentice
- **Unlock criteria:** 25 code requests
- **Rarity:** Uncommon
- **Perk:** Nothing
32. Code Adept
- **Unlock criteria:** 100 code requests
- **Rarity:** Rare
- **Perk:** GitHub badge
33. Code Master
- **Unlock criteria:** 500 code requests
- **Rarity:** Epic
- **Perk:** GitLens badge
34. Code Overlord
- **Unlock criteria:** 1,500+ code requests
- **Rarity:** Legendary
- **Perk:** Animated badge

---

### 35. The Glitch
- **Unlock criteria:** Trigger a specific hidden easter egg phrase
- **Description:** hidden until unlocked
- **Rarity:** ???
- **Perk:** Can unlocked the next badges

---

### 36. Speedrunner
- **Unlock criteria:** Complete onboarding in under 3 minutes
- **Description:** hidden until unlocked
- **Rarity:** ???
- **Perk:** Can unlocked the next badges

---

### 37. The Silent One
- **Unlock criteria:** Use app for 30 days without posting in public chat
- **Description:** hidden until unlocked
- **Rarity:** ???
- **Perk:** Can unlocked the next badges

---

### 38. Chaos Mode
- **Unlock criteria:** Switch between Diszi and Zily 50 times in one session
- **Description:** hidden until unlocked
- **Rarity:** ???
- **Perk:** Can unlocked the next badges

---

### 39. The Dual Mind
- **Unlock criteria:** Balanced usage: 50% Diszi, 50% Zily over 100 sessions
- **Description:** hidden until unlocked
- **Rarity:** ???
- **Perk:** Can unlocked the next badges

---

### 40. Community Helper
- **Unlock criteria:** Marked helpful by 10 users

---

### 41. Trend Starter
- **Unlock criteria:** Prompt copied/used by 20 users

---

### 42. Beta Explorer
- **Unlock criteria:** Used beta model 20 times

---

### 43. Cloud Pioneer
- **Unlock criteria:** First *100* users to use OpenRouter integration

---

### 44. Local Titan
- **Unlock criteria:** Runs 7B+ local model consistently

---

### 45. The 1%
- **Unlock criteria:** Top 1% of activity in last 30 days

---

### 46. AI Whisperer
- **Unlock criteria:** 90%+ helpful rating over 200 sessions

---

### 47. Eternal
- **Unlock criteria:** 365-day login streak (Offline doesn't count)

---

### 48. Mythic Mind
- **Unlock criteria:** Unlock 30+ total badges

---

## Implementation details & suggestions

### Data model (example)
Store badges as strings in user record:
```json
{
  "username": "alice",
  "badges_unlocked": ["first_chat", "coder", "verified"],
  "badges_active": ["coder", "verified"]
}
```

### Unlock workflow
1. Event occurs (e.g., API call recorded).
2. Backend evaluates unlock rules.
3. If unlocked:
   - Add to `badges_unlocked`
   - Optionally auto-add to `badges_active` (respect active limit)
   - Emit websocket event `badge_unlocked`
   - Frontend shows animation / toast and adds to Achievements list

### Badge UI tips
- Use a circular background with subtle shadow.
- Add a small ribbon or star for rare badges.
- Show tooltip with: title, description, date unlocked, how obtained.
- Allow users to pin up to 3 badges as active.

### Accessibility
- Provide text labels and ARIA attributes.
- For colorblind users, include shapes or small patterns in badge background.

### Anti-abuse
- Debounce event-based badges (dedupe repeated actions).
- Only count "helpful" or "accepted" markers for quality-based badges.
- Rate-limit quick-grant badges.

---

## Final notes
- Start with a core set (~12) and expand gradually.
- Keep criteria simple and measurable.
- Log badge grants for analytics and debugging.

---

_End of badge specification._
