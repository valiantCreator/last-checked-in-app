// src/hooks/useSelection.js

import { useState, useMemo } from "react";

// DEV COMMENT: This hook manages the state for batch-selecting items in both active and archived views.
export const useSelection = () => {
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedArchivedIds, setSelectedArchivedIds] = useState([]);

  // --- Handlers for Active Contacts ---
  const handleToggleSelection = (contactId) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleClearSelection = () => {
    setSelectedContactIds([]);
  };

  // --- Handlers for Archived Contacts ---
  const handleToggleArchivedSelection = (contactId) => {
    setSelectedArchivedIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleClearArchivedSelection = () => {
    setSelectedArchivedIds([]);
  };

  // --- Derived State ---
  // Memoize these values to prevent unnecessary re-renders.
  const selectionModeActive = useMemo(
    () => selectedContactIds.length > 0,
    [selectedContactIds]
  );
  const selectionModeArchived = useMemo(
    () => selectedArchivedIds.length > 0,
    [selectedArchivedIds]
  );

  return {
    // Active selection state and handlers
    selectedContactIds,
    setSelectedContactIds,
    handleToggleSelection,
    handleClearSelection,
    selectionModeActive,

    // Archived selection state and handlers
    selectedArchivedIds,
    setSelectedArchivedIds,
    handleToggleArchivedSelection,
    handleClearArchivedSelection,
    selectionModeArchived,
  };
};
