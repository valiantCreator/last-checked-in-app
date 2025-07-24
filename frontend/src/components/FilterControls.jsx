// --- React and Library Imports ---
import React from 'react';

// --- FilterControls Component ---
// This component displays the search, sort, and tag filter inputs.
// It is a "dumb" component that receives all its values and functions as props from the parent (App.jsx).
function FilterControls({
  // Props for the search functionality
  globalSearchTerm,
  onGlobalSearchChange,
  onSearchSubmit,
  isSearchFocused,
  onSearchFocus,
  onSearchBlur,
  searchResults,
  onClearSearch,
  debouncedGlobalSearch,

  // Props for the sorting functionality
  sortBy,
  onSortByChange,
  sortDirection,
  onToggleSortDirection,

  // Props for the tag filter functionality
  selectedTagId,
  onSelectedTagChange,
  allTags
}) {
  return (
    <div className="card filter-controls">
      {/* --- Global Search Bar --- */}
      <form className="search-container" onSubmit={onSearchSubmit}>
        <input
          type="text"
          placeholder="Search contacts and notes..."
          value={globalSearchTerm}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          className="search-input"
        />
        {/* The clear button only appears when a search is "locked in" */}
        {debouncedGlobalSearch && <button type="button" className="clear-search-button" onClick={onClearSearch}>X</button>}
        
        {/* The results dropdown only appears when the input is focused and there are results */}
        {isSearchFocused && searchResults && (
          <div className="search-results">
            {searchResults.contacts.length > 0 && (
              <div className="results-section">
                <h4>Contacts</h4>
                <ul>
                  {searchResults.contacts.map(c => <li key={`c-${c.id}`} onMouseDown={() => onGlobalSearchChange(c.firstName)}>{c.firstName}</li>)}
                </ul>
              </div>
            )}
            {searchResults.notes.length > 0 && (
              <div className="results-section">
                <h4>Notes</h4>
                <ul>
                  {searchResults.notes.map(n => (
                    <li key={`n-${n.id}`} onMouseDown={() => onGlobalSearchChange(n.content)}>
                      "{n.content.substring(0, 30)}..."
                      <span className="note-contact-name">({n.contactFirstName})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {searchResults.contacts.length === 0 && searchResults.notes.length === 0 && debouncedGlobalSearch && (
              <p className="no-results">No results found.</p>
            )}
          </div>
        )}
      </form>

      {/* --- Sort and Tag Filter Controls --- */}
      <div className="sort-controls">
        <select className="sort-dropdown" value={sortBy} onChange={(e) => onSortByChange(e.target.value)}>
          <option value="newestFirst">Sort by: Date Added</option>
          <option value="closestCheckin">Sort by: Closest Check-in</option>
          <option value="mostOverdue">Sort by: Most Overdue</option>
          <option value="nameAZ">Sort by: Name (A-Z)</option>
        </select>
        <button className="sort-direction-button" onClick={onToggleSortDirection} title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      <select className="tag-filter-dropdown" value={selectedTagId} onChange={(e) => onSelectedTagChange(e.target.value)}>
        <option value="">Filter by Tag: All</option>
        {allTags.map(tag => (
          <option key={tag.id} value={tag.id}>{tag.name}</option>
        ))}
      </select>
    </div>
  );
}

export default FilterControls;
