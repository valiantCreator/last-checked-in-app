// frontend/src/components/Header.jsx

import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import ThemeToggleButton from "./ThemeToggleButton";
import useMediaQuery from "../hooks/useMediaQuery";
import DropdownMenu from "./DropdownMenu";
import styles from "./Header.module.css";

function Header({
  archivedCount,
  onToggleTheme,
  onExportToCalendar,
  theme,
  onOpenFeedbackModal,
  notificationPermission,
  onRequestNotifications,
  isRequestingNotifications,
  swRegistration,
}) {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 500px)");

  // Gemini COMMENT: Determine if we are on the 'active' (home) view or 'archived' view based on URL.
  const isArchivedView = location.pathname === "/archived";
  const isHomeView = location.pathname === "/";

  let notificationButton = null;

  if (isRequestingNotifications) {
    notificationButton = (
      <button
        key="notifications-loading"
        className="button-secondary"
        title="Requesting permission..."
        disabled
      >
        Enabling...
      </button>
    );
  } else if (notificationPermission) {
    switch (notificationPermission) {
      case "granted":
        notificationButton = (
          <button
            key="notifications-granted"
            className="button-secondary"
            title="Notifications are enabled"
            disabled
          >
            🔔 Enabled
          </button>
        );
        break;
      case "denied":
        notificationButton = (
          <button
            key="notifications-denied"
            className="button-secondary"
            title="Notifications are blocked in your browser settings"
            onClick={onRequestNotifications}
          >
            🔕 Blocked
          </button>
        );
        break;
      default:
        if (!swRegistration) {
          notificationButton = (
            <button
              key="notifications-initializing"
              className="button-secondary"
              title="Initializing notification service..."
              disabled
            >
              Initializing...
            </button>
          );
        } else {
          notificationButton = (
            <button
              key="notifications-default"
              className="button-secondary"
              title="Enable Notifications"
              onClick={onRequestNotifications}
            >
              🔔 Enable Notifications
            </button>
          );
        }
        break;
    }
  }

  // Gemini COMMENT: Desktop Navigation Logic
  // If we are on Home, show "View Archived".
  // If we are on Archived (or others), show "Home".
  const viewButton = !isArchivedView ? (
    <button
      key="archive"
      className="button-secondary"
      onClick={() => navigate("/archived")}
    >
      📥 View Archived ({archivedCount})
    </button>
  ) : (
    <button
      key="active"
      className="button-secondary"
      onClick={() => navigate("/")}
    >
      🏠 Home
    </button>
  );

  // Gemini COMMENT: Only show export button on the main list view.
  const exportButton = isHomeView && (
    <button
      key="export"
      className="button-secondary"
      onClick={onExportToCalendar}
      title="Export check-ins and birthdays to your calendar"
    >
      🗓️ Export
    </button>
  );

  const settingsButton = (
    <button
      key="settings"
      className="button-secondary"
      onClick={() => navigate("/settings")}
      title="Settings"
    >
      ⚙️ Settings
    </button>
  );

  const feedbackButton = (
    <button
      key="feedback"
      className="button-secondary"
      onClick={onOpenFeedbackModal}
      title="Send Feedback"
    >
      ✉️ Send Feedback
    </button>
  );

  const logoutButton = (
    <button key="logout" className="button-secondary" onClick={logout}>
      🔴 Logout
    </button>
  );

  // Gemini COMMENT: Mobile Dropdown Actions
  // We REMOVED 'Settings' and 'View Archived' from here because they are now in the BottomNav.
  const mobileDropdownActions = [
    // View Button (Home/Archived) is removed on mobile to save space (it's in bottom nav)
    exportButton,
    notificationButton,
    // settingsButton, <- REMOVED on mobile
    feedbackButton,
    logoutButton,
  ].filter(Boolean);

  const kebabIcon = (
    <div className={styles.dropdownTrigger}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="12" cy="5" r="1"></circle>
        <circle cx="12" cy="19" r="1"></circle>
      </svg>
    </div>
  );

  return (
    <div className={styles.appHeader}>
      <div className={styles.logoTitleContainer}>
        <img
          src="/LogoV1.png"
          alt="Last Checked In Logo"
          className={styles.appLogo}
        />
        <h1>Last Checked In</h1>
      </div>

      <div className={styles.headerActions}>
        {isMobile ? (
          <>
            <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
            <DropdownMenu trigger={kebabIcon}>
              {mobileDropdownActions}
            </DropdownMenu>
          </>
        ) : (
          <>
            {viewButton}
            {exportButton}
            {notificationButton}
            {settingsButton}
            {feedbackButton}
            {logoutButton}
            <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
          </>
        )}
      </div>
    </div>
  );
}

export default Header;
