# **Last Checked In \- Project Documentation**

**Last Updated:** March 11, 2026  
**Version:** 14.4.0 \-\> 14.5.0  
**Author:** Gemini

## **1\. Project Overview**

### **1.1 Purpose & Vision**

"Last Checked In" is a Personal Relationship Manager (PRM). Its core purpose is to be a private, intentional tool that empowers users to be more consistent and thoughtful in nurturing their personal and professional relationships. It provides each user with a secure, private account to manage their connections, combating the passive nature of social media by providing an active tool for connection.

### **1.2 Core Problem Solved**

In a busy world, it's easy to lose touch with people we care about. This application solves that problem by providing a centralized, private dashboard for each user to:

* Track the last time they connected with a specific person.  
* Set custom, flexible reminders for when to check in next.  
* Keep private, timestamped, and editable notes on conversations to remember important details.  
* Organize contacts with detailed information and a flexible tagging system.  
* Receive proactive push notifications for their own overdue check-ins.

### **1.3 Target User & Philosophy**

The app is designed for individuals seeking a private tool to manage their social and professional connections. It operates on a philosophy of intentionality over passive engagement.

* It is not a social network. All user data is sandboxed and for their eyes only.  
* It is proactive, not reactive. The app prompts the user to reach out.  
* It values quality over quantity, focusing on deepening existing relationships.

## **2\. Feature Breakdown**

### **2.1 User Accounts & Authentication**

The application has been fundamentally re-architected into a full-featured, multi-user platform with a robust and secure account system.

* **Signup:** Users can create a new, private account using an email and password. The signup page UI has been completely refactored with a modern design, a "Confirm Password" field to prevent typos, and a "Show/Hide Password" toggle for improved usability. Passwords are never stored in plain text; they are salted and hashed using bcryptjs. All email addresses are automatically normalized to lowercase and trimmed to prevent accidental duplicate accounts or login failures due to case mismatches.
* **Login:** Registered users can log in to access their sandboxed data. Emails provided during login are also normalized to lowercase, guaranteeing match consistency.
* **Session Management:** The system uses JSON Web Tokens (JWTs) stored in the browser's localStorage to maintain user sessions across page loads. Sessions persist for 7 days.
* **Data Sandboxing:** The core of the multi-user system. A user can only see and interact with the data they have created. All data is scoped to their user ID on the backend.  
* **Logout:** A logout button in the header allows users to securely terminate their session, clearing their credentials from the application state and localStorage.

### **2.2 Core Features (Now User-Specific)**

* **Contact Management:** Add, edit, and view contacts with their name and a custom check-in frequency.  
* **Check-in System:** Manually log a "check-in" to reset the reminder timer. Contacts who are past their check-in frequency are visually highlighted as "overdue."  
* **Notes System:** Add, edit, and view multiple, timestamped notes for each contact.

### **2.3 Advanced Features (Now User-Specific)**

* **Animated Dark Mode & Persistence:** Replaced the text-based "Toggle Theme" button with a modern, animated sun/moon icon. The user's theme preference is now saved to their browser's localStorage.  
* **Expanded Contact Details:** Store 'How We Met,' 'Key Facts,' and 'Birthday'. For improved clarity, the birthday field in both the "Add" and "Edit" forms now includes a 🎂 icon to make it instantly recognizable.  
* **Tagging System:** A flexible, many-to-many tagging system with server-side autocomplete. Tag suggestions are fetched dynamically from a dedicated search endpoint (`GET /api/tags/search?q=`) as the user types, using a debounced input (300ms). This replaces the previous approach of fetching all tags on component mount, significantly improving scalability for users with large tag libraries.  
* **Advanced Filtering & Sorting:** Comprehensive controls to organize the contact list.  
* **Global Search:** A search bar that filters contacts by name or note content.  
* **Archive/Restore System:** Archive contacts instead of permanently deleting them.  
* **Multi-User Push Notifications:** An hourly scheduled job on the backend (node-cron) is the single source of truth for notifications. It queries users whose preferred notification hour matches the current UTC hour, then performs a fast, indexed lookup on the pre-calculated `next_checkin_date` column to find overdue contacts. It sends a single, dynamic summary push notification. After each send, the job automatically inspects the FCM response and removes any stale or permanently-invalid device tokens from the database, keeping the `devices` table clean and preventing wasted FCM calls on subsequent runs.
* **Signup Auto-Login Optimization (v14.5, A3):** The `POST /api/auth/signup` endpoint now generates and returns a JWT session token immediately upon successful user creation. Previously, the frontend would make a redundant `POST /api/auth/login` request immediately after signup. This optimization halves the network latency for signups and reduces database load (eliminating a redundant lookup and bcrypt comparison).
* **Parameterized Batch Snooze Query (v14.4, B4):** The batch-snooze endpoint (`POST /api/contacts/batch-snooze`) previously built its PostgreSQL interval via string interpolation (`'${interval}'::interval`). While the input was Zod-validated, this pattern was a latent SQL injection vector — if the Zod schema ever loosened or was bypassed, a crafted interval string could escape the SQL context and execute arbitrary queries. The fix replaces the interpolated string with a parameterized query placeholder (`$1::interval`), ensuring the database driver always treats the value as data, never as SQL. This matches the pattern already used by the single-contact snooze endpoint. The change has zero functional impact on users — snooze behavior is identical — but eliminates a class of vulnerability entirely. **Testing:** Best tested in the **dev environment** (local database, no production risk) by selecting 2+ contacts, batch-snoozing with a days/hours option (exercises the parameterized branch) and with "Tomorrow Morning" (exercises the hardcoded branch). Production testing is unnecessary since the SQL output is identical; the only difference is *how* the value reaches PostgreSQL.  
* **Agenda View with Recurring Events:** An Agenda View provides a forward-looking summary of all upcoming check-ins for the next 30 days. The logic has been completely rewritten to correctly project and display all recurring events for each contact within the timeframe.  
* **In-App Toast Notifications:** Modern, non-blocking "toast" notifications for all user actions, provided by react-hot-toast.  
* **Intuitive & Timezone-Safe Date Display:** All date calculations and displays have been refactored to be timezone-safe, ensuring consistency regardless of user location.  
* **Granular & Intelligent Snooze:** The snooze functionality is handled by a robust modal that now offers granular, user-friendly options ("Tomorrow Morning", "3 Days", "1 Week", "2 Weeks") instead of a simple day counter. The "Tomorrow Morning" option is intelligently handled by the backend to set a reminder that aligns perfectly with the 9:00 AM daily notification job, providing a more intuitive user experience. All logic is handled authoritatively on the backend to prevent state conflicts.  
* **Refactored Contact Card UI:** A cleaner "summary" view and an expandable "detailed" view for contact cards, refactored into three distinct zones: Identification Header, Status Bar, and Action Footer. The Action Footer has been further refined to establish a clear visual hierarchy, placing the primary "Checked In\!" button in the most prominent position above all secondary actions.  
* **Favorite/Pin Contacts:** Users can pin important contacts to a separate "Pinned" section at the top of the main list.  
* **Calendar Export (.ics):** Allows users to export birthdays and check-in reminders into a universal .ics file, compliant with the iCalendar standard.  
* **Batch Actions (Active & Archived):** Allows users to select multiple contacts to perform bulk operations.  
* **Custom Confirmation Modal:** All destructive actions trigger a custom, in-app modal to confirm the user's intent.  
* **Backend Security:** The backend API is protected with rate limiting (express-rate-limit) and input validation (zod).  
* **Branded Authentication Screens:** The Login and Signup pages have been updated with the application's logo, name, and tagline. This provides a professional and orienting experience for new and returning users, addressing feedback that the pages felt generic.  
* **First-Time User Onboarding:** A one-time, two-page welcome modal now appears for new users upon their first login. It introduces the app's core concepts (adding contacts, setting reminders) as well as its powerful organizational features (tagging, notifications, and calendar exporting). The modal is fully responsive and its content area scrolls on shorter screens to prevent UI overflow.  
* **Global Error & Session Handling:** The application is now protected against two critical failure states.  
  * **Graceful Session Expiry:** A global API interceptor automatically detects 401 Unauthorized responses (e.g., from an expired 7-day token). Instead of failing silently, it logs the user out and redirects them to the login screen with a clear message, preventing the "disappearing data" user experience.  
  * **UI Crash Protection:** The entire application is wrapped in a React Error Boundary. If a JavaScript error occurs during rendering, this boundary catches the crash and displays a fallback UI with a refresh option, preventing a "white screen of death."  
