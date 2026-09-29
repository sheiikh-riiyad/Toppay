package com.toppay.notificationcapture

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ToppayNotificationCapture")

    Function("isAccessEnabled") {
      val context = appContext.reactContext ?: return@Function false
      val component = ComponentName(context, PaymentNotificationListener::class.java)
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: ""
      enabled.split(':').any { ComponentName.unflattenFromString(it) == component }
    }

    Function("isCaptureEnabled") {
      val context = appContext.reactContext ?: return@Function false
      context.getSharedPreferences(NotificationStore.PREFS, Context.MODE_PRIVATE)
        .getBoolean(NotificationStore.ENABLED, false)
    }

    Function("setCaptureEnabled") { enabled: Boolean ->
      val context = appContext.reactContext ?: return@Function null
      context.getSharedPreferences(NotificationStore.PREFS, Context.MODE_PRIVATE)
        .edit().putBoolean(NotificationStore.ENABLED, enabled).apply()
    }

    Function("openAccessSettings") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("getEventsJson") {
      val context = appContext.reactContext ?: return@Function "[]"
      context.getSharedPreferences(NotificationStore.PREFS, Context.MODE_PRIVATE)
        .getString(NotificationStore.EVENTS, "[]") ?: "[]"
    }

    Function("clearEvents") {
      val context = appContext.reactContext ?: return@Function null
      context.getSharedPreferences(NotificationStore.PREFS, Context.MODE_PRIVATE)
        .edit().remove(NotificationStore.EVENTS).apply()
    }
  }
}
