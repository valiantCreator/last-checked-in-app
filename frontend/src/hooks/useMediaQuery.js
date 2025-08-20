// frontend/src/hooks/useMediaQuery.js

import { useState, useEffect } from "react";

/**
 * Custom hook for tracking the state of a media query.
 * @param {string} query The media query string to watch (e.g., '(max-width: 768px)').
 * @returns {boolean} True if the media query matches, false otherwise.
 */
function useMediaQuery(query) {
  // State to hold whether the media query matches or not.
  // It checks for a match on initial render.
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    // Get the MediaQueryList object.
    const mediaQueryList = window.matchMedia(query);

    // Define the event listener to update state when the match status changes.
    const handleChange = (event) => {
      setMatches(event.matches);
    };

    // Add the listener. We use the modern addEventListener method for compatibility.
    mediaQueryList.addEventListener("change", handleChange);

    // This is the cleanup function that React runs when the component unmounts.
    // It's crucial to remove the listener to prevent memory leaks.
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]); // The effect re-runs only if the query string itself changes.

  return matches;
}

export default useMediaQuery;
