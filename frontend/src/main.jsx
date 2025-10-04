import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./App.css";

// Gemini COMMENT: FIX - This is the final, correct way to register the service worker.
// We import a "virtual module" provided by the PWA plugin, which handles all the
// complex registration logic for us.
import { registerSW } from "virtual:pwa-register";

// This call tells the plugin to register our service worker immediately.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
