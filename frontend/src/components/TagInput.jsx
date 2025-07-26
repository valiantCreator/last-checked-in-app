import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../apiConfig.js';

// --- TagInput Component ---
// This component provides an input field for adding tags to a contact.
// It fetches all existing tags to provide suggestions as the user types.
function TagInput({ contact, onTagAdded }) {
  // --- State ---
  const [inputValue, setInputValue] = useState(''); // The current text in the input field
  const [suggestions, setSuggestions] = useState([]); // The list of suggested tags
  const [allTags, setAllTags] = useState([]); // All unique tags in the system

  // --- Effect ---
  // Fetch all existing tags from the system once when the component first loads.
  useEffect(() => {
    axios.get(`${API_URL}/tags`).then(res => {
      if (res.data.tags) setAllTags(res.data.tags);
    });
  }, []);

  // --- Handlers ---

  // Update the input value and filter suggestions as the user types.
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (value) {
      const existingContactTagIds = contact.tags.map(t => t.id);
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(value.toLowerCase()) &&
        !existingContactTagIds.includes(tag.id)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // Add a tag to the contact, either from a suggestion click or form submission.
  const handleAddTag = (tagName) => {
    if (!tagName) return;
    axios.post(`${API_URL}/contacts/${contact.id}/tags`, { tagName })
      .then(res => {
        onTagAdded(res.data); // Callback to parent to update the contact's tags
        setInputValue('');    // Clear the input
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
    <div className="tag-input-container">
      {/* The onSubmit handler is added here */}
      <form onSubmit={handleFormSubmit}>
        <input 
          type="text" 
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Add a tag..."
          className="tag-input"
        />
      </form>
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map(tag => (
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
