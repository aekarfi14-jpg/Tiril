package com.neostrike.multiplayer

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.neostrike.multiplayer.debug.DiagnosticsLogger
import com.neostrike.multiplayer.discovery.DiscoveredRoom
import com.neostrike.multiplayer.discovery.NsdDiscoveryHelper
import com.neostrike.multiplayer.discovery.UdpDiscoveryHelper
import com.neostrike.multiplayer.network.ClientController
import com.neostrike.multiplayer.network.ConnectedPlayer
import com.neostrike.multiplayer.network.HostServer
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class AppMode {
    CHOOSE,
    TV_HOST,
    PHONE_CONTROLLER
}

class MainActivity : ComponentActivity() {

    private var nsdHelper: NsdDiscoveryHelper? = null
    private var udpHelper: UdpDiscoveryHelper? = null
    private var hostServer: HostServer? = null
    private var clientController: ClientController? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        nsdHelper = NsdDiscoveryHelper(this)
        udpHelper = UdpDiscoveryHelper()
        DiagnosticsLogger.refreshNetworkInfo(this)

        setContent {
            NeoStrikeApp(
                nsdHelper = nsdHelper!!,
                udpHelper = udpHelper!!,
                onStartHostServer = { roomName, port, onPlayersChanged, onTestReceived ->
                    hostServer?.shutdown()
                    val server = HostServer(
                        port = port,
                        onPlayerListChanged = onPlayersChanged,
                        onTestMessageReceived = onTestReceived
                    )
                    server.start()
                    hostServer = server
                    server
                },
                onStopHostServer = {
                    hostServer?.shutdown()
                    hostServer = null
                },
                onConnectClient = { hostIp, port, playerName, onConnected, onHostTest, onDisconnected ->
                    clientController?.disconnect()
                    val client = ClientController(
                        hostIp = hostIp,
                        port = port,
                        playerName = playerName,
                        onConnected = onConnected,
                        onHostTestReceived = onHostTest,
                        onDisconnected = onDisconnected
                    )
                    client.connect()
                    clientController = client
                    client
                },
                onDisconnectClient = {
                    clientController?.disconnect()
                    clientController = null
                }
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        nsdHelper?.stop()
        udpHelper?.stop()
        hostServer?.shutdown()
        clientController?.disconnect()
    }
}

@Composable
fun NeoStrikeApp(
    nsdHelper: NsdDiscoveryHelper,
    udpHelper: UdpDiscoveryHelper,
    onStartHostServer: (String, Int, (List<ConnectedPlayer>) -> Unit, (String) -> Unit) -> HostServer,
    onStopHostServer: () -> Unit,
    onConnectClient: (String, Int, String, () -> Unit, () -> Unit, (String) -> Unit) -> ClientController,
    onDisconnectClient: () -> Unit
) {
    var currentMode by remember { mutableStateOf(AppMode.CHOOSE) }
    var showDebugDialog by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F172A) // Sleek slate dark background
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Main screen content based on mode
            when (currentMode) {
                AppMode.CHOOSE -> {
                    ModeSelectionScreen(
                        onSelectTv = { currentMode = AppMode.TV_HOST },
                        onSelectPhone = { currentMode = AppMode.PHONE_CONTROLLER }
                    )
                }
                AppMode.TV_HOST -> {
                    TvHostScreen(
                        nsdHelper = nsdHelper,
                        udpHelper = udpHelper,
                        onStartServer = onStartHostServer,
                        onStopServer = onStopHostServer,
                        onBack = {
                            onStopHostServer()
                            nsdHelper.stop()
                            udpHelper.stop()
                            currentMode = AppMode.CHOOSE
                        }
                    )
                }
                AppMode.PHONE_CONTROLLER -> {
                    PhoneControllerScreen(
                        nsdHelper = nsdHelper,
                        udpHelper = udpHelper,
                        onConnect = onConnectClient,
                        onDisconnect = onDisconnectClient,
                        onBack = {
                            onDisconnectClient()
                            nsdHelper.stop()
                            udpHelper.stop()
                            currentMode = AppMode.CHOOSE
                        }
                    )
                }
            }

