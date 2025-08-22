import React from "react";
// DEV COMMENT: Import the new CSS module.
import styles from "./ArchivedView.module.css";

function ArchivedView({
  archivedContacts,
  onRestore,
  onDeletePermanently,
  selectedArchivedIds,
  onToggleArchivedSelection,
}) {
  return (
    <div className={styles.archivedList}>
      <h2>Archived Contacts</h2>

      {archivedContacts.map((contact) => {
        const isSelected = selectedArchivedIds.includes(contact.id);
        // DEV COMMENT: Dynamically build the class string for the card.
        const cardClasses = `card ${styles.archivedItem} ${
          isSelected ? "selected" : ""
        }`;

        return (
          <div
            key={contact.id}
            className={cardClasses}
            onClick={() => onToggleArchivedSelection(contact.id)}
          >
            {/* DEV COMMENT: Grouped checkbox and name for better layout control. */}
            <div className={styles.archivedContactInfo}>
              <div className={styles.selectionCheckboxContainer}>
                <div
                  className={`${styles.checkbox} ${
                    isSelected ? styles.checked : ""
                  }`}
                ></div>
              </div>
              <span className={styles.archivedContactName}>{contact.name}</span>
            </div>
            <div className={styles.archivedActions}>
              <button
                className="button-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(contact.id);
                }}
              >
                Restore
              </button>
              <button
                className="button-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePermanently(contact.id);
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        );
      })}

      {archivedContacts.length === 0 && <p>No archived contacts.</p>}
    </div>
  );
}

export default ArchivedView;
