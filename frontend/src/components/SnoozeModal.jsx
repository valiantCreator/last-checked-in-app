import React, { useState } from 'react';

function SnoozeModal({ contact, onClose, onSnooze }) {
  // The modal manages its own state for the input field.
  const [days, setDays] = useState(7);

  const handleSnoozeClick = () => {
    // Basic validation to ensure a positive number is entered.
    const snoozeDays = parseInt(days, 10);
    if (snoozeDays > 0) {
      onSnooze(contact.id, snoozeDays);
    }
  };

  // Allows the user to submit by pressing Enter in the input field.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSnoozeClick();
    }
  };

  return (
    // The modal-backdrop covers the whole screen and closes the modal when clicked.
    <div className="modal-backdrop" onClick={onClose}>
      {/* We stop propagation on the modal-content so clicking inside it doesn't close it. */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Snooze {contact.firstName}</h2>
        <p>Snooze reminder for how many days?</p>
        <div className="modal-input-group">
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            onKeyDown={handleKeyDown}
            min="1"
            className="modal-input"
            // autoFocus selects the input field as soon as the modal opens.
            autoFocus 
          />
          <label>days</label>
        </div>
        <div className="modal-actions">
          <button className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button-primary" onClick={handleSnoozeClick}>
            Snooze
          </button>
        </div>
      </div>
    </div>
  );
}

export default SnoozeModal;