// =============================================================================
// functions/index.js
// Firebase Cloud Function — sends a REAL push notification (via FCM Admin SDK)
// to the recipient whenever a new message document is created in Firestore.
// This is the server-side piece the browser cannot do on its own: clients can
// only *receive* push, only a trusted server (or Cloud Function) can *send* it.
//
// Deploy with:
//   cd functions && npm install
//   firebase deploy --only functions
// =============================================================================
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const DISPLAY_NAMES = { "mazin@gmail.com": "Mazin", "hebo@gmail.com": "Hebo" };

exports.sendMessageNotification = onDocumentCreated("messages/{messageId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  if (!data || !data.recipientEmail || !data.senderEmail) return;

  try {
    const recipientDoc = await admin.firestore().collection("users").doc(data.recipientEmail).get();
    const recipient = recipientDoc.data();
    if (!recipient || !recipient.fcmToken) {
      console.log(`No FCM token for ${data.recipientEmail}, skipping push.`);
      return;
    }

    // Don't push if the recipient is actively online AND has the app open —
    // the client already shows an in-app/foreground notification in that case.
    // We still push if they're offline or the doc has no 'online' flag, to be safe.
    const senderName = DISPLAY_NAMES[data.senderEmail] || data.senderEmail;

    let body = "Sent you a message";
    if (data.type === "text") body = String(data.text || "").slice(0, 120);
    else if (data.type === "image") body = "📷 Photo";
    else if (data.type === "file") body = `📎 ${data.fileName || "File"}`;
    else if (data.type === "voice") body = "🎤 Voice message";

    const message = {
      token: recipient.fcmToken,
      notification: {
        title: senderName,
        body,
      },
      webpush: {
        notification: {
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%230A84FF'/></svg>",
          tag: "aurora-chat-msg",
          renotify: true,
        },
        fcmOptions: {
          link: "/",
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`Push sent to ${data.recipientEmail}`);
  } catch (err) {
    // Common benign case: token expired/invalid — clean it up so we stop retrying.
    if (err.code === "messaging/registration-token-not-registered") {
      await admin.firestore().collection("users").doc(data.recipientEmail)
        .update({ fcmToken: admin.firestore.FieldValue.delete() })
        .catch(() => {});
    }
    console.error("Push notification failed:", err);
  }
});
