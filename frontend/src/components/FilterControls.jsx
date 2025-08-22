// --- React and Library Imports ---
import React from "react";
// DEV COMMENT: Import the CSS Module for this component.
import styles from "./FilterControls.module.css";

// --- FilterControls Component ---
// This component displays all the controls for filtering and sorting the main contact list.
function FilterControls({
  // --- Props ---

  // Props for the global search functionality
  globalSearchTerm,
  onGlobalSearchChange,
  onSearchSubmit,
  isSearchFocused,
  onSearchFocus,
  onSearchBlur,
  searchResults,
  onClearSearch,
  debouncedGlobalSearch,
  onSearchResultClick,

  // Props for the sorting functionality
  sortBy,
  onSortByChange,
  sortDirection,
  onToggleSortDirection,

  // Props for the tag filter functionality
  selectedTagId,
  onSelectedTagChange,
  allTags,
}) {
  return (
    // DEV COMMENT: Combine the global 'card' class with the local module class.
    <div className={`card ${styles.filterControls}`}>
      {/* --- Global Search Bar --- */}
      <form className={styles.searchContainer} onSubmit={onSearchSubmit}>
        <input
          type="text"
          placeholder="Search contacts and notes..."
          value={globalSearchTerm}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          className={styles.searchInput}
        />
        {/* The clear button only appears when a search is "locked in" */}
        {debouncedGlobalSearch && (
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={onClearSearch}
          >
            X
          </button>
        )}

        {/* The results dropdown only appears when the input is focused and there are results */}
        {isSearchFocused && searchResults && (
          <div className={styles.searchResults}>
            {searchResults.contacts.length > 0 && (
              <div className={styles.resultsSection}>
                <h4>Contacts</h4>
                <ul>
                  {searchResults.contacts.map((c) => (
                    <li
                      key={`c-${c.id}`}
                      onMouseDown={() => onSearchResultClick(c.name)}
                    >
                      {c.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {searchResults.notes.length > 0 && (
              <div className={styles.resultsSection}>
                <h4>Notes</h4>
                <ul>
                  {searchResults.notes.map((n) => (
                    <li
                      key={`n-${n.id}`}
                      onMouseDown={() => onSearchResultClick(n.content)}
                    >
                      "{n.content.substring(0, 30)}..."
                      <span className={styles.noteContactName}>
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
                <p className={styles.noResults}>No results found.</p>
              )}
          </div>
        )}
      </form>

      {/* --- Sort and Tag Filter Controls --- */}
      <div className={styles.sortControls}>
        <select
          className={styles.sortDropdown}
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
        >
          <option value="newestFirst">Sort by: Date Added</option>
          <option value="closestCheckin">Sort by: Closest Check-in</option>
          <option value="mostOverdue">Sort by: Most Overdue</option>
          <option value="nameAZ">Sort by: Name (A-Z)</option>
        </select>
        <button
          className={styles.sortDirectionButton}
          onClick={onToggleSortDirection}
          title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
        >
          {sortDirection === "asc" ? "↑" : "↓"}
        </button>
      </div>
      <select
        className={styles.tagFilterDropdown}
        value={selectedTagId}
        onChange={(e) => onSelectedTagChange(e.target.value)}
      >
        <option value="">Filter by Tag: All</option>
        {allTags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FilterControls;
