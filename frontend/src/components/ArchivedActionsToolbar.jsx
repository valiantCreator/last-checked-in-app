import React from "react";
// DEV COMMENT: Reuse the existing CSS module from the main batch actions toolbar.
// This is efficient as the structure and style are identical.
import styles from "./BatchActionsToolbar.module.css";

function ArchivedActionsToolbar({
  selectedCount,
  onSelectAll,
  onClear,
  onRestore,
  onDelete,
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
        {/* FIX: Changed to button-primary for better UX distinction */}
        <button onClick={onRestore} className="button-primary">
          Restore
        </button>
        <button onClick={onDelete} className="button-danger">
          Delete Permanently
        </button>
      </div>
    </div>
  );
}

export default ArchivedActionsToolbar;
