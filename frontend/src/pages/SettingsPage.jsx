// frontend/src/pages/SettingsPage.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../hooks/useSettings";
import styles from "./SettingsPage.module.css";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { settings, loading, saving, updateNotificationHour } = useSettings();

  // Gemini COMMENT: Generate hours 0-23 for the dropdown.
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (loading) {
    return <div className={styles.container}>Loading settings...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate("/")}
          title="Back to Dashboard"
        >
          ←
        </button>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <p className={styles.description}>
          Choose when you want to receive your daily "Check-in Reminder" and
          "Birthday" notifications.
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="notificationTime" className={styles.label}>
            Daily Notification Time
          </label>
          <select
            id="notificationTime"
            className={styles.select}
            value={settings.notificationHourUtc}
            onChange={(e) => updateNotificationHour(e.target.value)}
            disabled={saving}
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {hour.toString().padStart(2, "0")}:00 UTC
              </option>
            ))}
          </select>
          <p className={styles.utcNote}>
            *Times are in Coordinated Universal Time (UTC).
            <br />
            9:00 UTC is approximately 4:00 AM (EST) / 9:00 AM (London) / 6:00 PM
            (Tokyo).
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
