import React from 'react';

function ArchivedActionsToolbar({
  selectedCount,
  onSelectAll,
  onClear,
  onRestore,
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
        <button onClick={onRestore} className="button-secondary">Restore</button>
        <button onClick={onDelete} className="button-danger">Delete Permanently</button>
      </div>
    </div>
  );
}

export default ArchivedActionsToolbar;
