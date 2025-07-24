import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { requestForToken } from './firebase';

const API_URL = 'http://localhost:3001/api';

function daysSince(dateString) {
  const today = new Date();
  const lastDate = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const diffTime = today - lastDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatBirthday(dateString) {
  if (!dateString || !dateString.includes('-')) return dateString;
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return adjustedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

function isOverdue(contact) {
    const now = new Date();
    if (contact.snooze_until && new Date(contact.snooze_until) > now) {
        return false;
    }
    const daysSinceCheckin = daysSince(contact.lastCheckin);
    return daysSinceCheckin > contact.checkinFrequency;
}

function calculateNextCheckinDate(lastCheckin, frequency) {
    const lastDate = new Date(lastCheckin);
    lastDate.setDate(lastDate.getDate() + frequency);
    return lastDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

function TagInput({ contact, onTagAdded }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/tags`).then(res => {
      if (res.data.tags) setAllTags(res.data.tags);
    });
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (value) {
      const existingContactTagIds = contact.tags.map(t => t.id);
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(value.toLowerCase()) &&
        !existingContactTagIds.includes(tag.id)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleAddTag = (tagName) => {
    if (!tagName) return;
    axios.post(`${API_URL}/contacts/${contact.id}/tags`, { tagName })
      .then(res => {
        onTagAdded(res.data);
        setInputValue('');
        setSuggestions([]);
      });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleAddTag(inputValue.trim());
  };

  return (
    <div className="tag-input-container">
      <form onSubmit={handleFormSubmit}>
        <input 
          type="text" 
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Add a tag..."
          className="tag-input"
        />
      </form>
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map(tag => (
            <li key={tag.id} onClick={() => handleAddTag(tag.name)}>
              {tag.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  const [contacts, setContacts] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [newContact, setNewContact] = useState({
    firstName: '', checkinFrequency: 7, howWeMet: '', keyFacts: '', birthday: ''
  });
  const [expandedContactId, setExpandedContactId] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [addingNoteToContactId, setAddingNoteToContactId] = useState(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  
  const [sortBy, setSortBy] = useState('newestFirst');
  const [sortDirection, setSortDirection] = useState('desc');
  const [allTags, setAllTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState('');

  const [view, setView] = useState('active');
  const [archivedContacts, setArchivedContacts] = useState([]);
  const [snoozingContactId, setSnoozingContactId] = useState(null);

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [debouncedGlobalSearch] = useDebounce(globalSearchTerm, 300);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  useEffect(() => {
    requestForToken();
    axios.get(`${API_URL}/contacts`).then(res => setContacts(res.data.contacts.map(c => ({ ...c, notes: [], tags: c.tags || [] }))));
    axios.get(`${API_URL}/tags`).then(res => setAllTags(res.data.tags || []));
  }, []);

  useEffect(() => {
    if (debouncedGlobalSearch) {
        axios.get(`${API_URL}/search?q=${debouncedGlobalSearch}`)
            .then(res => setSearchResults(res.data.results));
    } else {
        setSearchResults(null);
    }
  }, [debouncedGlobalSearch]);

  const filteredAndSortedContacts = useMemo(() => {
    let displayedContacts = [...contacts];

    if (activeSearchFilter && searchResults) {
        const contactIdsFromSearch = new Set();
        searchResults.contacts.forEach(c => contactIdsFromSearch.add(c.id));
        searchResults.notes.forEach(n => contactIdsFromSearch.add(n.contactId));
        displayedContacts = contacts.filter(c => contactIdsFromSearch.has(c.id));
    } 
    else if (selectedTagId) {
        displayedContacts = contacts.filter(contact =>
            contact.tags.some(tag => tag.id === parseInt(selectedTagId))
        );
    }

    const getDaysUntilDue = (c) => daysSince(c.lastCheckin) - c.checkinFrequency;
    switch (sortBy) {
      case 'closestCheckin':
        displayedContacts.sort((a, b) => getDaysUntilDue(b) - getDaysUntilDue(a));
        break;
      case 'mostOverdue':
        displayedContacts.sort((a, b) => getDaysUntilDue(a) - getDaysUntilDue(b));
        break;
      case 'nameAZ':
        displayedContacts.sort((a, b) => a.firstName.localeCompare(b.firstName));
        break;
      case 'newestFirst':
        displayedContacts.sort((a, b) => b.id - a.id);
        break;
      default: break;
    }
    if (sortDirection === 'asc') {
        displayedContacts.reverse();
    }
    return displayedContacts;
  }, [contacts, activeSearchFilter, searchResults, selectedTagId, sortBy, sortDirection]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearchFilter(globalSearchTerm);
    setIsSearchFocused(false);
  };

  const handleClearSearch = () => {
    setGlobalSearchTerm('');
    setActiveSearchFilter('');
    setSearchResults(null);
  };

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const handleNewContactChange = (e) => setNewContact(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAddContact = (e) => { e.preventDefault(); if (!newContact.firstName.trim()) return; axios.post(`${API_URL}/contacts`, newContact).then(res => { setContacts([...contacts, { ...res.data, notes: [], tags: [] }]); setNewContact({ firstName: '', checkinFrequency: 7, howWeMet: '', keyFacts: '', birthday: '' }); }); };
  const handleCheckIn = (id) => { axios.post(`${API_URL}/contacts/${id}/checkin`).then(res => setContacts(contacts.map(c => c.id === id ? { ...c, lastCheckin: res.data.lastCheckin, snooze_until: null } : c))); };
  const handleEditContactClick = (contact) => setEditingContact({ ...contact });
  const handleCancelEditContact = () => setEditingContact(null);
  const handleEditingContactChange = (e) => setEditingContact(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleUpdateContact = (e) => { e.preventDefault(); axios.put(`${API_URL}/contacts/${editingContact.id}`, editingContact).then(() => { setContacts(contacts.map(c => c.id === editingContact.id ? editingContact : c)); setEditingContact(null); }); };
  const handleToggleNotesList = (contactId) => { const newId = expandedContactId === contactId ? null : contactId; setExpandedContactId(newId); if (newId === null) setAddingNoteToContactId(null); if (newId !== null) { const contact = contacts.find(c => c.id === contactId); if (contact && contact.notes.length === 0) { axios.get(`${API_URL}/contacts/${contactId}/notes`).then(res => setContacts(cs => cs.map(c => c.id === contactId ? { ...c, notes: res.data.notes } : c))); } } };
  const handleToggleAddNoteForm = (contactId) => { setAddingNoteToContactId(curr => (curr === contactId ? null : contactId)); if (expandedContactId !== contactId) handleToggleNotesList(contactId); };
  const handleSaveNote = (contactId) => { if (!newNoteContent.trim()) return; axios.post(`${API_URL}/contacts/${contactId}/notes`, { content: newNoteContent }).then(res => { const newNote = res.data; setContacts(cs => cs.map(c => c.id === contactId ? { ...c, notes: [newNote, ...c.notes] } : c)); setNewNoteContent(''); setAddingNoteToContactId(null); }); };
  const handleEditNoteClick = (note) => setEditingNote({ id: note.id, content: note.content });
  const handleCancelEditNote = () => setEditingNote(null);
  const handleUpdateNote = (contactId, noteId) => { axios.put(`${API_URL}/notes/${noteId}`, { content: editingNote.content }).then(res => { setContacts(cs => cs.map(c => { if (c.id === contactId) { const updatedNotes = c.notes.map(n => n.id === noteId ? { ...n, content: editingNote.content, modifiedAt: res.data.modifiedAt } : n); return { ...c, notes: updatedNotes }; } return c; })); setEditingNote(null); }); };
  const handleTagAdded = (contactId, newTag) => { setContacts(cs => cs.map(c => c.id === contactId ? { ...c, tags: [...c.tags, newTag] } : c)); };
  const handleRemoveTag = (contactId, tagId) => { axios.delete(`${API_URL}/contacts/${contactId}/tags/${tagId}`).then(() => { setContacts(cs => cs.map(c => { if (c.id === contactId) return { ...c, tags: c.tags.filter(t => t.id !== tagId) }; return c; })); }); };
  const toggleSortDirection = () => { setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc')); };
  const handleViewArchived = () => { axios.get(`${API_URL}/contacts/archived`).then(res => { setArchivedContacts(res.data.contacts || []); setView('archived'); }); };
  const handleViewActive = () => { setView('active'); };
  const handleArchiveContact = (contactId) => { axios.put(`${API_URL}/contacts/${contactId}/archive`).then(() => { const contactToArchive = contacts.find(c => c.id === contactId); if (contactToArchive) { setArchivedContacts([...archivedContacts, contactToArchive]); } setContacts(contacts.filter(c => c.id !== contactId)); }); };
  const handleRestoreContact = (contactId) => { axios.put(`${API_URL}/contacts/${contactId}/restore`).then(() => { const contactToRestore = archivedContacts.find(c => c.id === contactId); setArchivedContacts(archivedContacts.filter(c => c.id !== contactId)); if (contactToRestore) { setContacts([...contacts, { ...contactToRestore, notes: [], tags: contactToRestore.tags || [] }]); } }); };
  const handleDeletePermanently = (contactId) => { axios.delete(`${API_URL}/contacts/${contactId}`).then(() => { setArchivedContacts(archivedContacts.filter(c => c.id !== contactId)); }); };
  const handleSnooze = (contactId, days) => { axios.put(`${API_URL}/contacts/${contactId}/snooze`, { snooze_days: days }).then(res => { setContacts(contacts.map(c => c.id === contactId ? { ...c, snooze_until: res.data.snooze_until } : c)); setSnoozingContactId(null); }); };
  const handleMakeOverdue = (contactId) => { axios.put(`${API_URL}/contacts/${contactId}/make-overdue`).then(res => { setContacts(contacts.map(c => c.id === contactId ? { ...c, lastCheckin: res.data.lastCheckin } : c)); }); };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Last Checked In 🎯</h1>
        <div className="header-actions">
          {view === 'active' ? (
              <button className="button-secondary" onClick={handleViewArchived}>View Archived ({archivedContacts.length})</button>
          ) : (
              <button className="button-secondary" onClick={handleViewActive}>View Active Contacts</button>
          )}
          <button className="theme-toggle-button" onClick={toggleTheme}>Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
        </div>
      </div>

      {view === 'active' ? (
        <>
          <form onSubmit={handleAddContact} className="card form-card">
            <h2>Add New Person</h2>
            <div className="form-grid">
              <input name="firstName" value={newContact.firstName} onChange={handleNewContactChange} placeholder="First Name" required />
              <input name="howWeMet" value={newContact.howWeMet} onChange={handleNewContactChange} placeholder="How we met" />
              <input type="date" name="birthday" value={newContact.birthday} onChange={handleNewContactChange} className="full-width-field" />
              <textarea name="keyFacts" value={newContact.keyFacts} onChange={handleNewContactChange} placeholder="Key facts (e.g., loves dogs)" />
              <div className="remind-me-container">
                <label>Remind me every</label>
                <input type="number" name="checkinFrequency" value={newContact.checkinFrequency} onChange={handleNewContactChange} min="1"/>
                <label>days</label>
              </div>
            </div>
            <button type="submit" className="button-primary">Add Contact</button>
          </form>

          <div className="card filter-controls">
            <form className="search-container" onSubmit={handleSearchSubmit}>
                <input
                    type="text"
                    placeholder="Search contacts and notes..."
                    value={globalSearchTerm}
                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="search-input"
                />
                {activeSearchFilter && <button type="button" className="clear-search-button" onClick={handleClearSearch}>X</button>}
                {isSearchFocused && searchResults && (
                    <div className="search-results">
                        {searchResults.contacts.length > 0 && (
                            <div className="results-section"><h4>Contacts</h4><ul>{searchResults.contacts.map(c => <li key={`c-${c.id}`} onMouseDown={() => { setGlobalSearchTerm(c.firstName); setActiveSearchFilter(c.firstName); }}>{c.firstName}</li>)}</ul></div>
                        )}
                        {searchResults.notes.length > 0 && (
                            <div className="results-section"><h4>Notes</h4><ul>{searchResults.notes.map(n => <li key={`n-${n.id}`} onMouseDown={() => { setGlobalSearchTerm(n.content); setActiveSearchFilter(n.content); }}>"{n.content.substring(0, 30)}..."<span className="note-contact-name">({n.contactFirstName})</span></li>)}</ul></div>
                        )}
                        {searchResults.contacts.length === 0 && searchResults.notes.length === 0 && debouncedGlobalSearch && (
                            <p className="no-results">No results found.</p>
                        )}
                    </div>
                )}
            </form>
            <div className="sort-controls">
              <select className="sort-dropdown" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newestFirst">Sort by: Date Added</option>
                <option value="closestCheckin">Sort by: Closest Check-in</option>
                <option value="mostOverdue">Sort by: Most Overdue</option>
                <option value="nameAZ">Sort by: Name (A-Z)</option>
              </select>
              <button className="sort-direction-button" onClick={toggleSortDirection} title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            <select className="tag-filter-dropdown" value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}>
                <option value="">Filter by Tag: All</option>
                {allTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
            </select>
          </div>

          <div>
            <h2>My People</h2>
            {filteredAndSortedContacts.map(contact => {
              const overdue = isOverdue(contact);
              const isEditingThisContact = editingContact && editingContact.id === contact.id;
              const isExpanded = expandedContactId === contact.id;
              const isAddingNote = addingNoteToContactId === contact.id;

              return (
                <div key={contact.id} className={`card contact-item ${overdue ? 'overdue' : ''}`}>
                  {isEditingThisContact ? (
                    <form onSubmit={handleUpdateContact} className="contact-edit-form">
                      <input name="firstName" value={editingContact.firstName} onChange={handleEditingContactChange} />
                      <input name="howWeMet" value={editingContact.howWeMet} onChange={handleEditingContactChange} placeholder="How we met" />
                      <input type="date" name="birthday" value={editingContact.birthday} onChange={handleEditingContactChange} />
                      <textarea name="keyFacts" value={editingContact.keyFacts} onChange={handleEditingContactChange} placeholder="Key facts" />
                      <div>
                        <label>Remind every</label>
                        <input type="number" name="checkinFrequency" value={editingContact.checkinFrequency} onChange={handleEditingContactChange} min="1"/>
                        <label>days</label>
                      </div>
                      <div className="form-actions">
                        <button type="submit">Save Changes</button>
                        <button type="button" className="cancel-button" onClick={handleCancelEditContact}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="contact-header">
                        <h3>{contact.firstName}</h3>
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
                      </div>
                      <button className="expand-collapse-button" onClick={() => handleToggleNotesList(contact.id)} aria-expanded={isExpanded}>
                        {isExpanded ? 'Hide Notes' : 'Show Notes'}
                        <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                      </button>
                      <p>
                        Last checked in: <strong>{daysSince(contact.lastCheckin)} day(s) ago</strong>.
                        <button className="dev-button" onClick={() => handleMakeOverdue(contact.id)}>(Test: Make Overdue)</button>
                      </p>
                      <p>Next check-in: <strong>{calculateNextCheckinDate(contact.lastCheckin, contact.checkinFrequency)}</strong></p>
                      {contact.snooze_until && new Date(contact.snooze_until) > new Date() && (
                        <p className="snooze-info">Snoozed until: <strong>{new Date(contact.snooze_until).toLocaleString()}</strong></p>
                      )}
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
                            <button onClick={() => handleSaveNote(contact.id)}>Save Note</button>
                          </div>
                        )}
                        {isExpanded && (
                          <div className="notes-content">
                            {contact.notes.map(note => (
                              <div key={note.id} className="note">
                                {editingNote && editingNote.id === note.id ? (
                                  <div className="note-edit-view">
                                    <textarea value={editingNote.content} onChange={(e) => setEditingNote(prev => ({...prev, content: e.target.value}))} />
                                    <div className="note-actions">
                                      <button onClick={() => handleUpdateNote(contact.id, note.id)}>Save</button>
                                      <button className="cancel-button" onClick={handleCancelEditNote}>Cancel</button>
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
                                      <button className="edit-button" onClick={() => handleEditNoteClick(note)}>Edit</button>
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
                            <button className="edit-contact-button" onClick={() => handleEditContactClick(contact)}>Edit Contact</button>
                            <button className="add-note-button" onClick={() => handleToggleAddNoteForm(contact.id)}>Add Note</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="archived-list">
            <h2>Archived Contacts</h2>
            {archivedContacts.map(contact => (
                <div key={contact.id} className="card archived-item">
                    <span>{contact.firstName}</span>
                    <div className="archived-actions">
                        <button className="button-secondary" onClick={() => handleRestoreContact(contact.id)}>Restore</button>
                        <button className="delete-button" onClick={() => handleDeletePermanently(contact.id)}>Delete Permanently</button>
                    </div>
                </div>
            ))}
            {archivedContacts.length === 0 && <p>No archived contacts.</p>}
        </div>
      )}
    </div>
  );
}

export default App;
