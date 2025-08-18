// frontend/src/components/ConfirmationModal.jsx

import React from 'react';

function ConfirmationModal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{children}</p>
        <div className="modal-actions">
          <button onClick={onConfirm} className="button-danger">
            Confirm
          </button>
          <button onClick={onClose} className="button-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;