# Last Checked In — Future Roadmap

**Generated:** March 4, 2026  
**Based on:** Deep audit of all backend/frontend code, infrastructure, and architecture

---

## Phase A: Reliability & Notification Hardening
*Fix the silent failures that break trust with users.*

### [DONE] A1. Stale FCM Token Cleanup
**Priority:** 🔴 Critical | **Effort:** Small | **Infra:** None

**Problem:** When Firebase returns `messaging/registration-token-not-registered` (user cleared browser data, uninstalled PWA), the cron job silently fails but the dead token stays in the `devices` table forever. This is exactly what caused your notification outage.

**Fix:** In [server.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/server.js), wrap `sendEachForMulticast()` and inspect its `responses` array. For each response where `error.code === 'messaging/registration-token-not-registered'`, `DELETE` that token from `devices`.

**Files:** [server.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/server.js) (cron job, ~L189)

---

### [DONE] A2. Cron Job Error Isolation (Per-User)
**Priority:** 🔴 Critical | **Effort:** Small | **Infra:** None

**Problem:** If sending a notification to User A throws an unhandled error inside the [for](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/utils.js#103-109) loop (e.g., a bad token format), the entire loop aborts and Users B, C, D never get their notifications.

**Fix:** Wrap the inner `for (const userId of userIds)` body in its own `try/catch` so one user's failure doesn't block the rest.

**Files:** [server.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/server.js) (L145-L238)

---

### [DONE] A3. Signup → Auto-Login Double Request
**Priority:** 🟡 Medium | **Effort:** Small | **Infra:** None

**Problem:** `AuthContext.signup()` makes two sequential API calls: `POST /auth/signup` then `POST /auth/login`. This is a wasted round-trip. If the signup succeeds, the server already has the user — it should return a JWT directly.

**Fix:** Update `POST /api/auth/signup` to return a JWT in the response (same as login does), and update `AuthContext.signup()` to use it directly instead of calling [login()](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/context/AuthContext.jsx#62-86) separately.

**Files:** [auth.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/auth.js) (L38-L63), [AuthContext.jsx](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/context/AuthContext.jsx) (L37-L59)

---

## Phase B: Security Hardening
*Close gaps before the user base grows.*

### [DONE] B1. Email Case Sensitivity
**Priority:** 🟡 Medium | **Effort:** Small | **Infra:** None

**Problem:** If a user signs up as `User@Gmail.com` and later tries to log in as `user@gmail.com`, the `WHERE email = $1` lookup will fail (PostgreSQL `=` is case-sensitive). This also allows two accounts with the same email in different cases.

**Fix:** Normalize emails to lowercase before `INSERT` and `SELECT` in [auth.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/auth.js). Add a `LOWER()` wrapper or `CITEXT` column type.

**Files:** [auth.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/auth.js) (L42, L69, L91)

---

### B2. Rate Limit Auth Endpoints Separately
**Priority:** 🟡 Medium | **Effort:** Small | **Infra:** None

**Problem:** The global rate limiter allows 200 requests per 15 minutes across ALL endpoints. Auth endpoints (login, signup, forgot-password) should have a much stricter limit to prevent brute-force attempts.

**Fix:** Add a separate `authLimiter` (e.g., 10 requests per 15 minutes) and apply it specifically to `/api/auth`.

**Files:** [server.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/server.js) (L65-L74, L106)

---

### B3. Error Messages Leaking Internal Details
**Priority:** 🟡 Medium | **Effort:** Small | **Infra:** None

**Problem:** Many endpoints return `res.status(500).json({ error: err.message })`, which can leak database internals (table names, column names, query details) to the client.

**Fix:** Return generic error messages to the client (`"Internal server error"`) and only log the detailed `err.message` to the server console.

**Files:** Multiple routes: [contacts.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/contacts.js), [index.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/index.js), [settings.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/settings.js)

---

### [DONE] B4. SQL Injection Risk in Batch Snooze
**Priority:** 🔴 Critical | **Effort:** Small | **Infra:** None

**Problem:** In the batch-snooze endpoint, the interval string is built via string interpolation (`'${interval}'::interval`) rather than a parameterized query. While Zod validates the input as `{value: number, unit: enum}`, the pattern is dangerous and could become exploitable if the schema changes.

**Fix:** Use the same parameterized approach as the single-contact snooze endpoint (`$1::interval`).

**Files:** [contacts.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/contacts.js) (L120-L126)

---

## Phase C: Code Quality & Maintainability
*Reduce tech debt that slows future development.*

### C1. Remove Deprecated Endpoints
**Priority:** 🟢 Low | **Effort:** Small | **Infra:** None

**Problem:** `GET /api/contacts` and `GET /api/contacts/archived/count` are explicitly marked as `DEPRECATED` in comments but still active. They add surface area and maintenance burden.

**Fix:** Remove them or add deprecation headers if external consumers exist.

**Files:** [contacts.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/contacts.js) (L196-L223, L274-L287)

---

### C2. Clean Up "Gemini COMMENT" Annotations
**Priority:** 🟢 Low | **Effort:** Small | **Infra:** None

**Problem:** The codebase has ~50+ "Gemini COMMENT" prefixed comments. While useful during development, they clutter the code and look unprofessional. Standard code comments should explain *why*, not attribute *who*.

**Fix:** Batch find-replace to convert `// Gemini COMMENT:` to standard `//` comments, keeping only the ones that explain non-obvious decisions.

**Files:** All backend and some frontend files

---

### C3. Extract `MainApplication` Component (769-line `App.jsx`)
**Priority:** 🟡 Medium | **Effort:** Medium | **Infra:** None

**Problem:** `MainApplication` (L107-L733) is a 626-line component with 20+ handler functions, useMemo blocks, and complex JSX. It's a "God Component" that's hard to reason about and test.

**Fix:** Extract handler groups into focused custom hooks (e.g., `useBatchActions`, `useModals`) and break the render into sub-components (e.g., `<ActiveContactsView>`, `<PinnedSection>`).

**Files:** [App.jsx](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/App.jsx)

---

## Phase D: UX & Feature Improvements
*Polish that makes the app feel more professional.*

### D1. Notification Hour in Local Time
**Priority:** 🟡 Medium | **Effort:** Small | **Infra:** None

**Problem:** The Settings page shows notification time as a raw UTC hour (0-23). Most users don't think in UTC and will misconfigure their preferred time.

**Fix:** Display the dropdown in the user's local timezone (with a "(UTC+X)" suffix for clarity). Convert to/from UTC on submit/load using `Intl.DateTimeFormat().resolvedOptions().timeZone`.

**Files:** [SettingsPage.jsx](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/pages/SettingsPage.jsx), [useSettings.js](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/hooks/useSettings.js)

---

### D2. "Last Notification Sent" Visibility
**Priority:** 🟢 Low | **Effort:** Small | **Infra:** None

**Problem:** Users have no way to tell if notifications are actually being sent (as you experienced). There's no audit trail or last-sent timestamp.

**Fix:** Add a `last_notification_sent_at` column to `users`, updated by the cron job. Display it on the Settings page as "Last notification: 2 hours ago" so users can verify the system is working.

**Files:** `users` table migration, [server.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/server.js), [SettingsPage.jsx](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/pages/SettingsPage.jsx)

---

### D3. Expanded Reminder Frequencies
**Priority:** 🟡 Medium | **Effort:** Medium | **Infra:** None

**Problem:** Check-in frequency is currently only in days. User feedback explicitly requests weeks, months, and years as options.

**Fix:** Keep the database storage in days but add a frontend UI that lets users pick "2 weeks" or "3 months" and converts it to days. Alternatively, store frequency as an interval string and update the `next_checkin_date` calculation.

**Files:** [AddContactForm.jsx](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/components/AddContactForm.jsx), [ContactCard.jsx](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/components/ContactCard.jsx), [contacts.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/contacts.js)

---

### D4. Account Deletion (GDPR / Privacy)
**Priority:** 🟡 Medium | **Effort:** Medium | **Infra:** None

**Problem:** There's no way for a user to delete their own account. This is a legal requirement under GDPR and a good practice in general.

**Fix:** Add a `DELETE /api/auth/account` endpoint that cascades deletes across `contacts`, `notes`, `tags`, `contact_tags`, and `devices`, then deletes the `users` row. Add a UI button on the Settings page with a confirmation modal.

**Files:** [auth.js](file:///c:/Users/david/Documents/last-checked-in-app/backend/routes/auth.js), [SettingsPage.jsx](file:///c:/Users/david/Documents/last-checked-in-app/frontend/src/pages/SettingsPage.jsx)

---

## Phase E: Infrastructure & Scalability
*For when the user base grows beyond hobby-tier.*

### E1. Background Worker (Redis + BullMQ)
**Priority:** 🟢 Low (deferred) | **Effort:** Large | **Infra:** Redis ($7/mo), Worker process ($7/mo)

This is the original Phase 2 from the implementation plan. Decouples notification sending from the API server. Only needed at scale (~500+ users with devices).

---

### E2. Capacitor Wrap for App Store Distribution
**Priority:** 🟢 Low (deferred) | **Effort:** Medium | **Infra:** Apple Developer ($99/yr), Google Play ($25 one-time)

Wrap the existing PWA in Capacitor to distribute via iOS App Store and Google Play. The existing codebase would need minor platform-specific adjustments (e.g., native push token handling vs. web push).

---

## Phase F: Testing & CI
*Catch regressions before users do. Best undertaken after Phases A–D are complete and the codebase is stable.*

### F1. Backend Integration Tests (Jest + Supertest)
**Priority:** 🟡 Medium (deferred) | **Effort:** Medium | **Infra:** None

**Scope (to be refined by deep audit):** Auth endpoints (signup, login, reset, edge cases like email case sensitivity), contacts CRUD with `next_checkin_date` verification, the cron job (simulated batch sends with mixed success/failure tokens to verify error isolation and stale token cleanup), and settings endpoints.

---

### F2. Frontend Component Tests (Vitest + React Testing Library)
**Priority:** 🟡 Medium (deferred) | **Effort:** Medium | **Infra:** None

**Scope (to be refined by deep audit):** Critical user flows — login/signup, contact creation, snooze modal, batch actions, and the onboarding modal. Best paired with C3 (Extract MainApplication) so that components are small enough to test meaningfully.

---

### F3. CI Pipeline (GitHub Actions)
**Priority:** 🟡 Medium (deferred) | **Effort:** Small | **Infra:** None (free tier)

Add a GitHub Actions workflow that runs the F1 and F2 test suites on every push and PR. Block merges on test failure. This turns the deploy process from "hope for the best" into "verified before release."

---

## Summary Matrix

| Item | Priority | Effort | Phase |
|------|----------|--------|-------|
| [DONE] A1. Stale FCM Token Cleanup | 🔴 Critical | Small | A |
| [DONE] A2. Cron Error Isolation | 🔴 Critical | Small | A |
| [DONE] B4. SQL Injection in Batch Snooze | 🔴 Critical | Small | B |
| [DONE] A3. Signup Auto-Login | 🟡 Medium | Small | A |
| [DONE] B1. Email Case Sensitivity | 🟡 Medium | Small | B |
| B2. Auth Rate Limiting | 🟡 Medium | Small | B |
| B3. Error Message Leaking | 🟡 Medium | Small | B |
| C3. Extract MainApplication | 🟡 Medium | Medium | C |
| D1. Local Timezone Settings | 🟡 Medium | Small | D |
| D3. Expanded Frequencies | 🟡 Medium | Medium | D |
| D4. Account Deletion | 🟡 Medium | Medium | D |
| C1. Remove Deprecated Endpoints | 🟢 Low | Small | C |
| C2. Clean Gemini Comments | 🟢 Low | Small | C |
| D2. Last Notification Timestamp | 🟢 Low | Small | D |
| E1. BullMQ Worker | 🟢 Low | Large | E |
| E2. Capacitor App Store | 🟢 Low | Medium | E |
| F1. Backend Integration Tests | 🟡 Medium | Medium | F |
| F2. Frontend Component Tests | 🟡 Medium | Medium | F |
| F3. CI Pipeline | 🟡 Medium | Small | F |
