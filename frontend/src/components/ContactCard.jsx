import React, { useState } from "react";
import {
  isOverdue,
  formatBirthday,
  daysSince,
  parseAsLocalDate,
} from "../utils.js";
import TagInput from "./TagInput.jsx";
// DEV COMMENT: Import the new CSS module for the ContactCard.
import styles from "./ContactCard.module.css";

// DEV COMMENT: New helper function to format dates into readable strings like "Today", "Tomorrow", or "Sun, Aug 24".
const formatDateDisplay = (date) => {
  if (!date) return null;
  const localDate = parseAsLocalDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (localDate.getTime() === today.getTime()) return "Today";
  if (localDate.getTime() === tomorrow.getTime()) return "Tomorrow";

  return localDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

function ContactCard({
  contact,
  handlers,
  uiState,
  displayMode,
  selectionMode,
  isSelected,
  onToggleSelection,
  isAgendaItemOverdue,
  uniqueAgendaKey,
  // DEV COMMENT: New props from AgendaView to override the date display.
  agendaDueDate,
  agendaNextDate,
}) {
  const { editingContact, detailedItemId, addingNoteToContactId, editingNote } =
    uiState;
  const {
    handleCheckIn,
    handleToggleDetails,
    handleTagAdded,
    handleRemoveTag,
    handleEditContactClick,
    handleEditingContactChange,
    handleArchiveContact,
    handleToggleAddNoteForm,
    handleSaveNote,
    handleUpdateNote,
    handleEditNoteClick,
    handleCancelEditNote,
    handleUpdateContact,
    handleCancelEditContact,
    handleTogglePin,
    handleOpenSnoozeModal,
  } = handlers;

  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteContent, setEditingNoteContent] = useState("");

  if (!contact) {
    return null;
  }

  const isCardOverdue =
    typeof isAgendaItemOverdue === "boolean"
      ? isAgendaItemOverdue
      : isOverdue(contact);

  const isEditingThisContact =
    editingContact && editingContact.id === contact.id;

  const cardKey = uniqueAgendaKey || contact.id;
  const isExpanded = detailedItemId === cardKey;

  const isAddingNote = addingNoteToContactId === contact.id;

  // DEV COMMENT: New date display logic for the status bar.
  // It prioritizes dates passed from AgendaView but falls back to the contact's global status.

  // --- "Last" display ---
  const lastCheckinDate = parseAsLocalDate(contact.last_checkin);
  const now = new Date();
  let lastDisplay;
  if (lastCheckinDate && lastCheckinDate > now) {
    lastDisplay = `Starting on ${formatDateDisplay(lastCheckinDate)}`;
  } else {
    lastDisplay = `${daysSince(contact.last_checkin)} day(s) ago`;
  }

  // --- "Due" display ---
  let dueDisplay;
  if (agendaDueDate) {
    dueDisplay = formatDateDisplay(agendaDueDate);
  } else {
    // Fallback logic for List/Grid view
    const isSnoozed =
      contact.snooze_until && parseAsLocalDate(contact.snooze_until) >= now;
    if (isSnoozed) {
      dueDisplay = formatDateDisplay(contact.snooze_until);
    } else if (contact.last_checkin) {
      const nextDate = new Date(parseAsLocalDate(contact.last_checkin));
      nextDate.setDate(nextDate.getDate() + contact.checkin_frequency);
      dueDisplay = formatDateDisplay(nextDate);
    } else {
      dueDisplay = "N/A";
    }
  }

  // --- "Next" display (only for Agenda View) ---
  const nextDisplay = agendaNextDate ? formatDateDisplay(agendaNextDate) : null;

  const onUpdateContactSubmit = (e) => {
    e.preventDefault();
    handleUpdateContact();
  };

  const startEditingNote = (note) => {
    setEditingNoteContent(note.content);
    handleEditNoteClick(note);
  };

  const onSaveNote = () => {
    handleSaveNote(contact.id, newNoteContent);
    setNewNoteContent("");
  };

  const onUpdateNote = (noteId) => {
    handleUpdateNote(contact.id, noteId, editingNoteContent);
  };

  const handleCardClick = (e) => {
    // DEV COMMENT: Prevent card click from toggling details if a button was clicked.
    if (e.target.closest("button")) return;

    if (selectionMode) {
      onToggleSelection(contact.id);
    } else if (!isEditingThisContact) {
      handleToggleDetails(cardKey); // Use the unique card key here
    }
  };

  // DEV COMMENT: Grid view has its own unique, simplified layout and is preserved.
  if (displayMode === "grid") {
    // DEV COMMENT: Dynamically build the class string for the grid card.
    const gridCardClasses = `
      card 
      ${styles.contactItemGrid} 
      ${isCardOverdue ? styles.overdue : ""} 
      ${isSelected ? "selected" : ""}
    `;

    return (
      <div
        className={gridCardClasses.trim()}
        onClick={() => {
          if (selectionMode) {
            onToggleSelection(contact.id);
          }
        }}
      >
        <div className={styles.contactCardIdentity}>
          <div
            className={styles.selectionCheckboxContainer}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(contact.id);
            }}
          >
            <div
              className={`${styles.checkbox} ${
                isSelected ? styles.checked : ""
              }`}
            ></div>
          </div>
          <button
            className={`${styles.pinButton} ${
              contact.is_pinned ? styles.pinned : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin(contact.id);
            }}
            disabled={selectionMode}
          >
            {contact.is_pinned ? "★" : "☆"}
          </button>
        </div>
        <h3>{contact.name}</h3>
        <p>Next check-in:</p>
        <strong>{dueDisplay}</strong>
        {contact.birthday && (
          <p className={styles.gridBirthday}>
            🎂 {formatBirthday(contact.birthday)}
          </p>
        )}
      </div>
    );
  }

  // DEV COMMENT: This is the refactored layout for List and Agenda views.
  const listCardClasses = `
    card 
    ${styles.contactItem} 
    ${isCardOverdue ? styles.overdue : ""} 
    ${isSelected ? "selected" : ""}
  `;

  return (
    <div className={listCardClasses.trim()}>
      {isEditingThisContact ? (
        <form
          onSubmit={onUpdateContactSubmit}
          className={styles.contactEditForm}
        >
          {/* The edit form remains unchanged */}
          <input
            name="name"
            value={editingContact.name}
            onChange={handleEditingContactChange}
          />
          <input
            name="how_we_met"
            value={editingContact.how_we_met || ""}
            onChange={handleEditingContactChange}
            placeholder="How we met"
          />
          <input
            type="date"
            name="birthday"
            value={
              editingContact.birthday
                ? editingContact.birthday.split("T")[0]
                : ""
            }
            onChange={handleEditingContactChange}
          />
          <textarea
            name="key_facts"
            value={editingContact.key_facts || ""}
            onChange={handleEditingContactChange}
            placeholder="Key facts"
          />
          <div>
            <label>Remind every</label>
            <input
              type="number"
              name="checkin_frequency"
              value={editingContact.checkin_frequency}
              onChange={handleEditingContactChange}
              min="1"
            />
            <label>days</label>
          </div>
          <div>
            <label>Starting from</label>
            <input
              type="date"
              name="last_checkin"
              value={
                editingContact.last_checkin
                  ? editingContact.last_checkin.split("T")[0]
                  : ""
              }
              onChange={handleEditingContactChange}
            />
          </div>
          <div className={styles.formActions}>
            <button type="submit" className="button-primary">
              Save Changes
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={handleCancelEditContact}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* ZONE 1: HEADER (IDENTIFICATION & STATE) */}
          <div className={styles.contactCardHeader}>
            <div
              className={styles.contactCardIdentity}
              onClick={handleCardClick}
            >
              <div
                className={styles.selectionCheckboxContainer}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection(contact.id);
                }}
              >
                <div
                  className={`${styles.checkbox} ${
                    isSelected ? styles.checked : ""
                  }`}
                ></div>
              </div>
              <button
                className={`${styles.pinButton} ${
                  contact.is_pinned ? styles.pinned : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin(contact.id);
                }}
                disabled={selectionMode}
              >
                {contact.is_pinned ? "★" : "☆"}
              </button>
              <h3>{contact.name}</h3>
            </div>
            <button
              className={styles.expandCollapseButton}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleDetails(cardKey);
              }}
              aria-expanded={isExpanded}
              disabled={selectionMode}
            >
              {isExpanded ? "Hide Details" : "Show Details"}
              <span
                className={`${styles.arrow} ${
                  isExpanded ? styles.expanded : ""
                }`}
              >
                ▼
              </span>
            </button>
          </div>

          {/* ZONE 2: STATUS BAR (THE "WHEN") */}
          <div className={styles.contactCardStatusBar}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Last:</span>
              <span className={styles.statusValue}>{lastDisplay}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Due:</span>
              <span className={styles.statusValue}>{dueDisplay}</span>
            </div>
            {nextDisplay && (
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Next:</span>
                <span className={styles.statusValue}>{nextDisplay}</span>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className={styles.contactDetailsExpanded}>
              <div className={styles.contactDetails}>
                {contact.birthday && (
                  <p>
                    <strong>Birthday:</strong>{" "}
                    {formatBirthday(contact.birthday)}
                  </p>
                )}
                {contact.how_we_met && (
                  <p>
                    <strong>How we met:</strong> {contact.how_we_met}
                  </p>
                )}
                {contact.key_facts && (
                  <p>
                    <strong>Key facts:</strong> {contact.key_facts}
                  </p>
                )}
                <p className={styles.frequencyDetail}>
                  <strong>Check-in frequency:</strong> Every{" "}
                  {contact.checkin_frequency} days
                </p>
              </div>
              <div className="tags-container">
                {contact.tags &&
                  contact.tags.map((tag) => (
                    <span key={tag.id} className="tag-badge">
                      {tag.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(contact.id, tag.id);
                        }}
                        className="remove-tag-btn"
                      >
                        x
                      </button>
                    </span>
                  ))}
                <TagInput
                  contact={contact}
                  onTagAdded={(newTag) => handleTagAdded(contact.id, newTag)}
                />
              </div>
              <div className={styles.notesSection}>
                {isAddingNote && (
                  <div className={styles.addNoteForm}>
                    <textarea
                      placeholder="Add a new note..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                    />
                    <div className={styles.addNoteActions}>
                      <button className="button-primary" onClick={onSaveNote}>
                        Save Note
                      </button>
                      <button
                        className="button-secondary"
                        onClick={() => handleToggleAddNoteForm(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="notes-content">
                  {contact.notes.map((note) => (
                    <div key={note.id} className={styles.note}>
                      {editingNote && editingNote.id === note.id ? (
                        <div className={styles.noteEditView}>
                          <textarea
                            value={editingNoteContent}
                            onChange={(e) =>
                              setEditingNoteContent(e.target.value)
                            }
                          />
                          <div className={styles.noteActions}>
                            <button
                              className="button-primary"
                              onClick={() => onUpdateNote(note.id)}
                            >
                              Save
                            </button>
                            <button
                              className="button-secondary"
                              onClick={handleCancelEditNote}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.noteDisplayView}>
                          <p>{note.content}</p>
                          <div className={styles.noteFooter}>
                            <small>
                              Created:{" "}
                              {new Date(note.created_at).toLocaleString()}
                              {note.modified_at && (
                                <span className={styles.modifiedDate}>
                                  &nbsp;· Edited:{" "}
                                  {new Date(note.modified_at).toLocaleString()}
                                </span>
                              )}
                            </small>
                            <button
                              className={styles.editButton}
                              onClick={() => startEditingNote(note)}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {contact.notes.length === 0 && !isAddingNote && (
                    <p>No notes yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ZONE 3: FOOTER (THE "WHAT") */}
          <div className={styles.contactCardFooter}>
            <div className={styles.footerActionsLeft}>
              <button
                className="button-secondary button-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveContact(contact.id);
                }}
                disabled={selectionMode}
              >
                Archive
              </button>
            </div>
            <div className={styles.footerActionsRight}>
              {isCardOverdue && (
                <button
                  className="button-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSnoozeModal(contact);
                  }}
                  disabled={selectionMode}
                >
                  Snooze
                </button>
              )}
              <button
                className="button-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditContactClick(contact);
                }}
                disabled={selectionMode}
              >
                Edit
              </button>
              <button
                className="button-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isExpanded) {
                    handleToggleDetails(cardKey);
                  }
                  handleToggleAddNoteForm(
                    contact.id === addingNoteToContactId ? null : contact.id
                  );
                }}
                disabled={selectionMode}
              >
                Add Note
              </button>
              <button
                className="button-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckIn(contact.id);
                }}
                disabled={selectionMode}
              >
                Checked In!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ContactCard;
