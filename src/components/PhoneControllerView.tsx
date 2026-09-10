import React, { useState, useEffect, useRef } from 'react';
import { localLanBus } from '../services/localLanBus';
import { RoomInfo, LanMessage, TeamColor, GameStateBroadcast, PlayerInput } from '../types';
import { PhoneLobby } from './PhoneLobby';
import { PhoneGameHud } from './PhoneGameHud';
import { CountdownOverlay } from './CountdownOverlay';
import { MatchEndModal } from './MatchEndModal';
import { GameCanvas } from './GameCanvas';
import { Language, translations } from '../i18n/translations';
import { audioService } from '../services/audioService';
import {
  Smartphone,
  Radio,
  Sliders,
  ShieldCheck,
  LogOut,
  CheckCircle2,
} from 'lucide-react';

interface PhoneControllerViewProps {
  onOpenDiagnostics: () => void;
  onOpenAudioSettings?: () => void;
  isEmbedded?: boolean;
  assignedPlayerName?: string;
  lang?: Language;
}

export const PhoneControllerView: React.FC<PhoneControllerViewProps> = ({
  onOpenDiagnostics,
  onOpenAudioSettings,
  isEmbedded = false,
  assignedPlayerName = 'Player 1',
  lang = 'dz',
}) => {
  const t = translations[lang];

  const [discoveredRooms, setDiscoveredRooms] = useState<RoomInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedRoom, setConnectedRoom] = useState<RoomInfo | null>(null);
  const [hostTestReceivedBanner, setHostTestReceivedBanner] = useState<boolean>(false);
  const [testSentFeedback, setTestSentFeedback] = useState<boolean>(false);

  // Player Customization
  const [myPlayerName, setMyPlayerName] = useState(assignedPlayerName);
  const [characterId, setCharacterId] = useState('commando');
  const [team, setTeam] = useState<TeamColor>('red');

  // Game Phases: 'lobby' | 'countdown' | 'playing' | 'ended'
  const [gamePhase, setGamePhase] = useState<'lobby' | 'countdown' | 'playing' | 'ended'>('lobby');
  const [countdownValue, setCountdownValue] = useState<number>(5);
  const [latestGameState, setLatestGameState] = useState<GameStateBroadcast | null>(null);

  const playerIdRef = useRef<string>(`phone_${Math.floor(Math.random() * 9000 + 1000)}`);

  // Auto-Discovery on mount (Preserved LAN mechanism)
  useEffect(() => {
    localLanBus.addLog('Discovery STARTED (Searching for _neostrike._tcp.)', 'info');
    localLanBus.updateInfo({
      discoveryStatus: 'Searching for _neostrike._tcp.',
      connectionState: 'SCANNING',
    });

    const unsubscribe = localLanBus.subscribe((msg: LanMessage) => {
      if (msg.type === 'DISCOVERY_BEACON') {
        setDiscoveredRooms((prev) => {
          const exists = prev.some((r) => r.id === msg.room.id);
          const updated = exists ? prev.map((r) => (r.id === msg.room.id ? msg.room : r)) : [...prev, msg.room];

          localLanBus.updateInfo({
            roomsDiscoveredCount: updated.length,
            lastDiscoveryTime: new Date().toTimeString().split(' ')[0],
            hostIp: msg.room.hostIp,
            port: msg.room.port,
          });

          if (!exists) {
            localLanBus.addLog(`ROOM FOUND: ${msg.room.name} at ${msg.room.hostIp}:${msg.room.port}`, 'success');
          }
          return updated;
        });
      } else if (msg.type === 'JOIN_ACCEPTED' && msg.assignedId === playerIdRef.current) {
        setIsConnected(true);
        setConnectedRoom(msg.room);
        setGamePhase('lobby');
        audioService.playPlayerJoin();
        localLanBus.addLog('JOIN_OK RECEIVED — Connected to NeoStrike Room', 'success');
        localLanBus.updateInfo({
          connectionState: 'CONNECTED',
          hostIp: msg.room.hostIp,
          port: msg.room.port,
        });
      } else if (msg.type === 'HOST_TEST') {
        localLanBus.addLog('HOST TEST RECEIVED from Host', 'success');
        localLanBus.updateInfo({
          lastMessageReceived: 'HOST TEST',
        });
        setHostTestReceivedBanner(true);
        setTimeout(() => setHostTestReceivedBanner(false), 4000);
      } else if (msg.type === 'START_COUNTDOWN') {
        setGamePhase('countdown');
        setCountdownValue(msg.countdown);
      } else if (msg.type === 'CANCEL_COUNTDOWN') {
        setGamePhase('lobby');
      } else if (msg.type === 'MATCH_START') {
        setGamePhase('playing');
      } else if (msg.type === 'GAME_STATE_UPDATE') {
        setLatestGameState(msg.state);
      } else if (msg.type === 'MATCH_END') {
        setGamePhase('ended');
      } else if (msg.type === 'RETURN_TO_LOBBY') {
        setGamePhase('lobby');
      } else if (msg.type === 'REMATCH') {
        setGamePhase('countdown');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Join Room
  const handleJoinRoom = (room: RoomInfo) => {
    localLanBus.addLog(`CONNECTING to ${room.hostIp}:${room.port}...`, 'info');
    localLanBus.updateInfo({
      connectionState: 'CONNECTING',
      hostIp: room.hostIp,
      port: room.port,
      lastMessageSent: `JOIN (${myPlayerName})`,
    });

    localLanBus.send({
      type: 'JOIN_REQUEST',
      playerId: playerIdRef.current,
      playerName: myPlayerName,
      clientIp: '192.168.1.105',
    });
  };

  // Player Customization update to Host
  const handleCustomize = (name: string, charId: string, teamColor: TeamColor) => {
    setMyPlayerName(name);
    setCharacterId(charId);
    setTeam(teamColor);

    localLanBus.send({
      type: 'PLAYER_CUSTOMIZE',
      playerId: playerIdRef.current,
      name,
      characterId: charId,
      team: teamColor,
    });
  };

  // Continuous Player Input to Host
  const handleSendInput = (input: Omit<PlayerInput, 'playerId'>) => {
    localLanBus.send({
      type: 'PLAYER_INPUT',
      input: {
        ...input,
        playerId: playerIdRef.current,
      },
    });
  };

  // Send Test
  const handleSendTest = () => {
    localLanBus.send({
      type: 'CLIENT_TEST',
      playerId: playerIdRef.current,
      playerName: myPlayerName,
      text: 'TEST',
    });

    localLanBus.addLog(`TEST SENT from ${myPlayerName}`, 'info');
    localLanBus.updateInfo({ lastMessageSent: 'TEST' });
    setTestSentFeedback(true);
    setTimeout(() => setTestSentFeedback(false), 2000);
  };

  // Disconnect
  const handleDisconnect = () => {
    localLanBus.send({
      type: 'DISCONNECT_NOTICE',
      playerId: playerIdRef.current,
      reason: 'User disconnected cleanly',
    });

    setIsConnected(false);
    setConnectedRoom(null);
    setGamePhase('lobby');
    setHostTestReceivedBanner(false);

    localLanBus.addLog('DISCONNECTED by user', 'warn');
    localLanBus.updateInfo({
      connectionState: 'DISCONNECTED',
      disconnectReason: 'User clicked Disconnect',
    });
  };

  const myPlayerState = latestGameState?.players.find((p) => p.id === playerIdRef.current);

  return (
    <div
      id="phone-controller-container"
      className={`w-full flex flex-col items-center justify-center p-4 sm:p-6 relative ${
        isEmbedded ? 'min-h-[520px]' : 'min-h-[85vh]'
      }`}
      dir={lang === 'dz' ? 'rtl' : 'ltr'}
    >
      {/* Host Test Received Banner */}
      {hostTestReceivedBanner && (
        <div
          id="host-test-received-banner"
          className="fixed top-20 z-50 bg-emerald-950/95 border-2 border-emerald-500 rounded-2xl px-6 py-3 text-emerald-300 font-bold text-base animate-bounce shadow-2xl"
        >
          HOST TEST RECEIVED
        </div>
      )}

      {/* Top Mobile Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-emerald-400">CONTROLLER</span>
            <div className="text-[11px] text-slate-400">{myPlayerName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAudioSettings && (
            <button
              id="phone-audio-settings-btn"
              onClick={onOpenAudioSettings}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            id="open-diagnostics-phone-btn"
            onClick={onOpenDiagnostics}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <span>🔧</span>
            <span>Debug</span>
          </button>
        </div>
      </div>

      {/* 1. Not Connected State (Scanning & Discovery) */}
      {!isConnected ? (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          {/* Searching status indicator */}
          <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
            <span className="text-xs font-semibold text-sky-300 font-sans">{t.searchingForRooms}</span>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{t.lanNotice}</span>
          </div>

          {/* Discovered Rooms List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
              <span>الغرف المكتشفة ({discoveredRooms.length}):</span>
              <span>LAN</span>
            </div>

            {discoveredRooms.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs space-y-2">
                <Radio className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                <p className="font-medium">{t.waitingForPlayers}</p>
                <p className="text-[11px] text-slate-600">
                  تأكد من فتح شاشة التلفاز (TV / Host) والضغط على [ إنشاء غرفة ].
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {discoveredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white text-lg">{room.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-emerald-400 font-semibold">
                            {t.playersCount}: {room.playersCount}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {room.hostIp}:{room.port}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                        {t.ready}
                      </span>
                    </div>

                    <button
                      id={`join-room-btn-${room.id}`}
                      onClick={() => handleJoinRoom(room)}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base rounded-2xl transition cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-98"
                    >
                      [ {t.joinRoom} ]
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. Connected State */
        <>
          {/* Phase 1: Lobby */}
          {gamePhase === 'lobby' && connectedRoom && (
            <PhoneLobby
              roomInfo={connectedRoom}
              playerName={myPlayerName}
              characterId={characterId}
              team={team}
              onCustomize={handleCustomize}
              onSendTest={handleSendTest}
              onDisconnect={handleDisconnect}
              testSentFeedback={testSentFeedback}
              lang={lang}
            />
          )}

          {/* Phase 2: Synchronized Countdown */}
          {gamePhase === 'countdown' && (
            <CountdownOverlay count={countdownValue} isHost={false} lang={lang} />
          )}

          {/* Phase 3: Playing Phase (Controller HUD + Canvas viewport) */}
          {gamePhase === 'playing' && (
            <div className="fixed inset-0 z-20 bg-slate-950 overflow-hidden">
              {/* Following Canvas Camera centered on this player */}
              {latestGameState && (
                <GameCanvas
                  gameState={latestGameState}
                  followPlayerId={playerIdRef.current}
                  className="w-full h-full"
                />
              )}

              {/* Touch Game HUD Controls Overlay */}
              <PhoneGameHud
                playerState={myPlayerState}
                timeRemaining={latestGameState?.timeRemaining || 0}
                onSendInput={handleSendInput}
                onOpenSettings={onOpenAudioSettings || onOpenDiagnostics}
                lang={lang}
              />
            </div>
          )}

          {/* Phase 4: Match End */}
          {gamePhase === 'ended' && latestGameState && (
            <MatchEndModal
              winnerTeam={latestGameState.winnerTeam}
              teamScores={latestGameState.teamScores}
              playerStats={latestGameState.players}
              isHost={false}
              onRematch={() => {}}
              onBackToLobby={() => {}}
              lang={lang}
            />
          )}
        </>
      )}
    </div>
  );
};