* **Responsive Header (Desktop):** The main application header on desktop viewports (\> 500px) utilizes an icon-first approach. Actions like 'Archive', 'Export', and 'Feedback' are represented by icons with descriptive tooltips to save space and create a cleaner look, while the 'Logout' action remains text-based for clarity.  
* **Frontend Architectural Refactor:** The entire frontend has been re-architected using locally-scoped CSS Modules and a custom hooks architecture.  
* **Password Reset Flow:** A complete, self-service password reset feature has been implemented using secure, expiring tokens sent via email.  
* **Legal & Informational Pages:** Static pages for a "Privacy Policy" and "Terms of Service" are accessible from the footer of Login and Signup pages.  
* **In-App User Feedback Channel:** The unreliable `mailto:` link has been replaced with a robust in-app system. A "Send Feedback" button in the header now opens a modal, allowing users to submit feedback directly. The backend processes this feedback and sends it to a designated email address via the Mailjet API.  
* **Birthday Push Notifications:** In addition to check-in reminders, the application now sends a proactive push notification on the morning of a contact's birthday. The notification is dynamic, providing a friendly message whether it's for a single person or a summary for multiple people. This feature directly addresses user feedback and helps users remember important dates, reinforcing the app's core mission of thoughtful connection.

### 

### **2.4 User Settings & Preferences (NEW SECTION)**

* **Time-of-Day Specific Notifications:** Users can now explicitly choose the hour (in UTC) they wish to receive their daily check-in and birthday reminders. This preference is persisted in the database and defaults to 9:00 UTC for all users.  
* **Settings Page:** A dedicated, protected route (`/settings`) allows users to manage these preferences without cluttering the main dashboard.

### **2.5 Mobile-First Navigation Architecture (NEW SECTION)**

* **Bottom Navigation Bar:** On mobile viewports (\<= 500px), the application now features a fixed bottom navigation bar. This provides persistent, one-tap access to the three core areas of the app: "Home" (Active Contacts), "Archived", and "Settings". This design significantly improves one-handed usability and reduces the reliance on the top dropdown menu.  
* **URL-Based Routing:** The application has migrated from state-based view toggling to full URL-based routing. The Active View (`/`), Archived View (`/archived`), and Settings (`/settings`) are now distinct routes. This ensures that the browser's "Back" button functions natively, allowing users to navigate backward through their history without exiting the application.

## **3\. Technical Architecture**

### **3.1 Technology Stack**

* **Frontend:** React (Vite), React Router (react-router-dom), JavaScript (ES6+), Axios, use-debounce, date-fns, Firebase SDK, react-hot-toast, vite-plugin-pwa, CSS3 with CSS Modules.  
* **Backend:** Node.js, Express.js, PostgreSQL, bcryptjs, jsonwebtoken, node-mailjet, node-cron, Firebase Admin SDK, dotenv, express-rate-limit, zod.  
* **Deployment:**  
  * Frontend: Vercel (as a Progressive Web App)  
  * Backend: Render (Web Service)  
  * Database: Render (PostgreSQL)  
* **Development & Tooling:**  
  * IDE: Visual Studio Code with the Prettier extension.  
  * Version Control: Git, with the repository hosted on GitHub.  
  * Database Management: DBeaver.  
  * Displays `stats.html` with `npm run build`: rollup-plugin-visualizer

### **3.2 Project Structure**

The project is a monorepo organized into frontend and backend directories.

last-checked-in-app/  
├── .git/  
├── .gitignore  
├── backend/  
│   ├── node\_modules/  
│   ├── routes/   
│   │ ├── auth.js   
│   │ ├── contacts.js   
│   │ ├── settings.js  
│   │ └── index.js   
│   ├── .env (Note: Ignored by git)  
│   ├── migrate\_next\_checkin.js **\<- NEW FILE (v14.1)**  
│   ├── package.json  
│   ├── server.js (Refactored)  
│   └── serviceAccountKey.json (Note: Ignored by git, for Production)  
│   └── serviceAccountKey.dev.json (Note: Ignored by git, for Development)  
└── frontend/  
    ├── node\_modules/  
    ├── public/  
    │   ├── vite.svg  
    │   └── LogoV1.png (And other icon sizes)  
    ├── src/  
    │   ├── components/  
    │   │   ├── AddContactForm.jsx  
    │   │   ├── AddContactForm.module.css  
    │   │   ├── AgendaView.jsx  
    │   │   ├── AgendaView.module.css  
    │   │   ├── ArchivedActionsToolbar.jsx  
    │   │   ├── ArchivedView.jsx  
    │   │   ├── ArchivedView.module.css  
    │   │   ├── BatchActionsToolbar.jsx  
    │   │   ├── BatchActionsToolbar.module.css  
    │   │   ├── BottomNav.jsx **\<- NEW FILE**  
    │   │   ├── BottomNav.module.css **\<- NEW FILE**  
    │   │   ├── ConfirmationModal.jsx  
    │   │   ├── ConfirmationModal.module.css  
    │   │   ├── ContactCard.jsx  
    │   │   ├── ContactCard.module.css  
    │   │   ├── DropdownMenu.jsx  
    │   │   ├── DropdownMenu.module.css  
    │   │   ├── ErrorBoundary.jsx  
    │   │   ├── ErrorBoundary.module.css  
    │   │   ├── ExportCalendarModal.jsx  
    │   │   ├── ExportCalendarModal.module.css  
    │   │   ├── FeedbackModal.jsx       
    │   │   ├── FeedbackModal.module.css  
    │   │   ├── FilterControls.jsx  
    │   │   ├── FilterControls.module.css  
    │   │   ├── Header.jsx  
    │   │   ├── Header.module.css  
    │   │   ├── Layout.jsx **\<- NEW FILE**  
    │   │   ├── Layout.module.css **\<- NEW FILE**  
    │   │   ├── OnboardingModal.jsx  
    │   │   ├── OnboardingModal.module.css  
    │   │   ├── ProtectedRoute.jsx  
    │   │   ├── SnoozeModal.jsx  
    │   │   ├── SnoozeModal.module.css  
    │   │   ├── TagInput.jsx  
    │   │   ├── TagInput.module.css  
    │   │   ├── ThemeToggleButton.jsx  
    │   │   └── ThemeToggleButton.module.css  
    │   ├── context/  
    │   │   └── AuthContext.jsx  
    │   │   └── SWContext.jsx  
    │   ├── hooks/  
    │   │   ├── useContacts.js  
    │   │   ├── useMediaQuery.js  
    │   │   ├── useSelection.js  
    │   │   ├── useSettings.js **\<- NEW FILE**  
    │   │   └── useUIState.js  
    │   ├── pages/  
    │   │   ├── AuthForm.module.css  
    │   │   ├── ForgotPasswordPage.jsx  
    │   │   ├── LoginPage.jsx  
    │   │   ├── PrivacyPolicyPage.jsx  
    │   │   ├── ResetPasswordPage.jsx  
    │   │   ├── SettingsPage.jsx **\<- NEW FILE**  
    │   │   ├── SettingsPage.module.css **\<- NEW FILE**  
    │   │   ├── SignupPage.jsx  
    │   │   └── TermsOfServicePage.jsx  
    │   ├── App.css  
    │   ├── App.jsx  
    │   ├── App.module.css  
    │   ├── apiConfig.js  
    │   ├── firebase-messaging-sw.js  
    │   ├── firebase.js  
    │   ├── index.css  
    │   ├── main.jsx  
    │   └── utils.js   
    ├── .env  
    ├── .gitignore  
    ├── eslint.config.js  
    ├── index.html  
    ├── package-lock.json  
    ├── package.json  
    ├── README.md  
    ├── stats.html  
    ├── eslint.config.js  
    ├── index.html  
    ├── vercel.json  
    └── vite.config.js

### **3.3 Backend Architecture**

*   **(CURRENT - Multi-User Architecture)**  
*   **Database Schema:** A primary `users` table was added. All other data tables have a `user_id` foreign key.  
*   **Authentication Endpoints:**  
    *   `POST /api/auth/signup` and `POST /api/auth/login` handle user registration and authentication, returning a JWT.  
    *   `POST /api/auth/forgot-password`: A public endpoint that takes a user's email. If the user exists, it generates a unique, single-use, expiring JWT reset token and sends a password reset email to the user.  
    *   `POST /api/auth/reset-password`: A public endpoint that takes the reset token and a new password, validates the token, and updates the user's password in the database.  
