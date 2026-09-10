package com.neostrike.multiplayer.network

import com.neostrike.multiplayer.debug.DiagnosticsLogger
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONObject
import java.net.URI

class ClientController(
    private val hostIp: String,
    private val port: Int = 8888,
    private val playerName: String = "Player 1",
    private val onConnected: () -> Unit,
    private val onHostTestReceived: () -> Unit,
    private val onDisconnected: (String) -> Unit
) {

    var onRawMessageReceived: ((String) -> Unit)? = null
    private var client: WebSocketClient? = null

    fun connect() {
        DiagnosticsLogger.hostIp.value = hostIp
        DiagnosticsLogger.port.value = port
        DiagnosticsLogger.connectionState.value = "CONNECTING"
        DiagnosticsLogger.log("CONNECTING to ws://$hostIp:$port")

        val uri = URI("ws://$hostIp:$port")
        client = object : WebSocketClient(uri) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                DiagnosticsLogger.connectionState.value = "CONNECTED"
                DiagnosticsLogger.log("TCP/WS CONNECTED to $hostIp:$port")

                // Send JOIN immediately
                val joinMessage = JSONObject().apply {
                    put("type", "JOIN")
                    put("name", playerName)
                    put("id", "phone_${System.currentTimeMillis() % 10000}")
                }.toString()

                send(joinMessage)
                DiagnosticsLogger.lastMessageSent.value = "JOIN ($playerName)"
                DiagnosticsLogger.log("JOIN SENT: $playerName")
            }

            override fun onMessage(message: String) {
                DiagnosticsLogger.lastMessageReceived.value = message
                try {
                    val json = JSONObject(message)
                    when (json.optString("type")) {
                        "JOIN_OK" -> {
                            DiagnosticsLogger.log("JOIN_OK RECEIVED: Room ${json.optString("roomName")}")
                            onConnected()
                        }
                        "HOST_TEST" -> {
                            DiagnosticsLogger.log("HOST TEST RECEIVED")
                            onHostTestReceived()
                        }
                    }
                } catch (e: Exception) {
                    DiagnosticsLogger.log("CLIENT MESSAGE_ERROR: ${e.message}")
                }
                try {
                    onRawMessageReceived?.invoke(message)
                } catch (_: Exception) {}
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                val closeReason = reason ?: "Code $code"
                DiagnosticsLogger.connectionState.value = "DISCONNECTED"
                DiagnosticsLogger.disconnectReason.value = closeReason
                DiagnosticsLogger.log("CLIENT DISCONNECTED: $closeReason")
                onDisconnected(closeReason)
            }

            override fun onError(ex: Exception?) {
                DiagnosticsLogger.connectionErrors.value = ex?.localizedMessage ?: "Client socket error"
                DiagnosticsLogger.log("CLIENT ERROR: ${ex?.message}")
            }
        }

        try {
            client?.connect()
        } catch (e: Exception) {
            DiagnosticsLogger.connectionErrors.value = e.localizedMessage ?: "Connect error"
            DiagnosticsLogger.log("CONNECT_FAILED: ${e.message}")
            onDisconnected(e.message ?: "Connection failed")
        }
    }

    fun sendTestMessage() {
        val payload = JSONObject().apply {
            put("type", "TEST")
            put("text", "TEST")
        }.toString()

        try {
            client?.send(payload)
            DiagnosticsLogger.lastMessageSent.value = "TEST"
            DiagnosticsLogger.log("TEST SENT to Host")
        } catch (e: Exception) {
            DiagnosticsLogger.connectionErrors.value = "Send failed: ${e.message}"
            DiagnosticsLogger.log("SEND_TEST_ERROR: ${e.message}")
        }
    }

    fun sendRaw(message: String) {
        try {
            client?.send(message)
        } catch (e: Exception) {
            DiagnosticsLogger.log("SEND_RAW_ERROR: ${e.message}")
        }
    }

    fun disconnect() {
        try {
            val payload = JSONObject().apply {
                put("type", "DISCONNECT")
            }.toString()
            client?.send(payload)
        } catch (_: Exception) {}

        try {
            client?.close(1000, "User clicked Disconnect")
        } catch (_: Exception) {}

        client = null
        DiagnosticsLogger.connectionState.value = "DISCONNECTED"
        DiagnosticsLogger.disconnectReason.value = "User disconnected"
        DiagnosticsLogger.log("DISCONNECT COMPLETED")
    }
}
