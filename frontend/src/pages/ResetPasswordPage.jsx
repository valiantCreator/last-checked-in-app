import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../apiConfig";
import styles from "./AuthForm.module.css";

function ResetPasswordPage() {
  // DEV COMMENT: useParams from react-router-dom extracts the token from the URL.
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // DEV COMMENT: State to track the outcome of the submission.
  const [submitStatus, setSubmitStatus] = useState({
    submitted: false,
    error: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSubmitStatus({ submitted: true, error: null });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        "An unexpected error occurred. Please try again.";
      setSubmitStatus({ submitted: true, error: errorMessage });
      console.error("Reset password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const eyeIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
      <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
    </svg>
  );

  const eyeSlashIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z" />
      <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z" />
    </svg>
  );

  const renderContent = () => {
    if (submitStatus.submitted) {
      if (submitStatus.error) {
        return (
          <div>
            <p style={{ color: "var(--danger-color)" }}>
              Error: {submitStatus.error}
            </p>
            <p>Your reset link may be expired. Please request a new one.</p>
            <p className={styles.authFormFooter}>
              <Link to="/forgot-password">Request New Link</Link>
            </p>
          </div>
        );
      } else {
        // Automatically redirect after a short delay on success
        setTimeout(() => navigate("/login"), 3000);
        return (
          <div>
            <p>Your password has been reset successfully!</p>
            <p>Redirecting you to the login page shortly...</p>
            <p className={styles.authFormFooter}>
              <Link to="/login">Login Now</Link>
            </p>
          </div>
        );
      }
    }

    return (
      <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
        <div className={styles.inputGroup}>
          <label htmlFor="password">New Password</label>
          <div className={styles.inputWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              className={styles.passwordToggleBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? eyeSlashIcon : eyeIcon}
            </button>
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <div className={styles.inputWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.passwordToggleBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? eyeSlashIcon : eyeIcon}
            </button>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="button-primary">
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    );
  };

  return (
    <div className={styles.authContainer}>
      <h1>Set a New Password</h1>
      {renderContent()}
    </div>
  );
}

export default ResetPasswordPage;
