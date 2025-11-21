// frontend/src/components/Layout.jsx

import React from "react";
import { Outlet } from "react-router-dom"; // Gemini COMMENT: Outlet renders the child route.
import Header from "./Header";
import BottomNav from "./BottomNav";
import useMediaQuery from "../hooks/useMediaQuery";
import styles from "./Layout.module.css";

const Layout = (props) => {
  // Gemini COMMENT: We pass all props down to Header (like theme, counts, etc.)
  // This ensures the Header continues to function as a "smart" component.
  const isMobile = useMediaQuery("(max-width: 500px)");

  return (
    <div className={styles.layoutContainer}>
      {/* Header is always rendered, but its internal content adapts via props */}
      <Header {...props} />

      <main className={styles.mainContent}>
        {/* The active page (Home, Archived, Settings) renders here */}
        <Outlet />
      </main>

      {/* Only show BottomNav on mobile devices */}
      {isMobile && <BottomNav />}
    </div>
  );
};

export default Layout;
