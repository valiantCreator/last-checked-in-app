// frontend/src/components/Header.jsx

// FIX: Import useContext and AuthContext to access the logout function directly.
import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import ThemeToggleButton from './ThemeToggleButton';

function Header({
  view,
  // --- UPDATED: Receive archivedCount (a number) instead of the full array ---
  archivedCount,
  onToggleTheme,
  onViewArchived,
  onViewActive,
  onExportToCalendar,
  theme
}) {
  // FIX: Get the logout function from our global authentication context.
  const { logout } = useContext(AuthContext);

  return (
    <div className="app-header">
      <div className="logo-title-container">
        <img src="/LogoV1.png" alt="Last Checked In Logo" className="app-logo" />
        <h1>Last Checked In</h1>
      </div>

      <div className="header-actions">
        {view === 'active' ? (
          <button className="button-secondary" onClick={onViewArchived}>
            {/* --- UPDATED: Display the count directly --- */}
            View Archived ({archivedCount})
          </button>
        ) : (
          <button className="button-secondary" onClick={onViewActive}>
            View Active Contacts
          </button>
        )}

        {view === 'active' && (
            <button className="button-secondary" onClick={onExportToCalendar} title="Export check-ins and birthdays to your calendar">
                🗓️ Export
            </button>
        )}

        <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />

        {/* FIX: Add the Logout button. It calls the logout function from the context. */}
        <button className="button-secondary" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Header;