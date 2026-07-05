// =============================================================================
// firebase-messaging-sw.js
// Required by the browser to receive FCM push notifications while the app
// tab is closed or in the background. Must be served from the SAME origin
// root as index.html (e.g. https://yourdomain.com/firebase-messaging-sw.js).
// This file cannot be merged into index.html — service workers must be a
// separate script file per the Push API / Service Worker spec.
// =============================================================================
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDPeruz_3GyjCC-E__u4_YjlI4GUPNGEV8",
  authDomain: "love-chat-6a028.firebaseapp.com",
  projectId: "love-chat-6a028",
  storageBucket: "love-chat-6a028.firebasestorage.app",
  messagingSenderId: "414710714598",
  appId: "1:414710714598:web:96881d5718093bd40eeb27"
});

const messaging = firebase.messaging();

// Background push handler — shows a system notification when a push arrives
// and the app is not in the foreground.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Aurora Chat";
  const body = (payload.notification && payload.notification.body) || "You have a new message";
  self.registration.showNotification(title, {
    body,
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%230A84FF'/></svg>",
    tag: "aurora-chat-msg",
    renotify: true
  });
});

// Focus/open the app when the notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./");
    })
  );
});
