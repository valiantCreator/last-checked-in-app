import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../apiConfig";
import styles from "./AuthForm.module.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      // DEV COMMENT: Set a submitted state to show a confirmation message to the user.
      setIsSubmitted(true);
    } catch (error) {
      // DEV COMMENT: Even on error, we show a generic success message to prevent email enumeration.
      // The actual error is logged to the console for debugging.
      console.error("Forgot password error:", error);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <h1>Reset Password</h1>
      {isSubmitted ? (
        // DEV COMMENT: After submission, show a confirmation message instead of the form.
        <div>
          <p>
            If an account with that email exists, a password reset link has been
            sent. Please check your inbox.
          </p>
          <p className={styles.authFormFooter}>
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      ) : (
        <>
          <p>
            Enter your email address and we will send you a link to reset your
            password.
          </p>
          <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="button-primary"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <p className={styles.authFormFooter}>
            Remember your password? <Link to="/login">Login</Link>
          </p>
        </>
      )}
    </div>
  );
}

export default ForgotPasswordPage;
