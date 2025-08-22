import React from "react";
// DEV COMMENT: Import the new CSS Module.
import styles from "./ThemeToggleButton.module.css";

// --- ThemeToggleButton Component ---
// This is a presentational component that displays an animated SVG icon
// for toggling between light and dark themes.
function ThemeToggleButton({ theme, onToggleTheme }) {
  // The `aria-label` provides an accessible name for the button for screen readers.
  // It dynamically changes based on the current theme.
  const label = `Switch to ${theme === "light" ? "dark" : "light"} mode`;

  return (
    <button
      // DEV COMMENT: All classNames are now scoped by the CSS module.
      className={styles.themeToggle}
      id="theme-toggle"
      title={label}
      aria-label={label}
      onClick={onToggleTheme}
    >
      <svg
        className={styles.sunAndMoon}
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        {/* The moon shape */}
        <mask className={styles.moon} id="moon-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle cx="24" cy="10" r="6" fill="black" />
        </mask>
        {/* The main circle for the sun/moon body */}
        <circle
          className={styles.sun}
          cx="12"
          cy="12"
          r="6"
          mask="url(#moon-mask)"
          fill="currentColor"
        />
        {/* The sunbeams, which will animate */}
        <g className={styles.sunBeams} stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </button>
  );
}

export default ThemeToggleButton;
