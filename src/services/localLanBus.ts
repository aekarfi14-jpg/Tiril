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
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('neostrike_local_lan');
        this.channel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel error, falling back to local memory bus', err);
      }
    }

    this.addLog('Network CONNECTED (Local LAN, Offline Mode)', 'info');
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
