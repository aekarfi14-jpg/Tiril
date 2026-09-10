package com.neostrike.multiplayer

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.*
import androidx.activity.ComponentActivity
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

        // Keep screen on during active gaming
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Enable immersive full-screen mode
        enableImmersiveMode()

        // Initialize discovery and network diagnostics
        nsdHelper = NsdDiscoveryHelper(this)
        udpHelper = UdpDiscoveryHelper()
        DiagnosticsLogger.refreshNetworkInfo(this)

        // Setup WebView
        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            setBackgroundColor(0xFF0F172A.toInt()) // Sleek slate dark background
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
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // Fallback to local asset URL if needed
                if (request?.isForMainFrame == true && error?.errorCode == ERROR_FILE_NOT_FOUND) {
                    webView.loadUrl("file:///android_asset/web/index.html")
                }
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
                // If Host is running, broadcast to all players
                hostServer?.broadcast(message)
                // If Client is connected, send to Host
                clientController?.sendRaw(message)
            },
            onStartUdpBroadcast = { roomName, port ->
                udpHelper?.startBroadcasting(roomName, port)
            },
            onStopUdpBroadcast = {
                udpHelper?.stop()
            },
            onStartUdpDiscovery = {
                udpHelper?.startListening { room ->
        val roomJson = JSONObject().apply {
    put("type", "ROOM_DISCOVERED")
    put("roomName", room.serviceName)
    put("hostIp", room.hostIp)
    put("port", room.port)
    put("discoveryMethod", "UDP")
}.toString()
        sendToWeb(roomJson)   // ← هذا السطر كان ناقص، رجّعه
                }
            },
            onStopUdpDiscovery = {
                udpHelper?.stop()
            }
        )
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        // Set as main content view
        setContentView(webView)

        // Load the full offline NeoStrike game bundle
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
    }

    private fun enableImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableImmersiveMode()
        }
    }

    private fun startHostServer(port: Int) {
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
    }

    private fun stopHostServer() {
        hostServer?.shutdown()
        hostServer = null
    }

    private fun connectClient(hostIp: String, port: Int, playerName: String) {
        clientController?.disconnect()
و        val client = ClientController(
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
    }

    private fun disconnectClient() {
        clientController?.disconnect()
        clientController = null
    }

    fun sendToWeb(message: String) {
        runOnUiThread {
            val safeStr = JSONObject.quote(message)
            webView.evaluateJavascript(
                "if (window.onNativeMessage) { window.onNativeMessage($safeStr); }",
                null
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        nsdHelper?.stop()
        udpHelper?.stop()
        hostServer?.shutdown()
        clientController?.disconnect()
        webView.destroy()
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
        return DiagnosticsLogger.localIp.value
    }

    @JavascriptInterface
    fun startHost(port: Int) {
        activity.runOnUiThread {
            onStartServer(port)
        }
    }

    @JavascriptInterface
    fun stopHost() {
        activity.runOnUiThread {
            onStopServer()
        }
    }

    @JavascriptInterface
    fun connectClient(hostIp: String, port: Int, playerName: String) {
        activity.runOnUiThread {
            onConnectClient(hostIp, port, playerName)
        }
    }

    @JavascriptInterface
    fun disconnectClient() {
        activity.runOnUiThread {
            onDisconnectClient()
        }
    }

    @JavascriptInterface
    fun sendToNativeBus(message: String) {
        onSendBroadcast(message)
    }

    @JavascriptInterface
    fun startBroadcastingRoom(roomName: String, port: Int) {
        onStartUdpBroadcast(roomName, port)
    }

    @JavascriptInterface
    fun stopBroadcastingRoom() {
        onStopUdpBroadcast()
    }

    @JavascriptInterface
    fun startDiscovery() {
        onStartUdpDiscovery()
    }

    @JavascriptInterface
    fun stopDiscovery() {
        onStopUdpDiscovery()
    }

    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        try {
            val vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(
                    VibrationEffect.createOneShot(
                        durationMs.coerceIn(10, 500),
                        VibrationEffect.DEFAULT_AMPLITUDE
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(durationMs.coerceIn(10, 500))
            }
        } catch (_: Exception) {}
    }
}
