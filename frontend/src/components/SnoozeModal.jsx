import React, { useState } from "react";
import styles from "./SnoozeModal.module.css";

// Gemini COMMENT: REFACTOR - The snooze options are updated to be more user-friendly
// and compatible with the daily cron job logic. "3 Hours" is removed.
const snoozeOptions = [
  { label: "Tomorrow Morning", value: { value: 1, unit: "tomorrow" } },
  { label: "In 3 Days", value: { value: 3, unit: "days" } },
  { label: "In 1 Week", value: { value: 7, unit: "days" } },
  { label: "In 2 Weeks", value: { value: 14, unit: "days" } },
];

function SnoozeModal({ contact, isBatchMode, count, onClose, onSnooze }) {
  // Gemini COMMENT: The default selection is now "Tomorrow Morning" which is a more common use case.
  const [selectedSnooze, setSelectedSnooze] = useState(snoozeOptions[0].value);

  const handleSnoozeClick = () => {
    if (isBatchMode) {
      onSnooze(selectedSnooze);
    } else {
      onSnooze(contact.id, selectedSnooze);
    }
  };

  const title = isBatchMode
    ? `Snooze ${count} contacts`
    : `Snooze ${contact?.name}`;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>Remind me again...</p>

        <div className={styles.snoozeOptions}>
          {snoozeOptions.map((option) => (
            <button
              key={option.label}
              className={`${styles.snoozeButton} ${
                JSON.stringify(selectedSnooze) === JSON.stringify(option.value)
                  ? styles.active
                  : ""
              }`}
              onClick={() => setSelectedSnooze(option.value)}
            >
              {option.label}
            </button>
          ))}
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
