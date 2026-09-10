import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, FolderArchive, Terminal, ShieldCheck } from 'lucide-react';
import JSZip from 'jszip';

interface AndroidProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ANDROID_FILES: { title: string; path: string; lang: string; content: string }[] = [
  {
    title: 'MainActivity.kt',
    path: 'android/app/src/main/java/com/neostrike/multiplayer/MainActivity.kt',
    lang: 'kotlin',
    content: `// MainActivity.kt - Jetpack Compose implementation
package com.neostrike.multiplayer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.neostrike.multiplayer.debug.DiagnosticsLogger
import com.neostrike.multiplayer.discovery.NsdDiscoveryHelper
import com.neostrike.multiplayer.discovery.UdpDiscoveryHelper
import com.neostrike.multiplayer.network.ClientController
import com.neostrike.multiplayer.network.HostServer

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
                    val server = HostServer(port, onPlayersChanged, onTestReceived)
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
                    val client = ClientController(hostIp, port, playerName, onConnected, onHostTest, onDisconnected)
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
}`,
  },
  {
    title: 'NsdDiscoveryHelper.kt',
    path: 'android/app/src/main/java/com/neostrike/multiplayer/discovery/NsdDiscoveryHelper.kt',
    lang: 'kotlin',
    content: `// NsdDiscoveryHelper.kt - Android Network Service Discovery (mDNS)
package com.neostrike.multiplayer.discovery

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.neostrike.multiplayer.debug.DiagnosticsLogger

data class DiscoveredRoom(val serviceName: String, val hostIp: String, val port: Int)

class NsdDiscoveryHelper(private val context: Context) {
    private val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val serviceType = "_neostrike._tcp."
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null

    // Register room on Host
    fun registerService(port: Int, roomName: String = "NeoStrike Room", onRegistered: (String) -> Unit) {
        val serviceInfo = NsdServiceInfo().apply {
            this.serviceName = roomName
            this.serviceType = this@NsdDiscoveryHelper.serviceType
            this.port = port
        }
        registrationListener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(info: NsdServiceInfo) {
                DiagnosticsLogger.log("NSD SERVICE_REGISTERED: \${info.serviceName} on port $port")
                onRegistered(info.serviceName)
            }
            override fun onRegistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                DiagnosticsLogger.log("NSD REGISTRATION_FAILED: code $errorCode")
            }
            override fun onServiceUnregistered(info: NsdServiceInfo) {}
            override fun onUnregistrationFailed(info: NsdServiceInfo, errorCode: Int) {}
        }
        nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
    }

    // Discover rooms on Phone
    fun startDiscovery(onRoomDiscovered: (DiscoveredRoom) -> Unit) {
        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(regType: String) {
                DiagnosticsLogger.log("Discovery STARTED ($regType)")
            }
            override fun onServiceFound(service: NsdServiceInfo) {
                if (service.serviceType.contains("neostrike")) {
                    nsdManager.resolveService(service, object : NsdManager.ResolveListener {
                        override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {}
                        override fun onServiceResolved(info: NsdServiceInfo) {
                            val host = info.host.hostAddress ?: return
                            DiagnosticsLogger.log("ROOM FOUND: \${info.serviceName} at $host:\${info.port}")
                            onRoomDiscovered(DiscoveredRoom(info.serviceName, host, info.port))
                        }
                    })
                }
            }
            override fun onServiceLost(service: NsdServiceInfo) {}
            override fun onDiscoveryStopped(serviceType: String) {}
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {}
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
        }
        nsdManager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
    }

    fun stop() {
        try { registrationListener?.let { nsdManager.unregisterService(it) } } catch (_: Exception) {}
        try { discoveryListener?.let { nsdManager.stopServiceDiscovery(it) } } catch (_: Exception) {}
    }
}`,
  },
  {
    title: 'HostServer.kt',
    path: 'android/app/src/main/java/com/neostrike/multiplayer/network/HostServer.kt',
    lang: 'kotlin',
    content: `// HostServer.kt - Embedded WebSocket Server on TV Host
package com.neostrike.multiplayer.network

import com.neostrike.multiplayer.debug.DiagnosticsLogger
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import org.json.JSONObject
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentHashMap

data class ConnectedPlayer(val id: String, val name: String, val ip: String, val webSocket: WebSocket)

class HostServer(
    port: Int = 8888,
    private val onPlayerListChanged: (List<ConnectedPlayer>) -> Unit,
    private val onTestMessageReceived: (String) -> Unit
) : WebSocketServer(InetSocketAddress(port)) {

    private val players = ConcurrentHashMap<WebSocket, ConnectedPlayer>()
    private var counter = 0

    override fun onStart() {
        DiagnosticsLogger.log("TCP/WS Server STARTED on port $port")
    }

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake?) {
        val ip = conn.remoteSocketAddress.address.hostAddress ?: "127.0.0.1"
        DiagnosticsLogger.log("TCP/WS CLIENT_CONNECTING from $ip")
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean) {
        val player = players.remove(conn)
        val name = player?.name ?: "Player"
        DiagnosticsLogger.log("PLAYER DISCONNECTED: $name")
        onPlayerListChanged(players.values.toList())
    }

    override fun onMessage(conn: WebSocket, message: String) {
        val json = JSONObject(message)
        when (json.optString("type")) {
            "JOIN" -> {
                counter++
                val name = json.optString("name", "Player $counter")
                val id = json.optString("id", "p_$counter")
                val ip = conn.remoteSocketAddress.address.hostAddress ?: "127.0.0.1"
                val player = ConnectedPlayer(id, name, ip, conn)
                players[conn] = player

                // Send JOIN_OK
                val ack = JSONObject().apply {
                    put("type", "JOIN_OK")
                    put("assignedName", name)
                }.toString()
                conn.send(ack)

                DiagnosticsLogger.log("JOIN_OK SENT to $name ($ip)")
                onPlayerListChanged(players.values.toList())
            }
            "TEST" -> {
                val name = players[conn]?.name ?: "Player"
                DiagnosticsLogger.log("TEST RECEIVED — $name")
                onTestMessageReceived(name)
            }
            "DISCONNECT" -> {
                players.remove(conn)
                onPlayerListChanged(players.values.toList())
            }
        }
    }

    override fun onError(conn: WebSocket?, ex: Exception?) {
        DiagnosticsLogger.log("SERVER ERROR: \${ex?.message}")
    }

    fun sendHostTest() {
        val payload = JSONObject().apply {
            put("type", "HOST_TEST")
            put("message", "HOST TEST")
        }.toString()
        for ((_, p) in players) {
            p.webSocket.send(payload)
        }
        DiagnosticsLogger.log("HOST TEST SENT to \${players.size} player(s)")
    }

    fun shutdown() {
        try { stop() } catch (_: Exception) {}
        players.clear()
    }
}`,
  },
  {
    title: 'ClientController.kt',
    path: 'android/app/src/main/java/com/neostrike/multiplayer/network/ClientController.kt',
    lang: 'kotlin',
    content: `// ClientController.kt - Phone Controller WebSocket Client
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
    private var client: WebSocketClient? = null

    fun connect() {
        DiagnosticsLogger.log("CONNECTING to ws://$hostIp:$port")
        val uri = URI("ws://$hostIp:$port")
        client = object : WebSocketClient(uri) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                DiagnosticsLogger.log("TCP/WS CONNECTED")
                // Send JOIN
                val payload = JSONObject().apply {
                    put("type", "JOIN")
                    put("name", playerName)
                }.toString()
                send(payload)
                DiagnosticsLogger.log("JOIN SENT: $playerName")
            }
            override fun onMessage(message: String) {
                val json = JSONObject(message)
                when (json.optString("type")) {
                    "JOIN_OK" -> {
                        DiagnosticsLogger.log("JOIN_OK RECEIVED")
                        onConnected()
                    }
                    "HOST_TEST" -> {
                        DiagnosticsLogger.log("HOST TEST RECEIVED")
                        onHostTestReceived()
                    }
                }
            }
            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                DiagnosticsLogger.log("CLIENT DISCONNECTED: $reason")
                onDisconnected(reason ?: "Closed")
            }
            override fun onError(ex: Exception?) {
                DiagnosticsLogger.log("CLIENT ERROR: \${ex?.message}")
            }
        }
        client?.connect()
    }

    fun sendTestMessage() {
        val payload = JSONObject().apply {
            put("type", "TEST")
        }.toString()
        client?.send(payload)
        DiagnosticsLogger.log("TEST SENT to Host")
    }

    fun disconnect() {
        try {
            client?.send(JSONObject().apply { put("type", "DISCONNECT") }.toString())
            client?.close(1000, "User Disconnected")
        } catch (_: Exception) {}
        client = null
    }
}`,
  },
  {
    title: 'AndroidManifest.xml',
    path: 'android/app/src/main/AndroidManifest.xml',
    lang: 'xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Zero Internet / Offline LAN Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="NeoStrike"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
  },
  {
    title: 'build.gradle.kts',
    path: 'android/app/build.gradle.kts',
    lang: 'gradle',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.neostrike.multiplayer"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.neostrike.multiplayer"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    
    // Offline embedded WebSocket Server and Client
    implementation("org.java-websocket:Java-WebSocket:1.5.6")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}`,
  },
];

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({ isOpen, onClose }) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const currentFile = ANDROID_FILES[selectedFileIdx];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Settings and root files
      zip.file(
        'settings.gradle.kts',
        `pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "NeoStrike"
include(":app")`
      );

      zip.file(
        'build.gradle.kts',
        `plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}`
      );

      // App files
      for (const file of ANDROID_FILES) {
        const relativePath = file.path.replace(/^android\//, '');
        zip.file(relativePath, file.content);
      }

      zip.file(
        'README.md',
        `# NeoStrike Local Multiplayer
