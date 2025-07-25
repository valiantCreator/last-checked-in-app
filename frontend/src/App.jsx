// --- React and Library Imports ---
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
// --- Local File Imports ---
import { requestForToken } from './firebase'; // Handles push notification permissions
import Header from './components/Header.jsx';
import AddContactForm from './components/AddContactForm.jsx';
import FilterControls from './components/FilterControls.jsx';
import ContactCard from './components/ContactCard.jsx';
import ArchivedView from './components/ArchivedView.jsx';
import { daysSince, isOverdue } from './utils.js'; // also add .js here

// --- Global Constants ---
//OLD Const for local hosting: const API_URL = 'http://localhost:3001/api';
const API_URL = 'https://last-checked-in-api.onrender.com/api';

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
  const [searchTerm, setSearchTerm] = useState(''); // For the simple name filter in the filter controls

  // State for Child Component Interactions (passed down via props)
  const [expandedContactId, setExpandedContactId] = useState(null); // Which contact card's notes are expanded
  const [editingContact, setEditingContact] = useState(null); // Holds the contact object being edited
  const [addingNoteToContactId, setAddingNoteToContactId] = useState(null); // Which contact is showing the 'add note' form
  const [editingNote, setEditingNote] = useState(null); // Holds the note object being edited
  const [snoozingContactId, setSnoozingContactId] = useState(null); // Which contact is showing the snooze options

  // --- Effects ---

  // This effect applies the current theme to the entire HTML document.
  // It runs whenever the `theme` state changes.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // This effect runs once when the application first loads.
  // It fetches initial data: active contacts and all unique tags.
  useEffect(() => {
    requestForToken(); // Ask for push notification permission
    axios.get(`${API_URL}/contacts`).then(res => setContacts(res.data.contacts.map(c => ({ ...c, notes: [], tags: c.tags || [] }))));
    axios.get(`${API_URL}/tags`).then(res => setAllTags(res.data.tags || []));
  }, []);

  // This `useMemo` hook calculates the list of contacts to display.
  // It's memoized, meaning it only recalculates when one of its dependencies changes, improving performance.
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = [...contacts];

    // First, filter by the search term in the filter controls
    if (searchTerm) {
        filtered = filtered.filter(contact =>
            contact.firstName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Then, filter by the selected tag
    if (selectedTagId) {
        filtered = filtered.filter(contact =>
            contact.tags.some(tag => tag.id === parseInt(selectedTagId))
        );
    }

    // Helper function for sorting logic
    const getDaysUntilDue = (contact) => {
      const daysSinceCheckin = daysSince(contact.lastCheckin);
      return contact.checkinFrequency - daysSinceCheckin;
    };

    // Apply the current sorting method
    switch (sortBy) {
      case 'closestCheckin':
        filtered.sort((a, b) => getDaysUntilDue(a) - getDaysUntilDue(b));
        break;
      case 'mostOverdue':
        filtered.sort((a, b) => getDaysUntilDue(b) - getDaysUntilDue(a));
        break;
      case 'nameAZ':
        filtered.sort((a, b) => a.firstName.localeCompare(b.firstName));
        break;
      case 'newestFirst':
        filtered.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }

    // Finally, apply the sort direction
    if (sortDirection === 'asc') {
        filtered.reverse();
    }

    return filtered;
  }, [contacts, searchTerm, selectedTagId, sortBy, sortDirection]);

  // --- Handlers ---
  // These functions handle all user interactions and API calls.
  // They are defined in the parent `App` component and passed down to children as props.

  // Handles adding a new contact from the AddContactForm component
  const handleAddContact = (newContact) => {
    setContacts(c => [...c, newContact]);
  };

  // Handles the "Just Checked In!" button click
  const handleCheckIn = (id) => {
    axios.post(`${API_URL}/contacts/${id}/checkin`)
      .then(res => setContacts(contacts.map(c => c.id === id ? { ...c, lastCheckin: res.data.lastCheckin, snooze_until: null } : c)));
  };

  // Handles saving changes when editing a contact's details
  const handleUpdateContact = (updatedContact) => {
    axios.put(`${API_URL}/contacts/${updatedContact.id}`, updatedContact)
      .then(() => {
        setContacts(contacts.map(c => c.id === updatedContact.id ? updatedContact : c));
        setEditingContact(null); // Exit edit mode
      });
  };
  
  // Handles expanding/collapsing the notes section for a contact
  const handleToggleNotesList = (contactId) => {
    const newId = expandedContactId === contactId ? null : contactId;
    setExpandedContactId(newId);
    if (newId === null) setAddingNoteToContactId(null); // Close 'add note' form when collapsing
    if (newId !== null) {
      const contact = contacts.find(c => c.id === contactId);
      // Fetch notes only if they haven't been fetched before
      if (contact && contact.notes.length === 0) {
        axios.get(`${API_URL}/contacts/${contactId}/notes`)
          .then(res => setContacts(cs => cs.map(c => c.id === contactId ? { ...c, notes: res.data.notes } : c)));
      }
    }
  };

  // Handles saving a new note for a contact
  const handleSaveNote = (contactId, newNoteContent) => {
    if (!newNoteContent.trim()) return;
    axios.post(`${API_URL}/contacts/${contactId}/notes`, { content: newNoteContent })
      .then(res => {
        const newNote = res.data;
        setContacts(cs => cs.map(c => c.id === contactId ? { ...c, notes: [newNote, ...c.notes] } : c));
        setAddingNoteToContactId(null); // Hide 'add note' form
      });
  };

  // Handles saving an edited note
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
        setEditingNote(null); // Exit note edit mode
      });
  };

  // Handles adding a tag to a contact
  const handleTagAdded = (contactId, newTag) => {
    setContacts(cs => cs.map(c => c.id === contactId ? { ...c, tags: [...c.tags, newTag] } : c));
  };

  // Handles removing a tag from a contact
  const handleRemoveTag = (contactId, tagId) => {
    axios.delete(`${API_URL}/contacts/${contactId}/tags/${tagId}`)
      .then(() => {
        setContacts(cs => cs.map(c => {
          if (c.id === contactId) return { ...c, tags: c.tags.filter(t => t.id !== tagId) };
          return c;
        }));
      });
  };

  // Handles switching to the archived contacts view
  const handleViewArchived = () => {
    axios.get(`${API_URL}/contacts/archived`).then(res => {
        setArchivedContacts(res.data.contacts || []);
        setView('archived');
    });
  };

  // Handles archiving a contact
  const handleArchiveContact = (contactId) => {
    axios.put(`${API_URL}/contacts/${contactId}/archive`)
        .then(() => {
            const contactToArchive = contacts.find(c => c.id === contactId);
            if (contactToArchive) {
                setArchivedContacts([...archivedContacts, contactToArchive]);
            }
            setContacts(contacts.filter(c => c.id !== contactId));
        });
  };

  // Handles restoring a contact from the archive
  const handleRestoreContact = (contactId) => {
    axios.put(`${API_URL}/contacts/${contactId}/restore`)
        .then(() => {
            const contactToRestore = archivedContacts.find(c => c.id === contactId);
            setArchivedContacts(archivedContacts.filter(c => c.id !== contactId));
            if (contactToRestore) {
                setContacts([...contacts, { ...contactToRestore, notes: [], tags: contactToRestore.tags || [] }]);
            }
        });
  };

  // Handles permanently deleting a contact from the archive
  const handleDeletePermanently = (contactId) => {
    axios.delete(`${API_URL}/contacts/${contactId}`)
        .then(() => {
            setArchivedContacts(archivedContacts.filter(c => c.id !== contactId));
        });
  };

  // Handles snoozing a reminder for a contact
  const handleSnooze = (contactId, days) => {
    axios.put(`${API_URL}/contacts/${contactId}/snooze`, { snooze_days: days })
        .then(res => {
            setContacts(contacts.map(c => 
                c.id === contactId ? { ...c, snooze_until: res.data.snooze_until } : c
            ));
            setSnoozingContactId(null);
        });
  };

  // Handles the developer button to test the overdue status
  const handleMakeOverdue = (contactId) => {
    axios.put(`${API_URL}/contacts/${contactId}/make-overdue`)
        .then(res => {
            setContacts(contacts.map(c =>
                c.id === contactId ? { ...c, lastCheckin: res.data.lastCheckin } : c
            ));
        });
  };

  // --- Prop Bundling ---
  // These objects bundle up state and handlers to pass them down to child components cleanly.
  const handlers = {
    handleCheckIn,
    handleToggleNotesList,
    handleMakeOverdue,
    handleTagAdded,
    handleRemoveTag,
    handleEditContactClick: setEditingContact,
    handleArchiveContact,
    handleToggleAddNoteForm: setAddingNoteToContactId,
    handleSaveNote,
    handleUpdateNote,
    handleEditNoteClick: setEditingNote,
    handleCancelEditNote: () => setEditingNote(null),
    setSnoozingContactId,
    handleSnooze,
    handleUpdateContact,
    handleCancelEditContact: () => setEditingContact(null)
  };

  const uiState = {
    editingContact, expandedContactId, addingNoteToContactId, editingNote, snoozingContactId
  };

  // --- JSX Rendering ---
  return (
    <div className="app-container">
      <Header 
        view={view} 
        archivedContacts={archivedContacts} 
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
        onViewActive={() => setView('active')}
        onViewArchived={handleViewArchived}
      />

      {/* Conditionally render the main view or the archived view */}
      {view === 'active' ? (
        <>
          <AddContactForm onContactAdded={handleAddContact} />
          <FilterControls 
            allTags={allTags} 
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortDirection={sortDirection}
            onToggleSortDirection={() => setSortDirection(sd => sd === 'asc' ? 'desc' : 'asc')}
            selectedTagId={selectedTagId}
            onSelectedTagChange={setSelectedTagId}
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
