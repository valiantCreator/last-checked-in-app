// frontend/src/components/Header.jsx

import React, { useContext } from "react";
import AuthContext from "../context/AuthContext";
import ThemeToggleButton from "./ThemeToggleButton";
import useMediaQuery from "../hooks/useMediaQuery";
import DropdownMenu from "./DropdownMenu";
import styles from "./Header.module.css";

function Header({
  view,
  archivedCount,
  onToggleTheme,
  onViewArchived,
  onViewActive,
  onExportToCalendar,
  theme,
}) {
  const { logout } = useContext(AuthContext);
  const isMobile = useMediaQuery("(max-width: 500px)");

  const viewButton =
    view === "active" ? (
      <button
        key="archive"
        className="button-secondary"
        onClick={onViewArchived}
      >
        📥 View Archived ({archivedCount})
      </button>
    ) : (
      // Gemini FIX: Changed the text from "View Active Contacts" to "Home" and updated the icon
      // to provide simpler, more intuitive navigation per user feedback (Issue 2.3).
      <button key="active" className="button-secondary" onClick={onViewActive}>
        🏠 Home
      </button>
    );

  const exportButton = view === "active" && (
    <button
      key="export"
      className="button-secondary"
      onClick={onExportToCalendar}
      title="Export check-ins and birthdays to your calendar"
    >
      🗓️ Export
    </button>
  );

  // Gemini DEV COMMENT: The email address has been updated to a real, accessible email address.
  // Replace 'lastcheckedin.feedback@gmail.com' with the actual email you will use to receive feedback.
  const feedbackLink = (
    <a
      key="feedback"
      className="button-secondary"
      href="mailto:lastcheckedin.feedback@gmail.com?subject=Last%20Checked%20In%20-%20Feedback"
      target="_blank"
      rel="noopener noreferrer"
    >
      ✉️ Send Feedback
    </a>
  );

  const logoutButton = (
    <button key="logout" className="button-secondary" onClick={logout}>
      🔴 Logout
    </button>
  );

  const mobileDropdownActions = [
    viewButton,
    exportButton,
    feedbackLink,
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
            {feedbackLink}
            {logoutButton}
            <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
          </>
        )}
      </div>
    </div>
  );
}

export default Header;