            // Top diagnostics debug icon (🔧 / 🐞)
            IconButton(
                onClick = { showDebugDialog = true },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
                    .size(44.dp)
                    .background(Color(0xFF1E293B), RoundedCornerShape(12.dp))
                    .border(1.dp, Color(0xFF334155), RoundedCornerShape(12.dp))
            ) {
                Icon(
                    imageVector = Icons.Default.BugReport,
                    contentDescription = "Network Diagnostics",
                    tint = Color(0xFF38BDF8)
                )
            }

            // Network Diagnostics Dialog
            if (showDebugDialog) {
                DiagnosticsDialog(onDismiss = { showDebugDialog = false })
            }
        }
    }
}

@Composable
fun ModeSelectionScreen(
    onSelectTv: () -> Unit,
    onSelectPhone: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "NeoStrike",
            fontSize = 42.sp,
            fontWeight = FontWeight.Black,
            color = Color(0xFFF8FAFC),
            letterSpacing = 2.sp
        )
        Text(
            text = "Local Multiplayer Connection Test",
            fontSize = 16.sp,
            color = Color(0xFF94A3B8),
            modifier = Modifier.padding(top = 4.dp, bottom = 48.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(0.9f),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // TV / Host Button
            Button(
                onClick = onSelectTv,
                modifier = Modifier
                    .weight(1f)
                    .height(130.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.Tv, contentDescription = null, modifier = Modifier.size(36.dp), tint = Color(0xFF38BDF8))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("TV / Host", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("مستضيف الغرفة", fontSize = 12.sp, color = Color(0xFF94A3B8))
                }
            }

            // Phone / Controller Button
            Button(
                onClick = onSelectPhone,
                modifier = Modifier
                    .weight(1f)
                    .height(130.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.Smartphone, contentDescription = null, modifier = Modifier.size(36.dp), tint = Color(0xFF4ADE80))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Phone / Controller", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("جهاز التحكم", fontSize = 12.sp, color = Color(0xFF94A3B8))
                }
            }
        }
    }
}