*   **Authorization Middleware:** A robust `authMiddleware` function protects all data-related endpoints by validating the JWT. It has been corrected to return a proper `401 Unauthorized` status for any invalid or expired tokens, enabling the frontend to handle session expiry gracefully.  
*   **Scoped Queries:** Every SQL query includes a `WHERE user_id = $1` clause to enforce strict data privacy.  
*   **Data Fetching Optimization:** The backend has been optimized to improve initial application load times. The primary `GET /api/contacts` endpoint was refactored to fix a critical N+1 query bug. A new, consolidated endpoint, `GET /api/dashboard-data`, has been introduced. This endpoint now serves as the primary data source for the application's initial load, efficiently providing all contacts (with their tags), the archived count, and the user's tag list in a single network request. The previous endpoints (`/api/contacts`, `/api/tags`, `/api/contacts/archived/count`) are now considered deprecated for initial data fetching.  
*   **Write-Time Optimization (`next_checkin_date`):** A pre-calculated `next_checkin_date` column has been added to the `contacts` table with a B-tree index (`idx_contacts_next_checkin`). This column is automatically maintained at write-time: every endpoint that modifies a contact's schedule (create, update, check-in, snooze, and their batch equivalents) recalculates and persists this value. This eliminates the need for the cron job to compute overdue status on the fly, converting an O(N) full-table-scan computation into an O(log N) indexed lookup.  
*   **Tag Search Endpoint:** A new `GET /api/tags/search?q=` endpoint has been added to `routes/index.js`. It performs a server-side `ILIKE` search on the user's tags and returns a maximum of 10 results, enabling scalable tag autocomplete on the frontend.  
*   **Scheduled Notification Job (node-cron):** The server now runs an **hourly** scheduled task (`0 * * * *`) instead of a daily one.
    *   **Logic:** Every hour, the job calculates the current UTC hour (0-23). It queries the database *only* for users whose `notification_hour_utc` preference matches the current hour. The overdue contact lookup has been simplified from a complex on-the-fly computation to a simple indexed lookup: `WHERE next_checkin_date <= NOW()`.
    *   **Per-User Error Isolation (v14.3):** Each user in the notification loop is processed inside an independent `try/catch`. If sending notifications to one user throws an error (e.g., a bad token format, a transient database hiccup, or an unexpected FCM response), the error is logged with the user's ID and the loop continues to process all remaining users. This prevents a single user's failure from blocking notifications for everyone else.
    *   **Stale Token Cleanup (v14.2):** After each `sendEachForMulticast()` call, the job now inspects the `BatchResponse.responses[]` array (a 1:1 mapping with the input tokens). A dedicated `cleanupStaleTokens()` helper function iterates over these responses and collects any tokens where `response.success === false` and the error code is one of the permanently-invalid FCM codes: `messaging/registration-token-not-registered` (user uninstalled or cleared browser data) or `messaging/invalid-registration-token` (malformed token). Collected stale tokens are deleted from the `devices` table in a single `DELETE ... WHERE token = ANY($1)` query. This runs after the send completes with the same pooled database connection, so it cannot interfere with notification delivery to valid devices.  
    *   **Database Schema:** The `users` table has a new column: `notification_hour_utc` (INTEGER, NOT NULL, DEFAULT 9). The `contacts` table has a new column: `next_checkin_date` (TIMESTAMPTZ, indexed).  
*   **Deployment & Environment (Render):** For a successful production deployment on a platform like Render, the backend relies on several environment variables (`DATABASE_URL`, `JWT_SECRET`, `RESET_TOKEN_SECRET`, `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE`, `FRONTEND_URL`) which must be set in the deployment service's dashboard. Furthermore, the `serviceAccountKey.json` file is not committed to the repository and must be provided as a "Secret File" in the deployment environment. The CORS policy is explicitly configured to only accept requests from the `FRONTEND_URL` to ensure security.  
*   **Local Development & Environment:** For local development, the server now operates in a completely isolated environment. The `npm run dev` script sets a `NODE_ENV=development` flag. The `server.js` file detects this flag and performs two critical actions:  
    *   **Database Connection:** It connects to a local PostgreSQL database specified by the `DATABASE_URL` in the `backend/.env` file and explicitly disables SSL, which is not used by local database servers.  
    *   **Firebase Admin:** It loads a separate, development-only private key (`serviceAccountKey.dev.json`), whose path is specified by the `DEV_SERVICE_ACCOUNT_PATH` variable in the `.env` file. This ensures that any actions performed locally (like running test jobs) only affect the development Firebase project and cannot interfere with production users.

### **3.4 Frontend Architecture**

* **(RE-ARCHITECTED \- Hook-Based & Modular CSS)** The frontend has undergone a complete architectural overhaul to improve scalability and maintainability.  
* **CSS Modules:** The monolithic `index.css` file has been eliminated in favor of CSS Modules. Every React component now imports its own `.module.css` file, which locally scopes all class names. This prevents style collisions, eliminates the need for complex naming conventions (like BEM), and makes components truly self-contained. `index.css` is now reserved for global `:root` variables and base element styles.  
* **Custom Hooks for State Management:** All complex stateful logic has been extracted from the `App.jsx` component and organized into a series of single-responsibility custom hooks.  
* **Composition Root & Layout:** The `App.jsx` component no longer manages state directly. Its role is to act as a composition root, defining the application's routes. A new `Layout.jsx` component wraps these routes, acting as an app shell that intelligently renders the Desktop Header or Mobile Bottom Navigation based on screen size.  
* **Routing:** The application uses `react-router-dom` for full client-side routing. Views are no longer managed by a state variable but by distinct URL paths (`/`, `/archived`, `/settings`).  
* **Build & Performance Optimization:** The production build process has been overhauled for performance. Code-splitting is implemented via `React.lazy()` to break the application into smaller JavaScript chunks, loading non-essential components on demand. All major dependencies (`firebase`, `date-fns`) have had their imports refactored to be modular, enabling tree-shaking to significantly reduce the final bundle size. The service worker is now correctly processed and bundled for production using `vite-plugin-pwa`.  
* **Deployment & Environment (Vercel):** The frontend deployment on Vercel is highly dependent on a correct project configuration. The Root Directory must be set to `frontend` to accommodate the monorepo structure. The default Vite "Framework Preset" must be overridden with manual Build & Development Settings (Build Command: `npm run build`, Output Directory: `dist`) to ensure environment variables are correctly injected. All public keys, including `VITE_API_URL` and the seven `VITE_FIREBASE_*` keys, must be set as environment variables in the Vercel dashboard for the Production and Preview environments.  
* **Local Development & Environment:** The frontend is now fully environment-aware. The `firebase.js` file checks Vite's built-in `import.meta.env.DEV` flag. If true (when running `npm run dev`), it initializes the Firebase SDK using a separate set of development keys (prefixed with `VITE_DEV_`) from the `frontend/.env` file. This points the local application to a dedicated development Firebase project, completely isolating local user authentication and push notification registration from the production environment.

## 

## 

## 

## **4\. File Glossary & Key Logic**

### **Frontend (src directory)**

**App.jsx (RE-ARCHITECTED)**

* **(Previous Role):** Was the "brain" of the frontend. It managed all shared application state, defined all data-handling functions, and rendered all modals and toolbars. Was a "God Component" that managed all application state and logic.  
* **(Current Role):** Now the clean root of the entire application. It implements the `BrowserRouter` and defines the route structure using the `Layout` component wrapper. It maps URL paths (`/`, `/archived`, `/settings`) to their respective views. It establishes all top-level context providers and renders an `ApplicationCore` component responsible for startup effects like service worker registration. The `MainApplication` component acts as the primary composition root for the UI. It is now responsible for handling the successful completion of a single-contact snooze operation; it chains a `.then()` to the `handleSnooze` promise (returned from the `useContacts` hook) in order to set the `snoozingContact` state to null, which correctly closes the SnoozeModal.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `react-router-dom`, `Layout.jsx`, `SettingsPage.jsx`, all context providers, all custom hooks, and `virtual:pwa-register`.  
  * **Side Effects:** High impact. Changes to the provider structure, service worker registration, or state management logic for modals will have global effects on the application's stability and user experience. Enables routing to the settings interface.

**index.css**

