// Gemini NEW: Create this new file at frontend/src/components/ErrorBoundary.jsx
import React from "react";
import styles from "./ErrorBoundary.module.css";

// Error Boundaries must be class components, as the required lifecycle methods
// (getDerivedStateFromError and componentDidCatch) are not yet available in Hooks.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // The state holds a boolean that tells us whether an error has occurred.
    this.state = { hasError: false };
  }

  // This lifecycle method is called when an error is thrown in a descendant component.
  // It should return a new state object to trigger a re-render with the fallback UI.
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  // This lifecycle method is also called after an error, but it's used for
  // side effects, like logging the error to an external service. For now,
  // we'll just log it to the console for debugging.
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    // If an error has been caught, we render our custom fallback UI.
    if (this.state.hasError) {
      return (
        <div className={styles.errorBoundary}>
          <h1 className={styles.errorTitle}>Oops! Something went wrong.</h1>
          <p className={styles.errorMessage}>
            A critical error occurred, and the application can't continue.
            Please try refreshing the page.
          </p>
          <button
            className={styles.reloadButton}
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    // If there is no error, we render the children components as normal.
    return this.props.children;
  }
}

export default ErrorBoundary;
