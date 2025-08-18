// frontend/src/App.jsx

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthContext from "./context/AuthContext";
import { useState, useEffect, useMemo, useContext } from "react";
import { useDebounce } from "use-debounce";
import { Toaster, toast } from "react-hot-toast";
import { requestForToken } from "./firebase";
import Header from "./components/Header.jsx";
import AddContactForm from "./components/AddContactForm.jsx";
import ContactCard from "./components/ContactCard.jsx";
import ArchivedView from "./components/ArchivedView.jsx";
import ExportCalendarModal from "./components/ExportCalendarModal.jsx";
import BatchActionsToolbar from "./components/BatchActionsToolbar.jsx";
// FIX: Import the ArchivedActionsToolbar as well
import ArchivedActionsToolbar from "./components/ArchivedActionsToolbar.jsx";
import SnoozeModal from "./components/SnoozeModal.jsx";
import AgendaView from "./components/AgendaView.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ConfirmationModal from "./components/ConfirmationModal.jsx";
import {
  isOverdue,
  generateAgendaViewData,
  calculateNextUpcomingCheckinDate,
  formatToICSDate,
  getNextBirthday,
} from "./utils.js";
import api from "./apiConfig.js";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

function MainApplication() {
  const { token } = useContext(AuthContext);
  const [contacts, setContacts] = useState([]);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme-preference");
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [sortBy, setSortBy] = useState("newestFirst");
  const [sortDirection, setSortDirection] = useState("desc");
  const [allTags, setAllTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [view, setView] = useState("active");
  const [displayMode, setDisplayMode] = useState("list");
  const [archivedContacts, setArchivedContacts] = useState([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [detailedContactId, setDetailedContactId] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [addingNoteToContactId, setAddingNoteToContactId] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [snoozingContact, setSnoozingContact] = useState(null);
  const [isBatchSnoozing, setIsBatchSnoozing] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [debouncedGlobalSearch] = useDebounce(globalSearchTerm, 300);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedArchivedIds, setSelectedArchivedIds] = useState([]);
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme-preference", theme);
  }, [theme]);

  const fetchContacts = async () => {
    try {
      const res = await api.get("/contacts");
      setContacts(
        res.data.contacts.map((c) => ({ ...c, notes: [], tags: c.tags || [] }))
      );
    } catch (error) {
      console.error("Failed to fetch contacts", error);
      toast.error("Could not load contacts.");
    }
  };

  useEffect(() => {
    if (token) {
      requestForToken();
      fetchContacts();
      api.get("/tags").then((res) => setAllTags(res.data.tags || []));
      api
        .get("/contacts/archived/count")
        .then((res) => setArchivedCount(res.data.count));
    }
  }, [token]);

  useEffect(() => {
    if (debouncedGlobalSearch) {
      api
        .get(`/search?q=${debouncedGlobalSearch}`)
        .then((res) => setSearchResults(res.data.results));
    } else {
      setSearchResults(null);
    }
  }, [debouncedGlobalSearch]);

  const agendaData = useMemo(
    () => generateAgendaViewData(contacts),
    [contacts]
  );

  const processedContacts = useMemo(() => {
    let displayedContacts = [...contacts];
    if (activeSearchFilter && searchResults) {
      const contactIdsFromSearch = new Set(
        searchResults.contacts.map((c) => c.id)
      );
      searchResults.notes.forEach((n) =>
        contactIdsFromSearch.add(n.contact_id)
      );
      displayedContacts = contacts.filter((c) =>
        contactIdsFromSearch.has(c.id)
      );
      return { pinned: [], unpinned: displayedContacts };
    } else if (selectedTagId) {
      displayedContacts = contacts.filter((contact) =>
        contact.tags.some((tag) => tag.id === parseInt(selectedTagId))
      );
      return { pinned: [], unpinned: displayedContacts };
    }
    const pinned = displayedContacts.filter((c) => c.is_pinned);
    const unpinned = displayedContacts.filter((c) => !c.is_pinned);
    const getDaysSinceDue = (c) => {
      const effectiveDate = calculateNextUpcomingCheckinDate(
        c.last_checkin,
        c.checkin_frequency
      );
      if (!effectiveDate) return Number.MIN_SAFE_INTEGER;
      return (new Date() - effectiveDate) / (1000 * 60 * 60 * 24);
    };
    switch (sortBy) {
      case "closestCheckin":
        unpinned.sort((a, b) => getDaysSinceDue(a) - getDaysSinceDue(b));
        break;
      case "mostOverdue":
        unpinned.sort((a, b) => getDaysSinceDue(b) - getDaysSinceDue(a));
        break;
      case "nameAZ":
        unpinned.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newestFirst":
        unpinned.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }
    if (sortDirection === "asc") {
      unpinned.reverse();
    }
    pinned.sort((a, b) => a.name.localeCompare(b.name));
    return { pinned, unpinned };
  }, [
    contacts,
    activeSearchFilter,
    searchResults,
    selectedTagId,
    sortBy,
    sortDirection,
  ]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearchFilter(globalSearchTerm);
    setIsSearchFocused(false);
  };
  const handleClearSearch = () => {
    setGlobalSearchTerm("");
    setActiveSearchFilter("");
    setSearchResults(null);
  };
  const handleAddContact = () => {
    toast.success("Contact added!");
    fetchContacts();
  };
  const handleCheckIn = (id) => {
    const originalContacts = [...contacts];
    const checkinTime = new Date().toISOString();
    setContacts((currentContacts) =>
      currentContacts.map((c) =>
        c.id === id
          ? { ...c, last_checkin: checkinTime, snooze_until: null }
          : c
      )
    );
    toast.success("Checked in!");
    api.post(`/contacts/${id}/checkin`).catch((error) => {
      console.error("Failed to check in", error);
      toast.error("Could not save check-in. Reverting.");
      setContacts(originalContacts);
    });
  };
  const handleUpdateContact = (updatedContact) => {
    api.put(`/contacts/${updatedContact.id}`, updatedContact).then(() => {
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
      const contact = contacts.find((c) => c.id === contactId);
      if (contact && contact.notes.length === 0) {
        api
          .get(`/contacts/${contactId}/notes`)
          .then((res) =>
            setContacts((cs) =>
              cs.map((c) =>
                c.id === contactId ? { ...c, notes: res.data.notes } : c
              )
            )
          );
      }
    }
  };
  const handleSaveNote = (contactId, newNoteContent) => {
    if (!newNoteContent.trim()) return;
    api
      .post(`/contacts/${contactId}/notes`, { content: newNoteContent })
      .then((res) => {
        const newNote = res.data;
        setContacts((cs) =>
          cs.map((c) =>
            c.id === contactId ? { ...c, notes: [newNote, ...c.notes] } : c
          )
        );
        setAddingNoteToContactId(null);
        toast.success("Note saved!");
      });
  };
  const handleUpdateNote = (contactId, noteId, newContent) => {
    api.put(`/notes/${noteId}`, { content: newContent }).then((res) => {
      setContacts((cs) =>
        cs.map((c) => {
          if (c.id === contactId) {
            const updatedNotes = c.notes.map((n) =>
              n.id === noteId
                ? { ...n, content: newContent, modifiedAt: res.data.modifiedAt }
                : n
            );
            return { ...c, notes: updatedNotes };
          }
          return c;
        })
      );
      setEditingNote(null);
      toast.success("Note updated!");
    });
  };
  const handleTagAdded = (contactId, newTag) => {
    setContacts((cs) =>
      cs.map((c) =>
        c.id === contactId ? { ...c, tags: [...c.tags, newTag] } : c
      )
    );
  };
  const handleRemoveTag = (contactId, tagId) => {
    api.delete(`/contacts/${contactId}/tags/${tagId}`).then(() => {
      setContacts((cs) =>
        cs.map((c) => {
          if (c.id === contactId)
            return { ...c, tags: c.tags.filter((t) => t.id !== tagId) };
          return c;
        })
      );
      api.get(`/tags`).then((res) => setAllTags(res.data.tags || []));
    });
  };
  const handleViewArchived = () => {
    api.get("/contacts/archived").then((res) => {
      setArchivedContacts(res.data.contacts || []);
      setView("archived");
      setSelectedContactIds([]);
    });
  };
  const handleViewActive = () => {
    setView("active");
    setSelectedArchivedIds([]);
  };
  const handleArchiveContact = (contactId) => {
    const contactToArchive = contacts.find((c) => c.id === contactId);
    api.put(`/contacts/${contactId}/archive`).then(() => {
      if (contactToArchive) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        setArchivedCount((prev) => prev + 1);
      }
      toast.success("Contact archived.");
    });
  };
  const handleRestoreContact = (contactId) => {
    const contactToRestore = archivedContacts.find((c) => c.id === contactId);
    api.put(`/contacts/${contactId}/restore`).then(() => {
      setArchivedContacts(archivedContacts.filter((c) => c.id !== contactId));
      setArchivedCount((prev) => prev - 1);
      if (contactToRestore) {
        setContacts([
          ...contacts,
          { ...contactToRestore, notes: [], tags: contactToRestore.tags || [] },
        ]);
      }
      toast.success("Contact restored!");
    });
  };
  const handleDeletePermanently = (contactId) => {
    const contact = archivedContacts.find((c) => c.id === contactId);
    if (!contact) return;
    setConfirmationState({
      isOpen: true,
      title: "Delete Contact?",
      message: `Are you sure you want to permanently delete ${contact.name}? This action cannot be undone.`,
      onConfirm: () => {
        api
          .delete(`/contacts/${contactId}`)
          .then(() => {
            setArchivedContacts(
              archivedContacts.filter((c) => c.id !== contactId)
            );
            setArchivedCount((prev) => prev - 1);
            toast.success("Contact permanently deleted.");
            setConfirmationState({ isOpen: false });
          })
          .catch((err) => {
            toast.error("Failed to delete contact.");
            console.error(err);
            setConfirmationState({ isOpen: false });
          });
      },
    });
  };
  const handleSnooze = (contactId, days) => {
    api
      .put(`/contacts/${contactId}/snooze`, { snooze_days: days })
      .then(() => {
        setSnoozingContact(null);
        fetchContacts();
        toast.success("Snoozed!");
      })
      .catch((err) => {
        console.error("Snooze failed", err);
        toast.error("Could not snooze contact.");
      });
  };
  const handleTogglePin = (contactId) => {
    const originalContacts = [...contacts];
    setContacts((currentContacts) =>
      currentContacts.map((c) =>
        c.id === contactId ? { ...c, is_pinned: !c.is_pinned } : c
      )
    );
    api.put(`/contacts/${contactId}/pin`).catch((error) => {
      console.error("Failed to pin contact", error);
      toast.error("Could not update pin status.");
      setContacts(originalContacts);
    });
  };
  const handleToggleSelection = (contactId) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };
  const handleSelectAll = () => {
    let allVisibleContactIds = [];
    if (displayMode === "agenda") {
      agendaData.forEach((day) => {
        day.contacts.forEach((contact) => {
          allVisibleContactIds.push(contact.id);
        });
      });
    } else {
      allVisibleContactIds = [
        ...processedContacts.pinned,
        ...processedContacts.unpinned,
      ].map((c) => c.id);
    }
    setSelectedContactIds(allVisibleContactIds);
  };
  const handleClearSelection = () => {
    setSelectedContactIds([]);
  };
  const handleBatchArchive = () => {
    api
      .post("/contacts/batch-archive", { contactIds: selectedContactIds })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts archived.`);
        setArchivedCount((prev) => prev + selectedContactIds.length);
        setContacts(contacts.filter((c) => !selectedContactIds.includes(c.id)));
        setSelectedContactIds([]);
      })
      .catch((err) => {
        console.error("Batch archive failed", err);
        toast.error("Could not archive contacts.");
      });
  };
  const handleBatchSnooze = (days) => {
    api
      .post("/contacts/batch-snooze", {
        contactIds: selectedContactIds,
        snooze_days: days,
      })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts snoozed.`);
        fetchContacts();
        setSelectedContactIds([]);
        setIsBatchSnoozing(false);
      })
      .catch((err) => {
        console.error("Batch snooze failed", err);
        toast.error("Could not snooze contacts.");
      });
  };
  const handleBatchCheckIn = () => {
    api
      .post("/contacts/batch-checkin", { contactIds: selectedContactIds })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts checked in.`);
        fetchContacts();
        setSelectedContactIds([]);
      })
      .catch((err) => {
        console.error("Batch check-in failed", err);
        toast.error("Could not check in contacts.");
      });
  };
  const handleOpenBatchSnoozeModal = () => {
    setIsBatchSnoozing(true);
  };
  const handleToggleArchivedSelection = (contactId) => {
    setSelectedArchivedIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };
  const handleSelectAllArchived = () => {
    const allArchivedIds = archivedContacts.map((c) => c.id);
    setSelectedArchivedIds(allArchivedIds);
  };
  const handleClearArchivedSelection = () => {
    setSelectedArchivedIds([]);
  };
  const handleBatchRestore = () => {
    api
      .post("/contacts/batch-restore", { contactIds: selectedArchivedIds })
      .then(() => {
        toast.success(`${selectedArchivedIds.length} contacts restored.`);
        const restored = archivedContacts.filter((c) =>
          selectedArchivedIds.includes(c.id)
        );
        setContacts((prev) => [...prev, ...restored]);
        setArchivedContacts(
          archivedContacts.filter((c) => !selectedArchivedIds.includes(c.id))
        );
        setArchivedCount((prev) => prev - selectedArchivedIds.length);
        setSelectedArchivedIds([]);
      })
      .catch((err) => {
        console.error("Batch restore failed", err);
        toast.error("Could not restore contacts.");
      });
  };
  const handleBatchDelete = () => {
    const idsToDelete = selectedArchivedIds;
    if (idsToDelete.length === 0) return;
    setConfirmationState({
      isOpen: true,
      title: `Delete ${idsToDelete.length} Contact${
        idsToDelete.length > 1 ? "s" : ""
      }?`,
      message:
        "Are you sure you want to permanently delete these contacts? This action cannot be undone.",
      onConfirm: () => {
        api
          .post("/contacts/batch-delete", { contactIds: idsToDelete })
          .then(() => {
            toast.success(`${idsToDelete.length} contacts deleted.`);
            setArchivedContacts(
              archivedContacts.filter((c) => !idsToDelete.includes(c.id))
            );
            setArchivedCount((prev) => prev - idsToDelete.length);
            setSelectedArchivedIds([]);
            setConfirmationState({ isOpen: false });
          })
          .catch((err) => {
            toast.error("Could not delete contacts.");
            console.error(err);
            setConfirmationState({ isOpen: false });
          });
      },
    });
  };
  const handleOpenExportModal = () => {
    if (contacts.length === 0) {
      toast.error("There are no contacts to export.");
      return;
    }
    setIsExportModalOpen(true);
  };
  const generateCalendarFiles = ({
    exportBirthdays,
    exportCheckins,
    timeWindow,
  }) => {
    let birthdayICS = "";
    let checkinICS = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeWindowLimit = new Date(today);
    if (timeWindow !== "all") {
      timeWindowLimit.setDate(timeWindowLimit.getDate() + parseInt(timeWindow));
    }
    contacts.forEach((contact) => {
      const fullName = contact.name;
      if (exportCheckins) {
        let nextCheckinDate =
          contact.snooze_until && new Date(contact.snooze_until) > today
            ? new Date(contact.snooze_until)
            : calculateNextUpcomingCheckinDate(
                contact.last_checkin,
                contact.checkin_frequency
              );
        if (nextCheckinDate) {
          while (timeWindow === "all" || nextCheckinDate <= timeWindowLimit) {
            const formattedCheckinDate = formatToICSDate(nextCheckinDate);
            const checkinUID = `checkin-${contact.id}-${formattedCheckinDate}@lastchecked.in`;
            checkinICS += `BEGIN:VEVENT\nUID:${checkinUID}\nDTSTAMP:${formatToICSDate(
              new Date()
            )}\nDTSTART;VALUE=DATE:${formattedCheckinDate}\nSUMMARY:Check in with ${fullName}\nDESCRIPTION:Time to reconnect with ${fullName}!\nEND:VEVENT\n`;
            if (timeWindow === "all" && contact.checkin_frequency <= 0) {
              break;
            }
            if (contact.checkin_frequency <= 0) {
              break;
            }
            nextCheckinDate.setDate(
              nextCheckinDate.getDate() + contact.checkin_frequency
            );
          }
        }
      }
      if (exportBirthdays && contact.birthday) {
        const originalBirthdayDate = new Date(contact.birthday);
        if (!isNaN(originalBirthdayDate.getTime())) {
          const formattedBirthday = formatToICSDate(originalBirthdayDate);
          const birthdayUID = `birthday-${contact.id}@lastchecked.in`;
          birthdayICS += `BEGIN:VEVENT\nUID:${birthdayUID}\nDTSTAMP:${formatToICSDate(
            new Date()
          )}\nDTSTART;VALUE=DATE:${formattedBirthday}\nSUMMARY:🎂 ${fullName}'s Birthday\nDESCRIPTION:Wish ${fullName} a happy birthday!\nRRULE:FREQ=YEARLY\nEND:VEVENT\n`;
        }
      }
    });
    const createFullICS = (content) => {
      if (!content) return null;
      return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LastCheckedIn//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\n${content}END:VCALENDAR`;
    };
    const timeWindowMap = {
      7: "next_7_days",
      30: "next_30_days",
      365: "next_year",
      all: "all_upcoming",
    };
    const checkinFilename = `checkins_${timeWindowMap[timeWindow]}.ics`;
    return {
      birthdays: exportBirthdays
        ? { content: createFullICS(birthdayICS), filename: "birthdays.ics" }
        : null,
      checkins: exportCheckins
        ? { content: createFullICS(checkinICS), filename: checkinFilename }
        : null,
    };
  };
  const handlers = {
    handleCheckIn,
    handleToggleDetails,
    handleTagAdded,
    handleRemoveTag,
    handleEditContactClick: setEditingContact,
    handleArchiveContact,
    handleToggleAddNoteForm: setAddingNoteToContactId,
    handleSaveNote,
    handleUpdateNote,
    handleEditNoteClick: setEditingNote,
    handleCancelEditNote: () => setEditingNote(null),
    handleSnooze,
    handleUpdateContact,
    handleCancelEditContact: () => setEditingContact(null),
    handleTogglePin,
    handleOpenSnoozeModal: setSnoozingContact,
  };
  const uiState = {
    editingContact,
    detailedContactId,
    addingNoteToContactId,
    editingNote,
    isOverdue,
  };
  const selectionModeActive = selectedContactIds.length > 0;
  const selectionModeArchived = selectedArchivedIds.length > 0;

  return (
    <div
      className={`app-container ${
        selectionModeActive || selectionModeArchived
          ? "selection-mode-active"
          : ""
      }`}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: "var(--card-bg)", color: "var(--text-color)" },
        }}
      />
      <Header
        view={view}
        archivedCount={archivedCount}
        theme={theme}
        onToggleTheme={() =>
          setTheme((t) => (t === "light" ? "dark" : "light"))
        }
        onViewActive={handleViewActive}
        onViewArchived={handleViewArchived}
        onExportToCalendar={handleOpenExportModal}
      />
      {view === "active" ? (
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
                  onBlur={() =>
                    setTimeout(() => setIsSearchFocused(false), 200)
                  }
                  className="search-input"
                />
                {activeSearchFilter && (
                  <button
                    type="button"
                    className="clear-search-button"
                    onClick={handleClearSearch}
                  >
                    X
                  </button>
                )}
                {isSearchFocused && searchResults && (
                  <div className="search-results">
                    {searchResults.contacts.length > 0 && (
                      <div className="results-section">
                        <h4>Contacts</h4>
                        <ul>
                          {searchResults.contacts.map((c) => (
                            <li
                              key={`c-${c.id}`}
                              onMouseDown={() => {
                                setGlobalSearchTerm(c.name);
                                setActiveSearchFilter(c.name);
                              }}
                            >
                              {c.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {searchResults.notes.length > 0 && (
                      <div className="results-section">
                        <h4>Notes</h4>
                        <ul>
                          {searchResults.notes.map((n) => (
                            <li
                              key={`n-${n.id}`}
                              onMouseDown={() => {
                                setGlobalSearchTerm(n.content);
                                setActiveSearchFilter(n.content);
                              }}
                            >
                              "{n.content.substring(0, 30)}..."
                              <span className="note-contact-name">
                                ({n.contactFirstName})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {searchResults.contacts.length === 0 &&
                      searchResults.notes.length === 0 &&
                      debouncedGlobalSearch && (
                        <p className="no-results">No results found.</p>
                      )}
                  </div>
                )}
              </form>
              <div className="sort-controls">
                <select
                  className="sort-dropdown"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newestFirst">Sort by: Date Added</option>
                  <option value="closestCheckin">
                    Sort by: Closest Check-in
                  </option>
                  <option value="mostOverdue">Sort by: Most Overdue</option>
                  <option value="nameAZ">Sort by: Name (A-Z)</option>
                </select>
                <button
                  className="sort-direction-button"
                  onClick={() =>
                    setSortDirection((sd) => (sd === "asc" ? "desc" : "asc"))
                  }
                  title={`Sort ${
                    sortDirection === "asc" ? "Descending" : "Ascending"
                  }`}
                >
                  {sortDirection === "asc" ? "↑" : "↓"}
                </button>
              </div>
              <select
                className="tag-filter-dropdown"
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
              >
                <option value="">Filter by Tag: All</option>
                {allTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
            {displayMode !== "agenda" &&
              processedContacts.pinned.length > 0 && (
                <div className="pinned-section">
                  <h2>Pinned</h2>
                  <div className={`contacts-container ${displayMode}`}>
                    {processedContacts.pinned.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        handlers={handlers}
                        uiState={uiState}
                        displayMode={displayMode}
                        selectionMode={selectionModeActive}
                        isSelected={selectedContactIds.includes(contact.id)}
                        onToggleSelection={handleToggleSelection}
                      />
                    ))}
                  </div>
                </div>
              )}
            <div className="view-controls">
              <h2>{displayMode === "agenda" ? "Agenda" : "My People"}</h2>
              <div className="view-toggle-buttons">
                <button
                  className={displayMode === "list" ? "active" : ""}
                  onClick={() => setDisplayMode("list")}
                >
                  List
                </button>
                <button
                  className={displayMode === "grid" ? "active" : ""}
                  onClick={() => setDisplayMode("grid")}
                >
                  Grid
                </button>
                <button
                  className={displayMode === "agenda" ? "active" : ""}
                  onClick={() => setDisplayMode("agenda")}
                >
                  Agenda
                </button>
              </div>
            </div>
          </div>
          {displayMode === "agenda" ? (
            <AgendaView
              agendaData={agendaData}
              handlers={handlers}
              uiState={uiState}
              selectionMode={selectionModeActive}
              selectedContactIds={selectedContactIds}
              onToggleSelection={handleToggleSelection}
            />
          ) : (
            <div className={`contacts-container ${displayMode}`}>
              {processedContacts.unpinned.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  handlers={handlers}
                  uiState={uiState}
                  displayMode={displayMode}
                  selectionMode={selectionModeActive}
                  isSelected={selectedContactIds.includes(contact.id)}
                  onToggleSelection={handleToggleSelection}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <ArchivedView
          archivedContacts={archivedContacts}
          onRestore={handleRestoreContact}
          onDeletePermanently={handleDeletePermanently}
          selectedArchivedIds={selectedArchivedIds}
          onToggleArchivedSelection={handleToggleArchivedSelection}
        />
      )}
      {selectionModeActive && view === "active" && (
        <BatchActionsToolbar
          selectedCount={selectedContactIds.length}
          onSelectAll={handleSelectAll}
          onClear={handleClearSelection}
          onArchive={handleBatchArchive}
          onCheckIn={handleBatchCheckIn}
          onOpenSnoozeModal={handleOpenBatchSnoozeModal}
          totalContacts={contacts.length}
        />
      )}
      {selectionModeArchived && view === "archived" && (
        <ArchivedActionsToolbar
          selectedCount={selectedArchivedIds.length}
          onSelectAll={handleSelectAllArchived}
          onClear={handleClearArchivedSelection}
          onRestore={handleBatchRestore}
          onDelete={handleBatchDelete}
          totalContacts={archivedContacts.length}
        />
      )}
      <ExportCalendarModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onGenerateFiles={generateCalendarFiles}
      />
      {(snoozingContact || isBatchSnoozing) && (
        <SnoozeModal
          contact={snoozingContact}
          isBatchMode={isBatchSnoozing}
          count={selectedContactIds.length}
          onClose={() => {
            setSnoozingContact(null);
            setIsBatchSnoozing(false);
          }}
          onSnooze={isBatchSnoozing ? handleBatchSnooze : handleSnooze}
        />
      )}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        onClose={() =>
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
        onConfirm={confirmationState.onConfirm}
      >
        {confirmationState.message}
      </ConfirmationModal>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainApplication />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
