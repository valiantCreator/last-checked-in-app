// --- React and Library Imports ---
import React from 'react';

// --- ArchivedView Component ---
// This component is responsible for displaying the list of archived contacts.
// It's a simple presentational component that maps over the archived contacts array.
function ArchivedView({ 
  archivedContacts,     // Prop: The array of archived contact objects
  onRestore,            // Prop: Function to call when the "Restore" button is clicked
  onDeletePermanently   // Prop: Function to call when the "Delete Permanently" button is clicked
}) {
  return (
    <div className="archived-list">
      <h2>Archived Contacts</h2>

      {/* Map over the archivedContacts array to display each one */}
      {archivedContacts.map(contact => (
          <div key={contact.id} className="card archived-item">
              <span>{contact.firstName}</span>
              <div className="archived-actions">
                  {/* Each button calls the appropriate handler function passed down from App.jsx */}
                  <button className="button-secondary" onClick={() => onRestore(contact.id)}>Restore</button>
                  <button className="button-danger" onClick={() => onDeletePermanently(contact.id)}>Delete Permanently</button>
              </div>
          </div>
      ))}

      {/* Display a message if there are no archived contacts */}
      {archivedContacts.length === 0 && <p>No archived contacts.</p>}
    </div>
  );
}

export default ArchivedView;
