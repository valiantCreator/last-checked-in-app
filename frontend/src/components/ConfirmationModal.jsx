import React from "react";
// DEV COMMENT: Import the CSS Module for the modal styles.
import styles from "./ConfirmationModal.module.css";

function ConfirmationModal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    // DEV COMMENT: All classNames now use the imported 'styles' object.
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{children}</p>
        <div className={styles.modalActions}>
          {/* DEV COMMENT: Button classes are global and remain as strings. */}
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
