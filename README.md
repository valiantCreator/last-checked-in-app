# Last Checked In - Project Documentation
**Version: 2.9 (As of August 9, 2025)**
**Author: Gemini**

## 1. Project Overview

### 1.1 Purpose & Vision
"Last Checked In" is a solo Personal Relationship Manager (PRM). Its core purpose is to be a private, intentional tool that empowers users to be more consistent and thoughtful in nurturing the personal and professional relationships they value. It is designed to combat the passive nature of social media by providing an active tool for connection.

### 1.2 Core Problem Solved
In a busy world, it's easy to lose touch with people we care about. Important connections can weaken over time simply due to a lack of contact. This application solves that problem by providing a centralized, private dashboard to:
- Track the last time you connected with a specific person.
- Set custom, flexible reminders for when to check in next.
- Keep timestamped, editable notes on conversations to remember important details.
- Organize contacts with detailed information and a flexible tagging system.
- Receive proactive push notifications for overdue check-ins.

### 1.3 Target User & Philosophy
The app is designed for individuals seeking a private tool to manage their social and professional connections. It operates on a philosophy of intentionality over passive engagement.
- It is **not** a social network. All data is for the user's eyes only.
- It is **proactive**, not reactive. The app prompts the user to reach out.
- It values **quality over quantity**, focusing on deepening existing relationships.

---

## 2. Feature Breakdown

### 2.1 Core Features (MVP)
- **Contact Management:** Add, edit, and view contacts with their name and a custom check-in frequency.
- **Check-in System:** Manually log a "check-in" to reset the reminder timer. Contacts who are past their check-in frequency are visually highlighted as "overdue."
- **Notes System:** Add multiple, timestamped notes for each contact.
- **Dark Mode:** A fully functional light/dark mode theme.

### 2.2 Advanced Features (Implemented)
- **Expanded Contact Details:** Store 'How We Met,' 'Key Facts,' and 'Birthday'.
- **Tagging System:** A flexible, many-to-many tagging system.
- **Advanced Filtering & Sorting:** Comprehensive controls to organize the contact list.
- **Global Search:** A search bar that filters contacts by name or note content.
- **Archive/Restore System:** Archive contacts instead of permanently deleting them.
- **Push Notifications:** A daily scheduled job sends a summary push notification for overdue contacts.
- **List/Grid View Toggle:** Switch between a single-column list and a multi-column grid layout.
- **On-Demand Push Notification Testing:** A developer-focused button on each contact card to test the notification pipeline.
- **In-App Toast Notifications:** Modern, non-blocking "toast" notifications for all user actions.
- **Intuitive Date Display:** Snooze dates are reflected as the next check-in, and check-ins due today are labeled "Today".
- **Custom Snooze Durations:** Allows users to input a custom number of days to snooze a reminder.
- **Refactored Contact Card UI:** A cleaner "summary" view and an expandable "detailed" view for contact cards.
- **Favorite/Pin Contacts:** Users can pin their most important contacts. A star icon on each contact card toggles the pinned status. Pinned contacts appear in a separate "Pinned" section at the top of the main list for easy access. This section is temporarily hidden when a search or filter is active.
- **Calendar Export (.ics):** Allows users to export their contacts' birthdays and check-in reminders into a universal `.ics` file format, compatible with Google Calendar, Outlook, Apple Calendar, and others.
    - An "Export" button in the header opens a modal with options.
    - Users can choose to export birthdays (as recurring annual events) and/or check-ins.
    - For check-ins, users can select a specific time window (next 7, 30, 365 days, or all upcoming) to prevent calendar clutter.
    - The system intelligently generates all recurring check-ins for a contact within the selected time window.
    - If both birthdays and check-ins are selected, the modal provides separate download links for each file (`birthdays.ics` and a dynamically named check-ins file, e.g., `checkins_next_30_days.ics`).

---

## 3. Technical Architecture

### 3.1 Technology Stack
- **Frontend:** React (Vite), JavaScript (ES6+), Axios, use-debounce, Firebase SDK, react-hot-toast, CSS3 with CSS Variables.
- **Backend:** Node.js with Express.js, PostgreSQL, node-cron, Firebase Admin SDK, dotenv.
- **Deployment:**
    - **Frontend:** Vercel (as a Progressive Web App)
    - **Backend:** Render (Web Service)
    - **Database:** Render (PostgreSQL)

### 3.2 Project Structure
The project is a monorepo organized into two main directories: `frontend` and `backend`.
```
last-checked-in-app/
├── .git/
├── .gitignore
├── backend/
│   ├── node_modules/
│   ├── .env
│   ├── backup.js
│   ├── my_data.json
│   ├── package.json
│   ├── restore.js
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
    │   │   ├── ArchivedView.jsx
    │   │   ├── ContactCard.jsx
    │   │   ├── ExportCalendarModal.jsx
    │   │   ├── FilterControls.jsx
    │   │   ├── Header.jsx
    │   │   └── TagInput.jsx
    │   ├── App.jsx
    │   ├── apiConfig.js
    │   ├── firebase.js
    │   ├── index.css
    │   └── utils.js
    ├── index.html
    └── package.json
```

### 3.3 Backend Architecture (PostgreSQL)
The backend uses a PostgreSQL database with a connection pool. All API endpoints are prefixed with `/api`.
- **(UPDATE) Database Schema:** The `contacts` table has been updated with a new `is_pinned` boolean column, which defaults to `false`.
- **(NEW) Pin/Unpin Endpoint:**
    - `PUT /api/contacts/:id/pin`: Toggles the `is_pinned` status of a contact in the database and returns the updated contact object.

