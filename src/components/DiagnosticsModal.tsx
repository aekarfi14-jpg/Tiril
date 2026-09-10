import React, { useState, useEffect } from 'react';
import { localLanBus } from '../services/localLanBus';
import { NetworkDiagnosticsInfo, DiagnosticsLog } from '../types';
import { X, Trash2, Copy, Check, Terminal, Wifi, Activity } from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [diagInfo, setDiagInfo] = useState<NetworkDiagnosticsInfo>(localLanBus.getDiagnostics().info);
  const [logs, setLogs] = useState<DiagnosticsLog[]>(localLanBus.getDiagnostics().logs);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = localLanBus.subscribeDiagnostics((info, logList) => {
      setDiagInfo(info);
      setLogs(logList);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleCopyLog = () => {
    const formatted = logs.map((l) => `${l.timestamp} ${l.text}`).join('\n');
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    localLanBus.addLog('Log COPIED to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLog = () => {
    localLanBus.clearLogs();
  };

  return (
    <div
      id="diagnostics-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        id="diagnostics-modal-card"
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔧</span>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                لوحة تشخيص الشبكة (Network Diagnostics)
                <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  مؤقتة للاختبار
                </span>
              </h3>
              <p className="text-xs text-slate-400">مراقبة أحداث الاكتشاف والاتصال عبر الشبكة المحلية</p>
            </div>
          </div>
          <button
            id="close-diagnostics-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm" dir="ltr">
          {/* Connection Status Grid */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <Wifi className="w-4 h-4" />
              <span>Connection Parameters & State</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Wi-Fi status:</span>
                <span className="font-mono text-emerald-400 font-semibold">{diagInfo.wifiStatus}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Local IP:</span>
                <span className="font-mono text-sky-300">{diagInfo.localIp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Host IP:</span>
                <span className="font-mono text-sky-300">{diagInfo.hostIp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Port:</span>
                <span className="font-mono text-amber-300">{diagInfo.port}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Discovery status:</span>
                <span className="font-mono text-indigo-300">{diagInfo.discoveryStatus}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">عدد الغرف المكتشفة:</span>
                <span className="font-mono text-white font-bold">{diagInfo.roomsDiscoveredCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">وقت آخر Discovery:</span>
                <span className="font-mono text-slate-300">{diagInfo.lastDiscoveryTime}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Connection state:</span>
                <span
                  className={`font-mono font-bold ${
                    diagInfo.connectionState === 'CONNECTED'
                      ? 'text-emerald-400'
                      : diagInfo.connectionState === 'CONNECTING'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {diagInfo.connectionState}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60 sm:col-span-2">
                <span className="text-slate-400">Connected players:</span>
                <span className="font-mono text-emerald-300">
                  {diagInfo.connectedPlayers.length > 0
                    ? diagInfo.connectedPlayers.join(', ')
                    : 'None (0)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">آخر رسالة مرسلة:</span>
                <span className="font-mono text-slate-300">{diagInfo.lastMessageSent}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">آخر رسالة مستقبلة:</span>
                <span className="font-mono text-slate-300">{diagInfo.lastMessageReceived}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Connection errors:</span>
                <span className="font-mono text-rose-400">{diagInfo.connectionErrors}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Disconnect reason:</span>
                <span className="font-mono text-slate-400">{diagInfo.disconnectReason}</span>
              </div>
            </div>
          </div>

          {/* Event Log Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>Event Log (Chronological)</span>
                <span className="text-xs text-slate-500">({logs.length} entries)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="copy-log-btn"
                  onClick={handleCopyLog}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Log'}</span>
                </button>
                <button
                  id="clear-log-btn"
                  onClick={handleClearLog}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-rose-950/60 hover:text-rose-300 transition border border-slate-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Log</span>
                </button>
              </div>
            </div>

            <div
              id="diagnostics-log-stream"
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs h-64 overflow-y-auto space-y-1.5"
            >
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-8">Log is empty.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-slate-500 select-none shrink-0 font-medium">[{log.timestamp}]</span>
                    <span
                      className={`break-all ${
                        log.type === 'error'
                          ? 'text-rose-400 font-semibold'
                          : log.type === 'warn'
                          ? 'text-amber-300'
                          : log.type === 'success'
                          ? 'text-emerald-400 font-medium'
                          : 'text-sky-200'
                      }`}
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>لوحة مراقبة فقط ولا تغير مسار اتصال الـ Socket.</span>
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
