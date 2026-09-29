package com.toppay.notificationcapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

internal object NotificationStore {
  const val PREFS = "toppay_payment_notification_capture"
  const val ENABLED = "enabled"
  const val EVENTS = "events"
  const val MAX_EVENTS = 50
}

class PaymentNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return
    val prefs = getSharedPreferences(NotificationStore.PREFS, MODE_PRIVATE)
    if (!prefs.getBoolean(NotificationStore.ENABLED, false)) return

    val extras = sbn.notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
    val body = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim().orEmpty()

    val entry = JSONObject()
      .put("id", "${sbn.key}:${sbn.postTime}")
      .put("provider", sbn.packageName)
      .put("title", title.take(120))
      .put("body", body.take(300))
      .put("timestamp", sbn.postTime)

    synchronized(NotificationStore) {
      val existing = try {
        JSONArray(prefs.getString(NotificationStore.EVENTS, "[]"))
      } catch (_: Exception) {
        JSONArray()
      }
      val updated = JSONArray().put(entry)
      for (index in 0 until minOf(existing.length(), NotificationStore.MAX_EVENTS - 1)) {
        val previous = existing.optJSONObject(index) ?: continue
        if (previous.optString("id") != entry.optString("id")) updated.put(previous)
      }
      prefs.edit().putString(NotificationStore.EVENTS, updated.toString()).apply()
    }
  }
}
