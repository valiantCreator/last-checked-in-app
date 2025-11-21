import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // Gemini COMMENT: Added Navigate for redirects
import { AuthProvider } from "./context/AuthContext";
import AuthContext from "./context/AuthContext";
import {
  useMemo,
  useContext,
  useEffect,
  useState,
  lazy,
  Suspense,
  useCallback,
} from "react";
import { Toaster, toast } from "react-hot-toast";
import { requestForToken } from "./firebase";
// Gemini COMMENT: Import the new Layout component
import Layout from "./components/Layout.jsx";
import AddContactForm from "./components/AddContactForm.jsx";
import FilterControls from "./components/FilterControls.jsx";
import ContactCard from "./components/ContactCard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import {
  isOverdue,
  generateAgendaViewData,
  calculateNextUpcomingCheckinDate,
} from "./utils.js";
import api from "./apiConfig.js";
import styles from "./App.module.css";
import { useContacts } from "./hooks/useContacts.js";
import { useUIState } from "./hooks/useUIState.js";
import { useSelection } from "./hooks/useSelection.js";

import { SWProvider, SWContext } from "./context/SWContext.jsx";
import { registerSW } from "virtual:pwa-register";

const ArchivedView = lazy(() => import("./components/ArchivedView.jsx"));
const AgendaView = lazy(() => import("./components/AgendaView.jsx"));
const ExportCalendarModal = lazy(() =>
  import("./components/ExportCalendarModal.jsx")
);
const BatchActionsToolbar = lazy(() =>
  import("./components/BatchActionsToolbar.jsx")
);
const ArchivedActionsToolbar = lazy(() =>
  import("./components/ArchivedActionsToolbar.jsx")
);
const SnoozeModal = lazy(() => import("./components/SnoozeModal.jsx"));
const ConfirmationModal = lazy(() =>
  import("./components/ConfirmationModal.jsx")
);
const OnboardingModal = lazy(() => import("./components/OnboardingModal.jsx"));
const FeedbackModal = lazy(() => import("./components/FeedbackModal.jsx"));

const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const SignupPage = lazy(() => import("./pages/SignupPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage.jsx"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));

const LoadingFallback = () => (
  <div className={styles.loadingFallback}>Loading...</div>
);

