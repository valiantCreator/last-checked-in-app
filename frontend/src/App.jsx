import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { Toaster, toast } from 'react-hot-toast';
import { requestForToken } from './firebase';
import Header from './components/Header.jsx';
import AddContactForm from './components/AddContactForm.jsx';
import ContactCard from './components/ContactCard.jsx';
import ArchivedView from './components/ArchivedView.jsx';
import ExportCalendarModal from './components/ExportCalendarModal.jsx';
import { daysSince, isOverdue, calculateNextUpcomingCheckinDate, formatToICSDate, getNextBirthday } from './utils.js';
import { API_URL } from './apiConfig.js';

function App() {
  const [contacts, setContacts] = useState([]);
  
  // --- UPDATED: Theme state now initializes from localStorage ---
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [sortBy, setSortBy] = useState('newestFirst');
  const [sortDirection, setSortDirection] = useState('desc');
  const [allTags, setAllTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState('');
  const [view, setView] = useState('active');
  const [archivedContacts, setArchivedContacts] = useState([]);
  const [detailedContactId, setDetailedContactId] = useState(null);
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // --- UPDATED: This effect now also saves the theme to localStorage on change ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme-preference', theme);
  }, [theme]);

  const fetchContacts = async () => {
    try {
      const res = await axios.get(`${API_URL}/contacts`);
      setContacts(res.data.contacts.map(c => ({ ...c, notes: [], tags: c.tags || [] })));
    } catch (error) {
      console.error("Failed to fetch contacts", error);
      toast.error("Could not load contacts.");
    }
  };

  useEffect(() => {
    requestForToken();
    fetchContacts();
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

  const processedContacts = useMemo(() => {
    let displayedContacts = [...contacts];

    if (activeSearchFilter && searchResults) {
      const contactIdsFromSearch = new Set();
      searchResults.contacts.forEach(c => contactIdsFromSearch.add(c.id));
      searchResults.notes.forEach(n => contactIdsFromSearch.add(n.contactId));
      displayedContacts = contacts.filter(c => contactIdsFromSearch.has(c.id));
      return { pinned: [], unpinned: displayedContacts };
    }
    else if (selectedTagId) {
      displayedContacts = contacts.filter(contact =>
        contact.tags.some(tag => tag.id === parseInt(selectedTagId))
      );
      return { pinned: [], unpinned: displayedContacts };
    }

    const pinned = displayedContacts.filter(c => c.is_pinned);
    const unpinned = displayedContacts.filter(c => !c.is_pinned);

    const getDaysUntilDue = (c) => daysSince(c.lastCheckin) - c.checkinFrequency;
    switch (sortBy) {
      case 'closestCheckin':
        unpinned.sort((a, b) => getDaysUntilDue(b) - getDaysUntilDue(a));
        break;
      case 'mostOverdue':
        unpinned.sort((a, b) => getDaysUntilDue(a) - getDaysUntilDue(b));
        break;
      case 'nameAZ':
        unpinned.sort((a, b) => a.firstName.localeCompare(b.firstName));
        break;
      case 'newestFirst':
        unpinned.sort((a, b) => b.id - a.id);
        break;
      default: break;
    }
    if (sortDirection === 'asc') {
      unpinned.reverse();
    }

    pinned.sort((a, b) => a.firstName.localeCompare(b.firstName));

    return { pinned, unpinned };
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
    toast.success(`${newContactData.firstName} added!`);
  };

  const handleCheckIn = (id) => {
    axios.post(`${API_URL}/contacts/${id}/checkin`)
      .then(() => fetchContacts())
      .then(() => toast.success("Checked in!"));
  };

  const handleUpdateContact = (updatedContact) => {
    axios.put(`${API_URL}/contacts/${updatedContact.id}`, updatedContact)
      .then(() => {
        setEditingContact(null);
        fetchContacts();
        toast.success("Contact updated!");
      });
  };

  const handleToggleDetails = (contactId) => {
    const newId = detailedContactId === contactId ? null : contactId;
    setDetailedContactId(newId);
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
        toast.success("Note saved!");
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
        toast.success("Note updated!");
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
      fetchContacts();
      toast.success("Contact archived.");
    });
  };

  const handleRestoreContact = (contactId) => {
    axios.put(`${API_URL}/contacts/${contactId}/restore`).then(() => {
      const contactToRestore = archivedContacts.find(c => c.id === contactId);
      setArchivedContacts(archivedContacts.filter(c => c.id !== contactId));
      if (contactToRestore) {
        setContacts([...contacts, { ...contactToRestore, notes: [], tags: contactToRestore.tags || [] }]);
      }
      toast.success("Contact restored!");
    });
  };

  const handleDeletePermanently = (contactId) => {
    axios.delete(`${API_URL}/contacts/${contactId}`).then(() => {
      setArchivedContacts(archivedContacts.filter(c => c.id !== contactId));
      toast.success("Contact permanently deleted.");
    });
  };

  const handleSnooze = (contactId, days) => {
    axios.put(`${API_URL}/contacts/${contactId}/snooze`, { snooze_days: days }).then(() => {
      setSnoozingContactId(null);
      fetchContacts();
      toast.success("Snoozed!");
    });
  };

  const handleMakeOverdue = async (contactId) => {
    try {
      const currentToken = await requestForToken();
      if (currentToken) {
        console.log("Sending test notification to token:", currentToken);
        await axios.post(`${API_URL}/contacts/${contactId}/test-overdue`, { fcmToken: currentToken });
        await fetchContacts();
        toast.success('Test notification sent!');
      } else {
        toast.error('Could not get notification token. Please grant permission.');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      toast.error('Failed to send test notification.');
    }
  };

  const handleTogglePin = (contactId) => {
    // Find the original contact to revert to in case of an error
    const originalContacts = [...contacts];
    
    // Optimistically update the UI
    setContacts(currentContacts => 
      currentContacts.map(c => 
        c.id === contactId ? { ...c, is_pinned: !c.is_pinned } : c
      )
    );

    // Make the API call in the background
    axios.put(`${API_URL}/contacts/${contactId}/pin`)
      .catch(error => {
        // If the API call fails, revert the UI state and show an error
        console.error("Failed to pin contact", error);
        toast.error("Could not update pin status.");
        setContacts(originalContacts);
      });
  };

  const handleOpenExportModal = () => {
    if (contacts.length === 0) {
      toast.error("There are no contacts to export.");
      return;
    }
    setIsExportModalOpen(true);
  };

  const generateCalendarFiles = ({ exportBirthdays, exportCheckins, timeWindow }) => {
    let birthdayICS = '';
    let checkinICS = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeWindowLimit = new Date(today);
    if (timeWindow !== 'all') {
      timeWindowLimit.setDate(timeWindowLimit.getDate() + parseInt(timeWindow));
    }

    contacts.forEach(contact => {
      const fullName = contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.firstName;

      if (exportCheckins) {
        let nextCheckinDate = (contact.snooze_until && new Date(contact.snooze_until) > today)
          ? new Date(contact.snooze_until)
          : calculateNextUpcomingCheckinDate(contact.lastCheckin, contact.checkinFrequency);
        
        while (timeWindow === 'all' || nextCheckinDate <= timeWindowLimit) {
          const formattedCheckinDate = formatToICSDate(nextCheckinDate);
          const checkinUID = `checkin-${contact.id}-${formattedCheckinDate}@lastchecked.in`;
          
          checkinICS += `BEGIN:VEVENT\nUID:${checkinUID}\nDTSTAMP:${formatToICSDate(new Date())}\nDTSTART;VALUE=DATE:${formattedCheckinDate}\nSUMMARY:Check in with ${fullName}\nDESCRIPTION:Time to reconnect with ${fullName}!\nEND:VEVENT\n`;

          if (timeWindow === 'all' && contact.checkinFrequency <= 0) {
              break;
          }
          if (contact.checkinFrequency <= 0) {
              break;
          }

          nextCheckinDate.setDate(nextCheckinDate.getDate() + contact.checkinFrequency);
        }
      }

      if (exportBirthdays && contact.birthday) {
        const nextBirthdayDate = getNextBirthday(contact.birthday);
        if (nextBirthdayDate) {
          const formattedBirthday = formatToICSDate(nextBirthdayDate);
          const birthdayUID = `birthday-${contact.id}@lastchecked.in`;
          birthdayICS += `BEGIN:VEVENT\nUID:${birthdayUID}\nDTSTAMP:${formatToICSDate(new Date())}\nDTSTART;VALUE=DATE:${formattedBirthday}\nSUMMARY:🎂 ${fullName}'s Birthday\nDESCRIPTION:Wish ${fullName} a happy birthday!\nRRULE:FREQ=YEARLY\nEND:VEVENT\n`;
        }
      }
    });

    const createFullICS = (content) => {
      if (!content) return null;
      return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LastCheckedIn//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\n${content}END:VCALENDAR`;
    };

    const timeWindowMap = {
      '7': 'next_7_days',
      '30': 'next_30_days',
      '365': 'next_year',
      'all': 'all_upcoming'
    };
    const checkinFilename = `checkins_${timeWindowMap[timeWindow]}.ics`;

    return {
      birthdays: exportBirthdays ? { content: createFullICS(birthdayICS), filename: 'birthdays.ics' } : null,
      checkins: exportCheckins ? { content: createFullICS(checkinICS), filename: checkinFilename } : null
    };
  };

  const handlers = {
    handleCheckIn, handleToggleDetails, handleMakeOverdue, handleTagAdded, handleRemoveTag,
    handleEditContactClick: setEditingContact, handleArchiveContact, handleToggleAddNoteForm: setAddingNoteToContactId,
    handleSaveNote, handleUpdateNote, handleEditNoteClick: setEditingNote, handleCancelEditNote: () => setEditingNote(null),
    setSnoozingContactId, handleSnooze, handleUpdateContact, handleCancelEditContact: () => setEditingContact(null),
    handleTogglePin
  };
  const uiState = {
    editingContact, detailedContactId, addingNoteToContactId, editingNote, snoozingContactId
  };

  return (
    <div className="app-container">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--card-bg)',
            color: 'var(--text-color)',
          },
        }}
      />
      <Header
        view={view}
        archivedContacts={archivedContacts}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        onViewActive={() => setView('active')}
        onViewArchived={handleViewArchived}
        onExportToCalendar={handleOpenExportModal}
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
                <button className="sort-direction-button" onClick={() => setSortDirection(sd => sd === 'asc' ? 'desc' : 'asc')} title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>{sortDirection === 'asc' ? '↑' : '↓'}</button>
              </div>
              <select className="tag-filter-dropdown" value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}>
                <option value="">Filter by Tag: All</option>
                {allTags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
            {processedContacts.pinned.length > 0 && (
              <div className="pinned-section">
                <h2>Pinned</h2>
                <div className={`contacts-container ${displayMode}`}>
                  {processedContacts.pinned.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      handlers={handlers}
                      uiState={uiState}
                      displayMode={displayMode}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="view-controls">
              <h2>My People</h2>
              <div className="view-toggle-buttons">
                <button className={displayMode === 'list' ? 'active' : ''} onClick={() => setDisplayMode('list')}>List</button>
                <button className={displayMode === 'grid' ? 'active' : ''} onClick={() => setDisplayMode('grid')}>Grid</button>
              </div>
            </div>
          </div>
          <div className={`contacts-container ${displayMode}`}>
            {processedContacts.unpinned.map(contact => (
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
      
      <ExportCalendarModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onGenerateFiles={generateCalendarFiles}
      />
    </div>
  );
}

export default App;
