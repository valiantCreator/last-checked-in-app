import React from 'react';

function BatchActionsToolbar({ 
  selectedCount, 
  onSelectAll, 
  onClear,
  onSnooze, // This prop is no longer used here, but kept for consistency
  onArchive,
  onDelete, // This prop is no longer used here but we'll leave it for now
  onCheckIn,
  onOpenSnoozeModal, // NEW: A handler to open the batch snooze modal
  totalContacts
}) {
  const allSelected = selectedCount > 0 && selectedCount === totalContacts;

  return (
    <div className="batch-actions-toolbar">
      <div className="selection-info">
        <button 
          className="select-all-button"
          onClick={allSelected ? onClear : onSelectAll}
          title={allSelected ? "Deselect All" : "Select All"}
        >
          <div className={`checkbox ${allSelected ? 'checked' : ''}`}></div>
          {selectedCount} Selected
        </button>
      </div>
      <div className="actions">
        {/* The primary action is now batch check-in */}
        <button onClick={onCheckIn} className="button-primary">Just Checked In!</button>
        {/* UPDATED: This button now opens the modal instead of having hardcoded logic */}
        <button onClick={onOpenSnoozeModal} className="button-secondary">Snooze</button>
        <button onClick={onArchive} className="button-secondary">Archive</button>
      </div>
    </div>
  );
}

export default BatchActionsToolbar;