* **Description:** Contains only truly global styles: a CSS reset, `:root` color variables for themes, and base styles for global classes like `.card` and `.button-primary`. It contains no component-specific layout information.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** None.  
  * **Side Effects:** High impact. Changes to `:root` variables or global classes (`.button-secondary`, `.card`) will affect the entire application. Edit with extreme caution.

**App.css**

* **Description:** Contains top-level application layout styles that are not component-specific, such as the main `.app-container` rules.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** None.  
  * **Side Effects:** Global. Changes here can affect the base layout of the entire application.

**App.module.css**

* **Description:** Contains layout styles used exclusively by the `MainApplication` component within `App.jsx`, such as the grid container and view controls.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `App.jsx`.  
  * **Side Effects:** Low impact. Changes are scoped to the main content layout (e.g., the view toggle buttons, pinned section).

**apiConfig.js**

* **Description:** Exports a pre-configured Axios instance. It now uses Vite's built-in `import.meta.env.MODE` to robustly determine the environment. For production builds, it uses the `VITE_API_URL` environment variable provided by the deployment platform (Vercel). For local development, it defaults to `http://localhost:3001/api`. It includes a request interceptor to attach the JWT and a response interceptor to handle global 401 Unauthorized errors for session management.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `axios`.  
  * **Side Effects:** Global. Changes to the base URL logic or the interceptors will affect every API call made by the application and are critical for authentication and session lifecycle management.

**firebase.js**

* **Description:** Initializes the Firebase SDK for frontend push notifications. This file is now fully environment-aware. It uses Vite's `import.meta.env.DEV` flag to determine if the application is in development mode. It then dynamically constructs the `firebaseConfig` object and selects the correct VAPID\_KEY using either the production (`VITE_FIREBASE_*`) or development (`VITE_DEV_FIREBASE_*`) environment variables. This is the core mechanism that isolates the frontend's Firebase connection between local development and production.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** Firebase SDK (`firebase/app`, `firebase/messaging`), `apiConfig.js`.  
  * **Side Effects:** High impact on push notification functionality. This file controls the connection to all client-side Firebase services. Misconfiguration here will break authentication and push notifications for either the local or production environment. The function will now fail if it is not passed a valid `ServiceWorkerRegistration` object. This change is fundamental to the stability of the PWA in a development environment.

**main.jsx**

* **Description:** The main entry point for the React application. Its sole responsibility is to render the root `App` component into the DOM. All application-level logic, including provider setup and service worker registration, has been centralized within the `App` component to ensure a clean, predictable startup sequence within the React lifecycle.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `App.jsx`, `index.css`, `App.css`.  
  * **Side Effects:** Critical. Changes here could prevent the application from rendering entirely.

**utils.js**

* **Description:** Contains pure helper functions for date manipulation and data transformation. All imports from the `date-fns` library have been refactored to be modular (e.g., `import addDays from 'date-fns/addDays'`), allowing the build tool to tree-shake unused functions and significantly reduce the production bundle size.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `date-fns` (via modular imports).  
  * **Side Effects:** High impact. Changes to core logic like `isOverdue` or `calculateNextUpcomingCheckinDate` will have application-wide effects on how contact statuses are calculated and displayed.

### **context/ directory**

**AuthContext.jsx**

* **Description:** Implements the React Context for global state management of the user's authentication token and auth functions (login, logout, signup). It now includes a global event listener for `session_expired` to handle programmatic logouts triggered by the API interceptor.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React, `apiConfig.js`.  
  * **Side Effects:** Global. Manages the core authentication state for the entire application. Changes here affect user login, logout, and session lifecycle.

**SWContext.jsx**

* **Description:** Implements a React Context for global state management of the PWA's `ServiceWorkerRegistration` object. Its sole purpose is to decouple the service worker's registration from its consumption. The `main.jsx` file populates this context via a callback from the PWA plugin, and `App.jsx` consumes it to pass the valid registration object to the Firebase SDK.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React.  
  * **Side Effects:** Global and critical for PWA functionality. If this context is not populated correctly, push notification registration will fail. This context is the lynchpin of the solution for the development environment's service worker conflict.

### **hooks/ directory**

**useContacts.js**

* **Description:** The primary data hook for the application. It is responsible for fetching all initial application data via the single `/api/dashboard-data` endpoint. It continues to manage all other asynchronous logic and state related to contacts (notes, tags, updates, etc.). The `handleSnooze` function within this hook has been refactored to accept a granular snooze object (`{ value, unit }`) and now returns the full Axios promise. This architectural change allows the calling component (`App.jsx`) to chain `.then()` onto the function call, enabling it to perform UI-specific actions (like closing the modal) only after the asynchronous snooze operation has successfully completed.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `apiConfig.js`, `AuthContext`.  
  * **Side Effects:** Central data logic. Changes directly affect all contact-related operations. The modification to `handleSnooze` is critical for the correct UI flow of the snooze feature.

**useUIState.js**

