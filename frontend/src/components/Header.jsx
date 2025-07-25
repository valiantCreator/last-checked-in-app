// --- React and Library Imports ---
import React from 'react';

// --- Header Component ---
// This is a "presentational" or "dumb" component. It receives all the data and functions it needs as props
// from its parent (App.jsx). Its only job is to display the UI based on those props. It doesn't
// manage its own complex state, which makes it highly reusable and easy to understand.
function Header({ 
  // --- Props ---
  view,               // Prop (string): The current view of the app ('active' or 'archived').
  archivedContacts,   // Prop (array): The list of archived contacts, used here to display the count.
  onToggleTheme,      // Prop (function): A function from App.jsx to call when the theme button is clicked.
  onViewArchived,     // Prop (function): A function from App.jsx to call to switch to the archived view.
  onViewActive        // Prop (function): A function from App.jsx to call to switch back to the active view.
}) {
  return (
    <div className="app-header">
      <h1>Last Checked In 🎯</h1>
      
      {/* This container holds the buttons on the right side of the header */}
      <div className="header-actions">
        
        {/* This is a conditional render. 
          - If the current `view` is 'active', it renders the "View Archived" button.
          - Otherwise (if the view is 'archived'), it renders the "View Active Contacts" button.
        */}
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

// Export the component so it can be imported and used in App.jsx
export default Header;
