export type AppMode = 'select' | 'tv' | 'phone' | 'dual';

export type TeamColor = 'red' | 'green' | 'blue' | 'yellow';

export type WeaponType = 'shotgun' | 'rifle';

export interface CharacterArchetype {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  color: string;
  speed: number;
}

export interface Player {
  id: string;
  name: string;
  connectedAt: number;
  ip: string;
  latencyMs?: number;
  team: TeamColor;
  characterId: string;
  isReady: boolean;
  number?: number;
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

export interface MatchSettings {
  durationSeconds: number; // e.g., 60, 120, 180, 300
}

export interface PlayerInput {
  playerId: string;
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  aimAngle: number; // in radians (0 to 2*PI)
  isFiring: boolean;
  isJumping: boolean;
  weapon: WeaponType;
  isThrowingGrenade: boolean;
  grenadePower: number; // 0 to 1
}

export interface GamePlayerState {
  id: string;
  name: string;
  team: TeamColor;
  characterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aimAngle: number;
  hp: number;
  maxHp: number;
  weapon: WeaponType;
  isAlive: boolean;
  respawnTimeRemaining: number;
  kills: number;
  deaths: number;
  score: number;
  isJumping: boolean;
  jumpHeight: number; // elevation or jump state
  facingRight: boolean;
  isOnGround: boolean;
  walkCycle: number;
  isShooting: boolean;
  number: number;
}

export interface CrateEntity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  broken: boolean;
}

export interface ProjectileEntity {
  id: string;
  ownerId: string;
  ownerTeam: TeamColor;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  weapon: WeaponType;
  life: number;
}

export interface GrenadeEntity {
  id: string;
  ownerId: string;
  ownerTeam: TeamColor;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuseTime: number; // seconds remaining until detonation
  radius: number;
  maxDistance: number;
}

export interface ExplosionEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  killerTeam: TeamColor;
  victimName: string;
  victimTeam: TeamColor;
  weapon: WeaponType | 'grenade';
  timestamp: number;
}

export interface GameStateBroadcast {
  timestamp: number;
  phase: 'lobby' | 'countdown' | 'playing' | 'ended';
  timeRemaining: number;
  durationSeconds: number;
  players: GamePlayerState[];
  crates: CrateEntity[];
  projectiles: ProjectileEntity[];
  grenades: GrenadeEntity[];
  explosions: ExplosionEntity[];
  teamScores: Record<TeamColor, number>;
  winnerTeam: TeamColor | null;
  killFeed: KillFeedItem[];
}

export type LanMessage =
  | { type: 'DISCOVERY_BEACON'; room: RoomInfo }
  | { type: 'JOIN_REQUEST'; playerId: string; playerName: string; clientIp: string }
  | { type: 'JOIN_ACCEPTED'; room: RoomInfo; assignedId: string }
  | { type: 'JOIN_REJECTED'; reason: string }
  | { type: 'CLIENT_TEST'; playerId: string; playerName: string; text: 'TEST' }
  | { type: 'HOST_TEST'; text: 'HOST TEST' }
  | { type: 'DISCONNECT_NOTICE'; playerId: string; reason: string }
  | { type: 'HEARTBEAT'; from: 'host' | 'client'; id: string }
  // Extended game messages
  | { type: 'PLAYER_CUSTOMIZE'; playerId: string; name: string; characterId: string; team: TeamColor }
  | { type: 'MATCH_SETTINGS_UPDATE'; durationSeconds: number }
  | { type: 'START_COUNTDOWN'; countdown: number }
  | { type: 'CANCEL_COUNTDOWN' }
  | { type: 'MATCH_START'; durationSeconds: number }
  | { type: 'PLAYER_INPUT'; input: PlayerInput }
  | { type: 'GAME_STATE_UPDATE'; state: GameStateBroadcast }
  | { type: 'MATCH_END'; winnerTeam: TeamColor; scores: Record<TeamColor, number>; playerStats: GamePlayerState[] }
  | { type: 'RETURN_TO_LOBBY' }
  | { type: 'REMATCH' };

