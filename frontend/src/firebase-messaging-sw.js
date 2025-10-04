// This import is required by the PWA plugin's build process.
import { precacheAndRoute } from "workbox-precaching";

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Gemini COMMENT: CRITICAL FIX - This line is the placeholder that the PWA build plugin
// looks for. It will be replaced with a list of your app's files (JS, CSS, etc.)
// to be pre-cached for offline use. This solves the build error.
precacheAndRoute(self.__WB_MANIFEST || []);

// Securely access the env variables that Vite makes available during the build.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log("[Service Worker] onBackgroundMessage received: ", payload);
});

self.addEventListener("notificationclick", function (event) {
  console.log("[Service Worker] Notification click Received.");
  const rootUrl = new URL("/", location).href;
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url == rootUrl && "focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(rootUrl);
      })
  );
});
