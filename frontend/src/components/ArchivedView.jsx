import React from 'react';
import ArchivedActionsToolbar from './ArchivedActionsToolbar'; // --- NEW: Import the new toolbar

// --- ArchivedView Component ---
// This component is responsible for displaying the list of archived contacts.
function ArchivedView({ 
  archivedContacts,     // Prop: The array of archived contact objects
  onRestore,            // Prop: Function to call when the "Restore" button is clicked
  onDeletePermanently,  // Prop: Function to call when the "Delete Permanently" button is clicked
  // --- NEW: Props for batch selection ---
  selectedArchivedIds,
  onToggleArchivedSelection,
  onSelectAllArchived,
  onClearArchivedSelection,
  onBatchRestore,
  onBatchDelete,
}) {

  const selectionMode = selectedArchivedIds.length > 0;

  return (
    <div className="archived-list">
      <h2>Archived Contacts</h2>

      {/* Map over the archivedContacts array to display each one */}
      {archivedContacts.map(contact => {
        const isSelected = selectedArchivedIds.includes(contact.id);
        return (
          <div 
            key={contact.id} 
            className={`card archived-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onToggleArchivedSelection(contact.id)}
          >
            <div className="selection-checkbox-container">
              <div className={`checkbox ${isSelected ? 'checked' : ''}`}></div>
            </div>
            <span>{contact.firstName}</span>
            <div className="archived-actions">
                {/* Each button calls the appropriate handler function passed down from App.jsx */}
                <button className="button-secondary" onClick={(e) => { e.stopPropagation(); onRestore(contact.id); }}>Restore</button>
                <button className="button-danger" onClick={(e) => { e.stopPropagation(); onDeletePermanently(contact.id); }}>Delete Permanently</button>
            </div>
          </div>
        );
      })}

      {/* Display a message if there are no archived contacts */}
      {archivedContacts.length === 0 && <p>No archived contacts.</p>}

      {/* --- NEW: Conditionally render the batch actions toolbar --- */}
      {selectionMode && (
        <ArchivedActionsToolbar
          selectedCount={selectedArchivedIds.length}
          onSelectAll={onSelectAllArchived}
          onClear={onClearArchivedSelection}
          onRestore={onBatchRestore}
          onDelete={onBatchDelete}
          totalContacts={archivedContacts.length}
        />
      )}
    </div>
  );
}

export default ArchivedView;
