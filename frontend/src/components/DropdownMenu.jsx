// frontend/src/components/DropdownMenu.jsx

import React, { useState, useEffect, useRef } from "react";

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

    // Add the event listener when the dropdown is open.
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup function to remove the listener.
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]); // Only re-run if isOpen changes.

  const handleToggle = (e) => {
    e.stopPropagation(); // Prevent the click from bubbling up.
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </button>
      {isOpen && (
        <div className="dropdown-menu" role="menu">
          {/* We map over children to ensure each gets the necessary props and behavior */}
          {React.Children.map(children, (child) =>
            React.cloneElement(child, {
              onClick: (e) => {
                // If the child has its own onClick, call it.
                if (child.props.onClick) {
                  child.props.onClick(e);
                }
                // Then, close the menu.
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
