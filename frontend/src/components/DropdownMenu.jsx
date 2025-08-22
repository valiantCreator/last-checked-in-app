// frontend/src/components/DropdownMenu.jsx

import React, { useState, useEffect, useRef } from "react";
// DEV COMMENT: Import the new CSS module for positioning and styling.
import styles from "./DropdownMenu.module.css";

function DropdownMenu({ trigger, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // This effect handles clicks outside of the dropdown to close it.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    // DEV COMMENT: All classNames now use the imported 'styles' object.
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu} role="menu">
          {React.Children.map(children, (child) =>
            React.cloneElement(child, {
              onClick: (e) => {
                if (child.props.onClick) {
                  child.props.onClick(e);
                }
                setIsOpen(false);
              },
              role: "menuitem",
            })
          )}
        </div>
      )}
    </div>
  );
}

export default DropdownMenu;
