package com.neostrike.multiplayer

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import android.webkit.*
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import com.neostrike.multiplayer.debug.DiagnosticsLogger
import com.neostrike.multiplayer.discovery.NsdDiscoveryHelper
import com.neostrike.multiplayer.discovery.UdpDiscoveryHelper
import com.neostrike.multiplayer.network.ClientController
import com.neostrike.multiplayer.network.HostServer
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var nsdHelper: NsdDiscoveryHelper? = null
    private var udpHelper: UdpDiscoveryHelper? = null
    private var hostServer: HostServer? = null
    private var clientController: ClientController? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Install safe uncaught exception logger to prevent silent unhandled crashes
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            DiagnosticsLogger.log("FATAL on ${thread.name}: ${throwable.message}")
            defaultHandler?.uncaughtException(thread, throwable)
        }

        // Keep screen awake during active gaming
        try {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } catch (_: Throwable) {}

        // Initialize discovery and network diagnostics safely
        try {
            nsdHelper = NsdDiscoveryHelper(this)
        } catch (t: Throwable) {
            DiagnosticsLogger.log("NsdDiscoveryHelper init failed: ${t.message}")
        }
        try {
            udpHelper = UdpDiscoveryHelper(this)
        } catch (t: Throwable) {
            DiagnosticsLogger.log("UdpDiscoveryHelper init failed: ${t.message}")
        }
        try {
            DiagnosticsLogger.refreshNetworkInfo(this)
        } catch (t: Throwable) {
            DiagnosticsLogger.log("refreshNetworkInfo failed: ${t.message}")
        }

        // Setup WebView safely
        try {
            webView = WebView(this).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    allowFileAccess = true
                    allowContentAccess = true
                    allowFileAccessFromFileURLs = true
                    allowUniversalAccessFromFileURLs = true
                    useWideViewPort = true
                    loadWithOverviewMode = true
                    setSupportZoom(false)
                    builtInZoomControls = false
                    displayZoomControls = false
                    cacheMode = WebSettings.LOAD_DEFAULT
                }
                setBackgroundColor(0xFF0F172A.toInt()) // Sleek slate dark background
            }
        } catch (e: Throwable) {
            DiagnosticsLogger.log("WebView creation failed: ${e.message}")
            return
        }

        // Setup WebViewAssetLoader for virtual secure origin
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return try {
                    assetLoader.shouldInterceptRequest(request.url)
                } catch (_: Throwable) {
                    null
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // Fallback to local asset URL if needed
                try {
                    if (request?.isForMainFrame == true) {
                        webView.loadUrl("file:///android_asset/web/index.html")
                    }
                } catch (_: Throwable) {}
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                consoleMessage?.let {
                    DiagnosticsLogger.log("[JS]: ${it.message()}")
                }
                return true
            }
        }

        // Register Native JavaScript Bridge
        val bridge = AndroidBridge(
            activity = this,
            webView = webView,
            onStartServer = { port -> startHostServer(port) },
            onStopServer = { stopHostServer() },
            onConnectClient = { hostIp, port, playerName -> connectClient(hostIp, port, playerName) },
            onDisconnectClient = { disconnectClient() },
            onSendBroadcast = { message ->
                try {
                    hostServer?.broadcast(message)
                    clientController?.sendRaw(message)
                } catch (_: Throwable) {}
            },
            onStartUdpBroadcast = { roomName, port ->
                try {
                    udpHelper?.startBroadcasting(roomName, port)
                } catch (_: Throwable) {}
            },
            onStopUdpBroadcast = {
                try {
                    udpHelper?.stop()
                } catch (_: Throwable) {}
            },
            onStartUdpDiscovery = {
                try {
                    udpHelper?.startListening { room ->
                        val roomJson = JSONObject().apply {
                            put("type", "ROOM_DISCOVERED")
                            put("roomName", room.serviceName)
                            put("hostIp", room.hostIp)
                            put("port", room.port)
                            put("discoveryMethod", "UDP_BROADCAST")
                        }.toString()
                        sendToWeb(roomJson)
                    }
                } catch (_: Throwable) {}
            },
            onStopUdpDiscovery = {
                try {
                    udpHelper?.stop()
                } catch (_: Throwable) {}
            }
        )
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        // Set as main content view
        setContentView(webView)

        // Enable immersive full-screen mode safely after view is attached
        enableImmersiveMode()

        // Load the full offline NeoStrike game bundle
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
    }

    private fun enableImmersiveMode() {
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        } catch (_: Throwable) {}
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableImmersiveMode()
        }
    }

    private fun startHostServer(port: Int) {
        try {
            hostServer?.shutdown()
            val server = HostServer(
                port = port,
                onPlayerListChanged = { players ->
                    val names = players.map { it.name }
                    val json = JSONObject().apply {
                        put("type", "PLAYERS_UPDATE")
                        put("players", org.json.JSONArray(names))
                    }.toString()
                    sendToWeb(json)
                },
                onTestMessageReceived = { label ->
                    val json = JSONObject().apply {
                        put("type", "TEST_RECEIVED")
                        put("label", label)
                    }.toString()
                    sendToWeb(json)
                }
            )
            server.onRawMessageReceived = { rawMsg ->
                sendToWeb(rawMsg)
            }
            server.start()
            hostServer = server
        } catch (t: Throwable) {
            DiagnosticsLogger.log("startHostServer error: ${t.message}")
        }
    }

    private fun stopHostServer() {
        try {
            hostServer?.shutdown()
            hostServer = null
        } catch (_: Throwable) {}
    }

    private fun connectClient(hostIp: String, port: Int, playerName: String) {
        try {
            clientController?.disconnect()
            val client = ClientController(
                hostIp = hostIp,
                port = port,
                playerName = playerName,
                onConnected = {
                    val json = JSONObject().apply {
                        put("type", "CLIENT_CONNECTED")
                        put("hostIp", hostIp)
                    }.toString()
                    sendToWeb(json)
                },
                onHostTestReceived = {
                    val json = JSONObject().apply {
                        put("type", "HOST_TEST")
                    }.toString()
                    sendToWeb(json)
                },
                onDisconnected = { reason ->
                    val json = JSONObject().apply {
                        put("type", "CLIENT_DISCONNECTED")
                        put("reason", reason)
                    }.toString()
                    sendToWeb(json)
                }
            )
            client.onRawMessageReceived = { rawMsg ->
                sendToWeb(rawMsg)
            }
            client.connect()
            clientController = client
        } catch (t: Throwable) {
            DiagnosticsLogger.log("connectClient error: ${t.message}")
        }
    }

    private fun disconnectClient() {
        try {
            clientController?.disconnect()
            clientController = null
        } catch (_: Throwable) {}
    }

    fun sendToWeb(message: String) {
        runOnUiThread {
            try {
                if (!isFinishing && !isDestroyed && ::webView.isInitialized) {
                    val safeStr = JSONObject.quote(message)
                    webView.evaluateJavascript(
                        "if (window.onNativeMessage) { window.onNativeMessage($safeStr); }",
                        null
                    )
                }
            } catch (_: Throwable) {}
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        try {
            if (::webView.isInitialized && webView.canGoBack()) {
                webView.goBack()
            } else {
                super.onBackPressed()
            }
        } catch (_: Throwable) {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try { nsdHelper?.stop() } catch (_: Throwable) {}
        try { udpHelper?.stop() } catch (_: Throwable) {}
        try { hostServer?.shutdown() } catch (_: Throwable) {}
        try { clientController?.disconnect() } catch (_: Throwable) {}
        try {
            if (::webView.isInitialized) {
                webView.destroy()
            }
        } catch (_: Throwable) {}
    }
}

class AndroidBridge(
    private val activity: MainActivity,
    private val webView: WebView,
    private val onStartServer: (Int) -> Unit,
    private val onStopServer: () -> Unit,
    private val onConnectClient: (String, Int, String) -> Unit,
    private val onDisconnectClient: () -> Unit,
    private val onSendBroadcast: (String) -> Unit,
    private val onStartUdpBroadcast: (String, Int) -> Unit,
    private val onStopUdpBroadcast: () -> Unit,
    private val onStartUdpDiscovery: () -> Unit,
    private val onStopUdpDiscovery: () -> Unit
) {
    @JavascriptInterface
    fun isAndroidNative(): Boolean = true

    @JavascriptInterface
    fun getLocalIp(): String {
        return try {
            DiagnosticsLogger.localIp.value
        } catch (_: Throwable) {
            "127.0.0.1"
        }
    }

    @JavascriptInterface
    fun startHost(port: Int) {
        activity.runOnUiThread {
            try { onStartServer(port) } catch (_: Throwable) {}
        }
    }

    @JavascriptInterface
    fun stopHost() {
        activity.runOnUiThread {
            try { onStopServer() } catch (_: Throwable) {}
        }
    }

    @JavascriptInterface
    fun connectClient(hostIp: String, port: Int, playerName: String) {
        activity.runOnUiThread {
            try { onConnectClient(hostIp, port, playerName) } catch (_: Throwable) {}
        }
    }

    @JavascriptInterface
    fun disconnectClient() {
        activity.runOnUiThread {
            try { onDisconnectClient() } catch (_: Throwable) {}
        }
    }

    @JavascriptInterface
    fun sendToNativeBus(message: String) {
        try { onSendBroadcast(message) } catch (_: Throwable) {}
    }

    @JavascriptInterface
    fun startBroadcastingRoom(roomName: String, port: Int) {
        try { onStartUdpBroadcast(roomName, port) } catch (_: Throwable) {}
    }

    @JavascriptInterface
    fun stopBroadcastingRoom() {
        try { onStopUdpBroadcast() } catch (_: Throwable) {}
    }

    @JavascriptInterface
    fun startDiscovery() {
        try { onStartUdpDiscovery() } catch (_: Throwable) {}
    }

    @JavascriptInterface
    fun stopDiscovery() {
        try { onStopUdpDiscovery() } catch (_: Throwable) {}
    }

    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        try {
            val clamped = durationMs.coerceIn(10, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createOneShot(clamped, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(
                    VibrationEffect.createOneShot(clamped, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(clamped)
            }
        } catch (_: Throwable) {}
    }
}