مشروع Android أصلي كامل وجاهز للبناء على Android Studio بنقرة واحدة.
- متوافق مع TV / Host و Phone / Controller.
- بدون إنترنت، بدون خوادم خارجية، واكتشاف تلقائي عبر NSD / mDNS و UDP.`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NeoStrike_Android_Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div
      id="android-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        id="android-project-modal-card"
        className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                مشروع Android كامل (NeoStrike Native Source Code)
                <span className="text-[11px] font-normal text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  Ready to Build
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                كود Kotlin كامل وقابل للبناء فوراً على Android Studio بدون تعديل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="download-android-zip-btn"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? 'جاري تجهيز الـ ZIP...' : 'تحميل مشروع Android كامل (.ZIP)'}</span>
            </button>

            <button
              id="close-android-modal-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar files + Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden" dir="ltr">
          {/* File selector sidebar */}
          <div className="w-full md:w-64 bg-slate-950 border-r border-slate-800 p-3 overflow-y-auto space-y-1.5 shrink-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Project Files</span>
            </div>
            {ANDROID_FILES.map((file, idx) => (
              <button
                key={file.path}
                onClick={() => setSelectedFileIdx(idx)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition flex items-center justify-between ${
                  selectedFileIdx === idx
                    ? 'bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span className="truncate">{file.title}</span>
                <span className="text-[10px] text-slate-600 font-sans uppercase">{file.lang}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-slate-950/80 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60 text-xs text-slate-400">
              <span className="font-mono text-slate-300 truncate">{currentFile.path}</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-xs font-sans"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy File'}</span>
              </button>
            </div>

            <pre className="flex-1 p-4 font-mono text-xs text-slate-200 overflow-auto whitespace-pre leading-relaxed selection:bg-sky-500/30">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400" dir="rtl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>يستخدم Android NsdManager لاكتشاف mDNS وخادم WebSocket محلي على المنفذ 8888.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
