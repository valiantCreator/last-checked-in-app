import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

function TagInput({ contact, onTagAdded }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/tags`).then(res => {
      if (res.data.tags) setAllTags(res.data.tags);
    });
  }, []);

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

  const handleAddTag = (tagName) => {
    if (!tagName) return;
    axios.post(`${API_URL}/contacts/${contact.id}/tags`, { tagName })
      .then(res => {
        onTagAdded(res.data);
        setInputValue('');
        setSuggestions([]);
      });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleAddTag(inputValue.trim());
  };

  return (
    <div className="tag-input-container">
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
