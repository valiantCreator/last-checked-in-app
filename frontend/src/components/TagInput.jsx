import React, { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import api from "../apiConfig";
// DEV COMMENT: Import the CSS Module.
import styles from "./TagInput.module.css";

// --- TagInput Component ---
// This component provides an input field for adding tags to a contact.
// It fetches tag suggestions from the server as the user types.
function TagInput({ contact, onTagAdded }) {
  // --- State ---
  const [inputValue, setInputValue] = useState(""); // The current text in the input field
  const [suggestions, setSuggestions] = useState([]); // The list of suggested tags

  // --- Debounced Server-Side Search ---
  // PERF REFACTOR: Instead of fetching ALL tags on mount and filtering client-side,
  // we now debounce the input and search on the server. This scales to thousands of tags.
  const debouncedSearch = useDebouncedCallback((query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    api
      .get(`/tags/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (res.data.tags) {
          // Filter out tags that are already on this contact
          const existingContactTagIds = contact.tags.map((t) => t.id);
          const filtered = res.data.tags.filter(
            (tag) => !existingContactTagIds.includes(tag.id)
          );
          setSuggestions(filtered);
        }
      })
      .catch((err) => console.error("Tag search failed:", err));
  }, 300);

  // --- Handlers ---

  // Update the input value and trigger debounced search as the user types.
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  // Add a tag to the contact, either from a suggestion click or form submission.
  const handleAddTag = (tagName) => {
    if (!tagName) return;
    api.post(`/contacts/${contact.id}/tags`, { tagName }).then((res) => {
      onTagAdded(res.data); // Callback to parent to update the contact's tags
      setInputValue(""); // Clear the input
      setSuggestions([]); // Clear suggestions
    });
  };

  // This function is called when the form is submitted (i.e., user presses Enter).
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleAddTag(inputValue.trim());
  };

  // --- JSX Rendering ---
  return (
    <div className={styles.tagInputContainer}>
      <form onSubmit={handleFormSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Search or create tags..."
          className={styles.tagInput}
        />
      </form>
      {suggestions.length > 0 && (
        <ul className={styles.suggestionsList}>
          {suggestions.map((tag) => (
            <li key={tag.id} onClick={() => handleAddTag(tag.name)}>
              {tag.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TagInput;
