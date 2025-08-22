import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthContext from "./context/AuthContext";
import { useMemo, useContext, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { requestForToken } from "./firebase";
import Header from "./components/Header.jsx";
import AddContactForm from "./components/AddContactForm.jsx";
import FilterControls from "./components/FilterControls.jsx";
import ContactCard from "./components/ContactCard.jsx";
import ArchivedView from "./components/ArchivedView.jsx";
import ExportCalendarModal from "./components/ExportCalendarModal.jsx";
import BatchActionsToolbar from "./components/BatchActionsToolbar.jsx";
import ArchivedActionsToolbar from "./components/ArchivedActionsToolbar.jsx";
import SnoozeModal from "./components/SnoozeModal.jsx";
import AgendaView from "./components/AgendaView.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ConfirmationModal from "./components/ConfirmationModal.jsx";
import {
  isOverdue,
  generateAgendaViewData,
  calculateNextUpcomingCheckinDate,
} from "./utils.js";
import api from "./apiConfig.js";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import styles from "./App.module.css";
import { useContacts } from "./hooks/useContacts.js";
import { useUIState } from "./hooks/useUIState.js";
// DEV COMMENT: Import the final custom hook for selection management.
import { useSelection } from "./hooks/useSelection.js";

function MainApplication() {
  const { token } = useContext(AuthContext);

  // DEV COMMENT: All UI state is managed by the useUIState hook.
  const {
    theme,
    sortBy,
    sortDirection,
    selectedTagId,
    view,
    displayMode,
    detailedItemId,
    editingContact,
    addingNoteToContactId,
    editingNote,
    snoozingContact,
    isBatchSnoozing,
    globalSearchTerm,
    debouncedGlobalSearch,
    searchResults,
    isSearchFocused,
    activeSearchFilter,
    isExportModalOpen,
    confirmationState,
    setTheme,
    setSortBy,
    setSortDirection,
    setSelectedTagId,
    setView,
    setDisplayMode,
    setDetailedItemId,
    setEditingContact,
    setAddingNoteToContactId,
    setEditingNote,
    setSnoozingContact,
    setIsBatchSnoozing,
    setGlobalSearchTerm,
    setSearchResults,
    setIsSearchFocused,
    setActiveSearchFilter,
    setIsExportModalOpen,
    setConfirmationState,
  } = useUIState();

  // DEV COMMENT: All contact-related data is managed by the useContacts hook.
  const {
    contacts,
    archivedContacts,
    archivedCount,
    allTags,
    fetchContacts,
    fetchArchivedContacts,
    handleAddContact,
    handleCheckIn,
    handleUpdateContact,
    fetchNotesForContact,
    handleSaveNote,
    handleUpdateNote,
    handleTagAdded,
    handleRemoveTag,
    handleArchiveContact,
    handleRestoreContact,
    handleDeletePermanently,
    handleSnooze,
    handleTogglePin,
    generateCalendarFiles,
  } = useContacts({ token, setConfirmationState });

  // DEV COMMENT: All selection state is managed by the useSelection hook.
  const {
    selectedContactIds,
    setSelectedContactIds,
    handleToggleSelection,
    handleClearSelection,
    selectionModeActive,
    selectedArchivedIds,
    setSelectedArchivedIds,
    handleToggleArchivedSelection,
    handleClearArchivedSelection,
    selectionModeArchived,
  } = useSelection();

  useEffect(() => {
    if (token) requestForToken();
  }, [token]);

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
    if (sortDirection === "asc") unpinned.reverse();
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

  // --- "Controller" Handlers ---
  const onUpdateContactSubmit = () => {
    handleUpdateContact(editingContact).then(() => setEditingContact(null));
  };
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
  const handleSearchResultClick = (term) => {
    setGlobalSearchTerm(term);
    setActiveSearchFilter(term);
  };
  const handleToggleDetails = (itemId) => {
    const newId = detailedItemId === itemId ? null : itemId;
    setDetailedItemId(newId);
    if (newId === null) setAddingNoteToContactId(null);
    if (newId !== null) {
      const contactId =
        typeof itemId === "string"
          ? parseInt(itemId.split("-").pop(), 10)
          : itemId;
      fetchNotesForContact(contactId);
    }
  };
  const handleViewArchived = () => {
    fetchArchivedContacts();
    setView("archived");
    handleClearSelection();
  };
  const handleViewActive = () => {
    setView("active");
    handleClearArchivedSelection();
  };
  const handleSelectAll = () => {
    let allVisibleIds =
      displayMode === "agenda"
        ? agendaData.flatMap((day) => day.contacts.map((c) => c.id))
        : [...processedContacts.pinned, ...processedContacts.unpinned].map(
            (c) => c.id
          );
    setSelectedContactIds(allVisibleIds);
  };
  const handleSelectAllArchived = () => {
    setSelectedArchivedIds(archivedContacts.map((c) => c.id));
  };
  const handleBatchArchive = () => {
    api
      .post("/contacts/batch-archive", { contactIds: selectedContactIds })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts archived.`);
        fetchContacts();
        handleClearSelection();
      })
      .catch((err) => toast.error("Could not archive contacts."));
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
        handleClearSelection();
        setIsBatchSnoozing(false);
      })
      .catch((err) => toast.error("Could not snooze contacts."));
  };
  const handleBatchCheckIn = () => {
    api
      .post("/contacts/batch-checkin", { contactIds: selectedContactIds })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts checked in.`);
        fetchContacts();
        handleClearSelection();
      })
      .catch((err) => toast.error("Could not check in contacts."));
  };
  const handleBatchRestore = () => {
    api
      .post("/contacts/batch-restore", { contactIds: selectedArchivedIds })
      .then(() => {
        toast.success(`${selectedArchivedIds.length} contacts restored.`);
        fetchContacts();
        fetchArchivedContacts();
        handleClearArchivedSelection();
      })
      .catch((err) => toast.error("Could not restore contacts."));
  };
  const handleBatchDelete = () => {
    setConfirmationState({
      isOpen: true,
      title: `Delete ${selectedArchivedIds.length} Contact(s)?`,
      message: "Are you sure? This action cannot be undone.",
      onConfirm: () => {
        api
          .post("/contacts/batch-delete", { contactIds: selectedArchivedIds })
          .then(() => {
            toast.success(`${selectedArchivedIds.length} contacts deleted.`);
            fetchArchivedContacts();
            handleClearArchivedSelection();
            setConfirmationState({ isOpen: false });
          })
          .catch((err) => {
            toast.error("Could not delete contacts.");
            setConfirmationState({ isOpen: false });
          });
      },
    });
  };

  const contactHandlers = {
    handleCheckIn,
    handleToggleDetails,
    handleTagAdded,
    handleRemoveTag,
    handleEditContactClick: setEditingContact,
    handleEditingContactChange: (e) =>
      setEditingContact((prev) => ({
        ...prev,
        [e.target.name]: e.target.value,
      })),
    handleArchiveContact,
    handleToggleAddNoteForm: setAddingNoteToContactId,
    handleSaveNote: (id, content) =>
      handleSaveNote(id, content).then(() => setAddingNoteToContactId(null)),
    handleUpdateNote: (id, noteId, content) =>
      handleUpdateNote(id, noteId, content).then(() => setEditingNote(null)),
    handleEditNoteClick: setEditingNote,
    handleCancelEditNote: () => setEditingNote(null),
    handleUpdateContact: onUpdateContactSubmit,
    handleCancelEditContact: () => setEditingContact(null),
    handleTogglePin,
    handleOpenSnoozeModal: setSnoozingContact,
  };

  const uiState = {
    editingContact,
    detailedItemId,
    addingNoteToContactId,
    editingNote,
    isOverdue,
  };

  return (
    <div
      className={`app-container ${
        selectionModeActive || selectionModeArchived
          ? "selection-mode-active"
          : ""
      }`}
    >
      <Header
        view={view}
        archivedCount={archivedCount}
        theme={theme}
        onToggleTheme={() =>
          setTheme((t) => (t === "light" ? "dark" : "light"))
        }
        onViewActive={handleViewActive}
        onViewArchived={handleViewArchived}
        onExportToCalendar={() => setIsExportModalOpen(true)}
      />
      {view === "active" ? (
        <>
          <div className={styles.contentWrapper}>
            <AddContactForm onContactAdded={handleAddContact} />
            <FilterControls
              globalSearchTerm={globalSearchTerm}
              onGlobalSearchChange={setGlobalSearchTerm}
              onSearchSubmit={handleSearchSubmit}
              isSearchFocused={isSearchFocused}
              onSearchFocus={() => setIsSearchFocused(true)}
              onSearchBlur={() =>
                setTimeout(() => setIsSearchFocused(false), 200)
              }
              searchResults={searchResults}
              onClearSearch={handleClearSearch}
              debouncedGlobalSearch={debouncedGlobalSearch}
              onSearchResultClick={handleSearchResultClick}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortDirection={sortDirection}
              onToggleSortDirection={() =>
                setSortDirection((sd) => (sd === "asc" ? "desc" : "asc"))
              }
              selectedTagId={selectedTagId}
              onSelectedTagChange={setSelectedTagId}
              allTags={allTags}
            />
          </div>
          <div className={styles.contentWrapper}>
            {displayMode !== "agenda" &&
              processedContacts.pinned.length > 0 && (
                <div className={styles.pinnedSection}>
                  <h2>Pinned</h2>
                  <div
                    className={`${styles.contactsContainer} ${styles[displayMode]}`}
                  >
                    {processedContacts.pinned.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        handlers={contactHandlers}
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
            <div className={styles.viewControls}>
              <h2>{displayMode === "agenda" ? "Agenda" : "My People"}</h2>
              <div className={styles.viewToggleButtons}>
                <button
                  className={displayMode === "list" ? styles.active : ""}
                  onClick={() => setDisplayMode("list")}
                >
                  List
                </button>
                <button
                  className={displayMode === "grid" ? styles.active : ""}
                  onClick={() => setDisplayMode("grid")}
                >
                  Grid
                </button>
                <button
                  className={displayMode === "agenda" ? styles.active : ""}
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
              handlers={contactHandlers}
              uiState={uiState}
              selectionMode={selectionModeActive}
              selectedContactIds={selectedContactIds}
              onToggleSelection={handleToggleSelection}
            />
          ) : (
            <div
              className={`${styles.contactsContainer} ${styles[displayMode]}`}
            >
              {processedContacts.unpinned.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  handlers={contactHandlers}
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
          onOpenSnoozeModal={() => setIsBatchSnoozing(true)}
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
        message={confirmationState.message}
        onClose={() => setConfirmationState({ isOpen: false })}
        onConfirm={confirmationState.onConfirm}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "var(--card-bg)",
              color: "var(--text-color)",
              border: "1px solid var(--border-color)",
            },
          }}
        />
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
