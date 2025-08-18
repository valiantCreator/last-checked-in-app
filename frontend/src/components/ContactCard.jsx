// frontend/src/components/ContactCard.jsx

import React, { useState } from "react";
import { isOverdue, formatBirthday, daysSince } from "../utils.js";
import TagInput from "./TagInput.jsx";

function ContactCard({
  contact,
  handlers,
  uiState,
  displayMode,
  selectionMode,
  isSelected,
  onToggleSelection,
}) {
  const {
    editingContact,
    detailedContactId,
    addingNoteToContactId,
    editingNote,
  } = uiState;
  const {
    handleCheckIn,
    handleToggleDetails,
    handleTagAdded,
    handleRemoveTag,
    handleEditContactClick,
    handleEditingContactChange, // Get the new handler
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
  // FIX: Remove the local editing state. The `editingContact` prop is now the source of truth.
  // const [editingContactState, setEditingContactState] = useState(null);

  // Add a guard clause for a null contact prop to prevent crashes.
  if (!contact) {
    return null;
  }

  const overdue = isOverdue(contact);
  const isEditingThisContact =
    editingContact && editingContact.id === contact.id;
  const isExpanded = detailedContactId === contact.id;
  const isAddingNote = addingNoteToContactId === contact.id;

  const getNextCheckinDisplay = () => {
    const isSnoozed =
      contact.snooze_until && new Date(contact.snooze_until) > new Date();
    if (isSnoozed) {
      const snoozeDateUTC = new Date(contact.snooze_until);
      const localSnoozeDate = new Date(
        snoozeDateUTC.valueOf() + snoozeDateUTC.getTimezoneOffset() * 60000
      );
      return localSnoozeDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (!contact.last_checkin) return "N/A";
    const lastCheckinDate = new Date(contact.last_checkin);
    const nextCheckinDate = new Date(lastCheckinDate);
    nextCheckinDate.setDate(
      lastCheckinDate.getDate() + contact.checkin_frequency
    );
    const today = new Date();
    if (
      nextCheckinDate.getFullYear() === today.getFullYear() &&
      nextCheckinDate.getMonth() === today.getMonth() &&
      nextCheckinDate.getDate() === today.getDate()
    ) {
      return "Today";
    }
    return nextCheckinDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };
  const nextCheckinDisplay = getNextCheckinDisplay();

  const lastCheckinDate = new Date(contact.last_checkin);
  const now = new Date();
  let lastCheckinDisplay;

  if (lastCheckinDate > now) {
    lastCheckinDisplay = `Starting on ${lastCheckinDate.toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric" }
    )}`;
  } else {
    lastCheckinDisplay = `${daysSince(contact.last_checkin)} day(s) ago`;
  }

  const onUpdateContactSubmit = (e) => {
    e.preventDefault();
    // FIX: This now calls the simplified handler in App.jsx
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

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelection(contact.id);
    } else if (!isEditingThisContact) {
      handleToggleDetails(contact.id);
    }
  };

  if (displayMode === "grid") {
    return (
      <div
        className={`card contact-item-grid ${overdue ? "overdue" : ""} ${
          isSelected ? "selected" : ""
        }`}
        onClick={handleCardClick}
      >
        <div
          className="selection-checkbox-container grid-checkbox"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(contact.id);
          }}
        >
          <div className={`checkbox ${isSelected ? "checked" : ""}`}></div>
        </div>
        <button
          className="pin-button grid-pin-button"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePin(contact.id);
          }}
          disabled={selectionMode}
        >
          {contact.is_pinned ? "★" : "☆"}
        </button>
        <h3>{contact.name}</h3>
        <p>Next check-in:</p>
        <strong>{nextCheckinDisplay}</strong>
        {contact.birthday && (
          <p className="grid-birthday">🎂 {formatBirthday(contact.birthday)}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`card contact-item ${overdue ? "overdue" : ""} ${
        isSelected ? "selected" : ""
      }`}
    >
      {isEditingThisContact ? (
        // FIX: The form now binds directly to the `editingContact` prop from App.jsx
        // and uses the `handleEditingContactChange` handler.
        <form onSubmit={onUpdateContactSubmit} className="contact-edit-form">
          <input
            name="name"
            value={editingContact.name}
            onChange={handleEditingContactChange}
          />
          <input
            name="how_we_met"
            value={editingContact.how_we_met}
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
            value={editingContact.key_facts}
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
                new Date(editingContact.last_checkin)
                  .toISOString()
                  .split("T")[0]
              }
              onChange={handleEditingContactChange}
            />
          </div>
          <div className="form-actions">
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
          <div className="contact-header" onClick={handleCardClick}>
            <div className="contact-title-wrapper">
              <div
                className="selection-checkbox-container"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection(contact.id);
                }}
              >
                <div
                  className={`checkbox ${isSelected ? "checked" : ""}`}
                ></div>
              </div>
              <button
                className="pin-button"
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
            <div className="contact-header-actions">
              {overdue && (
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
              <div className="header-buttons">
                <button
                  className="button-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckIn(contact.id);
                  }}
                  disabled={selectionMode}
                >
                  Just Checked In!
                </button>
                <button
                  className="expand-collapse-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDetails(contact.id);
                  }}
                  aria-expanded={isExpanded}
                  disabled={selectionMode}
                >
                  {isExpanded ? "Hide Details" : "Show Details"}
                  <span className={`arrow ${isExpanded ? "expanded" : ""}`}>
                    ▼
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="checkin-status-line">
            <p>
              Last checked in: <strong>{lastCheckinDisplay}</strong> · Next:{" "}
              <strong>{nextCheckinDisplay}</strong>
            </p>
          </div>

          {isExpanded && (
            <div className="contact-details-expanded">
              <div className="contact-details">
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
                <p className="frequency-detail">
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
              <div className="notes-section">
                {isAddingNote && (
                  <div className="add-note-form">
                    <textarea
                      placeholder="Add a new note..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                    />
                    <div className="add-note-actions">
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
                    <div key={note.id} className="note">
                      {editingNote && editingNote.id === note.id ? (
                        <div className="note-edit-view">
                          <textarea
                            value={editingNoteContent}
                            onChange={(e) =>
                              setEditingNoteContent(e.target.value)
                            }
                          />
                          <div className="note-actions">
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
                        <div className="note-display-view">
                          <p>{note.content}</p>
                          <div className="note-footer">
                            <small>
                              Created:{" "}
                              {new Date(note.created_at).toLocaleString()}
                              {note.modified_at && (
                                <span className="modified-date">
                                  &nbsp;· Edited:{" "}
                                  {new Date(note.modified_at).toLocaleString()}
                                </span>
                              )}
                            </small>
                            <button
                              className="edit-button"
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

          <div className="contact-footer">
            <button
              className="archive-button"
              onClick={(e) => {
                e.stopPropagation();
                handleArchiveContact(contact.id);
              }}
              disabled={selectionMode}
            >
              Archive
            </button>
            <div className="footer-right-actions">
              <button
                className="edit-contact-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditContactClick(contact);
                }}
                disabled={selectionMode}
              >
                Edit Contact
              </button>
              <button
                className="add-note-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAddNoteForm(
                    contact.id === addingNoteToContactId ? null : contact.id
                  );
                }}
                disabled={selectionMode}
              >
                Add Note
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ContactCard;
