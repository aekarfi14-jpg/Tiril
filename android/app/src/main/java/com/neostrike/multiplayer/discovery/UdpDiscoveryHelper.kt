package com.neostrike.multiplayer.discovery

import com.neostrike.multiplayer.debug.DiagnosticsLogger
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * UDP Broadcast Discovery Helper.
 * Serves as an ultra-reliable fallback for Wi-Fi routers or Android Hotspots
 * where mDNS multicast may be filtered by router hardware.
 * Discovery only — does NOT carry game traffic.
 */
class UdpDiscoveryHelper(private val port: Int = 8889) {

    private var broadcastJob: Job? = null
    private var listenJob: Job? = null
    private var socket: DatagramSocket? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    // Host continuously broadcasts room advertisement
    fun startBroadcasting(roomName: String, hostPort: Int) {
        stop()
        broadcastJob = scope.launch {
            try {
                val broadcastSocket = DatagramSocket().apply { broadcast = true }
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
            } catch (e: Exception) {
                if (e !is CancellationException) {
                    DiagnosticsLogger.log("UDP BROADCAST_ERROR: ${e.message}")
                }
            }
        }
    }

    // Phone listens for UDP room broadcasts
    fun startListening(onRoomFound: (DiscoveredRoom) -> Unit) {
        stop()
        listenJob = scope.launch {
            try {
                socket = DatagramSocket(port).apply {
                    broadcast = true
                    reuseAddress = true
                }
                DiagnosticsLogger.log("UDP LISTENER_STARTED on port $port")

                val buffer = ByteArray(2048)
                while (isActive) {
                    val packet = DatagramPacket(buffer, buffer.size)
                    socket?.receive(packet)
                    val senderIp = packet.address.hostAddress ?: continue
                    val text = String(packet.data, 0, packet.length)

                    try {
                        val json = JSONObject(text)
                        if (json.optString("type") == "NEOSTRIKE_BEACON") {
                            val roomName = json.optString("roomName", "NeoStrike Room")
                            val hostPort = json.optInt("port", 8888)

                            DiagnosticsLogger.roomsDiscoveredCount.value = 1
                            DiagnosticsLogger.lastDiscoveryTime.value = timeFormat.format(Date())
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
                    } catch (_: Exception) {
                        // Ignore non-json or alien packets
                    }
                }
            } catch (e: Exception) {
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
        } catch (_: Exception) {}
        socket = null
    }
}