* **Description:** Manages all state related to the UI itself, excluding routing (which is now handled by React Router). This includes `displayMode`, `sorting/filtering` state, `search terms`, and the `open/closed` state of all modals. It now also manages the state for the notification permission flow, including `notificationPermission` (which tracks the browser's permission status: default, granted, or denied) and `isRequestingNotifications` (a boolean for showing a loading state). The `view` state variable has been removed as part of the navigation overhaul.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React, `use-debounce`, `apiConfig.js`.  
  * **Side Effects:** Controls the visual state of the main application view (`App.jsx`). Changes directly impact the user interface's responsiveness and state.

**useSelection.js**

* **Description:** Manages the state for the batch action mode. It holds the arrays of selected contact IDs for both the active and archived views and provides the functions for toggling and clearing selections.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React.  
  * **Side Effects:** Manages the state for batch actions, consumed by `App.jsx`.

**useMediaQuery.js**

* **Description:** A simple utility hook that allows components to react to changes in viewport size.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React.  
  * **Side Effects:** Used by `Layout.jsx` to intelligently switch between the Desktop `Header` and the Mobile `BottomNav`.

**useSettings.js (NEW)**

* **Description:** A custom hook that encapsulates the API logic for the settings feature. It manages the state for `settings` (data), `loading` (fetch status), and `saving` (update status). It handles the `GET` and `PUT` requests to `/api/settings` and triggers toast notifications for success/error states.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `apiConfig.js`, `react-hot-toast`, React (`useState`, `useEffect`, `useCallback`).  
  * **Side Effects:** Triggers network requests to the backend settings endpoints.

### **Components (src/components/ directory)**

**Layout.jsx / .module.css (NEW)**

* **Description:** The application shell component. It wraps all route content. It uses `useMediaQuery` to detect the screen size. On screens wider than 500px, it renders the `Header`. On screens narrower than 500px, it renders the `Header` (in simplified mode) and the `BottomNav`. This ensures persistent navigation across all pages.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `Header`, `BottomNav`, `useMediaQuery`, `react-router-dom` (`Outlet`).  
  * **Side Effects:** Controls the macro-layout of the application.

**BottomNav.jsx / .module.css (NEW)**

* **Description:** A fixed-position navigation bar that appears at the bottom of the screen on mobile devices. It provides three navigation items: "Home" (Active Contacts), "Archived", and "Settings". It uses `NavLink` to automatically highlight the active route. Clicking "Home" while already on the home route triggers a smooth scroll to the top.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `react-router-dom` (`NavLink`, `useLocation`).  
  * **Side Effects:** Handles core navigation on mobile.

**AddContactForm.jsx / .module.css**

* **Description:** The form for adding a new contact. The CSS has been updated to include a 🎂 icon in the custom placeholder for the birthday field, improving its recognizability. The component's JSX was also updated to add a specific class to the birthday input's wrapper, enabling a more robust CSS fix for a cross-browser rendering bug.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `App.jsx` (for `onSubmit` handler).  
  * **Side Effects:** Purely presentational, low risk of side effects.

**ContactCard.jsx / .module.css**

* **Description:** The core component for displaying a single contact. The `contactCardFooter` has been refactored into a two-row layout to create a clear visual hierarchy. The primary action ("Checked In\!") is now in a full-width container for emphasis, while all secondary actions ("Edit", "Add Note", "Archive", etc.) are grouped in a flexible row below it. The edit form within this component also includes a `<label>` with a 🎂 icon for the birthday field, improving both clarity and accessibility.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `utils.js` (for date formatting and overdue logic), `TagInput.jsx`, `App.jsx` (for handlers).  
  * **Side Effects:** Critical display component. Changes here affect the visual representation of every contact. Relies on global classes like `.card`.

**DropdownMenu.jsx / .module.css**

* **Description:** A reusable dropdown menu component, used in the responsive header. It has been updated to be more robust by ignoring invalid children to prevent runtime errors. The CSS has been tweaked to shift the menu slightly to the left to prevent it from being clipped by the screen edge when aligned with the right-aligned header buttons.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React.  
  * **Side Effects:** Changes affect the behavior of any dropdown menu in the app, primarily the mobile header menu.

**ErrorBoundary.jsx / .module.css**

* **Description:** A class-based React component that uses `getDerivedStateFromError` and `componentDidCatch` to catch JavaScript errors that occur in its child component tree. It prevents the entire UI from crashing to a white screen and instead renders a fallback UI.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React.  
  * **Side Effects:** High impact. This component is a critical safety net. It is wrapped around the main `<Routes>` in `App.jsx` to protect the entire application from fatal rendering errors.

**FeedbackModal.jsx / .module.css**

* **Description:** A modal component that provides a form for users to submit feedback. It contains a `<textarea>` and handles the submission state, calling an `onSubmit` handler passed down from `App.jsx`.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React, `App.jsx` (for state control).  
  * **Side Effects:** Triggers the API call to the `/api/feedback` endpoint.

**Header.jsx / .module.css**

* **Description:** The main application header. It has been significantly refactored to be route-aware. It no longer receives "view switching" functions as props but instead uses `useNavigate` and `useLocation` to determine navigation behavior and button visibility. On mobile, the navigation items have been moved to `BottomNav`, leaving the header to handle global actions like Theme Toggling and Logout. The CSS has been updated to fix alignment issues, ensuring the logo aligns perfectly with the content width (700px) on desktop.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `DropdownMenu.jsx`, `ThemeToggleButton.jsx`, `useMediaQuery.js`, `react-router-dom` (`useNavigate`, `useLocation`).  
  * **Side Effects:** Changes affect global navigation and actions. Relies on global class `.button-secondary`.

**SnoozeModal.jsx / .module.css**

* **Description:** A modal that allows the user to snooze a single contact or a batch of selected contacts. The UI has been refactored from a simple number input to a button-based grid, offering a predefined set of user-friendly options ("Tomorrow Morning", "3 Days", "1 Week", "2 Weeks"). It no longer manages its own input validation; instead, it holds the selected option object in its state and passes it to the `onSnooze` handler provided by `App.jsx`.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `App.jsx` (for state control and the `onSnooze` handler).  
  * **Side Effects:** Low. This is a presentational component. Its primary side effect is invoking the `onSnooze` callback with the selected snooze object (`{ value, unit }`).

**OnboardingModal.jsx / .module.css**

* **Description:** A two-page welcome modal displayed to users on their first visit. It introduces core app concepts and features. It uses React state to manage pagination and its content is designed to be scrollable on shorter viewports to prevent overflow. Its visibility is controlled by a flag in `localStorage`.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React, `App.jsx` (for state control).  
  * **Side Effects:** High impact on the first-time user experience.

**ProtectedRoute.jsx**

* **Description:** A component wrapper that redirects to `/login` if no auth token is present.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `AuthContext`.  
  * **Side Effects:** Core security component for routing.

**TagInput.jsx / .module.css (REFACTORED v14.1)**

* **Description:** The input component for adding tags. It has been refactored from a client-side filter pattern to a server-side search pattern. Previously, it fetched all user tags on mount and filtered them in memory. It now uses `useDebouncedCallback` (300ms) from the `use-debounce` library to call the `GET /api/tags/search?q=` endpoint as the user types. Suggestions returned from the server are filtered to exclude tags already on the contact before being displayed. The placeholder text reads "Search or create tags..." to clarify its dual functionality.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `apiConfig.js`, `use-debounce`.  
  * **Side Effects:** Low impact. Changes affect the usability of the tag input field. Network requests are now made during typing (debounced).

### **Pages (src/pages/ directory)**

**AuthForm.module.css**

* **Description:** A shared stylesheet used by both `LoginPage` and `SignupPage` to ensure a consistent look and feel. It has been updated with styles for a new branding section (`.authBranding`, `.authLogo`, `.authTitle`) that appears above the login/signup card.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `LoginPage.jsx`, `SignupPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`.  
  * **Side Effects:** Changes will affect the appearance of all authentication forms.

**LoginPage.jsx**

* **Description:** The page where users can log in to their account. A "Forgot Password?" link was added to initiate the reset flow, and links to the legal pages have been added to the footer. It has been updated to include the new branding section (logo, title, tagline) for a more professional user experience. It also contains logic to check for a `session_expired` URL parameter and display an explanatory toast.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `AuthContext`, `AuthForm.module.css`.  
  * **Side Effects:** Part of the core authentication flow.

**PrivacyPolicyPage.jsx**

* **Description:** A new static page containing the placeholder text for the application's Privacy Policy.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React Router (for `<Link>`).  
  * **Side Effects:** Standalone informational page.

**SignupPage.jsx**

* **Description:** The page where new users can create an account. Links to the legal pages have been added to the footer. It has been updated to include the new branding section (logo, title, tagline) for a consistent and professional user experience.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `AuthContext`, `AuthForm.module.css`.  
  * **Side Effects:** Part of the core authentication flow.

**SettingsPage.jsx / .module.css (NEW)**

* **Description:** The UI for managing user settings. It displays a dropdown menu populated with hours 0-23 (UTC). It includes specific CSS logic to ensure the dropdown options render correctly in both light and dark modes, overriding browser defaults where necessary.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `useSettings.js`, `react-router-dom` (`useNavigate`).  
  * **Side Effects:** Updates the user's global notification preference via the hook.

**TermsOfServicePage.jsx**

* **Description:** A new static page containing the placeholder text for the application's Terms of Service.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** React Router (for `<Link>`).  
  * **Side Effects:** Standalone informational page.

### **Backend (backend/ directory)**

**server.js**

* **Description:** (Previous Role): Was a monolith responsible for server setup, middleware, performance optimizations, and all API endpoint logic.  
* **(Current Role):** The root of the backend application. The cron job logic has been fundamentally refactored. Instead of running once daily, it now runs hourly. It calculates the current UTC hour and queries the database for users who have specifically opted into notifications at that hour. The overdue contact query has been simplified from a complex on-the-fly computation to a simple indexed lookup: `WHERE next_checkin_date <= NOW()`. It also mounts the new settings router. Its primary role is to initialize the Express server and configure all middleware. It is now fully environment-aware. It checks the `process.env.NODE_ENV` flag to determine its operating mode. Based on this flag, it dynamically configures two critical services:  
  * **Firebase Admin SDK:** It loads either the production (`serviceAccountKey.json`) or a development (`serviceAccountKey.dev.json`) private key.  
  * **Database Pool:** It connects to the database specified in `.env` and intelligently enables or disables the SSL requirement, allowing it to connect to both a local PostgreSQL instance (no SSL) and the Render production database (SSL required). It also contains the `node-cron` scheduled job logic.  
  * **Stale Token Cleanup (v14.2):** A standalone `cleanupStaleTokens(batchResponse, tokens, client)` helper function is defined before the cron job. It is called after each `sendEachForMulticast()` invocation (both overdue and birthday sends). The function iterates over `BatchResponse.responses[]`, which maps 1:1 with the input `tokens` array, and identifies tokens where `response.success === false` with an error code of `messaging/registration-token-not-registered` or `messaging/invalid-registration-token`. These permanently-invalid tokens are deleted from the `devices` table via a single `DELETE ... WHERE token = ANY($1)` query using the same pooled `client` connection already held by the cron job. This ensures no wasted FCM calls on dead tokens and keeps the `devices` table clean. The cleanup is purely additive — it executes after each send completes and cannot interfere with notification delivery to valid devices. If a user's only token is pruned, they will need to revisit the app to re-register a new token via the existing `POST /api/devices/token` endpoint.  
  * **Per-User Error Isolation (v14.3):** The inner body of the `for (const userId of userIds)` loop is wrapped in its own `try/catch`. If any operation for a user throws (database query, FCM send, stale token cleanup), the error is logged with the specific user ID and the loop continues to the next user. The outer `try/catch` still guards the initial `pool.connect()` and user-list query, and the `finally { client.release() }` block is unaffected.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `express`, `pg`, `firebase-admin`, `node-cron`, `routes/settings.js` and all other core backend packages and routers.  
  * **Side Effects:** High impact. This file bootstraps the entire backend. Changes here affect server startup, security (CORS, rate limiting), the routing of all API requests, database connectivity, and all automated background tasks for all environments. Critical: controls the timing and targeting of all push notifications based on user preferences. The stale token cleanup modifies the `devices` table by deleting rows for permanently-invalid FCM tokens after each notification send cycle.

**migrate\_next\_checkin.js (NEW v14.1)**

* **Description:** A one-time migration script that adds the `next_checkin_date` column to the `contacts` table, creates a B-tree index on it (`idx_contacts_next_checkin`), and backfills all existing contacts with a calculated value. The backfill logic uses `snooze_until` (if active and in the future) or `last_checkin + checkin_frequency` to populate the column. The script is environment-aware, automatically enabling SSL for production databases (when `NODE_ENV` is not `development`).  
* **Usage:** `$env:DATABASE_URL='<connection_string>'; node migrate_next_checkin.js`  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `dotenv`, `pg`.  
  * **Side Effects:** Mutates the production database schema. Should only be run once per environment.

**routes/settings.js (NEW)**

* **Description:** A dedicated Express router handling user preference endpoints. It implements `GET /api/settings` to fetch the current hour and `PUT /api/settings` to update it. It uses `zod` to validate that the input is a valid integer between 0 and 23\.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** `express`, `zod`, `authMiddleware`.  
  * **Side Effects:** Reads from and writes to the `notification_hour_utc` column in the `users` table.

### **Root (/ directory)**

**vercel.json**

* **Description:** A configuration file that provides explicit deployment instructions to the Vercel hosting platform. It contains a critical headers block that forces Vercel's CDN to serve PWA assets (`manifest.webmanifest`, `firebase-messaging-sw.js`) with the correct `Content-Type` and `cache-control` headers. This overrides Vercel's default SPA routing behavior, which would otherwise block these files and cause a 403 Forbidden error, breaking all PWA functionality in production.  
* **Dependencies & Side Effects:**  
  * **Dependencies:** None.  
  * **Side Effects:** Critical for production deployment. Incorrect configuration will break the PWA functionality of the live application.

## **5\. Deployment Configuration**

(This section provides a summary of the critical, non-code settings required for a successful deployment.)

### **5.1 Backend (Render)**

The following Environment Variables must be set in the service dashboard:

* `DATABASE_URL`  
* `JWT_SECRET`  
* `RESET_TOKEN_SECRET`  
* `MJ_APIKEY_PUBLIC`  
* `MJ_APIKEY_PRIVATE`  
* `MAILJET_SENDER_EMAIL`  
* `FEEDBACK_RECIPIENT_EMAIL`  
* `FRONTEND_URL` (e.g., `https://last-checked-in-app.vercel.app`)

The following Secret File must be created:

* **Path:** `backend/serviceAccountKey.json`  
* **Contents:** (Paste the contents of the local JSON file)

### **5.2 Frontend (Vercel)**

The following Project Settings must be configured in the "General" tab:

* **Root Directory:** `frontend`  
* **Build Command (Override):** `npm run build`  
* **Output Directory (Override):** `dist`  
* **Install Command (Override):** `npm install`

The following Environment Variables must be set for the Production and Preview scopes:

* `VITE_API_URL` (e.g., `https://your-production-api.onrender.com/api`)  
* `VITE_FIREBASE_API_KEY`  
* `VITE_FIREBASE_AUTH_DOMAIN`  
* `VITE_FIREBASE_PROJECT_ID`  
* `VITE_FIREBASE_STORAGE_BUCKET`  
* `VITE_FIREBASE_MESSAGING_SENDER_ID`  
* `VITE_FIREBASE_APP_ID`  
* `VITE_FIREBASE_MEASUREMENT_ID`

The following Deployment Protection setting must be configured in the "Deployment Protection" tab:

* **Vercel Authentication:** Must be **DISABLED** for a public-facing application.

### **5.3 Local Development Configuration**

To run the application locally in a fully isolated development environment, a new developer must configure two separate `.env` files. These files are ignored by Git and must be created manually.

**Backend (backend/.env)**  
A local PostgreSQL server is required. The `.env` file must contain the connection string for the local database and the path to the development service account key.

\# backend/.env  
DATABASE\_URL="postgresql://YOUR\_LOCAL\_USER:YOUR\_LOCAL\_PASSWORD@localhost:5432/last\_checked\_in\_dev"  
DEV\_SERVICE\_ACCOUNT\_PATH="./serviceAccountKey.dev.json"  
\# Other secrets like JWT\_SECRET, MJ\_APIKEY\_PUBLIC, etc.

**Frontend (frontend/.env)**  
This file must contain two full sets of Firebase keys: one for the production build and one for the local dev server.

\# frontend/.env  
\# \--- Production Keys —  
VITE\_API\_URL="https://your-production-api.onrender.com/api"  
VITE\_FIREBASE\_API\_KEY="..."  
\# ... (all 7 production VITE\_FIREBASE\_\* keys) …  
VITE\_FIREBASE\_VAPID\_KEY="..."  
\# \--- Development Keys —  
VITE\_DEV\_FIREBASE\_API\_KEY="..."  
\# ... (all 7 development VITE\_DEV\_FIREBASE\_\* keys) …  
VITE\_DEV\_FIREBASE\_VAPID\_KEY="..."

## **6\. Error History & Resolutions**

(This section documents significant bugs from previous development cycles and their fixes.)

* **Bug: Incorrect "Overdue" Highlighting in Agenda View**  
  * **Resolution:** `AgendaView.jsx` was updated to pass a specific `isAgendaItemOverdue` prop to `ContactCard.jsx`.  
* **Bug: "Expand All" & Rate Limiting in Agenda View**  
  * **Resolution:** Refactored state to use a unique composite key (date \+ contact.id) to manage expansion state granularly.  
* **Bug: Snooze State Persists After Schedule Edits**  
  * **Resolution:** The backend `PUT /api/contacts/:id` endpoint was updated to unconditionally set `snooze_until` to NULL on every update.  
* **Bug: Multiple CSS Regressions, Runtime Errors, and Build Failures**  
  * **Resolution:** A comprehensive, multi-file fix was implemented to resolve a cascade of issues stemming from conflicting global classes, incorrect CSS Module patterns, a brittle DropdownMenu component, and invalid characters in a stylesheet.  
* **Bug: Incorrect Overdue Calculation for Recurring Check-ins**  
  * **Resolution:** The `isOverdue()` function in `utils.js` was refactored to use the same robust `calculateNextUpcomingCheckinDate` function as the rest of the UI, ensuring data consistency.  
* **Bug: Archived Count Shows (-1)**  
  * **Symptom:** The "View Archived" button in the header would sometimes display a (-1) count.  
  * **Root Cause:** An optimistic update in the handleRestoreContact function would decrement the count (prev \- 1\) without checking if the count was already zero, leading to a negative value in the state during race conditions.  
  * **Resolution:** The state update in `useContacts.js` was changed to `Math.max(0, prev - 1)`, ensuring the count can never drop below zero.  
* **Bug: Visual Overlap on Android Dark Mode Date Input**  
  * **Symptom:** In the "Add Contact" form on Android devices in dark mode, the "Birthday" placeholder text would visually overlap with the selected date text.  
  * **Root Cause:** The custom placeholder was created with a CSS `::before` pseudo-element that was never explicitly hidden. Most browsers would implicitly hide it by painting the input's opaque text value on top, but this failed on some Android browsers.  
  * **Resolution:** The logic was made explicit. A class is now added to the input's wrapper only when the input is empty. The CSS selector was updated to only show the `::before` pseudo-element when this class is present, ensuring it is removed from the layout when a date is selected.  
* **Bug: PWA Fails to Load in Development Environment**  
  * **Symptom:** In the local development environment (localhost), the application was unusable in a normal browser session. The developer console was flooded with a triad of errors: a manifest syntax error, an "unsupported MIME type ('text/html')" error for the service worker script, and a subsequent FirebaseError: messaging/failed-service-worker-registration. The application worked correctly only in an Incognito window.  
  * **Root Cause:** A fundamental conflict between two service worker registration attempts. First, `vite-plugin-pwa` would correctly register our custom `firebase-messaging-sw.js`. However, when the Firebase SDK's `getToken()` function was called, it would initiate its own attempt to register a service worker from the default `/firebase-messaging-sw.js` path. The Vite dev server, not recognizing this second request as part of the PWA plugin's purview, would fall back to its default SPA behavior and serve the main `index.html` file, causing the MIME type error and registration failure.  
  * **Resolution:** A comprehensive architectural fix was implemented to eliminate the conflict. A new global `SWContext` was created. The application entrypoint (`main.jsx`) was re-architected to use the `onRegistered` callback from the `vite-plugin-pwa` library. This callback captures the one, true, valid `ServiceWorkerRegistration` object and stores it in the `SWContext`. The `requestForToken` function in `firebase.js` was then modified to accept this registration object, which is passed down from `App.jsx`. By explicitly providing the service worker registration to `getToken()`, we force Firebase to use our existing worker, completely preventing its own registration attempt and resolving the root cause of the error.  
* **Bug: Notification Feature Fails to Initialize Due to Silent Registration Error**  
  * **Symptom:** After implementing the user-initiated notification flow, the "bell" icon button in the header would get permanently stuck in a disabled "Initializing..." state. No service worker would ever appear in the browser's Application tab, and no errors related to the failure were visible in the console, making the problem impossible to diagnose initially.  
  * **Root Cause:** A silent, fatal TypeError was occurring during the service worker registration process due to a misconfiguration in `vite.config.js`. The application's service worker uses ES Module import statements, which requires the browser to load it with `{ type: 'module' }`. This option was missing from the Vite PWA plugin's `devOptions`, causing the `registerSW` function to fail silently before any UI state could be updated.  
  * **Resolution:** After adding an `onRegisterError` callback to the `registerSW` function to make the error visible, the root cause was identified. The fix was a single-line change: adding `type: "module"` to the `devOptions` block in `vite.config.js`. This instructed the PWA plugin to register the service worker with the correct type, resolving the TypeError and allowing the entire notification feature to function as designed.  
* **Bug: Preventing the PWA from working in production**  
  * **Symptom:** After deploying the application to Vercel, the site would load, but all PWA functionality was broken. The notification button was stuck on "Initializing...", and the browser console showed 403 Forbidden errors when attempting to fetch `/manifest.webmanifest` and `/firebase-messaging-sw.js`.  
  * **Root Cause:** Vercel's default routing rules for Single Page Applications were incorrectly interfering with requests for the root-level PWA assets generated by `vite-plugin-pwa`. Even though the rewrite rules were intended to ignore files with extensions, Vercel's security or routing layer was still blocking direct access to these files, resulting in a permission-denied error.  
  * **Resolution:** A `frontend/vercel.json` configuration file was created with an explicit headers block. This block creates specific rules for the PWA asset paths, forcing Vercel to serve them with the correct `Content-Type` and caching headers, and ensuring these rules are processed before the SPA rewrites. This resolved the 403 errors and allowed the service worker to register correctly in the production environment.  
* **Bug: Contact Card Button Overflow on Mobile**  
  * **Symptom:** On devices with screens narrower than 500px, the "Archive" button would visually bleed outside the card container when the "Snooze" button was present, as the flex row could not accommodate four buttons side-by-side.  
  * **Resolution:** The `ContactCard.module.css` was updated to use a CSS Grid layout for secondary actions on mobile. A specific selector rule was added to dynamically adjust the grid: it creates a 2x2 layout when 4 buttons are present, and allows the last button to span the full width when only 3 buttons are present.

## **8\. Q3 2025 User Feedback Action Plan**

This section outlines the prioritized development plan based on user feedback collected in August and September 2025\. The work is divided into distinct phases to address critical issues before moving on to polish and new features.

### **8.1 P0: Stabilization & Core UX Sprint (Immediate Priority)**

This phase addresses release-blocking bugs and severe usability defects that are actively harming the user experience.

* (COMPLETED) Global Error Handling (Addresses 1.1, 1.2): Implemented a global Axios interceptor to handle 401 Unauthorized errors by logging the user out gracefully. Implemented a root-level React Error Boundary to prevent "white screen" crashes and display a friendly fallback UI.  
* Critical UI/UX Failures (Addresses 2.1, 2.2, 2.3):  
  * (COMPLETED) Correct the inverted button hierarchy on the Contact Card (Addresses 2.2): The ContactCard footer has been refactored. The "Checked In\!" button is now in a full-width, primary position, and the "Archive" button has been moved to a secondary position, resolving the visual conflict.  
  * (COMPLETED) Simplify header navigation by changing "View Active Contacts" to "Home" (Addresses 2.3).  
  * (COMPLETED) Improve the Tag Input component's affordance with placeholder/helper text (Addresses 2.1).  
* (COMPLETED) High-Priority Bug Fixes (Addresses 1.3, 1.4):  
  * (COMPLETED) Debug and fix the (-1) count on the "View Archived" button.  
  * (COMPLETED) Resolve the CSS visual overlap issue for the birthday field on Android in dark mode.

### **8.2 P1: Polish & Usability Sprint (Next Priority)**

Once the application is stable, this phase focuses on improvements that enhance clarity, professionalism, and user satisfaction.

* (COMPLETED) Branding & Onboarding (Addresses 2.4, 2.5, 2.7):  
  * (COMPLETED) Add branding to auth screens.  
  * (COMPLETED) Add a visual cue (icon) to the birthday field.  
  * (COMPLETED) Investigate a simple onboarding flow.  
* (COMPLETED) Friction Point Removal (Addresses 2.6): Replace the `mailto:` feedback link with a modal and a dedicated API endpoint.  
* (COMPLETED) Performance Audit (Addresses 1.5): Conducted a frontend performance audit to confirm no new bottlenecks exist. Conducted a frontend performance audit. The audit revealed a slow initial load caused by an N+1 query on the backend and a bloated JavaScript bundle on the frontend. Both issues were resolved, resulting in the Lighthouse performance score improving from 71 to 99\.

### **8.3 Out of Scope / Won't Fix**

* **Auto-Translation Glitches (Addresses 1.6):** This is a browser/OS-level feature. We have no control over its implementation or bugs and will not allocate development resources to it.

### **8.4 Product Backlog**

These are validated feature requests that will be prioritized for future development cycles after all P0 and P1 tasks are complete.

* **Core Functionality Improvements & Major "V2" Features:**  
  * (COMPLETED) Birthday Notifications  
  * (COMPLETED) Granular snooze options (e.g., hours, specific date)  
  * (COMPLETED) Time-of-day specific notifications  
  * (COMPLETED) Mobile Navigation Overhaul (Bottom Bar, Layout, Routing)  
  * Expanded reminder frequencies (e.g., weeks, months, years)  
  * A "Dashboard/Journal" view for a chronological history of interactions.  
  * Native phone contacts integration (import/sync).  
  * Granular calendar export options (e.g., export by tag).

**(COMPLETE) Product Backlog Item**  
**Title:** User-Initiated Notification Opt-In (COMPLETED)  
**User Story:** "As a new user, I want to be prompted to enable notifications at a time of my choosing, so that I understand their value and don't feel pressured into making a decision immediately upon logging in for the first time."  
**Summary of Implementation:** The aggressive on-login notification prompt was identified as a critical UX anti-pattern that could cause users to permanently block a core feature. The automatic request was removed and replaced with a user-driven flow. A new "bell" icon button was added to the header, which is now the sole entry point for enabling notifications. The button uses clear, contextual states ("Initializing", "Enable Notifications", "Enabling...", "Enabled", "Blocked") to provide robust user feedback throughout the entire opt-in process, including informative toasts for error states like a user having previously blocked the permission.

## **9\. Future Development Paths**

* (COMPLETED) Add Legal & Informational Pages  
* (COMPLETED) Create User Feedback Channel  
* (COMPLETED) Architectural Refactor  
* (COMPLETED) Implement Password Reset Flow  
* **Isolate Development & Production Environments \- COMPLETED**  
  * **Problem:** The local development environment was dangerously contaminated. The local backend server was connected to the live production database, and both the local and live frontends were using the same production Firebase project. This created a high risk of data corruption and allowed local testing to send real push notifications to production users.  
  * **Solution Implemented:** A comprehensive infrastructure refactor was completed to create a full "air gap" between environments. This involved:  
    * **Creating a Local Database:** A separate PostgreSQL database was created for local development, and the backend was configured to connect to it when in development mode, resolving the SSL connection mismatch.  
    * **Creating a Dev Firebase Project:** A parallel Firebase project (Last Checked In Dev) was created with its own set of keys for authentication and push notifications.  
    * **Making the Code Environment-Aware:** Both the frontend (`firebase.js`) and backend (`server.js`) were refactored to detect the current environment (development or production) and dynamically load the correct set of database and Firebase credentials.  
  * **Outcome:** The project now has a safe, isolated, and professional development workflow, eliminating the risk of cross-contamination between the local and production environments.  
* **Implement "Priority+" Adaptive Header:** A progressively revealing header was considered to make optimal use of space on various screen sizes between the mobile and full desktop breakpoints. The initial idea of using multiple, hardcoded media query breakpoints was rejected due to being brittle, difficult to maintain, and creating an unpredictable user experience. The professional solution, a "Priority+" pattern, was proposed for future implementation. This involves using a `ResizeObserver` to dynamically measure the available header space, calculate how many buttons can fit, and automatically move any overflow items into the dropdown menu.  
  * **Decision:** This feature is deferred to a future "polish" sprint (post-P0/P1) to prioritize the completion of critical bug fixes. The current simple, two-state header (icon-based desktop vs. mobile dropdown) is sufficient for the initial wider release.  
* **Expand Onboarding with Contextual Guidance:** Beyond the initial welcome modal, future development could include "coach marks" or interactive tooltips that point out discoverable features (like 'Edit' or 'Add Note') the first time a user is in a position to use them. This follows the "learn by doing" principle.  
* **Capacitor Conversion:** Use Capacitor to wrap the existing React web app into native iOS and Android packages.  
* **React Native Rewrite:** For ultimate native performance, a full rewrite of the frontend in React Native.  
* **Firebase to Supabase Refactor:** This roadmap item proposes a complete migration of the application's backend infrastructure from the current stack (Node.js/Express on Render, PostgreSQL on Render, Firebase for Auth) to a unified Supabase platform. Supabase is an open-source Backend-as-a-Service (BaaS) that provides a PostgreSQL database, Authentication, Edge Functions, and more in a single, cohesive ecosystem.  
  * **Problem/Justification**  
    * While the current stack is functional, it has several architectural disadvantages:  
    * **High Maintenance Overhead:** We are manually maintaining a full Express.js application, including routing, middleware, and database connection logic.  
    * **Fragmented Services:** The backend is spread across three separate services (Render Web Service, Render Database, Firebase), increasing complexity and potential points of failure.  
    * **Imperative Authorization:** Authorization logic is currently implemented imperatively in each API endpoint (e.g., `WHERE user_id = $1`). This is effective but prone to human error; if a developer forgets this clause, it could lead to a data leak.  
    * **Vendor Lock-in:** The push notification system is tied to Google's proprietary Firebase ecosystem.  
  * **Proposed Solution/Benefits**  
    * Migrating to Supabase would address these issues by:  
    * **Replacing the Express Server:** The entire Node.js/Express backend on Render would be replaced by Supabase's managed services.  
    * **Unifying the Database:** The separate Render PostgreSQL database would be replaced by Supabase's integrated PostgreSQL database.  
    * **Declarative Authorization:** We would leverage PostgreSQL's Row Level Security (RLS). This allows us to write a single, declarative policy in the database itself (e.g., "A user can only select/insert/update/delete contacts that belong to them"). This policy is automatically and infallibly applied to every query, dramatically improving security and reducing boilerplate code.  
    * **Serverless Logic:** Custom backend logic (like the daily cron job or the feedback processor) would be rewritten as simpler, isolated Supabase Edge Functions.  
    * **Reducing Vendor Lock-in:** As an open-source platform, Supabase offers a clear path to self-hosting if ever needed, providing long-term architectural flexibility.  
  * **Suggested Implementation Plan & File Impact Analysis:** This is a major refactoring effort. The following is a suggested list of files and components that would require significant modification. A future development team should use this as a guide but perform their own detailed analysis.  
    * **server/ (Complete Rewrite/Deletion):**  
      * **Files to be Deleted:** `server.js`, `routes/auth.js`, `routes/contacts.js`, `routes/index.js`.  
      * **Reason for Change:** The entire Express.js server and its routing logic would become obsolete. Their functionality would be re-implemented as Supabase Edge Functions (for the cron job and feedback endpoint) and direct database queries from the frontend, protected by RLS policies.  
    * **src/context/AuthContext.js (Complete Rewrite):**  
      * **Reason for Change:** The current context is built around managing a JWT with Axios interceptors. This would be replaced entirely with the Supabase client's built-in session management (`supabase.auth.onAuthStateChange`), which handles token storage, refresh, and session persistence automatically and more securely.  
    * **src/hooks/useApi.js (Complete Rewrite):**  
      * **Reason for Change:** This is the data-fetching core of the application. Every function that currently uses `api.get()` or `api.post()` would need to be rewritten to use the `supabase-js` client library. For example, `api.get('/dashboard-data')` would be replaced with a more expressive Supabase query like `supabase.from('contacts').select('*, tags(*)')`.  
    * **src/api/api.js (Deletion):**  
      * **Reason for Change:** The Axios instance would no longer be the primary interface to the backend. It would be replaced by a new configuration file (e.g., `supabaseClient.js`) that initializes and exports the Supabase client.  
    * **src/pages/Auth/ (Significant Updates):**  
      * **Files to be Updated:** `LoginPage.jsx`, `SignupPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`.  
      * **Reason for Change:** All forms and actions in these components that currently call functions from `AuthContext` would need to be updated to use the new Supabase-powered authentication functions.  
    * **src/firebase.js (Refactor):**  
      * **Reason for Change:** While Firebase Cloud Messaging could still be used for push notifications, the logic for saving the device token (`requestForToken`) would be changed from an Axios call to an invocation of a new Supabase Edge Function (e.g., `supabase.functions.invoke('save-device-token')`).  
    * **Environment Variables (.env)**  
      * **Reason for Change:** All `VITE_API_URL` variables would be removed. They would be replaced by `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Backend environment variables on Render would be moved to the Supabase project dashboard.

## **Appendix: Raw User Feedback**

(The raw, unabridged user feedback is preserved here for historical reference.)

Feedback 1 (iPhone):  
Hi, This app is great\! Here is some feedback: The processing speed for creating a new account is a bit longer than usual It might be helpful for the snooze to also give the option to snooze for hours. Currently, it's only in days It might also be helpful to have the option to choose a time you want to receive the reminder to check in I also have some questions: Does the filter by tag show multiple options? Would the reminder also come as a notification?  
Feedback 2 (iPhone):  
add in a way to export only new contacts to calendar may be a reach, but the ability to import actual phone contacts directly to the app would be cool. give months or weeks options for reminder too (not just days)  
Feedback 3 (iPhone):  
Hi\! Okay so here’s my off rip feedback as I was scrolling on my iPhone: First off, This app is great\! Really awesome concept... I noticed something right away as I was scrolling, and that’s when you have a contact, like the little card they have. I see that there’s the archive button and the check in button, but the archive button looks like a primary action, whereas check in looks to be secondary... Navigation: the “view active contacts/ view archived” button on the menu. Maybe consider changing the “view active contacts” when you’re on the archive screen to “home?”... The view archived has a \-1 (-1). I assume that’s a bug... When I hit edit on a person’s contact, I see their birthday pop up, but it looks a biiit plain... adding a birthday graphic... would draw some of that attention more\! Lastly, I think the login screen could use some branding...  
Feedback 4 (Android):  
Hey Sir, Not sure if it's supposed tk be like that but my page automatically translated to Dutch (which is good) but sometimes it still mixes and glitches english with dutch. Once I add a person and click on schedule, a white screen appears. ...When you add a tag to a person maybe make it like categories so you don't need to create everything all over again. ...When you add a date of birth in dark mode, the text doesn't appear right (the birthday text and the date picked seem to overlap each other visually)  
Feedback 5:  
hey dude... i don’t have the apple mail app on my phone so i cant send it through the app. Overall, i really like the concept of this... One thing I’ll note is that my contacts seemed to disappear from the app. one idea, perhaps a pop up screen when you open the app that shows your outstanding check ups, and then you can click right on one if you went through the check up, and then it opens a sort of journal for that person... a notification for someone’s birthday would be helpful. You could also try to link the app directly with apples contacts/phone app... all in all, this is a great idea. good stuff. can’t wait to download it when it fully releases\!

