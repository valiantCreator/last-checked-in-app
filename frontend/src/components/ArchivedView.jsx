// frontend/src/components/ArchivedView.jsx

import React from 'react';
// FIX: The toolbar is no longer imported or rendered here.
// import ArchivedActionsToolbar from './ArchivedActionsToolbar';

function ArchivedView({
  archivedContacts,
  onRestore,
  onDeletePermanently,
  selectedArchivedIds,
  onToggleArchivedSelection,
  // FIX: The batch action handlers are no longer needed as props here.
  // onSelectAllArchived,
  // onClearArchivedSelection,
  // onBatchRestore,
  // onBatchDelete,
}) {
  return (
    <div className="archived-list">
      <h2>Archived Contacts</h2>

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
            <span className="archived-contact-name">{contact.name}</span>
            <div className="archived-actions">
                <button className="button-secondary" onClick={(e) => { e.stopPropagation(); onRestore(contact.id); }}>Restore</button>
                <button className="button-danger" onClick={(e) => { e.stopPropagation(); onDeletePermanently(contact.id); }}>Delete Permanently</button>
            </div>
          </div>
        );
      })}

      {archivedContacts.length === 0 && <p>No archived contacts.</p>}

      {/* FIX: The toolbar has been moved to App.jsx to ensure correct CSS positioning. */}
    </div>
  );
}

export default ArchivedView;