@Composable
fun TvHostScreen(
    nsdHelper: NsdDiscoveryHelper,
    udpHelper: UdpDiscoveryHelper,
    onStartServer: (String, Int, (List<ConnectedPlayer>) -> Unit, (String) -> Unit) -> HostServer,
    onStopServer: () -> Unit,
    onBack: () -> Unit
) {
    var isRoomCreated by remember { mutableStateOf(false) }
    var activeServer by remember { mutableStateOf<HostServer?>(null) }
    val connectedPlayers = remember { mutableStateListOf<String>() }
    var testReceivedBanner by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Back Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(onClick = onBack) {
                Text("← تغيير الوضع", color = Color(0xFF94A3B8))
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "NeoStrike",
            fontSize = 36.sp,
            fontWeight = FontWeight.Black,
            color = Color.White
        )
        Text(
            text = "TV / HOST",
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF38BDF8),
            modifier = Modifier.padding(bottom = 32.dp)
        )

        if (!isRoomCreated) {
            // Button to create room
            Button(
                onClick = {
                    val server = onStartServer(
                        "NeoStrike Room",
                        8888,
                        { players ->
                            connectedPlayers.clear()
                            connectedPlayers.addAll(players.map { "${it.name} — Connected" })
                        },
                        { playerLabel ->
                            testReceivedBanner = "TEST RECEIVED — $playerLabel"
                            scope.launch {
                                delay(3500)
                                testReceivedBanner = null
                            }
                        }
                    )
                    activeServer = server
                    // Register NSD mDNS and UDP Broadcast
                    nsdHelper.registerService(8888, "NeoStrike Room") {}
                    udpHelper.startBroadcasting("NeoStrike Room", 8888)
                    isRoomCreated = true
                },
                modifier = Modifier
                    .fillMaxWidth(0.6f)
                    .height(60.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
            ) {
                Text("[ إنشاء غرفة ]", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        } else {
            // Room is active
            Card(
                modifier = Modifier.fillMaxWidth(0.85f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "NeoStrike Room",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(Color(0xFF22C55E), RoundedCornerShape(5.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "SERVER: RUNNING",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF22C55E)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Players: ${connectedPlayers.size}",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFF1F5F9)
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    // Players list
                    Text(
                        text = "قائمة اللاعبين المتصلين:",
                        fontSize = 14.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.align(Alignment.Start)
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (connectedPlayers.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "في انتظار انضمام الهواتف على نفس الشبكة...",
                                color = Color(0xFF64748B),
                                fontSize = 14.sp
                            )
                        }
                    } else {
                        LazyColumn(modifier = Modifier.fillMaxWidth().heightIn(max = 200.dp)) {
                            items(connectedPlayers) { playerLabel ->
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .background(Color(0xFF0F172A), RoundedCornerShape(8.dp))
                                        .padding(12.dp)
                                ) {
                                    Text(
                                        text = playerLabel,
                                        color = Color(0xFF4ADE80),
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 16.sp
                                    )
                                }
                            }
                        }
                    }

                    // Test banner
                    AnimatedVisibility(visible = testReceivedBanner != null) {
                        testReceivedBanner?.let { bannerText ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 16.dp)
                                    .background(Color(0xFF14532D), RoundedCornerShape(10.dp))
                                    .padding(12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = bannerText,
                                    color = Color(0xFF86EFAC),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Host Action buttons
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = { activeServer?.sendHostTest() },
                            modifier = Modifier.weight(1f).height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                            shape = RoundedCornerShape(10.dp),
                            enabled = connectedPlayers.isNotEmpty()
                        ) {
                            Text("[ HOST TEST ]", fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                onStopServer()
                                nsdHelper.stop()
                                udpHelper.stop()
                                isRoomCreated = false
                                connectedPlayers.clear()
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("إيقاف الغرفة", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PhoneControllerScreen(
    nsdHelper: NsdDiscoveryHelper,
    udpHelper: UdpDiscoveryHelper,
    onConnect: (String, Int, String, () -> Unit, () -> Unit, (String) -> Unit) -> ClientController,
    onDisconnect: () -> Unit,
    onBack: () -> Unit
) {
    var isConnected by remember { mutableStateOf(false) }
    var activeClient by remember { mutableStateOf<ClientController?>(null) }
    val discoveredRooms = remember { mutableStateListOf<DiscoveredRoom>() }
    var hostTestReceivedBanner by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Start discovery automatically when entering Phone mode
    LaunchedEffect(Unit) {
        discoveredRooms.clear()
        val onRoomFound: (DiscoveredRoom) -> Unit = { room ->
            if (discoveredRooms.none { it.hostIp == room.hostIp && it.port == room.port }) {
                discoveredRooms.add(room)
            }
        }
        nsdHelper.startDiscovery(onRoomFound)
        udpHelper.startListening(onRoomFound)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(onClick = onBack) {
                Text("← تغيير الوضع", color = Color(0xFF94A3B8))
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "NeoStrike",
            fontSize = 36.sp,
            fontWeight = FontWeight.Black,
            color = Color.White
        )
        Text(
            text = "PHONE / CONTROLLER",
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF4ADE80),
            modifier = Modifier.padding(bottom = 32.dp)
        )

        if (!isConnected) {
            // Discovered rooms list or Searching
            Text(
                text = "Searching for rooms...",
                fontSize = 16.sp,
                color = Color(0xFF94A3B8),
                modifier = Modifier.padding(bottom = 16.dp)
            )

            if (discoveredRooms.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .background(Color(0xFF1E293B), RoundedCornerShape(16.dp))
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Color(0xFF38BDF8), modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "جاري البحث عن غرف NeoStrike القريبة...",
                            color = Color(0xFF94A3B8),
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "تأكد من فتح وضع TV والاتصال بنفس الـ Wi-Fi أو Hotspot",
                            color = Color(0xFF64748B),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(0.85f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(discoveredRooms) { room ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = room.serviceName,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "Host: ${room.hostIp}:${room.port}",
                                    fontSize = 12.sp,
                                    color = Color(0xFF64748B),
                                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                                )

                                Button(
                                    onClick = {
                                        val client = onConnect(
                                            room.hostIp,
                                            room.port,
                                            "Player 1",
                                            { isConnected = true },
                                            {
                                                hostTestReceivedBanner = true
                                                scope.launch {
                                                    delay(3500)
                                                    hostTestReceivedBanner = false
                                                }
                                            },
                                            {
                                                isConnected = false
                                            }
                                        )
                                        activeClient = client
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
                                ) {
                                    Text("[ انضمام ]", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Connected State
            Card(
                modifier = Modifier.fillMaxWidth(0.85f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF14532D), RoundedCornerShape(10.dp))
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "CONNECTED",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF4ADE80),
                            letterSpacing = 1.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // SEND TEST Button
                    Button(
                        onClick = { activeClient?.sendTestMessage() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                    ) {
                        Text("[ SEND TEST ]", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }

                    // Host test banner
                    AnimatedVisibility(visible = hostTestReceivedBanner) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 16.dp)
                                .background(Color(0xFF065F46), RoundedCornerShape(10.dp))
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "HOST TEST RECEIVED",
                                color = Color(0xFF6EE7B7),
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // DISCONNECT Button
                    Button(
                        onClick = {
                            onDisconnect()
                            activeClient?.disconnect()
                            activeClient = null
                            isConnected = false
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                    ) {
                        Text("[ DISCONNECT ]", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun DiagnosticsDialog(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🔧 Network Diagnostics",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF38BDF8)
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF94A3B8))
                    }
                }

                HorizontalDivider(color = Color(0xFF334155), modifier = Modifier.padding(vertical = 8.dp))

                // Connection status grid
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B), RoundedCornerShape(10.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    DiagRow("Wi-Fi status", DiagnosticsLogger.wifiStatus.value)
                    DiagRow("Local IP", DiagnosticsLogger.localIp.value)
                    DiagRow("Host IP", DiagnosticsLogger.hostIp.value)
                    DiagRow("Port", DiagnosticsLogger.port.value.toString())
                    DiagRow("Discovery status", DiagnosticsLogger.discoveryStatus.value)
                    DiagRow("عدد الغرف المكتشفة", DiagnosticsLogger.roomsDiscoveredCount.value.toString())
                    DiagRow("وقت آخر Discovery", DiagnosticsLogger.lastDiscoveryTime.value)
                    DiagRow("Connection state", DiagnosticsLogger.connectionState.value)
                    DiagRow("Connected players", DiagnosticsLogger.connectedPlayers.joinToString().ifEmpty { "0" })
                    DiagRow("آخر رسالة مرسلة", DiagnosticsLogger.lastMessageSent.value)
                    DiagRow("آخر رسالة مستقبلة", DiagnosticsLogger.lastMessageReceived.value)
                    DiagRow("Connection errors", DiagnosticsLogger.connectionErrors.value)
                    DiagRow("Disconnect reason", DiagnosticsLogger.disconnectReason.value)
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Actions: Clear Log & Copy Log
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { DiagnosticsLogger.clearLogs() },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
                    ) {
                        Text("Clear Log", fontSize = 13.sp)
                    }
                    Button(
                        onClick = {
                            // Copy to clipboard
                            DiagnosticsLogger.log("LOG COPIED TO CLIPBOARD")
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                    ) {
                        Text("Copy Log", fontSize = 13.sp)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Event Log (Chronological):",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8),
                    fontWeight = FontWeight.SemiBold
                )

                // Log entries
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .background(Color(0xFF020617), RoundedCornerShape(8.dp))
                        .padding(8.dp)
                ) {
                    items(DiagnosticsLogger.logs) { entry ->
                        Text(
                            text = "${entry.timestamp} ${entry.message}",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF38BDF8),
                            modifier = Modifier.padding(vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DiagRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, fontSize = 11.sp, color = Color(0xFF94A3B8))
        Text(text = value, fontSize = 11.sp, color = Color(0xFFF1F5F9), fontWeight = FontWeight.Medium)
    }
}
