# Last Checked In - Project Documentation

**Version:** 8.2.0
**Last Updated:** August 22, 2025
**Author:** Gemini

## 1. Project Overview

### 1.1 Purpose & Vision

"Last Checked In" is a Personal Relationship Manager (PRM). Its core purpose is to be a private, intentional tool that empowers users to be more consistent and thoughtful in nurturing their personal and professional relationships. It provides each user with a secure, private account to manage their connections, combating the passive nature of social media by providing an active tool for connection.

### 1.2 Core Problem Solved

In a busy world, it's easy to lose touch with people we care about. This application solves that problem by providing a centralized, private dashboard for each user to:

- Track the last time they connected with a specific person.
- Set custom, flexible reminders for when to check in next.
- Keep private, timestamped, and editable notes on conversations to remember important details.
- Organize contacts with detailed information and a flexible tagging system.
- Receive proactive push notifications for their own overdue check-ins.

### 1.3 Target User & Philosophy

The app is designed for individuals seeking a private tool to manage their social and professional connections. It operates on a philosophy of intentionality over passive engagement.

- It is **not a social network**. All user data is sandboxed and for their eyes only.
- It is **proactive, not reactive**. The app prompts the user to reach out.
- It values **quality over quantity**, focusing on deepening existing relationships.

---

## 2. Feature Breakdown

### 2.1 User Accounts & Authentication

The application has been fundamentally re-architected into a full-featured, multi-user platform with a robust and secure account system.

- **Signup:** Users can create a new, private account using an email and password. The signup page UI has been completely refactored with a modern design, a "Confirm Password" field to prevent typos, and a "Show/Hide Password" toggle for improved usability. Passwords are never stored in plain text; they are salted and hashed using bcrypt.
- **Login:** Registered users can log in to access their sandboxed data.
- **Session Management:** The system uses JSON Web Tokens (JWTs) stored in the browser's localStorage to maintain user sessions across page loads. Sessions persist for 7 days.
- **Data Sandboxing:** The core of the multi-user system. A user can only see and interact with the data they have created. All data is scoped to their user ID on the backend.
- **Logout:** A logout button in the header allows users to securely terminate their session, clearing their credentials from the application state and localStorage.

### 2.2 Core Features (Now User-Specific)

- **Contact Management:** Add, edit, and view contacts with their name and a custom check-in frequency.
- **Check-in System:** Manually log a "check-in" to reset the reminder timer. Contacts who are past their check-in frequency are visually highlighted as "overdue."
- **Notes System:** Add, edit, and view multiple, timestamped notes for each contact.

### 2.3 Advanced Features (Now User-Specific)

- **Animated Dark Mode & Persistence:** Replaced the text-based "Toggle Theme" button with a modern, animated sun/moon icon. The user's theme preference is now saved to their browser's localStorage.
- **Expanded Contact Details:** Store 'How We Met,' 'Key Facts,' and 'Birthday'.
- **Tagging System:** A flexible, many-to-many tagging system.
- **Advanced Filtering & Sorting:** Comprehensive controls to organize the contact list.
- **Global Search:** A search bar that filters contacts by name or note content.
- **Archive/Restore System:** Archive contacts instead of permanently deleting them.
- **Multi-User Push Notifications:** A daily scheduled job on the backend is the single source of truth for notifications. It now iterates through each user with registered devices, running an efficient, user-scoped database query to find their specific overdue contacts. It sends a single, dynamic summary push notification.
- **Agenda View with Recurring Events:** An Agenda View provides a forward-looking summary of all upcoming check-ins for the next 30 days.
- **In-App Toast Notifications:** Modern, non-blocking "toast" notifications for all user actions.
- **Intuitive & Timezone-Safe Date Display:** All date calculations and displays have been refactored to be timezone-safe.
- **Server-Authoritative Snooze:** The snooze functionality is handled by a robust modal and calculated on the backend.
- **Refactored Contact Card UI:** A cleaner "summary" view and an expandable "detailed" view for contact cards.
- **Favorite/Pin Contacts:** Users can pin important contacts to a separate "Pinned" section at the top of the main list.
- **Calendar Export (.ics):** Allows users to export birthdays and check-in reminders into a universal .ics file.
- **Batch Actions (Active & Archived):** Allows users to select multiple contacts to perform bulk operations.
- **Custom Confirmation Modal:** All destructive actions trigger a custom, in-app modal to confirm the user's intent.
- **Backend Security:** The backend API is protected with rate limiting and input validation.
- **Responsive Header:** The main application header is now fully responsive, collapsing into a dropdown menu on smaller viewports.
- **Frontend Architectural Refactor:** The entire frontend has been re-architected to improve scalability and maintainability.

