// Gemini NEW: Create this new file at frontend/src/components/FeedbackModal.jsx
import React, { useState } from "react";
import styles from "./FeedbackModal.module.css";

function FeedbackModal({ isOpen, onClose, onSubmit }) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  const handleSubmit = async () => {
    if (feedback.trim().length < 10) {
      // For this modal, we'll use a simple alert for validation.
      alert("Please provide at least 10 characters of feedback.");
      return;
    }
    setIsSubmitting(true);
    // The onSubmit prop is an async function passed down from App.jsx
    await onSubmit(feedback);
    setIsSubmitting(false);
    setFeedback(""); // Clear feedback after successful submission
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={handleModalContentClick}>
        <h2 className={styles.title}>Send Feedback</h2>
        <p className={styles.intro}>
          Have a suggestion or found a bug? Let us know!
        </p>
        <textarea
          className={styles.feedbackTextarea}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Your feedback is valuable..."
          rows="6"
        />
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackModal;
