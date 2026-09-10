package com.neostrike.multiplayer.network

import com.neostrike.multiplayer.debug.DiagnosticsLogger
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import org.json.JSONObject
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentHashMap

data class ConnectedPlayer(
    val id: String,
    val name: String,
    val ip: String,
    val webSocket: WebSocket
)

class HostServer(
    port: Int = 8888,
    private val onPlayerListChanged: (List<ConnectedPlayer>) -> Unit,
    private val onTestMessageReceived: (playerLabel: String) -> Unit
) : WebSocketServer(InetSocketAddress(port)) {

    private val players = ConcurrentHashMap<WebSocket, ConnectedPlayer>()
    private var playerCounter = 0

    override fun onStart() {
        DiagnosticsLogger.port.value = port
        DiagnosticsLogger.connectionState.value = "HOST_SERVER_RUNNING"
        DiagnosticsLogger.log("TCP/WS Server STARTED on port $port")
    }

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake?) {
        val clientIp = conn.remoteSocketAddress.address.hostAddress ?: "Unknown"
        DiagnosticsLogger.log("TCP/WS CLIENT_CONNECTING from $clientIp")
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean) {
        val player = players.remove(conn)
        val name = player?.name ?: "Unknown Client"
        val disconnectMsg = reason ?: "Socket closed (code: $code)"
        DiagnosticsLogger.disconnectReason.value = "$name disconnected ($disconnectMsg)"
        DiagnosticsLogger.log("PLAYER DISCONNECTED: $name ($disconnectMsg)")
        
        updatePlayerList()
    }

    override fun onMessage(conn: WebSocket, message: String) {
        DiagnosticsLogger.lastMessageReceived.value = message
        try {
            val json = JSONObject(message)
            when (json.optString("type")) {
                "JOIN" -> {
                    playerCounter++
                    val assignedName = json.optString("name", "Player $playerCounter")
                    val playerId = json.optString("id", "p_$playerCounter")
                    val clientIp = conn.remoteSocketAddress.address.hostAddress ?: "127.0.0.1"

                    val player = ConnectedPlayer(
                        id = playerId,
                        name = assignedName,
                        ip = clientIp,
                        webSocket = conn
                    )
                    players[conn] = player

                    // Send JOIN_OK acknowledgement
                    val ack = JSONObject().apply {
                        put("type", "JOIN_OK")
                        put("assignedName", assignedName)
                        put("playerId", playerId)
                        put("roomName", "NeoStrike Room")
                    }.toString()
                    conn.send(ack)

                    DiagnosticsLogger.log("JOIN_OK SENT to $assignedName ($clientIp)")
                    updatePlayerList()
                }

                "TEST" -> {
                    val player = players[conn]
                    val playerLabel = player?.name ?: "Player ?"
                    DiagnosticsLogger.log("TEST RECEIVED from $playerLabel")
                    onTestMessageReceived(playerLabel)
                }

                "DISCONNECT" -> {
                    val player = players.remove(conn)
                    val name = player?.name ?: "Player"
                    DiagnosticsLogger.disconnectReason.value = "Requested by $name"
                    DiagnosticsLogger.log("DISCONNECT REQUEST from $name")
                    try {
                        conn.close(1000, "User requested disconnect")
                    } catch (_: Exception) {}
                    updatePlayerList()
                }
            }
        } catch (e: Exception) {
            DiagnosticsLogger.connectionErrors.value = "Bad packet: ${e.message}"
            DiagnosticsLogger.log("MESSAGE PARSE_ERROR: ${e.message}")
        }
    }

    override fun onError(conn: WebSocket?, ex: Exception?) {
        DiagnosticsLogger.connectionErrors.value = ex?.localizedMessage ?: "Server socket error"
        DiagnosticsLogger.log("SERVER_ERROR: ${ex?.message}")
    }

    // Host sends "HOST TEST" to all connected players
    fun sendHostTest() {
        val payload = JSONObject().apply {
            put("type", "HOST_TEST")
            put("message", "HOST TEST")
        }.toString()

        DiagnosticsLogger.lastMessageSent.value = "HOST TEST"
        DiagnosticsLogger.log("HOST TEST SENT to ${players.size} player(s)")

        for ((_, player) in players) {
            try {
                player.webSocket.send(payload)
            } catch (e: Exception) {
                DiagnosticsLogger.log("SEND_ERROR to ${player.name}: ${e.message}")
            }
        }
    }

    private fun updatePlayerList() {
        val currentPlayers = players.values.toList()
        DiagnosticsLogger.connectedPlayers.clear()
        DiagnosticsLogger.connectedPlayers.addAll(currentPlayers.map { "${it.name} — Connected" })
        onPlayerListChanged(currentPlayers)
    }

    fun shutdown() {
        try {
            stop()
        } catch (_: Exception) {}
        players.clear()
        DiagnosticsLogger.connectionState.value = "STOPPED"
        DiagnosticsLogger.log("TCP/WS Server STOPPED")
    }
}
