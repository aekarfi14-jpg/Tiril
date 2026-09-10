import React, { useState, useEffect, useRef } from 'react';
import { localLanBus } from '../services/localLanBus';
import { Player, RoomInfo, LanMessage } from '../types';
import { Tv, Radio, Users, CheckCircle2, AlertCircle, Send, PowerOff, ShieldCheck } from 'lucide-react';

interface TvHostViewProps {
  onOpenDiagnostics: () => void;
  isEmbedded?: boolean;
}

export const TvHostView: React.FC<TvHostViewProps> = ({ onOpenDiagnostics, isEmbedded = false }) => {
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [testReceivedBanner, setTestReceivedBanner] = useState<string | null>(null);
  const [hostTestSentSuccess, setHostTestSentSuccess] = useState(false);

  const roomInfoRef = useRef<RoomInfo>({
    id: 'room_neostrike_1',
    name: 'NeoStrike Room',
    hostIp: '192.168.1.10',
    port: 8888,
    playersCount: 0,
    maxPlayers: 8,
    status: 'idle',
    discoveredAt: Date.now(),
  });

  // Beacon interval for local LAN discovery
  useEffect(() => {
    let beaconTimer: any = null;
    if (isRoomCreated) {
      // Broadcast discovery beacon every 1.5s
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

  // Listen for incoming client messages on Local LAN Bus
  useEffect(() => {
    const unsubscribe = localLanBus.subscribe((msg: LanMessage) => {
      if (!isRoomCreated) return;

      if (msg.type === 'JOIN_REQUEST') {
        localLanBus.addLog(`TCP/WS Incoming connection request from ${msg.clientIp} (${msg.playerName})`, 'info');
        // Add player
        setPlayers((prev) => {
          if (prev.some((p) => p.id === msg.playerId)) return prev;
          const newPlayer: Player = {
            id: msg.playerId,
            name: msg.playerName,
            connectedAt: Date.now(),
            ip: msg.clientIp,
          };
          const next = [...prev, newPlayer];

          // Update diagnostics
          localLanBus.updateInfo({
            connectionState: 'CONNECTED',
            connectedPlayers: next.map((p) => `${p.name} — Connected`),
            lastMessageReceived: `JOIN (${msg.playerName})`,
          });
          localLanBus.addLog(`JOIN_OK: ${newPlayer.name} — Connected (${newPlayer.ip})`, 'success');

          // Send JOIN_ACCEPTED back to client
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
      } else if (msg.type === 'CLIENT_TEST') {
        // Phone pressed "SEND TEST"
        const playerLabel = msg.playerName || 'Player';
        localLanBus.addLog(`TEST RECEIVED — ${playerLabel}`, 'success');
        localLanBus.updateInfo({
          lastMessageReceived: `TEST from ${playerLabel}`,
        });
        setTestReceivedBanner(`TEST RECEIVED — ${playerLabel}`);

        // Auto hide after 4 seconds
        setTimeout(() => {
          setTestReceivedBanner((curr) => (curr?.includes(playerLabel) ? null : curr));
        }, 4000);
      } else if (msg.type === 'DISCONNECT_NOTICE') {
        // Player disconnected
        localLanBus.addLog(`Player disconnected: ${msg.playerId} (Reason: ${msg.reason})`, 'warn');
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

  // Handle Create Room
  const handleCreateRoom = () => {
    setIsRoomCreated(true);
    roomInfoRef.current.status = 'running';

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

  // Handle Stop Room
  const handleStopRoom = () => {
    setIsRoomCreated(false);
    roomInfoRef.current.status = 'stopped';
    setPlayers([]);
    setTestReceivedBanner(null);

    localLanBus.updateInfo({
      discoveryStatus: 'Idle (Stopped)',
      connectionState: 'DISCONNECTED',
      connectedPlayers: [],
      disconnectReason: 'Host stopped server',
    });

    localLanBus.addLog('Host Server STOPPED', 'warn');
  };

  // Send "HOST TEST" to all phones
  const handleSendHostTest = () => {
    localLanBus.send({
      type: 'HOST_TEST',
      text: 'HOST TEST',
    });

    localLanBus.updateInfo({
      lastMessageSent: 'HOST TEST',
    });
    localLanBus.addLog('HOST TEST sent to connected phones', 'info');
    setHostTestSentSuccess(true);
    setTimeout(() => setHostTestSentSuccess(false), 2500);
  };

  return (
    <div
      id="tv-host-container"
      className={`w-full flex flex-col items-center justify-center p-6 ${
        isEmbedded ? 'min-h-[500px]' : 'min-h-[85vh]'
      }`}
      dir="rtl"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle grid accent background */}
        <div className="absolute inset-0 bg-radial-at-t from-sky-950/20 via-transparent to-transparent pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white font-sans">NeoStrike</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-widest text-sky-400 font-mono">TV / HOST</span>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Local LAN Only
                </span>
              </div>
            </div>
          </div>

          <button
            id="open-diagnostics-tv-btn"
            onClick={onOpenDiagnostics}
            title="فتح لوحة تشخيص الشبكة"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-medium"
          >
            <span>🔧</span>
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Main Content Area */}
        {!isRoomCreated ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400">
              <Radio className="w-10 h-10" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-bold text-slate-200">ابدأ خادم الغرفة المحلي</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                عند الضغط على إنشاء غرفة، سيبدأ Local Host Server ويجعل الغرفة قابلة للاكتشاف تلقائياً للهواتف على نفس
                شبكة الـ Wi-Fi أو الـ Hotspot بدون إنترنت.
              </p>
            </div>

            <button
              id="create-room-btn"
              onClick={handleCreateRoom}
              className="mt-4 px-8 py-4 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-black text-xl rounded-2xl shadow-lg shadow-sky-500/25 transition flex items-center gap-3 cursor-pointer"
            >
              <span>[ إنشاء غرفة ]</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Room Header Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">NeoStrike Room</h2>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">SERVER: RUNNING</span>
                    <span className="text-xs text-slate-500">|</span>
                    <span className="text-xs font-mono text-slate-400">Port: 8888</span>
                  </div>
                </div>

                {/* Players Count Badge */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl self-start sm:self-center">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span className="font-mono text-sm font-bold text-white">Players: {players.length}</span>
                </div>
              </div>
            </div>

            {/* Test Message Reception Banner */}
            {testReceivedBanner && (
              <div
                id="test-received-banner"
                className="bg-emerald-950/80 border-2 border-emerald-500/70 rounded-2xl p-4 flex items-center justify-center gap-3 text-emerald-300 font-bold text-lg animate-bounce shadow-xl shadow-emerald-950/50"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>{testReceivedBanner}</span>
              </div>
            )}

            {/* Connected Players List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
                <span>قائمة اللاعبين المتصلين ({players.length}):</span>
                <span>الحالة</span>
              </div>

              {players.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                  <p className="font-medium">في انتظار انضمام الهواتف...</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    افتح وضع Phone / Controller على جهاز آخر على نفس الشبكة أو في المحاكي بالأسفل.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-slate-950 border border-slate-800/80 px-4 py-3 rounded-xl hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="font-bold text-slate-200 text-sm">{player.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">({player.ip})</span>
                      </div>
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                        Connected
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Bar: HOST TEST & Stop Server */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <button
                id="send-host-test-btn"
                onClick={handleSendHostTest}
                disabled={players.length === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                  players.length > 0
                    ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer active:scale-95 shadow-md shadow-sky-600/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{hostTestSentSuccess ? '✓ تم إرسال HOST TEST' : '[ HOST TEST ]'}</span>
              </button>

              <button
                id="stop-room-btn"
                onClick={handleStopRoom}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/40 text-xs font-semibold transition cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>إيقاف الغرفة</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
