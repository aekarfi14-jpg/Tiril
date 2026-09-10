import { LanMessage, NetworkDiagnosticsInfo, DiagnosticsLog } from '../types';

/**
 * Local LAN Bus:
 * Simulates local network broadcast (mDNS / NSD / UDP broadcast)
 * and direct TCP/WebSocket peer connections across browser tabs and frames
 * using the browser's BroadcastChannel API (100% offline, zero internet, zero cloud servers).
 */
class LocalLanBus {
  private channel: BroadcastChannel | null = null;
  private listeners: ((msg: LanMessage) => void)[] = [];
  private diagnosticListeners: ((info: NetworkDiagnosticsInfo, logs: DiagnosticsLog[]) => void)[] = [];

  private logs: DiagnosticsLog[] = [];
  private info: NetworkDiagnosticsInfo = {
    wifiStatus: 'Connected (Local LAN / Offline)',
    localIp: '192.168.1.105',
    hostIp: '-',
    port: 8888,
    discoveryStatus: 'Idle',
    roomsDiscoveredCount: 0,
    lastDiscoveryTime: '-',
    connectionState: 'DISCONNECTED',
    connectedPlayers: [],
    lastMessageSent: '-',
    lastMessageReceived: '-',
    connectionErrors: 'None',
    disconnectReason: 'None',
  };

  constructor() {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          this.channel = new BroadcastChannel('neostrike_local_lan');
          this.channel.onmessage = (event) => {
            this.handleIncomingMessage(event.data);
          };
        } catch (err) {
          console.warn('BroadcastChannel error, falling back to local memory bus', err);
        }
      }

      // Check if running inside native Android APK
      const bridge = (window as any).AndroidBridge;
      if (bridge) {
        try {
          const nativeIp = bridge.getLocalIp?.();
          if (nativeIp && nativeIp !== '127.0.0.1') {
            this.info.localIp = nativeIp;
          }
          this.addLog(`Native Android detected. Device IP: ${this.info.localIp}`, 'success');
        } catch (e) {
          console.error('Failed reading native IP', e);
        }
      }

      // Handler for messages sent from Kotlin/Android WebSocket server or client
      (window as any).onNativeMessage = (rawJson: string) => {
        try {
          const msg = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
          if (msg.type === 'ROOM_DISCOVERED') {
            this.handleIncomingMessage({
              type: 'DISCOVERY_BEACON',
              room: {
                id: 'room_' + (msg.hostIp || '192.168.1.1'),
                name: msg.roomName || 'NeoStrike Room',
                hostIp: msg.hostIp || '192.168.1.1',
                port: msg.port || 8888,
                playersCount: 1,
                maxPlayers: 4,
                status: 'idle',
                discoveredAt: Date.now(),
              },
            });
          } else {
            this.handleIncomingMessage(msg);
          }
        } catch (err) {
          console.error('Error handling onNativeMessage:', err);
        }
      };
    }

    this.addLog('Network CONNECTED (Local LAN, Offline Mode)', 'info');
  }

  public vibrate(durationMs = 30) {
    if (typeof window !== 'undefined') {
      const bridge = (window as any).AndroidBridge;
      if (bridge?.vibrate) {
        bridge.vibrate(durationMs);
        return;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(durationMs);
      }
    }
  }

  private getTimeString(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // "HH:mm:ss"
  }

  public addLog(text: string, type: DiagnosticsLog['type'] = 'info') {
    const timestamp = this.getTimeString();
    const entry: DiagnosticsLog = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      text,
      type,
    };
    this.logs = [entry, ...this.logs.slice(0, 199)];
    this.notifyDiagnosticListeners();
  }

  public updateInfo(partial: Partial<NetworkDiagnosticsInfo>) {
    this.info = { ...this.info, ...partial };
    this.notifyDiagnosticListeners();
  }

  public getDiagnostics(): { info: NetworkDiagnosticsInfo; logs: DiagnosticsLog[] } {
    return { info: { ...this.info }, logs: [...this.logs] };
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('Log CLEARED', 'info');
  }

  public subscribeDiagnostics(cb: (info: NetworkDiagnosticsInfo, logs: DiagnosticsLog[]) => void) {
    this.diagnosticListeners.push(cb);
    cb(this.info, this.logs);
    return () => {
      this.diagnosticListeners = this.diagnosticListeners.filter((l) => l !== cb);
    };
  }

  private notifyDiagnosticListeners() {
    for (const listener of this.diagnosticListeners) {
      listener({ ...this.info }, [...this.logs]);
    }
  }

  public subscribe(cb: (msg: LanMessage) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public send(msg: LanMessage) {
    // Notify external tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        console.error('Channel postMessage failed', e);
      }
    }

    // Send through Native Android Bridge if present
    if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
      try {
        (window as any).AndroidBridge.sendToNativeBus(JSON.stringify(msg));
      } catch (e) {
        console.error('AndroidBridge send failed', e);
      }
    }

    // Also notify internal frame listeners
    this.handleIncomingMessage(msg);
  }

  private handleIncomingMessage(msg: LanMessage) {
    for (const listener of this.listeners) {
      listener(msg);
    }
  }
}

export const localLanBus = new LocalLanBus();