### 3.4 Frontend Architecture (Component-Based)
- **State Management & Data Flow**
    - The `App.jsx` component remains the "brain" of the frontend, managing all application-wide state.
    - **Robust Data Fetching:** All handler functions that modify contact data call a central `fetchContacts()` function upon success, ensuring the UI is always in sync with the database.
- **Pinned Contact Logic:** The main list rendering logic in `App.jsx` has been updated. It now uses a `useMemo` hook to derive two lists from the main `contacts` state: a pinned list and an unpinned list.
- **Push Notification Handling**
    - `firebase.js`: This file handles requesting notification permissions and retrieving the device's FCM token.
    - `firebase-messaging-sw.js`: The service worker uses standard `push` and `notificationclick` event listeners for reliable background notification delivery.

---

## 4. File Glossary & Key Logic

This section provides a high-level overview of each critical file's purpose.

### Backend
- `backend/server.js`
    - **Purpose:** The entry point and core of the backend application.
    - **Key Logic:**
        - Initializes the Express.js server.
        - Connects to the PostgreSQL database.
        - Defines all API endpoints (e.g., `GET /api/contacts`, `POST /api/contacts/:id/checkin`, `PUT /api/contacts/:id/pin`).
        - Contains the `node-cron` scheduled job for sending daily push notifications.

### Frontend
- `frontend/public/firebase-messaging-sw.js`
    - **Purpose:** The Firebase service worker. This file runs in the browser's background.
    - **Key Logic:**
        - Listens for incoming push notifications from Firebase Cloud Messaging.
        - Displays the notification to the user using the browser's native notification API.
        - Handles `notificationclick` events to focus the app's tab when a notification is clicked.

- `frontend/src/App.jsx`
    - **Purpose:** The "brain" of the entire frontend application. It is the top-level component that manages all shared state and data logic.
    - **Key Logic:**
        - **State Management:** Holds all primary application state using `useState` hooks (e.g., `contacts`, `theme`, `sortBy`, `view`).
        - **Data Fetching:** Contains the `fetchContacts` function to get data from the backend API.
        - **Event Handlers:** Contains all the main handler functions (`handleCheckIn`, `handleUpdateContact`, `handleSnooze`, etc.) that perform API calls and update the state.
        - **Prop Drilling:** Passes state and handler functions down to child components as props.
        - **Derived State:** Uses `useMemo` to efficiently compute the sorted and filtered list of contacts (`processedContacts`) whenever the source data or filter settings change.

- `frontend/src/components/ContactCard.jsx`
    - **Purpose:** A presentational component responsible for rendering a single contact.
    - **Key Logic:**
        - Displays contact information (name, check-in status, etc.).
        - Manages the toggle between a compact "summary" view and an expanded "detailed" view (which shows notes, birthday, etc.).
        - Renders differently based on the `displayMode` prop ('list' vs. 'grid').
        - Contains the UI elements (buttons, forms) for all contact-specific actions like checking in, snoozing, editing, and adding notes. It receives the functions to perform these actions as props from `App.jsx`.

- `frontend/src/components/ExportCalendarModal.jsx`
    - **Purpose:** The UI component for the calendar export feature.
    - **Key Logic:**
        - Manages its own internal state for the form options (checkboxes, radio buttons).
        - Manages an internal view state to switch between the initial "options" view and the "files ready" view.
        - When the user confirms, it calls a function passed from `App.jsx` (`onGenerateFiles`) to get the calendar file data.
        - It handles the browser download logic, including triggering single or multiple downloads.

- `frontend/src/utils.js`
    - **Purpose:** A utility file for pure, reusable helper functions, primarily for date manipulation.
    - **Key Logic:**
        - `daysSince`: Calculates the difference in days between two dates.
        - `calculateNextUpcomingCheckinDate`: A critical function that correctly calculates a contact's *next future* check-in date, properly accounting for overdue contacts.
        - `formatToICSDate` / `getNextBirthday`: Helper functions specifically for formatting dates according to the iCalendar standard.

- `frontend/src/firebase.js`
    - **Purpose:** Handles client-side Firebase setup and interaction.
    - **Key Logic:**
        - Initializes the Firebase app with credentials.
        - Contains the `requestForToken` function, which prompts the user for notification permissions and retrieves the unique device token required to send push notifications.

- `frontend/src/index.css`
    - **Purpose:** The global stylesheet for the application.
    - **Key Logic:**
        - Defines CSS variables for theming (light and dark modes).
        - Contains all styles for layout, components, and responsiveness.

---

## 5. Setup, Installation, and Deployment
This section provides the necessary steps to set up the project for local development and deploy it to production. This involves creating a Firebase project for push notifications, setting up environment variables for the backend database connection, and running the frontend and backend servers concurrently. For local development, the backend uses `nodemon` to automatically restart upon file changes. Deployment involves connecting the GitHub repository to Vercel for the frontend and Render for the backend and database.

## 6. Future Development Paths
The current application is a robust PWA. The next logical steps for turning it into a commercial product would be:
- **Capacitor Conversion:** Use the Capacitor tool to wrap the existing React web app into native iOS and Android packages. This is the most cost-effective path to getting the app onto the Google Play Store and Apple App Store, as it reuses 100% of the current frontend code.
- **React Native Rewrite:** For the ultimate native performance and feel, a full rewrite of the frontend in React Native would be the long-term goal. The current application's logic, component structure, and backend API would serve as a perfect blueprint for this process.
