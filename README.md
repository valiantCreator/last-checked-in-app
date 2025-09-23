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
