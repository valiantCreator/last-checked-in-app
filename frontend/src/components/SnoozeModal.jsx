import React, { useState } from "react";
// DEV COMMENT: Import the new CSS Module for the modal.
import styles from "./SnoozeModal.module.css";

// NEW: The modal is now smarter and can handle single or batch operations.
function SnoozeModal({
  contact, // The contact object (for single snooze)
  isBatchMode, // A boolean to indicate if we're snoozing a batch
  count, // The number of contacts in the batch
  onClose,
  onSnooze,
}) {
  // State to hold the number of days to snooze for. Default to 1.
  const [days, setDays] = useState(1);

  const handleSnoozeClick = () => {
    // Basic validation to ensure days is a positive number.
    const snoozeDays = parseInt(days, 10);
    if (snoozeDays > 0) {
      // The onSnooze prop is now more flexible.
      // For a single contact, App.jsx passes a function like `(id, d) => ...`
      // For a batch, App.jsx passes a function like `(d) => ...`
      if (isBatchMode) {
        onSnooze(snoozeDays);
      } else {
        onSnooze(contact.id, snoozeDays);
      }
    }
  };

  // DEV COMMENT: FIX - The contact object uses the 'name' property, not 'firstName'.
  // This change corrects the "Snooze undefined" bug.
  const title = isBatchMode
    ? `Snooze ${count} contacts`
    : `Snooze ${contact?.name}`;

  return (
    // DEV COMMENT: All classNames now use the imported 'styles' object.
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>Select how many days from now you'd like to be reminded.</p>

        <div className={styles.modalInputGroup}>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={styles.modalInput}
            min="1"
            autoFocus
          />
          <label>day(s)</label>
        </div>

        <div className={styles.modalActions}>
          <button onClick={handleSnoozeClick} className="button-primary">
            Snooze
          </button>
          <button onClick={onClose} className="button-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SnoozeModal;
