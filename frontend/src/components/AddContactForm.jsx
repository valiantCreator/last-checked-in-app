// --- React and Library Imports ---
import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../apiConfig.js'; // Import the centralized URL

// --- AddContactForm Component ---
// This component is responsible for the "Add New Person" form.
// It manages the state of its own input fields.
function AddContactForm({ 
  onContactAdded // Prop: A function passed from the parent (App.jsx) to be called when a new contact is successfully created.
}) {
  // --- State Management ---
  // This state object holds the current values of all the form fields.
  const [newContact, setNewContact] = useState({
    firstName: '',
    checkinFrequency: 7,
    howWeMet: '',
    keyFacts: '',
    birthday: ''
  });

  // --- Handlers ---

  // This function is called every time the user types in an input field.
  // It updates the `newContact` state with the new value.
  const handleNewContactChange = (e) => {
    const { name, value } = e.target;
    setNewContact(prev => ({ ...prev, [name]: value }));
  };

  // This function is called when the form is submitted.
  const handleAddContact = (e) => {
    e.preventDefault(); // Prevents the browser from reloading the page
    if (!newContact.firstName.trim()) return; // Basic validation

    // Send the new contact data to the backend API
    axios.post(`${API_URL}/contacts`, newContact)
      .then(res => {
        // If successful, call the function passed down from the parent
        // to add the new contact to the main list in App.jsx
        onContactAdded(res.data);
        
        // Reset the form fields to be empty for the next entry
        setNewContact({ firstName: '', checkinFrequency: 7, howWeMet: '', keyFacts: '', birthday: '' });
      });
  };

  // --- JSX Rendering ---
  return (
    <form onSubmit={handleAddContact} className="card form-card">
      <h2>Add New Person</h2>
      <div className="form-grid">
        <input name="firstName" value={newContact.firstName} onChange={handleNewContactChange} placeholder="First Name" required />
        <input name="howWeMet" value={newContact.howWeMet} onChange={handleNewContactChange} placeholder="How we met" />
        <input type="date" name="birthday" value={newContact.birthday} onChange={handleNewContactChange} className="full-width-field" />
        <textarea name="keyFacts" value={newContact.keyFacts} onChange={handleNewContactChange} placeholder="Key facts (e.g., loves dogs)" />
        <div className="remind-me-container">
          <label>Remind me every</label>
          <input type="number" name="checkinFrequency" value={newContact.checkinFrequency} onChange={handleNewContactChange} min="1"/>
          <label>days</label>
        </div>
      </div>
      <button type="submit" className="button-primary">Add Contact</button>
    </form>
  );
}

export default AddContactForm;