---

## 3. Technical Architecture

### 3.1 Technology Stack

- **Frontend:** React (Vite), React Router (react-router-dom), JavaScript (ES6+), Axios, use-debounce, date-fns, Firebase SDK, react-hot-toast, CSS3 with **CSS Modules**.
- **Backend:** Node.js, Express.js, PostgreSQL, bcrypt, jsonwebtoken, node-cron, Firebase Admin SDK, dotenv, express-rate-limit, zod.
- **Deployment:**
  - Frontend: Vercel (as a Progressive Web App)
  - Backend: Render (Web Service)
  - Database: Render (PostgreSQL)
- **Development & Tooling:**
  - IDE: Visual Studio Code with the Prettier extension for automated code formatting.
  - Version Control: Git, with the repository hosted on GitHub.
  - Database Management: DBeaver was used as a GUI client to connect to, query, and manage both local and production PostgreSQL databases.

### 3.2 Project Structure

The project is a monorepo organized into frontend and backend directories. The frontend has been significantly refactored to use CSS Modules and a custom hooks architecture for state management.

```
last-checked-in-app/
├── .git/
├── .gitignore
├── backend/
│   ├── node_modules/
│   ├── .env
│   ├── package.json
│   ├── server.js
│   └── serviceAccountKey.json
└── frontend/
    ├── node_modules/
    ├── public/
    │   ├── firebase-messaging-sw.js
    │   ├── manifest.json
    │   └── LogoV1.png
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
    │   │   ├── ConfirmationModal.jsx
    │   │   ├── ConfirmationModal.module.css
    │   │   ├── ContactCard.jsx
    │   │   ├── ContactCard.module.css
    │   │   ├── DropdownMenu.jsx
    │   │   ├── DropdownMenu.module.css
    │   │   ├── ExportCalendarModal.jsx
    │   │   ├── ExportCalendarModal.module.css
    │   │   ├── FilterControls.jsx
    │   │   ├── FilterControls.module.css
    │   │   ├── Header.jsx
    │   │   ├── Header.module.css
    │   │   ├── ProtectedRoute.jsx
    │   │   ├── SnoozeModal.jsx
    │   │   ├── SnoozeModal.module.css
    │   │   ├── TagInput.jsx
    │   │   ├── TagInput.module.css
    │   │   ├── ThemeToggleButton.jsx
    │   │   └── ThemeToggleButton.module.css
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── hooks/
    │   │   ├── useContacts.js
    │   │   ├── useMediaQuery.js
    │   │   ├── useSelection.js
    │   │   └── useUIState.js
    │   ├── pages/
    │   │   ├── AuthForm.module.css
    │   │   ├── LoginPage.jsx
    │   │   └── SignupPage.jsx
    │   ├── App.css
    │   ├── App.jsx
    │   ├── App.module.css
    │   ├── apiConfig.js
    │   ├── firebase.js
    │   ├── index.css
    │   ├── main.jsx
    │   └── utils.js
    ├── index.html
    ├── package.json
    └── vercel.json
```

### 3.3 Backend Architecture

(CURRENT - Multi-User Architecture)

- **Database Schema:** A primary `users` table was added. All other data tables have a `user_id` foreign key.
- **Authentication Endpoints:** `POST /api/auth/signup` and `POST /api/auth/login` handle user registration and authentication, returning a JWT.
- **Authorization Middleware:** A robust `authMiddleware` function protects all data-related endpoints by validating the JWT.
- **Scoped Queries:** Every SQL query includes a `WHERE user_id = $1` clause to enforce strict data privacy.

### 3.4 Frontend Architecture

**(RE-ARCHITECTED - Hook-Based & Modular CSS)**
The frontend has undergone a complete architectural overhaul to improve scalability and maintainability.

- **CSS Modules:** The monolithic `index.css` file has been eliminated in favor of CSS Modules. Every React component now imports its own `.module.css` file, which locally scopes all class names.
- **Custom Hooks for State Management:** All complex stateful logic has been extracted from the `App.jsx` component and organized into a series of single-responsibility custom hooks.
- **Composition Root:** The `App.jsx` component no longer manages state directly. Its new role is to act as a **composition root**, consuming the custom hooks and orchestrating the flow of state and handlers down to its child components.

---

## 4. File Glossary & Key Logic

### Frontend (`src` directory)

