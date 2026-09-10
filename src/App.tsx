import React, { useState } from 'react';
import { TvHostView } from './components/TvHostView';
import { PhoneControllerView } from './components/PhoneControllerView';
import { DualSimulatorView } from './components/DualSimulatorView';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { AndroidProjectModal } from './components/AndroidProjectModal';
import { AppMode } from './types';
import { Tv, Smartphone, Layers, Bug, FolderArchive, Wifi, ArrowRight } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<AppMode>('select');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      {/* Top Application Header */}
      <header className="border-b border-slate-850 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5" dir="rtl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode('select')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-sky-500/20">
              NS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white font-sans">NeoStrike</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  v1.0 LAN
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                اختبار نظام Multiplayer محلي فقط (Local LAN / Offline)
              </p>
            </div>
          </div>

          {/* Mode Tabs Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              id="nav-tv-btn"
              onClick={() => setMode('tv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                mode === 'tv' ? 'bg-sky-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden md:inline">TV / Host</span>
              <span className="md:hidden">TV</span>
            </button>

            <button
              id="nav-phone-btn"
              onClick={() => setMode('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                mode === 'phone'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Phone / Controller</span>
              <span className="md:hidden">الهاتف</span>
            </button>

            <button
              id="nav-dual-btn"
              onClick={() => setMode('dual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                mode === 'dual' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="محاكي مزدوج لاختبار الشاشتين معاً في صفحة واحدة"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">محاكي ثنائي</span>
              <span className="lg:hidden">مزدوج</span>
            </button>
          </div>

          {/* Right Action Icons (Android Project + Diagnostics 🔧/🐞) */}
          <div className="flex items-center gap-2">
            <button
              id="open-android-code-btn"
              onClick={() => setIsAndroidModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 text-xs font-bold transition cursor-pointer"
              title="عرض كود Android وتحميل المشروع كاملاً (.ZIP)"
            >
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">كود Android (.ZIP)</span>
            </button>

            <button
              id="open-diagnostics-header-btn"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition cursor-pointer text-xs font-semibold"
              title="لوحة تشخيص الشبكة (Network Diagnostics)"
            >
              <Bug className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Diagnostics</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col items-center justify-center">
        {mode === 'select' && (
          <div className="w-full max-w-3xl text-center space-y-10 py-8" dir="rtl">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Wifi className="w-3.5 h-3.5" />
                Local Multiplayer Connection Test
              </span>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">NeoStrike</h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                نظام اختبار اتصال محلي خفيف ومستقل بين شاشة التلفاز وهواتف التحكم عبر شبكة الـ Wi-Fi المحلية أو Hotspot،
                بدون إنترنت، بدون خوادم سحابية وبدون إدخال IP أو QR أو أكواد.
              </p>
            </div>

            {/* Mode Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto text-right">
              {/* TV / Host Card */}
              <div
                id="select-mode-tv-card"
                onClick={() => setMode('tv')}
                className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:shadow-xl hover:shadow-sky-500/10 group relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition">
                  <Tv className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-sky-400 transition font-sans">
                  TV / Host
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  إنشاء غرفة "NeoStrike Room"، بدء خادم الاستضافة المحلي، استقبال اتصالات الهواتف تلقائياً وعرض قائمة
                  اللاعبين ورسائل الـ TEST.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <span>فتح شاشة الـ TV</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </div>
              </div>

              {/* Phone / Controller Card */}
              <div
                id="select-mode-phone-card"
                onClick={() => setMode('phone')}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:shadow-xl hover:shadow-emerald-500/10 group relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition font-sans">
                  Phone / Controller
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  البحث التلقائي الفوري عن غرف NeoStrike القريبة والانضمام بنقرة واحدة، إرسال رسالة "TEST" واستقبال "HOST TEST"
                  وزر فصل الاتصال.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <span>فتح شاشة الهاتف</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </div>
              </div>
            </div>

            {/* Quick Testing Options */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
              <button
                id="quick-start-dual-btn"
                onClick={() => setMode('dual')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition flex items-center gap-2 cursor-pointer font-medium"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>جرّب الشاشتين معاً (المحاكي المزدوج في صفحة واحدة)</span>
              </button>

              <button
                id="quick-view-android-code-btn"
                onClick={() => setIsAndroidModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/30 transition flex items-center gap-2 cursor-pointer font-medium"
              >
                <FolderArchive className="w-4 h-4 text-emerald-400" />
                <span>معاينة وتحميل مشروع Android الأصلي (Jetpack Compose + WebSocket)</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'tv' && (
          <TvHostView onOpenDiagnostics={() => setIsDiagnosticsOpen(true)} />
        )}

        {mode === 'phone' && (
          <PhoneControllerView onOpenDiagnostics={() => setIsDiagnosticsOpen(true)} />
        )}

        {mode === 'dual' && (
          <DualSimulatorView onOpenDiagnostics={() => setIsDiagnosticsOpen(true)} />
        )}
      </main>

      {/* Diagnostics Modal (🔧 / 🐞) */}
      <DiagnosticsModal isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />

      {/* Android Project Code Explorer & ZIP Export Modal */}
      <AndroidProjectModal isOpen={isAndroidModalOpen} onClose={() => setIsAndroidModalOpen(false)} />
    </div>
  );
}
