import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../apiConfig.js';

function AddContactForm({ onContactAdded }) {
  const [firstName, setFirstName] = useState('');
  const [checkinFrequency, setCheckinFrequency] = useState(7);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  // --- RE-ADDED: State for the missing fields ---
  const [howWeMet, setHowWeMet] = useState('');
  const [keyFacts, setKeyFacts] = useState('');
  const [birthday, setBirthday] = useState('');


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !checkinFrequency) return;

    const newContact = {
      firstName: firstName.trim(),
      checkinFrequency: parseInt(checkinFrequency, 10),
      lastCheckin: startDate,
      // --- RE-ADDED: Include missing fields in the submission ---
      howWeMet: howWeMet.trim(),
      keyFacts: keyFacts.trim(),
      birthday: birthday,
    };

    axios.post(`${API_URL}/contacts`, newContact)
      .then(res => {
        onContactAdded(res.data);
        // Reset all fields after submission
        setFirstName('');
        setCheckinFrequency(7);
        setStartDate(new Date().toISOString().split('T')[0]);
        setHowWeMet('');
        setKeyFacts('');
        setBirthday('');
      })
      .catch(err => console.error("Error adding contact:", err));
  };

  return (
    <div className="card form-card">
      <h2>Add a New Person</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            required
            className="full-width-field"
          />
          {/* --- RE-ADDED: The missing input fields --- */}
          <input
            type="text"
            value={howWeMet}
            onChange={(e) => setHowWeMet(e.target.value)}
            placeholder="How we met"
          />
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <textarea
            value={keyFacts}
            onChange={(e) => setKeyFacts(e.target.value)}
            placeholder="Key facts (optional)"
            rows="3"
            className="full-width-field"
          ></textarea>

          <div className="remind-me-container">
            <label>Remind every</label>
            <input
              type="number"
              value={checkinFrequency}
              onChange={(e) => setCheckinFrequency(e.target.value)}
              min="1"
              required
            />
            <label>days</label>
          </div>
          <div className="start-date-container">
            <label>Starting from</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" className="button-primary">Add Person</button>
      </form>
    </div>
  );
}

export default AddContactForm;
