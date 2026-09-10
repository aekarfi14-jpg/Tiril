package com.neostrike.multiplayer.discovery

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.neostrike.multiplayer.debug.DiagnosticsLogger
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class DiscoveredRoom(
    val serviceName: String,
    val hostIp: String,
    val port: Int,
    val playersCount: Int = 0
)

class NsdDiscoveryHelper(private val context: Context) {

    private val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val serviceType = "_neostrike._tcp."
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private var isRegistered = false
    private var isDiscovering = false

    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    // 1. Host registers the room on local network
    fun registerService(port: Int, roomName: String = "NeoStrike Room", onRegistered: (String) -> Unit) {
        val serviceInfo = NsdServiceInfo().apply {
            this.serviceName = roomName
            this.serviceType = this@NsdDiscoveryHelper.serviceType
            this.port = port
        }

        registrationListener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(NsdServiceInfo: NsdServiceInfo) {
                isRegistered = true
                val registeredName = NsdServiceInfo.serviceName
                DiagnosticsLogger.discoveryStatus.value = "Registered: $registeredName"
                DiagnosticsLogger.log("NSD SERVICE_REGISTERED: $registeredName on port $port")
                onRegistered(registeredName)
            }

            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                DiagnosticsLogger.discoveryStatus.value = "Registration Failed: $errorCode"
                DiagnosticsLogger.connectionErrors.value = "NSD Reg Error $errorCode"
                DiagnosticsLogger.log("NSD REGISTRATION_FAILED: code $errorCode")
            }

            override fun onServiceUnregistered(arg0: NsdServiceInfo) {
                isRegistered = false
                DiagnosticsLogger.discoveryStatus.value = "Unregistered"
                DiagnosticsLogger.log("NSD SERVICE_UNREGISTERED")
            }

            override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                DiagnosticsLogger.log("NSD UNREGISTRATION_FAILED: code $errorCode")
            }
        }

        try {
            nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
            DiagnosticsLogger.log("NSD REGISTER_REQUEST sent for $roomName")
        } catch (e: Exception) {
            DiagnosticsLogger.connectionErrors.value = e.localizedMessage ?: "NSD Register exception"
            DiagnosticsLogger.log("NSD REGISTER_EXCEPTION: ${e.message}")
        }
    }

    // 2. Controller discovers rooms automatically on local network
    fun startDiscovery(onRoomDiscovered: (DiscoveredRoom) -> Unit) {
        if (isDiscovering) return

        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(regType: String) {
                isDiscovering = true
                DiagnosticsLogger.discoveryStatus.value = "Scanning for $regType"
                DiagnosticsLogger.log("Discovery STARTED ($regType)")
            }

            override fun onServiceFound(service: NsdServiceInfo) {
                DiagnosticsLogger.log("NSD SERVICE_FOUND: ${service.serviceName}")
                if (service.serviceType.contains("neostrike")) {
                    resolveService(service, onRoomDiscovered)
                }
            }

            override fun onServiceLost(service: NsdServiceInfo) {
                DiagnosticsLogger.log("NSD SERVICE_LOST: ${service.serviceName}")
            }

            override fun onDiscoveryStopped(serviceType: String) {
                isDiscovering = false
                DiagnosticsLogger.discoveryStatus.value = "Discovery Stopped"
                DiagnosticsLogger.log("Discovery STOPPED")
            }

            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                isDiscovering = false
                DiagnosticsLogger.discoveryStatus.value = "Discovery Start Failed: $errorCode"
                DiagnosticsLogger.connectionErrors.value = "NSD Start Error $errorCode"
                DiagnosticsLogger.log("Discovery START_FAILED: code $errorCode")
            }

            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                DiagnosticsLogger.log("Discovery STOP_FAILED: code $errorCode")
            }
        }

        try {
            nsdManager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        } catch (e: Exception) {
            DiagnosticsLogger.connectionErrors.value = e.localizedMessage ?: "NSD Discover exception"
            DiagnosticsLogger.log("Discovery EXCEPTION: ${e.message}")
        }
    }

    private fun resolveService(service: NsdServiceInfo, onRoomDiscovered: (DiscoveredRoom) -> Unit) {
        val resolveListener = object : NsdManager.ResolveListener {
            override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                DiagnosticsLogger.log("NSD RESOLVE_FAILED for ${serviceInfo.serviceName}: code $errorCode")
            }

            override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                val host = serviceInfo.host.hostAddress ?: return
                val port = serviceInfo.port
                val room = DiscoveredRoom(
                    serviceName = serviceInfo.serviceName,
                    hostIp = host,
                    port = port
                )
                DiagnosticsLogger.roomsDiscoveredCount.value = 1
                DiagnosticsLogger.lastDiscoveryTime.value = timeFormat.format(Date())
                DiagnosticsLogger.hostIp.value = host
                DiagnosticsLogger.port.value = port
                DiagnosticsLogger.log("ROOM FOUND: ${room.serviceName} at $host:$port")
                onRoomDiscovered(room)
            }
        }

        try {
            nsdManager.resolveService(service, resolveListener)
        } catch (e: Exception) {
            DiagnosticsLogger.log("NSD RESOLVE_EXCEPTION: ${e.message}")
        }
    }

    fun stop() {
        if (isRegistered && registrationListener != null) {
            try {
                nsdManager.unregisterService(registrationListener)
            } catch (_: Exception) {}
            isRegistered = false
        }
        if (isDiscovering && discoveryListener != null) {
            try {
                nsdManager.stopServiceDiscovery(discoveryListener)
            } catch (_: Exception) {}
            isDiscovering = false
        }
    }
}
