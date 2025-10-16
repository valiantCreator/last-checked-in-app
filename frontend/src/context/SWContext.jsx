// Gemini COMMENT: Create a new context to hold the service worker registration object.
// This allows us to access the registration from any component in the application,
// preventing the need to prop-drill it down the component tree.
import React, { createContext, useState } from "react";

export const SWContext = createContext();

export const SWProvider = ({ children }) => {
  // Gemini COMMENT: State to hold the registration object once it's available.
  const [swRegistration, setSwRegistration] = useState(null);

  return (
    <SWContext.Provider value={{ swRegistration, setSwRegistration }}>
      {children}
    </SWContext.Provider>
  );
};
