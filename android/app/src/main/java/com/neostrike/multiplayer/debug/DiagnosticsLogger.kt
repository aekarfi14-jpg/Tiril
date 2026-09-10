package com.neostrike.multiplayer.debug

import android.content.Context
import android.net.wifi.WifiManager
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import java.net.Inet4Address
import java.net.NetworkInterface
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class LogEntry(
    val timestamp: String,
    val message: String
)

object DiagnosticsLogger {
    val logs = mutableStateListOf<LogEntry>()
    val wifiStatus = mutableStateOf("Checking...")
    val localIp = mutableStateOf("0.0.0.0")
    val hostIp = mutableStateOf("-")
    val port = mutableStateOf(8888)
    val discoveryStatus = mutableStateOf("Idle")
    val roomsDiscoveredCount = mutableStateOf(0)
    val lastDiscoveryTime = mutableStateOf("-")
    val connectionState = mutableStateOf("DISCONNECTED")
    val connectedPlayers = mutableStateListOf<String>()
    val lastMessageSent = mutableStateOf("-")
    val lastMessageReceived = mutableStateOf("-")
    val connectionErrors = mutableStateOf("None")
    val disconnectReason = mutableStateOf("None")

    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    fun log(event: String) {
        val time = timeFormat.format(Date())
        val entry = LogEntry(time, event)
        logs.add(0, entry)
        if (logs.size > 200) {
            logs.removeAt(logs.lastIndex)
        }
    }

    fun clearLogs() {
        logs.clear()
        log("Logs Cleared")
    }

    fun getFormattedLogs(): String {
        return logs.joinToString("\n") { "${it.timestamp} ${it.message}" }
    }

    fun refreshNetworkInfo(context: Context) {
        try {
            val ip = getLocalIpv4Address()
            localIp.value = ip ?: "127.0.0.1"
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val isWifiEnabled = wifiManager?.isWifiEnabled == true
            wifiStatus.value = if (isWifiEnabled) "Wi-Fi Active / Local LAN" else "Hotspot / Offline LAN"
            log("Network REFRESH: IP=${localIp.value} (${wifiStatus.value})")
        } catch (e: Exception) {
            connectionErrors.value = e.localizedMessage ?: "Network query failed"
            log("Network ERROR: ${e.message}")
        }
    }

    private fun getLocalIpv4Address(): String? {
        val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
        for (intf in interfaces) {
            if (intf.isLoopback || !intf.isUp) continue
            for (addr in intf.inetAddresses) {
                if (!addr.isLoopbackAddress && addr is Inet4Address) {
                    return addr.hostAddress
                }
            }
        }
        return null
    }
}
