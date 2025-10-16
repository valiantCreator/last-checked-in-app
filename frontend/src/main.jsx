import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./App.css";

// Gemini COMMENT: Import the new SWProvider to make the context available.
import { SWProvider } from "./context/SWContext.jsx";

// Gemini COMMENT: CRITICAL FIX - Import the SWContext itself to be used by useContext.
import { SWContext } from "./context/SWContext.jsx";

// Gemini COMMENT: This import is a "virtual module" provided by the PWA plugin.
import { registerSW } from "virtual:pwa-register";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    {/* Gemini COMMENT: Wrap the entire application with the SWProvider. */}
    <SWProvider>
      {/* 
        Gemini COMMENT: We need a component that can access the context to get the 
        `setSwRegistration` function. This component will then call `registerSW`.
      */}
      <Main />
    </SWProvider>
  </React.StrictMode>
);

// Gemini COMMENT: Create a new Main component that lives inside the SWProvider.
function Main() {
  // Gemini COMMENT: Now we can safely use the imported SWContext.
  const { setSwRegistration } = React.useContext(SWContext);

  // Gemini COMMENT: The registration logic is now inside a component that has
  // access to the context's state setter.
  React.useEffect(() => {
    registerSW({
      // Gemini COMMENT: When the SW is registered, update our context's state.
      onRegistered(registration) {
        if (registration) {
          console.log("Service Worker registered successfully.");
          setSwRegistration(registration);
        }
      },
      immediate: true,
    });
  }, [setSwRegistration]);

  return <App />;
}