- **`App.jsx` (RE-ARCHITECTED):** Now a lean **composition root**. Its only job is to consume the custom hooks (`useContacts`, `useUIState`, `useSelection`), wire them together, and pass the resulting state and functions down to the appropriate child components.
- **`index.css`:** Contains only truly global styles: a CSS reset, `:root` color variables for themes, and base styles for global classes like `.card` and `.button-primary`.
- **`App.css`:** Contains top-level application layout styles that are not component-specific, such as the main `.app-container` rules.
- **`App.module.css`:** Contains layout styles used exclusively by the `MainApplication` component within `App.jsx`, such as the grid container and view controls.
- **`utils.js`:** Contains pure helper functions for date manipulation and data transformation.
- **`context/AuthContext.jsx`:** Implements the React Context for global state management of the user's authentication token.

### (NEW) `hooks/` directory

This directory contains all the reusable, stateful logic for the application.

- **`useContacts.js`:** The primary data hook. Responsible for all state and asynchronous logic related to contacts: fetching, adding, updating, archiving, notes, tags, snoozing, and generating calendar files.
- **`useUIState.js`:** Manages all state related to the UI itself. This includes the active view, display mode, sorting/filtering state, search terms, and the open/closed state of all modals.
- **`useSelection.js`:** Manages the state for the batch action mode. It holds the arrays of selected contact IDs for both the active and archived views and provides the functions for toggling and clearing selections.
- **`useMediaQuery.js`:** A simple utility hook that allows components to react to changes in viewport size.

### Frontend Components (`src/components/` directory)

Each component is now fully self-contained and imports its own `.module.css` stylesheet.

- **`AddContactForm.jsx` / `.module.css`:** The form for adding a new contact.
- **`AgendaView.jsx` / `.module.css`:** The component that lays out upcoming check-ins by day.
- **`ArchivedActionsToolbar.jsx`:** The contextual toolbar for batch actions on archived contacts. Reuses styles from `BatchActionsToolbar.module.css`.
- **`ArchivedView.jsx` / `.module.css`:** The list view for displaying archived contacts.
- **`BatchActionsToolbar.jsx` / `.module.css`:** The contextual toolbar for batch actions on active contacts.
- **`ConfirmationModal.jsx` / `.module.css`:** A generic modal for confirming destructive actions.
- **`ContactCard.jsx` / `.module.css`:** The core component for displaying a single contact in all its states (list, grid, expanded).
- **`DropdownMenu.jsx` / `.module.css`:** A reusable dropdown menu component, used in the responsive header.
- **`ExportCalendarModal.jsx` / `.module.css`:** The modal containing the form for exporting calendar files.
- **`FilterControls.jsx` / `.module.css`:** The component containing the search bar, sort dropdown, and tag filter.
- **`Header.jsx` / `.module.css`:** The main application header, including the logo, title, and primary action buttons.
- **`ProtectedRoute.jsx`:** A component wrapper that redirects to `/login` if no auth token is present.
- **`SnoozeModal.jsx` / `.module.css`:** The modal used for snoozing single or multiple contacts.
- **`TagInput.jsx` / `.module.css`:** The input field within the `ContactCard` for adding tags, including a suggestions dropdown.
- **`ThemeToggleButton.jsx` / `.module.css`:** The animated sun/moon SVG button for toggling the theme.

### Frontend Pages (`src/pages/` directory)

- **`LoginPage.jsx` & `SignupPage.jsx`:** The user authentication pages.
- **`AuthForm.module.css`:** A shared stylesheet used by both `LoginPage` and `SignupPage` to ensure a consistent look and feel.

---

## 5. Setup, Installation, and Deployment

(This section remains unchanged)

---

## 6. Error History & Resolutions

(This section remains unchanged)

---

## 7. Future Development Paths

- **(NEW) Implement Password Reset Flow:** Build a secure, self-service "Forgot Password" feature. This involves creating backend endpoints for generating a unique reset token, sending a password reset email to the user, and a frontend page for them to enter a new password. This is the highest priority pre-launch feature.
- **(NEW) Add Legal & Informational Pages:** Create basic static pages for the "Privacy Policy" and "Terms of Service," and link to them from the Login/Signup pages.
- **(NEW) Create User Feedback Channel:** Implement a simple method for users to submit feedback or bug reports, such as a "Feedback" link in the header that opens a `mailto:` link.
- **Capacitor Conversion:** Use Capacitor to wrap the existing React web app into native iOS and Android packages.
- **React Native Rewrite:** For ultimate native performance, a full rewrite of the frontend in React Native.
- **(COMPLETED) Architectural Refactor:** The application's frontend architecture has been successfully refactored. The `App.jsx` "God Component" has been deconstructed into a clean composition root that consumes a series of single-responsibility custom hooks (`useContacts`, `useUIState`, `useSelection`). The monolithic `index.css` stylesheet has been replaced with locally-scoped CSS Modules for each component.
