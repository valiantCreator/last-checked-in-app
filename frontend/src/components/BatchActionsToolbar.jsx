import React from 'react';

function BatchActionsToolbar({ 
  selectedCount, 
  onSelectAll, 
  onClear,
  onSnooze,
  onArchive,
  onDelete,
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
        <button onClick={() => onSnooze(7)} className="button-secondary">Snooze 1 Week</button>
        <button onClick={onArchive} className="button-secondary">Archive</button>
        <button onClick={onDelete} className="button-danger">Delete</button>
      </div>
    </div>
  );
}

export default BatchActionsToolbar;
