import React, { useState } from 'react';
import { isOverdue, formatBirthday, calculateNextCheckinDate, daysSince } from '../utils.js';
import TagInput from './TagInput.jsx';

function ContactCard({ 
  contact,
  handlers,
  uiState,
  displayMode
}) {
  const { editingContact, expandedContactId, addingNoteToContactId, editingNote, snoozingContactId } = uiState;
  const {
    handleCheckIn,
    handleToggleNotesList,
    handleMakeOverdue,
    handleTagAdded,
    handleRemoveTag,
    handleEditContactClick,
    handleArchiveContact,
    handleToggleAddNoteForm,
    handleSaveNote,
    handleUpdateNote,
    handleEditNoteClick,
    handleCancelEditNote,
    setSnoozingContactId,
    handleSnooze,
    handleUpdateContact,
    handleCancelEditContact
  } = handlers;

  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingContactState, setEditingContactState] = useState(null);

  const overdue = isOverdue(contact);
  const isEditingThisContact = editingContact && editingContact.id === contact.id;
  const isExpanded = expandedContactId === contact.id;
  const isAddingNote = addingNoteToContactId === contact.id;

  // --- NEW: Logic to determine what to display for the next check-in date ---
  const getNextCheckinDisplay = () => {
    const isSnoozed = contact.snooze_until && new Date(contact.snooze_until) > new Date();
    if (isSnoozed) {
      return new Date(contact.snooze_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    const nextCheckinDate = new Date(contact.lastCheckin);
    nextCheckinDate.setDate(nextCheckinDate.getDate() + contact.checkinFrequency);
    
    const today = new Date();
    // Compare year, month, and day, ignoring the time
    if (nextCheckinDate.getFullYear() === today.getFullYear() &&
        nextCheckinDate.getMonth() === today.getMonth() &&
        nextCheckinDate.getDate() === today.getDate()) {
      return 'Today';
    }

    return calculateNextCheckinDate(contact.lastCheckin, contact.checkinFrequency);
  };
  const nextCheckinDisplay = getNextCheckinDisplay();
  // --- END NEW LOGIC ---

  const startEditingContact = () => {
    setEditingContactState({ ...contact });
    handleEditContactClick(contact);
  };

  const onEditingContactChange = (e) => {
    setEditingContactState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const onUpdateContactSubmit = (e) => {
      e.preventDefault();
      handleUpdateContact(editingContactState);
  };

  const startEditingNote = (note) => {
    setEditingNoteContent(note.content);
    handleEditNoteClick(note);
  };

  const onSaveNote = () => {
    handleSaveNote(contact.id, newNoteContent);
    setNewNoteContent('');
  };

  const onUpdateNote = (noteId) => {
    handleUpdateNote(contact.id, noteId, editingNoteContent);
  };

  // --- GRID VIEW RENDER ---
  if (displayMode === 'grid') {
    return (
        <div className={`card contact-item-grid ${overdue ? 'overdue' : ''}`}>
            <h3>{contact.firstName}</h3>
            <p>Next check-in:</p>
            <strong>{nextCheckinDisplay}</strong>
            {contact.birthday && <p className="grid-birthday">🎂 {formatBirthday(contact.birthday)}</p>}
        </div>
    );
  }

  // --- LIST VIEW RENDER (DEFAULT) ---
  return (
    <div className={`card contact-item ${overdue ? 'overdue' : ''}`}>
      {isEditingThisContact ? (
        <form onSubmit={onUpdateContactSubmit} className="contact-edit-form">
          <input name="firstName" value={editingContactState.firstName} onChange={onEditingContactChange} />
          <input name="howWeMet" value={editingContactState.howWeMet} onChange={onEditingContactChange} placeholder="How we met" />
          <input type="date" name="birthday" value={editingContactState.birthday} onChange={onEditingContactChange} />
          <textarea name="keyFacts" value={editingContactState.keyFacts} onChange={onEditingContactChange} placeholder="Key facts" />
          <div>
            <label>Remind every</label>
            <input type="number" name="checkinFrequency" value={editingContactState.checkinFrequency} onChange={onEditingContactChange} min="1"/>
            <label>days</label>
          </div>
          <div className="form-actions">
            <button type="submit" className="button-primary">Save Changes</button>
            <button type="button" className="button-secondary" onClick={handleCancelEditContact}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="contact-header">
            <h3>{contact.firstName}</h3>
            <div className="contact-header-actions">
              <div className="header-buttons">
                {overdue && (
                  <div className="snooze-container">
                    <button className="button-secondary" onClick={() => setSnoozingContactId(snoozingContactId === contact.id ? null : contact.id)}>Snooze</button>
                    {snoozingContactId === contact.id && (
                        <div className="snooze-options">
                            <button onClick={() => handleSnooze(contact.id, 1)}>Tomorrow</button>
                            <button onClick={() => handleSnooze(contact.id, 3)}>In 3 days</button>
                            <button onClick={() => handleSnooze(contact.id, 7)}>In 1 week</button>
                        </div>
                    )}
                  </div>
                )}
                <button className="button-primary" onClick={() => handleCheckIn(contact.id)}>Just Checked In!</button>
              </div>
              <button className="expand-collapse-button" onClick={() => handleToggleNotesList(contact.id)} aria-expanded={isExpanded}>
                {isExpanded ? 'Hide Notes' : 'Show Notes'}
                <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
              </button>
            </div>
          </div>
          
          <p>
            Last checked in: <strong>{daysSince(contact.lastCheckin)} day(s) ago</strong>.
            <button className="dev-button" onClick={() => handleMakeOverdue(contact.id)}>(Test: Make Overdue)</button>
          </p>
          <p>Next check-in: <strong>{nextCheckinDisplay}</strong></p>

          <div className="tags-container">
            {contact.tags && contact.tags.map(tag => (
              <span key={tag.id} className="tag-badge">
                {tag.name}
                <button onClick={() => handleRemoveTag(contact.id, tag.id)} className="remove-tag-btn">x</button>
              </span>
            ))}
          </div>
          <div className="contact-details">
            {contact.birthday && <p><strong>Birthday:</strong> {formatBirthday(contact.birthday)}</p>}
            {contact.howWeMet && <p><strong>How we met:</strong> {contact.howWeMet}</p>}
            {contact.keyFacts && <p><strong>Key facts:</strong> {contact.keyFacts}</p>}
          </div>
          <div className="notes-section">
            {isAddingNote && (
              <div className="add-note-form">
                <textarea placeholder="Add a new note..." value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} />
                <div className="add-note-actions">
                    <button className="button-primary" onClick={onSaveNote}>Save Note</button>
                    <button className="button-secondary" onClick={() => handleToggleAddNoteForm(null)}>Cancel</button>
                </div>
              </div>
            )}
            {isExpanded && (
              <div className="notes-content">
                {contact.notes.map(note => (
                  <div key={note.id} className="note">
                    {editingNote && editingNote.id === note.id ? (
                      <div className="note-edit-view">
                        <textarea value={editingNoteContent} onChange={(e) => setEditingNoteContent(e.target.value)} />
                        <div className="note-actions">
                          <button className="button-primary" onClick={() => onUpdateNote(note.id)}>Save</button>
                          <button className="button-secondary" onClick={handleCancelEditNote}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="note-display-view">
                        <p>{note.content}</p>
                        <div className="note-footer">
                          <small>
                            Created: {new Date(note.createdAt).toLocaleString()}
                            {note.modifiedAt && <span className="modified-date">&nbsp;· Edited: {new Date(note.modifiedAt).toLocaleString()}</span>}
                          </small>
                          <button className="edit-button" onClick={() => startEditingNote(note)}>Edit</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {contact.notes.length === 0 && !isAddingNote && <p>No notes yet.</p>}
              </div>
            )}
          </div>
          <div className="contact-footer">
            <button className="archive-button" onClick={() => handleArchiveContact(contact.id)}>Archive</button>
            {isExpanded && <TagInput contact={contact} onTagAdded={(newTag) => handleTagAdded(contact.id, newTag)} />}
            <div className="footer-right-actions">
                <button className="edit-contact-button" onClick={startEditingContact}>Edit Contact</button>
                <button className="add-note-button" onClick={() => handleToggleAddNoteForm(contact.id === addingNoteToContactId ? null : contact.id)}>Add Note</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ContactCard;
