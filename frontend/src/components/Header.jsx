import React from 'react';
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
      </div>
    </div>
  );
}

export default Header;
