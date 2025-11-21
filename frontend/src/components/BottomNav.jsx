// frontend/src/components/BottomNav.jsx

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./BottomNav.module.css";

const BottomNav = () => {
  const location = useLocation();

  // Gemini COMMENT: Helper to scroll to top if user taps "Home" while already on Home.
  const handleHomeClick = (e) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav className={styles.bottomNav}>
      <NavLink
        to="/"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ""}`
        }
        onClick={handleHomeClick}
      >
        <span className={styles.icon}>🏠</span>
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/archived"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ""}`
        }
      >
        <span className={styles.icon}>📥</span>
        <span>Archived</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ""}`
        }
      >
        <span className={styles.icon}>⚙️</span>
        <span>Settings</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
