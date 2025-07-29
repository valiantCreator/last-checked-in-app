import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { requestForToken } from './firebase';
import Header from './components/Header.jsx';
import AddContactForm from './components/AddContactForm.jsx';
import ContactCard from './components/ContactCard.jsx';
import ArchivedView from './components/ArchivedView.jsx';
import { daysSince, isOverdue } from './utils.js';
import { API_URL } from './apiConfig.js';

function App() {
  const [contacts, setContacts] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [sortBy, setSortBy] = useState('newestFirst');
  const [sortDirection, setSortDirection] = useState('desc');
  const [allTags, setAllTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState('');
  const [view, setView] = useState('active');
  const [archivedContacts, setArchivedContacts] = useState([]);
  
  const [expandedContactId, setExpandedContactId] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [addingNoteToContactId, setAddingNoteToContactId] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [snoozingContactId, setSnoozingContactId] = useState(null);

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [debouncedGlobalSearch] = useDebounce(globalSearchTerm, 300);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState('');

  const [displayMode, setDisplayMode] = useState('list');

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

  const handleAddContact = (newContactData) => {
    setContacts(c => [...c, newContactData]);
  };
  const handleCheckIn = (id) => {
    axios.post(`${API_URL}/contacts/${id}/checkin`)
      .then(res => setContacts(contacts.map(c => c.id === id ? { ...c, lastCheckin: res.data.lastCheckin, snooze_until: null } : c)));
  };
  const handleUpdateContact = (updatedContact) => {
    axios.put(`${API_URL}/contacts/${updatedContact.id}`, updatedContact)
      .then(() => {
        setContacts(contacts.map(c => c.id === updatedContact.id ? updatedContact : c));
        setEditingContact(null);
      });
  };
  const handleToggleNotesList = (contactId) => {
    const newId = expandedContactId === contactId ? null : contactId;
    setExpandedContactId(newId);
    if (newId === null) setAddingNoteToContactId(null);
    if (newId !== null) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact && contact.notes.length === 0) {
        axios.get(`${API_URL}/contacts/${contactId}/notes`)
          .then(res => setContacts(cs => cs.map(c => c.id === contactId ? { ...c, notes: res.data.notes } : c)));
      }
    }
  };
  const handleSaveNote = (contactId, newNoteContent) => {
    if (!newNoteContent.trim()) return;
    axios.post(`${API_URL}/contacts/${contactId}/notes`, { content: newNoteContent })
      .then(res => {
        const newNote = res.data;
        setContacts(cs => cs.map(c => c.id === contactId ? { ...c, notes: [newNote, ...c.notes] } : c));
        setAddingNoteToContactId(null);
      });
  };
  const handleUpdateNote = (contactId, noteId, newContent) => {
    axios.put(`${API_URL}/notes/${noteId}`, { content: newContent })
      .then(res => {
        setContacts(cs => cs.map(c => {
          if (c.id === contactId) {
            const updatedNotes = c.notes.map(n => n.id === noteId ? { ...n, content: newContent, modifiedAt: res.data.modifiedAt } : n);
            return { ...c, notes: updatedNotes };
          }
          return c;
        }));
        setEditingNote(null);
      });
  };
  const handleTagAdded = (contactId, newTag) => {
    setContacts(cs => cs.map(c => c.id === contactId ? { ...c, tags: [...c.tags, newTag] } : c));
  };
  const handleRemoveTag = (contactId, tagId) => {
    axios.delete(`${API_URL}/contacts/${contactId}/tags/${tagId}`)
      .then(() => {
        setContacts(cs => cs.map(c => {
          if (c.id === contactId) return { ...c, tags: c.tags.filter(t => t.id !== tagId) };
          return c;
        }));
        axios.get(`${API_URL}/tags`).then(res => setAllTags(res.data.tags || []));
      });
  };
  const handleViewArchived = () => {
    axios.get(`${API_URL}/contacts/archived`).then(res => {
        setArchivedContacts(res.data.contacts || []);
        setView('archived');
    });
  };
  const handleArchiveContact = (contactId) => {
    axios.put(`${API_URL}/contacts/${contactId}/archive`).then(() => {
        const contactToArchive = contacts.find(c => c.id === contactId);
        if (contactToArchive) {
            setArchivedContacts([...archivedContacts, contactToArchive]);
        }
        setContacts(contacts.filter(c => c.id !== contactId));
    });
  };
  const handleRestoreContact = (contactId) => {
    axios.put(`${API_URL}/contacts/${contactId}/restore`).then(() => {
        const contactToRestore = archivedContacts.find(c => c.id === contactId);
        setArchivedContacts(archivedContacts.filter(c => c.id !== contactId));
        if (contactToRestore) {
            setContacts([...contacts, { ...contactToRestore, notes: [], tags: contactToRestore.tags || [] }]);
        }
    });
  };
  const handleDeletePermanently = (contactId) => {
    axios.delete(`${API_URL}/contacts/${contactId}`).then(() => {
        setArchivedContacts(archivedContacts.filter(c => c.id !== contactId));
    });
  };
  const handleSnooze = (contactId, days) => {
    axios.put(`${API_URL}/contacts/${contactId}/snooze`, { snooze_days: days }).then(res => {
        setContacts(contacts.map(c => c.id === contactId ? { ...c, snooze_until: res.data.snooze_until } : c));
        setSnoozingContactId(null);
    });
  };
  const handleMakeOverdue = (contactId) => {
    axios.put(`${API_URL}/contacts/${contactId}/make-overdue`).then(res => {
        setContacts(contacts.map(c => c.id === contactId ? { ...c, lastCheckin: res.data.lastCheckin } : c));
    });
  };

  const handlers = {
    handleCheckIn, handleToggleNotesList, handleMakeOverdue, handleTagAdded, handleRemoveTag,
    handleEditContactClick: setEditingContact, handleArchiveContact, handleToggleAddNoteForm: setAddingNoteToContactId,
    handleSaveNote, handleUpdateNote, handleEditNoteClick: setEditingNote, handleCancelEditNote: () => setEditingNote(null),
    setSnoozingContactId, handleSnooze, handleUpdateContact, handleCancelEditContact: () => setEditingContact(null)
  };
  const uiState = {
    editingContact, expandedContactId, addingNoteToContactId, editingNote, snoozingContactId
  };

  return (
    <div className="app-container">
      <Header 
        view={view} 
        archivedContacts={archivedContacts} 
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
        onViewActive={() => setView('active')}
        onViewArchived={handleViewArchived}
      />

      {view === 'active' ? (
        <>
          <div className="content-wrapper">
            <AddContactForm onContactAdded={handleAddContact} />
            
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
                <button className="sort-direction-button" onClick={() => setSortDirection(sd => sd === 'asc' ? 'desc' : 'asc')} title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
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

            <div className="view-controls">
              <h2>My People</h2>
              <div className="view-toggle-buttons">
                  <button className={displayMode === 'list' ? 'active' : ''} onClick={() => setDisplayMode('list')}>List</button>
                  <button className={displayMode === 'grid' ? 'active' : ''} onClick={() => setDisplayMode('grid')}>Grid</button>
              </div>
            </div>
          </div>
          
          <div className={`contacts-container ${displayMode}`}>
            {filteredAndSortedContacts.map(contact => (
              <ContactCard 
                key={contact.id} 
                contact={contact} 
                handlers={handlers} 
                uiState={uiState}
                displayMode={displayMode}
              />
            ))}
          </div>
        </>
      ) : (
        <ArchivedView 
            archivedContacts={archivedContacts} 
            onRestore={handleRestoreContact}
            onDeletePermanently={handleDeletePermanently}
        />
      )}
    </div>
  );
}

export default App;
