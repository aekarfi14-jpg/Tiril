package com.neostrike.multiplayer.discovery

import android.content.Context
import android.net.wifi.WifiManager
import com.neostrike.multiplayer.debug.DiagnosticsLogger
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * UDP Broadcast Discovery Helper.
 * Serves as an ultra-reliable fallback for Wi-Fi routers or Android Hotspots
 * where mDNS multicast may be filtered by router hardware.
 * Discovery only — does NOT carry game traffic.
 */
class UdpDiscoveryHelper(private val context: Context? = null, private val port: Int = 8889) {

    private var broadcastJob: Job? = null
    private var listenJob: Job? = null
    private var socket: DatagramSocket? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    @Synchronized
    private fun getCurrentTime(): String {
        return try {
            SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        } catch (_: Throwable) {
            "00:00:00"
        }
    }

    private fun acquireMulticastLock() {
        try {
            if (context != null && multicastLock == null) {
                val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                multicastLock = wifiManager?.createMulticastLock("neostrike_udp_lock")?.apply {
                    setReferenceCounted(true)
                    acquire()
                }
            }
        } catch (t: Throwable) {
            DiagnosticsLogger.log("MulticastLock acquire failed: ${t.message}")
        }
    }

    private fun releaseMulticastLock() {
        try {
            multicastLock?.let {
                if (it.isHeld) {
                    it.release()
                }
            }
        } catch (_: Throwable) {}
        multicastLock = null
    }

    // Host continuously broadcasts room advertisement
    fun startBroadcasting(roomName: String, hostPort: Int) {
        stop()
        acquireMulticastLock()
        broadcastJob = scope.launch {
            var broadcastSocket: DatagramSocket? = null
            try {
                broadcastSocket = DatagramSocket(null).apply {
                    reuseAddress = true
                    broadcast = true
                }
                DiagnosticsLogger.log("UDP BROADCAST_STARTED on port $port")

                while (isActive) {
                    val payload = JSONObject().apply {
                        put("type", "NEOSTRIKE_BEACON")
                        put("roomName", roomName)
                        put("port", hostPort)
                        put("timestamp", System.currentTimeMillis())
                    }.toString()

                    val buffer = payload.toByteArray()
                    val packet = DatagramPacket(
                        buffer,
                        buffer.size,
                        InetAddress.getByName("255.255.255.255"),
                        port
                    )
                    broadcastSocket.send(packet)
                    delay(1500) // Broadcast every 1.5 seconds
                }
            } catch (e: Throwable) {
                if (e !is CancellationException) {
                    DiagnosticsLogger.log("UDP BROADCAST_ERROR: ${e.message}")
                }
            } finally {
                try {
                    broadcastSocket?.close()
                } catch (_: Throwable) {}
            }
        }
    }

    // Phone listens for UDP room broadcasts
    fun startListening(onRoomFound: (DiscoveredRoom) -> Unit) {
        stop()
        acquireMulticastLock()
        listenJob = scope.launch {
            try {
                // Must set reuseAddress BEFORE binding
                socket = DatagramSocket(null).apply {
                    reuseAddress = true
                    broadcast = true
                    bind(InetSocketAddress(port))
                }
                DiagnosticsLogger.log("UDP LISTENER_STARTED on port $port")

                val buffer = ByteArray(2048)
                while (isActive) {
                    val packet = DatagramPacket(buffer, buffer.size)
                    socket?.receive(packet)
                    val senderIp = packet.address?.hostAddress ?: continue
                    val text = String(packet.data, 0, packet.length)

                    try {
                        val json = JSONObject(text)
                        if (json.optString("type") == "NEOSTRIKE_BEACON") {
                            val roomName = json.optString("roomName", "NeoStrike Room")
                            val hostPort = json.optInt("port", 8888)

                            DiagnosticsLogger.roomsDiscoveredCount.value = 1
                            DiagnosticsLogger.lastDiscoveryTime.value = getCurrentTime()
                            DiagnosticsLogger.hostIp.value = senderIp
                            DiagnosticsLogger.port.value = hostPort
                            DiagnosticsLogger.log("UDP ROOM FOUND: $roomName at $senderIp:$hostPort")

                            withContext(Dispatchers.Main) {
                                onRoomFound(
                                    DiscoveredRoom(
                                        serviceName = roomName,
                                        hostIp = senderIp,
                                        port = hostPort
                                    )
                                )
                            }
                        }
                    } catch (_: Throwable) {
                        // Ignore non-json or alien packets
                    }
                }
            } catch (e: Throwable) {
                if (e !is CancellationException) {
                    DiagnosticsLogger.log("UDP LISTEN_ERROR: ${e.message}")
                }
            }
        }
    }

    fun stop() {
        broadcastJob?.cancel()
        broadcastJob = null
        listenJob?.cancel()
        listenJob = null
        try {
            socket?.close()
        } catch (_: Throwable) {}
        socket = null
        releaseMulticastLock()
    }
}
