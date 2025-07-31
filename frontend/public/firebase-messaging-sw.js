// This file MUST be in the 'public' directory
// Import the Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// --- IMPORTANT ---
// Paste your own firebaseConfig object here

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// --- NEW PUSH EVENT LISTENER ---
// This is the standard PWA event listener for incoming push messages.
// It's more reliable on mobile devices.
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  // The 'data' payload is sent from our server.
  const pushData = event.data.json();

  const title = pushData.data.title || 'New Notification';
  const options = {
    body: pushData.data.body || 'Something new happened!',
    icon: '/LogoV1.png', // Main app icon
    badge: '/LogoV1.png', // A smaller icon for the notification bar
    data: {
      // We can pass a URL to open when the notification is clicked
      url: self.location.origin, 
    },
  };

  // This command tells the browser to display the notification.
  event.waitUntil(self.registration.showNotification(title, options));
});


// --- NEW NOTIFICATION CLICK LISTENER ---
// This handles what happens when a user clicks on the notification.
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification pop-up
  event.notification.close();

  // Open the app's URL
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// We are keeping this here as a fallback, but the 'push' event listener above is now primary.
messaging.onBackgroundMessage(function(payload) {
  console.log('onBackgroundMessage received: ', payload);
  // Note: If the 'push' event is firing, this may not be needed.
  // It's good to have as a backup.
});
