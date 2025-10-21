import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./App.css";

// Gemini COMMENT: FINAL, SIMPLIFIED ARCHITECTURE - The entrypoint is now only responsible for rendering the App.
// All application logic, including the service worker registration, is handled within the React component tree
// to ensure the correct environment and lifecycle.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
