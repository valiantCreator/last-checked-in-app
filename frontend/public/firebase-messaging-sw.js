// This file MUST be in the 'public' directory
// Import the Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// --- IMPORTANT ---
// Paste your own firebaseConfig object here

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDeLrFceFzBr0lbACkPBm7Xva_PtMsFHeg",
  authDomain: "last-checked-in.firebaseapp.com",
  projectId: "last-checked-in",
  storageBucket: "last-checked-in.firebasestorage.app",
  messagingSenderId: "813141602060",
  appId: "1:813141602060:web:792d25a43a9ccf3f152329",
  measurementId: "G-6PW5VDQPJQ"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// --- NOTIFICATION CLICK LISTENER ---
// This handles what happens when a user clicks on the notification
// that Firebase automatically displays.
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  const rootUrl = new URL('/', location).href;
  event.notification.close();
  // This looks for an existing window and focuses it.
  // If one doesn't exist, it opens a new one.
  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url == rootUrl && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow(rootUrl);
    })
  );
});

// The onBackgroundMessage handler is a fallback and can be useful for
// handling data-only messages, but is not strictly needed for messages
// that have a 'notification' payload, which are handled automatically.
messaging.onBackgroundMessage(function(payload) {
  console.log('[Service Worker] onBackgroundMessage received: ', payload);
});