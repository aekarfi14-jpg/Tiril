import React, { useState, useEffect, useRef } from 'react';
import { localLanBus } from '../services/localLanBus';
import { RoomInfo, LanMessage } from '../types';
import { Smartphone, Radio, Send, LogOut, CheckCircle2, ShieldCheck, Wifi } from 'lucide-react';

interface PhoneControllerViewProps {
  onOpenDiagnostics: () => void;
  isEmbedded?: boolean;
  assignedPlayerName?: string;
}

export const PhoneControllerView: React.FC<PhoneControllerViewProps> = ({
  onOpenDiagnostics,
  isEmbedded = false,
  assignedPlayerName = 'Player 1',
}) => {
  const [discoveredRooms, setDiscoveredRooms] = useState<RoomInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedRoom, setConnectedRoom] = useState<RoomInfo | null>(null);
  const [hostTestReceivedBanner, setHostTestReceivedBanner] = useState<boolean>(false);
  const [testSentFeedback, setTestSentFeedback] = useState<boolean>(false);

  const playerIdRef = useRef<string>(`phone_${Math.floor(Math.random() * 9000 + 1000)}`);
  const myPlayerName = assignedPlayerName;

  // Auto-Discovery on mount
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
        localLanBus.addLog('JOIN_OK RECEIVED — Connected to NeoStrike Room', 'success');
        localLanBus.updateInfo({
          connectionState: 'CONNECTED',
          hostIp: msg.room.hostIp,
          port: msg.room.port,
        });
      } else if (msg.type === 'HOST_TEST') {
        // TV host pressed "HOST TEST"
        localLanBus.addLog('HOST TEST RECEIVED from Host', 'success');
        localLanBus.updateInfo({
          lastMessageReceived: 'HOST TEST',
        });
        setHostTestReceivedBanner(true);
        setTimeout(() => setHostTestReceivedBanner(false), 4000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle Join Room
  const handleJoinRoom = (room: RoomInfo) => {
    localLanBus.addLog(`CONNECTING to ${room.hostIp}:${room.port}...`, 'info');
    localLanBus.updateInfo({
      connectionState: 'CONNECTING',
      hostIp: room.hostIp,
      port: room.port,
      lastMessageSent: `JOIN (${myPlayerName})`,
    });

    // Send JOIN_REQUEST over Local LAN Bus
    localLanBus.send({
      type: 'JOIN_REQUEST',
      playerId: playerIdRef.current,
      playerName: myPlayerName,
      clientIp: '192.168.1.105',
    });
  };

  // Handle SEND TEST
  const handleSendTest = () => {
    localLanBus.send({
      type: 'CLIENT_TEST',
      playerId: playerIdRef.current,
      playerName: myPlayerName,
      text: 'TEST',
    });

    localLanBus.addLog(`TEST SENT from ${myPlayerName}`, 'info');
    localLanBus.updateInfo({
      lastMessageSent: 'TEST',
    });

    setTestSentFeedback(true);
    setTimeout(() => setTestSentFeedback(false), 2000);
  };

  // Handle DISCONNECT
  const handleDisconnect = () => {
    localLanBus.send({
      type: 'DISCONNECT_NOTICE',
      playerId: playerIdRef.current,
      reason: 'User disconnected cleanly',
    });

    setIsConnected(false);
    setConnectedRoom(null);
    setHostTestReceivedBanner(false);

    localLanBus.addLog('DISCONNECTED by user', 'warn');
    localLanBus.updateInfo({
      connectionState: 'DISCONNECTED',
      disconnectReason: 'User clicked Disconnect',
    });
  };

  return (
    <div
      id="phone-controller-container"
      className={`w-full flex flex-col items-center justify-center p-6 ${
        isEmbedded ? 'min-h-[500px]' : 'min-h-[85vh]'
      }`}
      dir="rtl"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle glow accent */}
        <div className="absolute inset-0 bg-radial-at-t from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-sans">NeoStrike</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-emerald-400 font-mono">
                  PHONE / CONTROLLER
                </span>
              </div>
            </div>
          </div>

          <button
            id="open-diagnostics-phone-btn"
            onClick={onOpenDiagnostics}
            title="فتح لوحة تشخيص الشبكة"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-medium"
          >
            <span>🔧</span>
            <span>Debug</span>
          </button>
        </div>

        {/* Not Connected State */}
        {!isConnected ? (
          <div className="space-y-6">
            {/* Searching status indicator */}
            <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
              </span>
              <span className="text-sm font-semibold text-sky-300 font-sans">Searching for rooms...</span>
            </div>

            {/* Zero-Config Explainer */}
            <div className="text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                اكتشاف تلقائي عبر الشبكة المحلية (mDNS / NSD / UDP). لا يطلب IP أو Port أو QR أو كود، ويعمل بدون إنترنت.
              </span>
            </div>

            {/* Discovered Rooms List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
                <span>الغرف المكتشفة ({discoveredRooms.length}):</span>
                <span>شبكة محلية</span>
              </div>

              {discoveredRooms.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs space-y-2">
                  <Radio className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                  <p className="font-medium">في انتظار إشارة غرفة NeoStrike...</p>
                  <p className="text-[11px] text-slate-600">
                    تأكد من فتح وضع TV / Host والضغط على [ إنشاء غرفة ].
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
                              Players: {room.playersCount}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {room.hostIp}:{room.port}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          READY
                        </span>
                      </div>

                      <button
                        id={`join-room-btn-${room.id}`}
                        onClick={() => handleJoinRoom(room)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-base rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        [ انضمام ]
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-6">
            {/* Connected Header Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-sm tracking-wider font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>CONNECTED</span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{connectedRoom?.name || 'NeoStrike Room'}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  المعرف: <span className="text-emerald-300 font-mono font-bold">{myPlayerName}</span>
                </p>
              </div>
            </div>

            {/* Host Test Received Banner */}
            {hostTestReceivedBanner && (
              <div
                id="host-test-received-banner"
                className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-4 text-center text-emerald-300 font-bold text-base animate-bounce shadow-xl"
              >
                HOST TEST RECEIVED
              </div>
            )}

            {/* Action Buttons: SEND TEST & DISCONNECT */}
            <div className="space-y-3 pt-2">
              <button
                id="send-test-btn"
                onClick={handleSendTest}
                className="w-full py-4 bg-sky-500 hover:bg-sky-400 active:scale-98 text-slate-950 font-black text-lg rounded-2xl shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-5 h-5" />
                <span>{testSentFeedback ? '✓ SENT!' : '[ SEND TEST ]'}</span>
              </button>

              <button
                id="disconnect-btn"
                onClick={handleDisconnect}
                className="w-full py-3 bg-slate-800/80 hover:bg-rose-950/50 hover:border-rose-800/50 text-slate-300 hover:text-rose-300 border border-slate-700/80 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>[ DISCONNECT ]</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
