import React, { useState } from "react";
import api from "../apiConfig";
import { toast } from "react-hot-toast";
// DEV COMMENT: Import the new CSS Module. This scopes all class names.
import styles from "./AddContactForm.module.css";

function AddContactForm({ onContactAdded }) {
  const [firstName, setFirstName] = useState("");
  const [checkinFrequency, setCheckinFrequency] = useState(7);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [howWeMet, setHowWeMet] = useState("");
  const [keyFacts, setKeyFacts] = useState("");
  const [birthday, setBirthday] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !checkinFrequency) return;

    setIsLoading(true);

    // --- TIMEZONE FIX ---
    // The date from the input is a string like "2025-08-17". new Date() treats this as midnight UTC.
    // We must adjust it to be midnight in the user's local timezone.
    const dateFromInput = new Date(startDate);
    const userTimezoneOffset = dateFromInput.getTimezoneOffset() * 60000; // Offset in milliseconds
    const localDate = new Date(dateFromInput.getTime() + userTimezoneOffset);
    const fullIsoDate = localDate.toISOString();
    // --- END FIX ---

    const newContact = {
      // The backend expects camelCase from Zod, let's send that
      firstName: firstName.trim(),
      checkinFrequency: parseInt(checkinFrequency, 10),
      lastCheckin: fullIsoDate, // Use the corrected local date
      howWeMet: howWeMet.trim(),
      keyFacts: keyFacts.trim(),
      birthday: birthday || null,
    };

    try {
      // We don't need the response data because we are refetching
      await api.post("/contacts", newContact);
      onContactAdded(); // This now just triggers a refetch in App.jsx

      // Reset all fields after submission
      setFirstName("");
      setCheckinFrequency(7);
      setStartDate(new Date().toISOString().split("T")[0]);
      setHowWeMet("");
      setKeyFacts("");
      setBirthday("");
    } catch (err) {
      console.error("Error adding contact:", err);
      if (err.response && err.response.status === 400) {
        toast.error("Please make sure all fields are filled out correctly.");
      } else {
        toast.error(err.response?.data?.error || "Could not add contact.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // DEV COMMENT: Use template literals to combine the global 'card' class with the module class.
    <div className={`card ${styles.formCard}`}>
      <h2>Add a New Person</h2>
      <form onSubmit={handleSubmit}>
        {/* DEV COMMENT: All component-specific classNames are now replaced with the 'styles' object. */}
        <div className={styles.formGrid}>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            required
            // DEV COMMENT: The 'fullWidthField' class is now scoped via the module.
            className={styles.fullWidthField}
          />
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
            className={styles.fullWidthField}
          ></textarea>
          <div className={styles.remindMeContainer}>
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
          <div className={styles.startDateContainer}>
            <label>Starting from</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
        </div>
        {/* DEV COMMENT: The 'button-primary' class is global and remains a string. */}
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Person"}
        </button>
      </form>
    </div>
  );
}

export default AddContactForm;
