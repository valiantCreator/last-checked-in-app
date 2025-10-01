// Gemini NEW: Create this new file at frontend/src/components/OnboardingModal.jsx
import React, { useState } from "react";
import styles from "./OnboardingModal.module.css";

function OnboardingModal({ isOpen, onClose }) {
  // Gemini FIX: Add state to track the current page of the modal.
  const [page, setPage] = useState(1);

  if (!isOpen) {
    return null;
  }

  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={handleModalContentClick}>
        <h2 className={styles.title}>Welcome to Last Checked In!</h2>

        {/* Gemini FIX: Added a new wrapper div that will handle scrolling for long content. */}
        <div className={styles.scrollableContent}>
          {page === 1 && (
            <>
              <p className={styles.intro}>
                This app helps you be more intentional with your relationships.
                Here's how to get started.
              </p>

              <div className={styles.feature}>
                <h3>➕ Add a Person</h3>
                <p>
                  Use the "Add a New Person" form to add someone you want to
                  keep in touch with. All you need is a name to start.
                </p>
              </div>

              <div className={styles.feature}>
                <h3>🗓️ Set a Reminder Frequency</h3>
                <p>
                  Decide how often you want to check in, in days. The app will
                  remind you when the date is getting close.
                </p>
              </div>
            </>
          )}

          {page === 2 && (
            <>
              <p className={styles.intro}>
                Organize your contacts and stay on track with these powerful
                features.
              </p>

              <div className={styles.feature}>
                <h3>🏷️ Organize with Tags & Filters</h3>
                <p>
                  Add tags to your contacts (like "Family" or "Work"). You can
                  then use the "Filter by Tag" dropdown to focus on specific
                  groups.
                </p>
              </div>

              <div className={styles.feature}>
                <h3>📬 Stay on Track with Notifications</h3>
                <p>
                  This app can send you push notifications when a check-in is
                  overdue. Make sure to allow notifications when your browser
                  asks for permission!
                </p>
              </div>

              <div className={styles.feature}>
                <h3>📤 Export to Your Calendar</h3>
                <p>
                  Use the 'Export' button in the header to download an{" "}
                  <code>.ics</code> file of your upcoming check-ins and
                  birthdays. You can import this file into any calendar service
                  you use, like Google Calendar or Apple Calendar.
                </p>
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.pageIndicator}>
            <span className={page === 1 ? styles.dotActive : styles.dot}></span>
            <span className={page === 2 ? styles.dotActive : styles.dot}></span>
          </div>
          <div className={styles.navigationButtons}>
            {page === 2 && (
              <button className={styles.backButton} onClick={() => setPage(1)}>
                Back
              </button>
            )}
            {page === 1 ? (
              <button className={styles.nextButton} onClick={() => setPage(2)}>
                Next
              </button>
            ) : (
              <button className={styles.closeButton} onClick={onClose}>
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingModal;
