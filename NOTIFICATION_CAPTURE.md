# Notification capture testing (Android)

When the Android app opens, it checks Notification Access. If access is missing, a full-screen prompt blocks the app and its button opens Android's Notification Access settings. The user must grant access there; Android does not allow an app to grant this access for itself. On return, the app checks again and continues only when access is enabled. The button also enables capture for the test.

Open **Profile → Notification testing** and send a new notification from any app to see it in the recent list.

This test build captures notifications from all apps, including messages with security codes. It keeps the latest 50 entries in app-private storage on the device and does not send them to Firestore or a network service. Tap **Clear** after testing. Pausing capture stops new entries; signing out pauses capture and clears stored entries.

After testing, restore provider and sensitive-content filtering before distributing the app. Notification text is display-only and must never be treated as proof of payment. Install a new Android build for native changes; an OTA JS update cannot change the listener. This feature is unavailable on iOS.
