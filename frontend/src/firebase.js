// Gemini COMMENT: Import only the necessary functions from the Firebase SDK.
// This is crucial for tree-shaking and reducing the final bundle size.
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import api from "./apiConfig.js";

// Gemini COMMENT: SECURITY FIX - The Firebase config is now loaded from environment variables.
// The hardcoded keys have been removed to prevent them from being exposed in the source code.
// Vite exposes environment variables prefixed with `VITE_` on the `import.meta.env` object.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase with your configuration
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Gemini COMMENT: It's better practice to also store this VAPID key as an environment variable.
const VAPID_KEY =
  "BO0L9UFpX0v6bo3AoYtuBQEBKLVQi1SNZoMgR-Gp5_wgSSb6cJxARGlyEaygEPTy9Ybc57GHJK-ignlou8IWwhw";

// This function now uses async/await and correctly returns the token
export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (currentToken) {
      await api.post("/devices/token", { token: currentToken });
      console.log("FCM Token successfully sent to server.");
      return currentToken; // <-- Explicitly return the token on success
    } else {
      console.log(
        "No registration token available. Request permission to generate one."
      );
      return null; // <-- Return null on failure
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
    return null; // <-- Return null on error
  }
};
