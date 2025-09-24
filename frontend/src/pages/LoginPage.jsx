import React, { useState, useContext, useEffect } from "react"; // Gemini NEW: Imported useEffect
import { Link, useSearchParams } from "react-router-dom"; // Gemini NEW: Imported useSearchParams
import AuthContext from "../context/AuthContext";
import { toast } from "react-hot-toast";
import styles from "./AuthForm.module.css";

function LoginPage() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Gemini NEW: Get access to the URL's search parameters.
  const [searchParams, setSearchParams] = useSearchParams();

  // Gemini NEW: This effect runs when the component loads to check for our specific redirect reason.
  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      toast.error("Your session has expired. Please log in again.");
      // Gemini NEW: It's good practice to remove the query parameter from the URL
      // after we've displayed the message. This prevents the message from
      // re-appearing if the user refreshes the login page.
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]); // Effect dependencies

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      toast.error(error.message || "Failed to login.");
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

  return (
    <div className={styles.authContainer}>
      <h1>Login</h1>
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
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <div className={styles.inputWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.passwordToggleBtn}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? eyeSlashIcon : eyeIcon}
            </button>
          </div>
          {/* DEV COMMENT: Added the "Forgot Password?" link that directs to our new page. */}
          <Link to="/forgot-password" className={styles.forgotPasswordLink}>
            Forgot Password?
          </Link>
        </div>
        {/* Gemini DEV COMMENT: Replaced global 'button-primary' with the modular 'submitButton' class. */}
        <button
          type="submit"
          disabled={isLoading}
          className={styles.submitButton}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className={styles.authFormFooter}>
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
      {/* Gemini DEV COMMENT: Added a footer section for legal document links. */}
      <div className={styles.legalLinks}>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <span>&nbsp;|&nbsp;</span>
        <Link to="/terms-of-service">Terms of Service</Link>
      </div>
    </div>
  );
}

export default LoginPage;
