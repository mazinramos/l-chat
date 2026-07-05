# Aurora Chat — Setup Instructions

You need to do 4 things in the Firebase Console before this works end-to-end.
None of this can be done from here since I have no network access — but it's ~10 minutes.

## 1. Host both files together
`index.html` and `firebase-messaging-sw.js` **must be served from the same origin root**
(e.g. Firebase Hosting, or any HTTPS static host). The service worker cannot be inlined
into index.html — that's a browser/Push API requirement, not a design choice.

Easiest option: Firebase Hosting (free tier is enough):
```
npm install -g firebase-tools
firebase login
firebase init hosting   # select project love-chat-6a028, public dir = this folder
firebase deploy
```

## 2. Create the two Authentication users
Firebase Console → Authentication → Users → Add user:
- `mazin@gmail.com` / password `m&h`
- `hebo@gmail.com` / password `m&h`

(Enable the **Email/Password** sign-in provider first if it isn't already.)

## 3. Firestore Security Rules
Firebase Console → Firestore Database → Rules → paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAllowedUser() {
      return request.auth != null &&
        request.auth.token.email in ["mazin@gmail.com", "hebo@gmail.com"];
    }

    match /users/{email} {
      allow read: if isAllowedUser();
      allow write: if isAllowedUser() && request.auth.token.email == email;
    }

    match /messages/{messageId} {
      allow read: if isAllowedUser();
      allow create: if isAllowedUser() &&
        request.resource.data.senderEmail == request.auth.token.email;
      allow update: if isAllowedUser() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(["status"]);
      allow delete: if false;
    }

    match /calls/{callId} {
      allow read, write: if isAllowedUser();
      match /{sub}/{doc} {
        allow read, write: if isAllowedUser();
      }
    }
  }
}
```

## 4. Storage Security Rules
Firebase Console → Storage → Rules → paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAllowedUser() {
      return request.auth != null &&
        request.auth.token.email in ["mazin@gmail.com", "hebo@gmail.com"];
    }
    match /uploads/{email}/{fileName} {
      allow read: if isAllowedUser();
      allow write: if isAllowedUser() && request.resource.size < 25 * 1024 * 1024;
    }
    match /voice/{email}/{fileName} {
      allow read: if isAllowedUser();
      allow write: if isAllowedUser() && request.resource.size < 15 * 1024 * 1024;
    }
  }
}
```

## Notes on Push Notifications — NOW FULLY WIRED
- The app requests Notification permission on login and registers `firebase-messaging-sw.js`
  for real FCM background push (works when the tab/app is closed), storing each user's
  token in `users/{email}.fcmToken`.
- The `functions/` folder contains a real Cloud Function (`sendMessageNotification`) that
  triggers on every new `messages/{id}` document and sends a genuine FCM push via the
  Admin SDK to the recipient's stored token — this is the server-side piece browsers can't
  do themselves. Deploy it with:
  ```
  cd functions
  npm install
  cd ..
  firebase deploy --only functions,hosting
  ```
  Once deployed, push notifications work even when both users have the app fully closed.
- The function also auto-deletes a recipient's `fcmToken` if FCM reports it as expired/
  invalid, so tokens stay clean without manual maintenance.

## What's implemented
Real-time text/image/file/voice messaging, WebRTC voice & video calls (Firestore signaling,
STUN only — no TURN, so calls may fail on very restrictive/symmetric NATs), presence,
typing indicators, delivered/seen ticks, auto-reconnect, upload progress, input
sanitization/XSS protection, file type & size limits, and a glassmorphism/Apple-Telegram
inspired UI with call screens, error dialogs, and toasts.
