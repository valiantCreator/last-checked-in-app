import React from 'react';
// --- NEW: Import the new theme toggle component ---
import ThemeToggleButton from './ThemeToggleButton';

function Header({
  view,
  archivedContacts,
  onToggleTheme,
  onViewArchived,
  onViewActive,
  onExportToCalendar,
  // --- NEW: Receive the current theme state ---
  theme 
}) {
  return (
    <div className="app-header">
      <div className="logo-title-container">
        <img src="/LogoV1.png" alt="Last Checked In Logo" className="app-logo" />
        <h1>Last Checked In</h1>
      </div>

      <div className="header-actions">
        {view === 'active' ? (
          <button className="button-secondary" onClick={onViewArchived}>
            View Archived ({archivedContacts.length})
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

        {/* --- UPDATED: Use the new animated toggle button --- */}
        <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
      </div>
    </div>
  );
}

export default Header;
