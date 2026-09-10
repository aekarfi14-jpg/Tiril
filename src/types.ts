export type AppMode = 'select' | 'tv' | 'phone' | 'dual';

export interface Player {
  id: string;
  name: string;
  connectedAt: number;
  ip: string;
  latencyMs?: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  hostIp: string;
  port: number;
  playersCount: number;
  maxPlayers: number;
  status: 'running' | 'idle' | 'stopped';
  discoveredAt: number;
}

export interface DiagnosticsLog {
  id: string;
  timestamp: string; // e.g. "11:42:03"
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface NetworkDiagnosticsInfo {
  wifiStatus: string;
  localIp: string;
  hostIp: string;
  port: number;
  discoveryStatus: string;
  roomsDiscoveredCount: number;
  lastDiscoveryTime: string;
  connectionState: 'DISCONNECTED' | 'SCANNING' | 'CONNECTING' | 'CONNECTED';
  connectedPlayers: string[];
  lastMessageSent: string;
  lastMessageReceived: string;
  connectionErrors: string;
  disconnectReason: string;
}

export type LanMessage =
  | { type: 'DISCOVERY_BEACON'; room: RoomInfo }
  | { type: 'JOIN_REQUEST'; playerId: string; playerName: string; clientIp: string }
  | { type: 'JOIN_ACCEPTED'; room: RoomInfo; assignedId: string }
  | { type: 'JOIN_REJECTED'; reason: string }
  | { type: 'CLIENT_TEST'; playerId: string; playerName: string; text: 'TEST' }
  | { type: 'HOST_TEST'; text: 'HOST TEST' }
  | { type: 'DISCONNECT_NOTICE'; playerId: string; reason: string }
  | { type: 'HEARTBEAT'; from: 'host' | 'client'; id: string };
