import React, { useState } from "react";
import api from "../apiConfig";
import { toast } from "react-hot-toast";
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

    const dateFromInput = new Date(startDate);
    const userTimezoneOffset = dateFromInput.getTimezoneOffset() * 60000;
    const localDate = new Date(dateFromInput.getTime() + userTimezoneOffset);
    const fullIsoDate = localDate.toISOString();

    const newContact = {
      firstName: firstName.trim(),
      checkinFrequency: parseInt(checkinFrequency, 10),
      lastCheckin: fullIsoDate,
      howWeMet: howWeMet.trim(),
      keyFacts: keyFacts.trim(),
      birthday: birthday || null,
    };

    try {
      await api.post("/contacts", newContact);
      onContactAdded();
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
    <div className={`card ${styles.formCard}`}>
      <h2>Add a New Person</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            // DEV COMMENT: Changed placeholder text from "First Name" to "Name".
            placeholder="Name"
            required
            className={styles.fullWidthField}
          />
          <input
            type="text"
            value={howWeMet}
            onChange={(e) => setHowWeMet(e.target.value)}
            placeholder="How we met"
          />
          {/* DEV COMMENT: Wrapped the date input to apply the custom placeholder style. */}
          <div className={styles.dateInputWrapper}>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              // DEV COMMENT: A conditional class hides the browser's default date format text.
              className={!birthday ? styles.dateInputEmpty : ""}
            />
          </div>
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
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Person"}
        </button>
      </form>
    </div>
  );
}

export default AddContactForm;