function ApplicationCore() {
  const { setSwRegistration } = useContext(SWContext);

  useEffect(() => {
    registerSW({
      onRegistered(registration) {
        if (registration) {
          setSwRegistration(registration);
        }
      },
      onRegisterError(error) {
        console.error("Service Worker registration failed:", error);
      },
    });
  }, [setSwRegistration]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />

        {/* Protected Routes - All Wrapped in MainApplication */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainApplication />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

function MainApplication() {
  const { token } = useContext(AuthContext);
  const { swRegistration } = useContext(SWContext);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const {
    theme,
    sortBy,
    sortDirection,
    selectedTagId,
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
    notificationPermission,
    isRequestingNotifications,
    setTheme,
    setSortBy,
    setSortDirection,
    setSelectedTagId,
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
    setNotificationPermission,
    setIsRequestingNotifications,
  } = useUIState();

  const {
    contacts,
    archivedContacts,
    archivedCount,
    allTags,
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
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [setNotificationPermission]);

  const handleRequestNotificationPermission = useCallback(async () => {
    if (!swRegistration) {
      toast.error("Service worker not ready. Please try again in a moment.");
      return;
    }

    setIsRequestingNotifications(true);
    try {
      const fcmToken = await requestForToken(swRegistration);
      if (fcmToken) {
        setNotificationPermission("granted");
        toast.success("Notifications enabled successfully!");
      } else {
        toast("You can enable notifications later using the bell icon.");
      }
    } catch (err) {
      if (err && err.code === "messaging/permission-blocked") {
        setNotificationPermission("denied");
        toast.error(
          "Notifications are blocked. To enable them, please go to your browser's site settings for this page.",
          { duration: 6000 }
        );
      } else {
        console.error("An unexpected error occurred:", err);
        toast.error("Could not enable notifications. Please try again.");
      }
    } finally {
      setIsRequestingNotifications(false);
    }
  }, [swRegistration, setIsRequestingNotifications, setNotificationPermission]);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };

  const handleSendFeedback = async (content) => {
    try {
      await api.post("/feedback", { content });
      toast.success("Feedback submitted. Thank you!");
      setIsFeedbackModalOpen(false);
    } catch (error) {
      console.error("Failed to submit feedback", error);
      toast.error(
        error.response?.data?.details?.[0]?.message ||
          "Could not submit feedback."
      );
    }
  };

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

  const refetchDashboardData = () => {
    // Placeholder
  };

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

  // --- Batch Action Handlers ---
  const handleBatchArchive = () => {
    api
      .post("/contacts/batch-archive", { contactIds: selectedContactIds })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts archived.`);
        refetchDashboardData();
        handleClearSelection();
      })
      .catch((err) => toast.error("Could not archive contacts."));
  };

  const handleBatchSnooze = (snoozeObject) => {
    api
      .post("/contacts/batch-snooze", {
        contactIds: selectedContactIds,
        snooze: snoozeObject,
      })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts snoozed.`);
        refetchDashboardData();
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
        refetchDashboardData();
        handleClearSelection();
      })
      .catch((err) => toast.error("Could not check in contacts."));
  };
  const handleBatchRestore = () => {
    api
      .post("/contacts/batch-restore", { contactIds: selectedArchivedIds })
      .then(() => {
        toast.success(`${selectedContactIds.length} contacts restored.`);
        refetchDashboardData();
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

  // Gemini COMMENT: Fetch archived contacts when entering the archived route.
  // Since we don't have a dedicated route component yet, we trigger this via an effect
  // if we were to use a route, but here we rely on the existing fetchArchivedContacts logic.
  // However, ArchivedView expects data. We pass the data we have.

  return (
    <div
      className={`app-container ${
        selectionModeActive || selectionModeArchived
          ? "selection-mode-active"
          : ""
      }`}
    >
      <Suspense fallback={null}>
        {showOnboarding && (
          <OnboardingModal
            isOpen={showOnboarding}
            onClose={handleCloseOnboarding}
          />
        )}

        {isFeedbackModalOpen && (
          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            onSubmit={handleSendFeedback}
          />
        )}
      </Suspense>

      {/* Gemini COMMENT: The Layout component wraps all our routes and provides the Header/BottomNav. */}
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              archivedCount={archivedCount}
              theme={theme}
              onToggleTheme={() =>
                setTheme((t) => (t === "light" ? "dark" : "light"))
              }
              onExportToCalendar={() => setIsExportModalOpen(true)}
              onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
              notificationPermission={notificationPermission}
              onRequestNotifications={handleRequestNotificationPermission}
              isRequestingNotifications={isRequestingNotifications}
              swRegistration={swRegistration}
            />
          }
        >
          {/* Route: Active Contacts (Home) */}
          <Route
            index
            element={
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
                              isSelected={selectedContactIds.includes(
                                contact.id
                              )}
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
                        className={`${styles.viewToggleButton} ${
                          displayMode === "list" ? styles.active : ""
                        }`}
                        onClick={() => setDisplayMode("list")}
                      >
                        List
                      </button>
                      <button
                        className={`${styles.viewToggleButton} ${
                          displayMode === "grid" ? styles.active : ""
                        }`}
                        onClick={() => setDisplayMode("grid")}
                      >
                        Grid
                      </button>
                      <button
                        className={`${styles.viewToggleButton} ${
                          displayMode === "agenda" ? styles.active : ""
                        }`}
                        onClick={() => setDisplayMode("agenda")}
                      >
                        Agenda
                      </button>
                    </div>
                  </div>
                </div>
                <Suspense fallback={<LoadingFallback />}>
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
                </Suspense>
                {/* Inline Batch Actions for Active View */}
                {selectionModeActive && (
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
              </>
            }
          />

          {/* Route: Archived Contacts */}
          <Route
            path="archived"
            element={
              <>
                {/* Gemini COMMENT: Fetch data on mount for this route effectively handled by MainApplication, 
                    but we should ensure fetchArchivedContacts is called. 
                    Ideally, we'd use a useEffect here, but since we are inside MainApplication, 
                    we'll rely on the user action or initial load logic. 
                    For now, we explicitly call fetchArchivedContacts when the component mounts? 
                    No, we'll just render the view, assuming data is populated or will be on 'view archived' action.
                    Actually, since we removed the explicit 'view' state toggle which triggered the fetch,
                    we might need to trigger it. But let's assume the initial load or previous fetch populated it.
                    Improvement: Add a useEffect in the ArchivedView wrapper or here to ensure freshness.
                */}
                <FetchArchivedWrapper fetcher={fetchArchivedContacts}>
                  <Suspense fallback={<LoadingFallback />}>
                    <ArchivedView
                      archivedContacts={archivedContacts}
                      onRestore={handleRestoreContact}
                      onDeletePermanently={handleDeletePermanently}
                      selectedArchivedIds={selectedArchivedIds}
                      onToggleArchivedSelection={handleToggleArchivedSelection}
                    />
                  </Suspense>
                </FetchArchivedWrapper>
                {selectionModeArchived && (
                  <ArchivedActionsToolbar
                    selectedCount={selectedArchivedIds.length}
                    onSelectAll={handleSelectAllArchived}
                    onClear={handleClearArchivedSelection}
                    onRestore={handleBatchRestore}
                    onDelete={handleBatchDelete}
                    totalContacts={archivedContacts.length}
                  />
                )}
              </>
            }
          />

          {/* Route: Settings */}
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>

      {/* Global Modals that can appear on any route */}
      <Suspense fallback={null}>
        {isExportModalOpen && (
          <ExportCalendarModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onGenerateFiles={generateCalendarFiles}
          />
        )}
        {(snoozingContact || isBatchSnoozing) && (
          <SnoozeModal
            contact={snoozingContact}
            isBatchMode={isBatchSnoozing}
            count={selectedContactIds.length}
            onClose={() => {
              setSnoozingContact(null);
              setIsBatchSnoozing(false);
            }}
            onSnooze={
              isBatchSnoozing
                ? handleBatchSnooze
                : (contactId, snoozeObject) => {
                    handleSnooze(contactId, snoozeObject).then(() => {
                      setSnoozingContact(null);
                    });
                  }
            }
          />
        )}
        {confirmationState.isOpen && (
          <ConfirmationModal
            isOpen={confirmationState.isOpen}
            title={confirmationState.title}
            message={confirmationState.message}
            onClose={() => setConfirmationState({ isOpen: false })}
            onConfirm={confirmationState.onConfirm}
          />
        )}
      </Suspense>
    </div>
  );
}

// Gemini COMMENT: A small wrapper component to ensure archived contacts are fetched when navigating to the route directly.
function FetchArchivedWrapper({ fetcher, children }) {
  useEffect(() => {
    fetcher();
  }, [fetcher]);
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SWProvider>
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
          <ErrorBoundary>
            <ApplicationCore />
          </ErrorBoundary>
        </SWProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
