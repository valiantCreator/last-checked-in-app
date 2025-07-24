// --- React and Library Imports ---
import React from 'react';

// --- Header Component ---
// This is a "presentational" component. It receives data and functions as props
// and is only responsible for displaying the UI. It doesn't manage its own state.
function Header({ 
  view,               // Prop: The current view ('active' or 'archived')
  archivedContacts,   // Prop: The list of archived contacts to get the count
  onToggleTheme,      // Prop: Function to call when the theme button is clicked
  onViewArchived,     // Prop: Function to call to switch to the archived view
  onViewActive        // Prop: Function to call to switch to the active view
}) {
  return (
    <div className="app-header">
      <h1>Last Checked In 🎯</h1>
      
      {/* This container holds the buttons on the right side of the header */}
      <div className="header-actions">
        
        {/* Conditionally render the "View Archived" or "View Active" button based on the current view */}
        {view === 'active' ? (
          <button className="button-secondary" onClick={onViewArchived}>
            View Archived ({archivedContacts.length})
          </button>
        ) : (
          <button className="button-secondary" onClick={onViewActive}>
            View Active Contacts
          </button>
        )}

        <button className="theme-toggle-button" onClick={onToggleTheme}>
          Toggle Theme
        </button>
      </div>
    </div>
  );
}

export default Header;
