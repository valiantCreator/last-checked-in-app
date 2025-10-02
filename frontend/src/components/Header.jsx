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
  // Gemini NEW: Accept the new handler prop from App.jsx
  onOpenFeedbackModal,
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

  // Gemini FIX: Replaced the unreliable mailto: link with a button that opens the in-app modal.
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

  const mobileDropdownActions = [
    viewButton,
    exportButton,
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
