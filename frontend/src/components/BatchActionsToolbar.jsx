import React from "react";
// DEV COMMENT: Import the new CSS Module.
import styles from "./BatchActionsToolbar.module.css";

function BatchActionsToolbar({
  selectedCount,
  onSelectAll,
  onClear,
  onSnooze, // This prop is no longer used here, but kept for consistency
  onArchive,
  onDelete, // This prop is no longer used here but we'll leave it for now
  onCheckIn,
  onOpenSnoozeModal, // NEW: A handler to open the batch snooze modal
  totalContacts,
}) {
  const allSelected = selectedCount > 0 && selectedCount === totalContacts;

  return (
    // DEV COMMENT: All classNames now use the imported 'styles' object.
    <div className={styles.batchActionsToolbar}>
      <div className={styles.selectionInfo}>
        <button
          className={styles.selectAllButton}
          onClick={allSelected ? onClear : onSelectAll}
          title={allSelected ? "Deselect All" : "Select All"}
        >
          <div
            className={`${styles.checkbox} ${
              allSelected ? styles.checked : ""
            }`}
          ></div>
          {selectedCount} Selected
        </button>
      </div>
      <div className={styles.actions}>
        {/* The primary action is now batch check-in */}
        <button onClick={onCheckIn} className="button-primary">
          Just Checked In!
        </button>
        {/* UPDATED: This button now opens the modal instead of having hardcoded logic */}
        <button onClick={onOpenSnoozeModal} className="button-secondary">
          Snooze
        </button>
        <button onClick={onArchive} className="button-secondary">
          Archive
        </button>
      </div>
    </div>
  );
}

export default BatchActionsToolbar;
