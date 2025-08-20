// frontend/src/components/Header.jsx

import React, { useContext } from "react";
import AuthContext from "../context/AuthContext";
import ThemeToggleButton from "./ThemeToggleButton";
import useMediaQuery from "../hooks/useMediaQuery";
import DropdownMenu from "./DropdownMenu";

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
      <button key="active" className="button-secondary" onClick={onViewActive}>
        📤 View Active Contacts
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

  const logoutButton = (
    <button key="logout" className="button-secondary" onClick={logout}>
      🔴 Logout
    </button>
  );

  // DEV COMMENT: Create an array of actions for the mobile dropdown.
  // Using .filter(Boolean) is a concise way to remove any "falsy" values
  // (like the null `exportButton` in the archived view), which fixes the crash.
  const mobileDropdownActions = [viewButton, exportButton, logoutButton].filter(
    Boolean
  );

  return (
    <div className="app-header">
      <div className="logo-title-container">
        <img
          src="/LogoV1.png"
          alt="Last Checked In Logo"
          className="app-logo"
        />
        <h1>Last Checked In</h1>
      </div>

      <div className="header-actions">
        {isMobile ? (
          <>
            <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
            <DropdownMenu trigger={<span className="kebab-icon">⋮</span>}>
              {mobileDropdownActions}
            </DropdownMenu>
          </>
        ) : (
          <>
            {viewButton}
            {exportButton}
            {logoutButton}
            <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
          </>
        )}
      </div>
    </div>
  );
}

export default Header;
