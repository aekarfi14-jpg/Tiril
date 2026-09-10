import React, { useState, useEffect, useRef } from 'react';
import { localLanBus } from '../services/localLanBus';
import { Player, RoomInfo, LanMessage, GameStateBroadcast, TeamColor } from '../types';
import { TvLobby } from './TvLobby';
import { CountdownOverlay } from './CountdownOverlay';
import { GameCanvas } from './GameCanvas';
import { MatchEndModal } from './MatchEndModal';
import { GameEngine } from '../game/gameEngine';
import { Language, translations } from '../i18n/translations';
import { audioService } from '../services/audioService';
import {
  Tv,
  Radio,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Send,
  PowerOff,
  Flame,
} from 'lucide-react';

interface TvHostViewProps {
  onOpenDiagnostics: () => void;
  onOpenAudioSettings?: () => void;
  isEmbedded?: boolean;
  lang?: Language;
}

export const TvHostView: React.FC<TvHostViewProps> = ({
  onOpenDiagnostics,
  onOpenAudioSettings,
  isEmbedded = false,
  lang = 'dz',
}) => {
  const t = translations[lang];

  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [testReceivedBanner, setTestReceivedBanner] = useState<string | null>(null);
  const [hostTestSentSuccess, setHostTestSentSuccess] = useState(false);

  // Game Phases: 'lobby' | 'countdown' | 'playing' | 'ended'
  const [gamePhase, setGamePhase] = useState<'lobby' | 'countdown' | 'playing' | 'ended'>('lobby');
  const [countdownValue, setCountdownValue] = useState<number>(5);
  const [durationSeconds, setDurationSeconds] = useState<number>(180);

  // Authoritative Game Engine
  const gameEngineRef = useRef<GameEngine>(new GameEngine());
  const [currentGameState, setCurrentGameState] = useState<GameStateBroadcast>(
    gameEngineRef.current.getBroadcastState()
  );

  const countdownTimerRef = useRef<any>(null);
  const gameLoopTimerRef = useRef<any>(null);

  const roomInfoRef = useRef<RoomInfo>({
    id: 'room_neostrike_1',
    name: 'NeoStrike Room',
    hostIp: '192.168.1.10',
    port: 8888,
    playersCount: 0,
    maxPlayers: 16,
    status: 'idle',
    discoveredAt: Date.now(),
  });

  // Background Lobby Music
  useEffect(() => {
    if (isRoomCreated && gamePhase === 'lobby') {
      audioService.startLobbyMusic();
    } else {
      audioService.stopLobbyMusic();
    }
    return () => audioService.stopLobbyMusic();
  }, [isRoomCreated, gamePhase]);

  // Beacon interval for local LAN discovery (Preserved exactly)
  useEffect(() => {
    let beaconTimer: any = null;
    if (isRoomCreated) {
      const broadcastBeacon = () => {
        localLanBus.send({
          type: 'DISCOVERY_BEACON',
          room: {
            ...roomInfoRef.current,
            playersCount: players.length,
            status: 'running',
          },
        });
      };

      broadcastBeacon();
      beaconTimer = setInterval(broadcastBeacon, 1500);
    }

    return () => {
      if (beaconTimer) clearInterval(beaconTimer);
    };
  }, [isRoomCreated, players.length]);

  // Listen for incoming LAN Messages
  useEffect(() => {
    const unsubscribe = localLanBus.subscribe((msg: LanMessage) => {
      if (!isRoomCreated) return;

      if (msg.type === 'JOIN_REQUEST') {
        localLanBus.addLog(`TCP/WS Incoming connection from ${msg.clientIp} (${msg.playerName})`, 'info');
        audioService.playPlayerJoin();

        setPlayers((prev) => {
          if (prev.some((p) => p.id === msg.playerId)) return prev;

          // Assign balanced default team
          const teamCycle: TeamColor[] = ['red', 'green', 'blue', 'yellow'];
          const assignedTeam = teamCycle[prev.length % 4];

          const newPlayer: Player = {
            id: msg.playerId,
            name: msg.playerName,
            connectedAt: Date.now(),
            ip: msg.clientIp,
            team: assignedTeam,
            characterId: 'commando',
            isReady: true,
            number: prev.length + 1,
          };
          const next = [...prev, newPlayer];

          localLanBus.updateInfo({
            connectionState: 'CONNECTED',
            connectedPlayers: next.map((p) => `${p.name} — Connected`),
            lastMessageReceived: `JOIN (${msg.playerName})`,
          });
          localLanBus.addLog(`JOIN_OK: ${newPlayer.name} — Connected (${newPlayer.ip})`, 'success');

          // Send JOIN_ACCEPTED back
          localLanBus.send({
            type: 'JOIN_ACCEPTED',
            room: {
              ...roomInfoRef.current,
              playersCount: next.length,
              status: 'running',
            },
            assignedId: msg.playerId,
          });

          return next;
        });
      } else if (msg.type === 'PLAYER_CUSTOMIZE') {
        // Player customized Name, Character, or Team on their phone
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === msg.playerId
              ? { ...p, name: msg.name, characterId: msg.characterId, team: msg.team }
              : p
          )
        );
        localLanBus.addLog(`Player updated: ${msg.name} -> Team ${msg.team.toUpperCase()}`, 'info');
      } else if (msg.type === 'PLAYER_INPUT') {
        // Feed input to authoritative engine
        gameEngineRef.current.handlePlayerInput(msg.input);
      } else if (msg.type === 'CLIENT_TEST') {
        const playerLabel = msg.playerName || 'Player';
        localLanBus.addLog(`TEST RECEIVED — ${playerLabel}`, 'success');
        localLanBus.updateInfo({
          lastMessageReceived: `TEST from ${playerLabel}`,
        });
        setTestReceivedBanner(`TEST RECEIVED — ${playerLabel}`);
        setTimeout(() => {
          setTestReceivedBanner((curr) => (curr?.includes(playerLabel) ? null : curr));
        }, 4000);
      } else if (msg.type === 'DISCONNECT_NOTICE') {
        localLanBus.addLog(`Player disconnected: ${msg.playerId} (${msg.reason})`, 'warn');
        setPlayers((prev) => {
          const filtered = prev.filter((p) => p.id !== msg.playerId);
          localLanBus.updateInfo({
            connectedPlayers: filtered.map((p) => `${p.name} — Connected`),
            disconnectReason: `Player disconnected (${msg.reason})`,
          });
          return filtered;
        });
      }
    });

    return () => unsubscribe();
  }, [isRoomCreated]);

  // Host Authoritative Game Loop (60 FPS tick)
  useEffect(() => {
    if (gamePhase === 'playing') {
      let lastTime = performance.now();

      gameLoopTimerRef.current = setInterval(() => {
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        gameEngineRef.current.update(dt);
        const state = gameEngineRef.current.getBroadcastState();
        setCurrentGameState(state);

        // Broadcast to all phones
        localLanBus.send({
          type: 'GAME_STATE_UPDATE',
          state,
        });

        if (state.phase === 'ended') {
          setGamePhase('ended');
          clearInterval(gameLoopTimerRef.current);
          localLanBus.send({
            type: 'MATCH_END',
            winnerTeam: state.winnerTeam || 'red',
            scores: state.teamScores,
            playerStats: state.players,
          });
        }
      }, 1000 / 60);
    } else {
      if (gameLoopTimerRef.current) {
        clearInterval(gameLoopTimerRef.current);
        gameLoopTimerRef.current = null;
      }
    }

    return () => {
      if (gameLoopTimerRef.current) clearInterval(gameLoopTimerRef.current);
    };
  }, [gamePhase]);

  // Handle Room Lifecycle
  const handleCreateRoom = () => {
    setIsRoomCreated(true);
    roomInfoRef.current.status = 'running';
    audioService.playRoomCreated();

    localLanBus.updateInfo({
      hostIp: '192.168.1.10',
      port: 8888,
      discoveryStatus: 'Broadcasting mDNS / UDP (_neostrike._tcp.)',
      connectionState: 'CONNECTED',
      connectedPlayers: [],
      lastDiscoveryTime: new Date().toTimeString().split(' ')[0],
      connectionErrors: 'None',
      disconnectReason: 'None',
    });

    localLanBus.addLog('Local Host Server STARTED on port 8888', 'info');
    localLanBus.addLog('Room "NeoStrike Room" CREATED & ADVERTISED on local network', 'success');
  };

  const handleStopRoom = () => {
    setIsRoomCreated(false);
    roomInfoRef.current.status = 'stopped';
    setPlayers([]);
    setTestReceivedBanner(null);
    setGamePhase('lobby');

    localLanBus.updateInfo({
      discoveryStatus: 'Idle (Stopped)',
      connectionState: 'DISCONNECTED',
      connectedPlayers: [],
      disconnectReason: 'Host stopped server',
    });

    localLanBus.addLog('Host Server STOPPED', 'warn');
  };

  // Synchronized Countdown Trigger
  const handleStartMatch = () => {
    if (players.length === 0) return;

    setGamePhase('countdown');
    setCountdownValue(5);

    // Broadcast countdown start to all devices
    localLanBus.send({
      type: 'START_COUNTDOWN',
      countdown: 5,
    });

    let current = 5;
    countdownTimerRef.current = setInterval(() => {
      current -= 1;
      setCountdownValue(current);

      localLanBus.send({
        type: 'START_COUNTDOWN',
        countdown: current,
      });

      if (current <= 0) {
        clearInterval(countdownTimerRef.current);
        setGamePhase('playing');
        gameEngineRef.current.setDuration(durationSeconds);
        gameEngineRef.current.initMatch(players);

        localLanBus.send({
          type: 'MATCH_START',
          durationSeconds,
        });
      }
    }, 1000);
  };

  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setGamePhase('lobby');
    localLanBus.send({
      type: 'CANCEL_COUNTDOWN',
    });
    localLanBus.addLog('Host CANCELLED Countdown', 'warn');
  };

  // Rematch & Back to Lobby
  const handleRematch = () => {
    localLanBus.send({ type: 'REMATCH' });
    handleStartMatch();
  };

  const handleBackToLobby = () => {
    setGamePhase('lobby');
    localLanBus.send({ type: 'RETURN_TO_LOBBY' });
  };

  const handleSendHostTest = () => {
    localLanBus.send({
      type: 'HOST_TEST',
      text: 'HOST TEST',
    });
    localLanBus.updateInfo({ lastMessageSent: 'HOST TEST' });
    localLanBus.addLog('HOST TEST sent to connected phones', 'info');
    setHostTestSentSuccess(true);
    setTimeout(() => setHostTestSentSuccess(false), 2500);
  };

  // Keyboard controls on PC / TV for instant testing without phones
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const keysDown = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);
      updateHostInput();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      updateHostInput();
    };

    const updateHostInput = () => {
      if (players.length === 0) return;
      const hostPlayer = players[0];
      let moveX = 0;
      let moveY = 0;

      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) moveY -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) moveY += 1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) moveX -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) moveX += 1;

      let aimAngle = 0;
      if (moveX !== 0 || moveY !== 0) {
        aimAngle = Math.atan2(moveY, moveX);
      }

      gameEngineRef.current.handlePlayerInput({
        playerId: hostPlayer.id,
        moveX,
        moveY,
        aimAngle,
        isFiring: keysDown.has('KeyJ') || keysDown.has('KeyZ'),
        isJumping: keysDown.has('Space'),
        weapon: keysDown.has('KeyK') ? 'shotgun' : 'rifle',
        isThrowingGrenade: keysDown.has('KeyG'),
        grenadePower: 0.7,
      });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gamePhase, players]);

  return (
    <div
      id="tv-host-container"
      className={`w-full flex flex-col items-center justify-center p-4 sm:p-6 relative ${
        isEmbedded ? 'min-h-[520px]' : 'min-h-[85vh]'
      }`}
      dir={lang === 'dz' ? 'rtl' : 'ltr'}
    >
      {/* Test Message Banner */}
      {testReceivedBanner && (
        <div
          id="test-received-banner"
          className="fixed top-20 z-50 bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl px-6 py-3 text-emerald-300 font-bold text-base animate-bounce shadow-2xl flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{testReceivedBanner}</span>
        </div>
      )}

      {/* 1. Pre-Room State: Create Room */}
      {!isRoomCreated ? (
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
            <Radio className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white">{t.appName}</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              {lang === 'dz'
                ? 'ابدأ خادم الاستضافة المحلي على التلفاز (TV / Host) لبث إشارة الغرفة عبر شبكة Wi-Fi أو Hotspot المحلية بدون إنترنت.'
                : 'Start the Local Host Server to broadcast room signal over Wi-Fi or Hotspot without internet.'}
            </p>
          </div>

          <button
            id="create-room-btn"
            onClick={handleCreateRoom}
            className="px-10 py-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xl rounded-2xl shadow-xl shadow-sky-500/25 transition cursor-pointer active:scale-95 flex items-center justify-center gap-3 mx-auto"
          >
            <span>[ {t.createRoom} ]</span>
          </button>
        </div>
      ) : (
        /* 2. Room Created: View depends on phase */
        <div className="w-full max-w-6xl space-y-6">
          {/* Top TV Navigation / Diagnostics Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-xs font-bold text-sky-400">NEOSTRIKE TV</span>
                <div className="text-xs text-slate-400">{t.algerianMonument}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenAudioSettings && (
                <button
                  id="tv-audio-settings-btn"
                  onClick={onOpenAudioSettings}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.audioSettings}</span>
                </button>
              )}

              <button
                id="open-diagnostics-tv-btn"
                onClick={onOpenDiagnostics}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>🔧</span>
                <span>{t.diagnostics}</span>
              </button>
            </div>
          </div>

          {/* Lobby View */}
          {gamePhase === 'lobby' && (
            <TvLobby
              roomInfo={roomInfoRef.current}
              players={players}
              durationSeconds={durationSeconds}
              onDurationChange={setDurationSeconds}
              onStartMatch={handleStartMatch}
              onSendHostTest={handleSendHostTest}
              onStopRoom={handleStopRoom}
              lang={lang}
            />
          )}

          {/* Playing Phase: Full Arena Canvas + TV HUD */}
          {gamePhase === 'playing' && (
            <div className="relative w-full h-[620px] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              {/* Game Arena Canvas */}
              <GameCanvas gameState={currentGameState} className="w-full h-full" />

              {/* TV Top HUD Overlay */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                {/* Team Scores */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-400 font-mono font-bold text-sm shadow-md">
                    RED: {currentGameState.teamScores.red}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-sm shadow-md">
                    GRN: {currentGameState.teamScores.green}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-sky-950/80 border border-sky-500/40 text-sky-400 font-mono font-bold text-sm shadow-md">
                    BLU: {currentGameState.teamScores.blue}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400 font-mono font-bold text-sm shadow-md">
                    YEL: {currentGameState.teamScores.yellow}
                  </div>
                </div>

                {/* Match Timer */}
                <div className="px-5 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shadow-xl">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wider">MATCH TIME</span>
                  <span className="font-mono font-black text-xl text-amber-400">
                    {Math.floor(currentGameState.timeRemaining / 60)}:
                    {currentGameState.timeRemaining % 60 < 10 ? '0' : ''}
                    {currentGameState.timeRemaining % 60}
                  </span>
                </div>

                {/* Kill Feed (Top Right) */}
                <div className="space-y-1 max-w-xs">
                  {currentGameState.killFeed.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950/85 border border-slate-800 rounded-xl px-3 py-1 text-[11px] font-bold flex items-center gap-2 shadow-md animate-in fade-in"
                    >
                      <span className="text-white">{item.killerName}</span>
                      <span className="text-rose-400 text-[10px] font-mono">[{item.weapon}]</span>
                      <span className="text-slate-400">{item.victimName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Match End Modal */}
          {gamePhase === 'ended' && (
            <MatchEndModal
              winnerTeam={currentGameState.winnerTeam}
              teamScores={currentGameState.teamScores}
              playerStats={currentGameState.players}
              isHost={true}
              onRematch={handleRematch}
              onBackToLobby={handleBackToLobby}
              lang={lang}
            />
          )}

          {/* Synchronized Countdown Overlay */}
          {gamePhase === 'countdown' && (
            <CountdownOverlay
              count={countdownValue}
              isHost={true}
              onCancel={handleCancelCountdown}
              lang={lang}
            />
          )}
        </div>
      )}
    </div>
  );
};
