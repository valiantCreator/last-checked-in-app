// --- React and Library Imports ---
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDebounce } from 'use-debounce';

// --- Local File Imports ---
import { requestForToken } from './firebase'; // Handles push notification permissions
import Header from './components/Header.jsx';
import AddContactForm from './components/AddContactForm.jsx';
import FilterControls from './components/FilterControls.jsx';
import ContactCard from './components/ContactCard.jsx';
import ArchivedView from './components/ArchivedView.jsx';
import { daysSince, isOverdue } from './utils.js'; // Helper functions
import { API_URL } from './apiConfig.js'; // Centralized API URL

// --- Main Application Component ---
function App() {
  // --- State Management ---
  // Data State
  const [contacts, setContacts] = useState([]); // Holds the list of active contacts
  const [archivedContacts, setArchivedContacts] = useState([]); // Holds the list of archived contacts
  const [allTags, setAllTags] = useState([]); // Holds all unique tags for filter dropdowns

  // UI State
  const [theme, setTheme] = useState('dark'); // Manages 'light' or 'dark' mode
  const [view, setView] = useState('active'); // Toggles between 'active' and 'archived' views
  
  // Filtering and Sorting State
  const [sortBy, setSortBy] = useState('newestFirst'); // Current sort method
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [selectedTagId, setSelectedTagId] = useState(''); // ID of the tag to filter by
  
  // Global Search State
  const [globalSearchTerm, setGlobalSearchTerm] = useState(''); // The live text in the search input
  const [debouncedGlobalSearch] = useDebounce(globalSearchTerm, 300); // A debounced version of the search term to reduce API calls
  const [searchResults, setSearchResults] = useState(null); // The results returned from the search API
  const [isSearchFocused, setIsSearchFocused] = useState(false); // Is the user currently focused on the search bar?
  const [activeSearchFilter, setActiveSearchFilter] = useState(''); // The "locked-in" search term after submission

  // State for Child Component Interactions (passed down via props)
  const [expandedContactId, setExpandedContactId] = useState(null); // Which contact card's notes are expanded
  const [editingContact, setEditingContact] = useState(null); // Holds the contact object being edited
  const [addingNoteToContactId, setAddingNoteToContactId] = useState(null); // Which contact is showing the 'add note' form
  const [editingNote, setEditingNote] = useState(null); // Holds the note object being edited
  const [snoozingContactId, setSnoozingContactId] = useState(null); // Which contact is showing the snooze options

  // --- Effects ---

  // This effect applies the current theme to the entire HTML document.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // This effect runs once when the application first loads to fetch initial data.
  useEffect(() => {
    requestForToken(); // Ask for push notification permission
    axios.get(`${API_URL}/contacts`).then(res => setContacts(res.data.contacts.map(c => ({ ...c, notes: [], tags: c.tags || [] }))));
    axios.get(`${API_URL}/tags`).then(res => setAllTags(res.data.tags || []));
  }, []);

  // This effect runs whenever the debounced search term changes.
  // It calls the search API to get dropdown suggestions.
  useEffect(() => {
    if (debouncedGlobalSearch) {
        axios.get(`${API_URL}/search?q=${debouncedGlobalSearch}`)
            .then(res => setSearchResults(res.data.results));
    } else {
        setSearchResults(null);
    }
  }, [debouncedGlobalSearch]);

  // This `useMemo` hook calculates the final list of contacts to display.
  const filteredAndSortedContacts = useMemo(() => {
    let displayedContacts = [...contacts];

    // If a search is "locked in", it becomes the primary filter.
    if (activeSearchFilter && searchResults) {
        const contactIdsFromSearch = new Set();
        searchResults.contacts.forEach(c => contactIdsFromSearch.add(c.id));
        searchResults.notes.forEach(n => contactIdsFromSearch.add(n.contactId));
        displayedContacts = contacts.filter(c => contactIdsFromSearch.has(c.id));
    } 
    // Otherwise, filter by the selected tag.
    else if (selectedTagId) {
        displayedContacts = contacts.filter(contact =>
            contact.tags.some(tag => tag.id === parseInt(selectedTagId))
        );
    }

    // After filtering, apply the current sorting method.
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
    // Finally, apply the sort direction.
    if (sortDirection === 'asc') {
        displayedContacts.reverse();
    }
    return displayedContacts;
  }, [contacts, activeSearchFilter, searchResults, selectedTagId, sortBy, sortDirection]);

  // --- Handlers ---
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

  const handleGlobalSearchChange = (value, lockIn = false) => {
      setGlobalSearchTerm(value);
      if (lockIn) {
          setActiveSearchFilter(value);
      }
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
          <AddContactForm onContactAdded={handleAddContact} />
          <FilterControls 
            allTags={allTags} 
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortDirection={sortDirection}
            onToggleSortDirection={() => setSortDirection(sd => sd === 'asc' ? 'desc' : 'asc')}
            selectedTagId={selectedTagId}
            onSelectedTagChange={setSelectedTagId}
            globalSearchTerm={globalSearchTerm}
            onGlobalSearchChange={handleGlobalSearchChange}
            onSearchSubmit={handleSearchSubmit}
            isSearchFocused={isSearchFocused}
            onSearchFocus={() => setIsSearchFocused(true)}
            onSearchBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            searchResults={searchResults}
            onClearSearch={handleClearSearch}
            debouncedGlobalSearch={debouncedGlobalSearch}
          />
          <div>
            <h2>My People</h2>
            {filteredAndSortedContacts.map(contact => (
              <ContactCard 
                key={contact.id} 
                contact={contact} 
                handlers={handlers} 
                uiState={uiState}
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
