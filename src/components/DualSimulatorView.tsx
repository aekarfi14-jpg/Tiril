import React from 'react';
import { TvHostView } from './TvHostView';
import { PhoneControllerView } from './PhoneControllerView';
import { Layers } from 'lucide-react';

interface DualSimulatorViewProps {
  onOpenDiagnostics: () => void;
}

export const DualSimulatorView: React.FC<DualSimulatorViewProps> = ({ onOpenDiagnostics }) => {
  return (
    <div id="dual-simulator-view" className="w-full max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Notice Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">المحاكي المزدوج (Dual Simulator)</span>
            <p className="text-slate-400">
              يعرض شاشة الـ TV وشاشة الهاتف جنباً إلى جنب لاختبار حلقة الاتصال كاملة، الاكتشاف، إرسال TEST، وفصل الاتصال فوراً.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full font-mono">
            LAN Bus: ACTIVE
          </span>
        </div>
      </div>

      {/* Dual Layout: TV on Left, Phone on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* TV / Host Column */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-3xl p-2 sm:p-4 shadow-xl">
          <div className="text-xs font-mono font-bold text-sky-400 px-4 pt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>TV DISPLAY PORT (Host)</span>
          </div>
          <TvHostView onOpenDiagnostics={onOpenDiagnostics} isEmbedded={true} />
        </div>

        {/* Phone / Controller Column */}
        <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-3xl p-2 sm:p-4 shadow-xl">
          <div className="text-xs font-mono font-bold text-emerald-400 px-4 pt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PHONE DEVICE (Client 1)</span>
          </div>
          <PhoneControllerView onOpenDiagnostics={onOpenDiagnostics} isEmbedded={true} assignedPlayerName="Player 1" />
        </div>
      </div>
    </div>
  );
};
