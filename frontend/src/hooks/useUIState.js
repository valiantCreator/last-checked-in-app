// src/hooks/useUIState.js

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import api from "../apiConfig.js";

// DEV COMMENT: This hook manages all state related to the UI's appearance and behavior.
export const useUIState = () => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme-preference");
    if (savedTheme) return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [sortBy, setSortBy] = useState("newestFirst");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [view, setView] = useState("active");
  const [displayMode, setDisplayMode] = useState("list");
  const [detailedItemId, setDetailedItemId] = useState(null);
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
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [isRequestingNotifications, setIsRequestingNotifications] =
    useState(false);

  // Effect to update the DOM and localStorage when the theme changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme-preference", theme);
  }, [theme]);

  // Effect to perform a search when the debounced search term changes.
  useEffect(() => {
    if (debouncedGlobalSearch) {
      api
        .get(`/search?q=${debouncedGlobalSearch}`)
        .then((res) => setSearchResults(res.data.results));
    } else {
      setSearchResults(null);
    }
  }, [debouncedGlobalSearch]);

  return {
    // State values
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
    notificationPermission,
    isRequestingNotifications,

    // State setters
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
    setNotificationPermission,
    setIsRequestingNotifications,
  };
};
