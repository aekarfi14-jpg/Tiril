import React, { useState } from 'react';
import { TvHostView } from './components/TvHostView';
import { PhoneControllerView } from './components/PhoneControllerView';
import { DualSimulatorView } from './components/DualSimulatorView';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { AndroidProjectModal } from './components/AndroidProjectModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { AppMode } from './types';
import { Language, translations } from './i18n/translations';
import {
  Tv,
  Smartphone,
  Layers,
  Bug,
  FolderArchive,
  Wifi,
  ArrowRight,
  Volume2,
  Languages,
} from 'lucide-react';
import { audioService } from './services/audioService';

export default function App() {
  const [mode, setMode] = useState<AppMode>('select');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [lang, setLang] = useState<Language>('dz');

  const t = translations[lang];

  const handleModeChange = (newMode: AppMode) => {
    audioService.playButtonClick();
    setMode(newMode);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30"
      dir={lang === 'dz' ? 'rtl' : 'ltr'}
    >
      {/* Top Application Header */}
      <header className="border-b border-slate-850 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => handleModeChange('select')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-sky-500/20">
              NS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white font-sans">
                  {t.appName}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  LAN 2D
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block font-medium">
                {lang === 'dz'
                  ? 'مباراة محلية عبر الشبكة (TV Host + Phone Controller) | مقام الشهيد'
                  : 'Local LAN Game (TV Host + Phone Controller) | Martyrs\' Memorial'}
              </p>
            </div>
          </div>

          {/* Mode Tabs Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              id="nav-tv-btn"
              onClick={() => handleModeChange('tv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                mode === 'tv'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.tvHost}</span>
              <span className="md:hidden">TV</span>
            </button>

            <button
              id="nav-phone-btn"
              onClick={() => handleModeChange('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                mode === 'phone'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.phoneController}</span>
              <span className="md:hidden">Phone</span>
            </button>

            <button
              id="nav-dual-btn"
              onClick={() => handleModeChange('dual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                mode === 'dual' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title={lang === 'dz' ? 'محاكي مزدوج لاختبار الشاشتين معاً في صفحة واحدة' : 'Dual simulator for side-by-side testing'}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">{lang === 'dz' ? 'محاكي ثنائي' : 'Dual Sim'}</span>
              <span className="lg:hidden">{lang === 'dz' ? 'مزدوج' : 'Dual'}</span>
            </button>
          </div>

          {/* Right Action Icons (Audio, Android, Diagnostics, Language) */}
          <div className="flex items-center gap-2">
            {/* Audio Settings */}
            <button
              id="header-audio-btn"
              onClick={() => {
                audioService.playButtonClick();
                setIsAudioModalOpen(true);
              }}
              className="w-8 h-8 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 flex items-center justify-center transition cursor-pointer"
              title={t.audioSettings}
            >
              <Volume2 className="w-4 h-4 text-sky-400" />
            </button>

            {/* Language Toggle */}
            <button
              id="header-lang-btn"
              onClick={() => {
                const nextLang = lang === 'dz' ? 'en' : 'dz';
                setLang(nextLang);
                audioService.playButtonClick();
              }}
              className="px-2.5 h-8 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 flex items-center gap-1.5 transition cursor-pointer text-xs font-bold font-mono"
              title="تغيير اللغة / Change Language"
            >
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'dz' ? 'EN' : 'DZ'}</span>
            </button>

            {/* Android Project Download */}
            <button
              id="open-android-code-btn"
              onClick={() => {
                audioService.playButtonClick();
                setIsAndroidModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 text-xs font-bold transition cursor-pointer"
              title="عرض كود Android وتحميل المشروع كاملاً (.ZIP)"
            >
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Android (.ZIP)</span>
            </button>

            {/* Network Diagnostics Modal */}
            <button
              id="open-diagnostics-header-btn"
              onClick={() => {
                audioService.playButtonClick();
                setIsDiagnosticsOpen(true);
              }}
              className="w-8 h-8 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 flex items-center justify-center transition cursor-pointer"
              title="لوحة تشخيص الشبكة (Network Diagnostics)"
            >
              <Bug className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col items-center justify-center">
        {mode === 'select' && (
          <div className="w-full max-w-3xl text-center space-y-10 py-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Wifi className="w-3.5 h-3.5" />
                Offline Local LAN Multiplayer Engine
              </span>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {t.appName}
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                {lang === 'dz'
                  ? 'لعبة قتال متعددة اللاعبين في ساحة مقام الشهيد بالعاصمة الجزائرية. خادم تلفاز موحد وهواتف تحكم تعمل بالكامل دون اتصال بالإنترنت عبر شبكة Wi-Fi أو Hotspot المحلية.'
                  : 'Multiplayer combat game set in the Algerian Martyrs\' Memorial arena. Authoritative TV host and responsive phone controllers running fully offline over local Wi-Fi or Hotspot.'}
              </p>
            </div>

            {/* Mode Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* TV / Host Card */}
              <div
                id="select-mode-tv-card"
                onClick={() => handleModeChange('tv')}
                className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:shadow-xl hover:shadow-sky-500/10 group relative overflow-hidden text-right"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition">
                  <Tv className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-sky-400 transition font-sans">
                  {t.tvHost}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {lang === 'dz'
                    ? 'شاشة العرض المركزية (Source of Truth): تدير الفيزياء، الرصاص، الأضرار، وتوزيع الفرق الأربعة، مع خريطة مقام الشهيد.'
                    : 'The authoritative central screen: manages physics, damage, and team lobbies with the Martyrs\' Memorial arena.'}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <span>{lang === 'dz' ? 'فتح شاشة الـ TV' : 'Open TV Host'}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${lang === 'dz' ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Phone / Controller Card */}
              <div
                id="select-mode-phone-card"
                onClick={() => handleModeChange('phone')}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:shadow-xl hover:shadow-emerald-500/10 group relative overflow-hidden text-right"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition font-sans">
                  {t.phoneController}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {lang === 'dz'
                    ? 'جهاز تحكم لمسي فوري: عصا تحكم افتراضية، تصويب، إطلاق نار، قفز، تبديل أسلحة وقنابل، واختيار وتخصيص الفريق والشخصية.'
                    : 'Responsive touch controller: virtual joystick, fire, jump, weapon switch, and team customization.'}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <span>{lang === 'dz' ? 'فتح شاشة الهاتف' : 'Open Phone Controller'}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${lang === 'dz' ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Quick Testing Options */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
              <button
                id="quick-start-dual-btn"
                onClick={() => handleModeChange('dual')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition flex items-center gap-2 cursor-pointer font-medium"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>
                  {lang === 'dz'
                    ? 'جرّب الشاشتين معاً (المحاكي المزدوج في صفحة واحدة)'
                    : 'Test both together (Dual Simulator in one page)'}
                </span>
              </button>

              <button
                id="quick-view-android-code-btn"
                onClick={() => {
                  audioService.playButtonClick();
                  setIsAndroidModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/30 transition flex items-center gap-2 cursor-pointer font-medium"
              >
                <FolderArchive className="w-4 h-4 text-emerald-400" />
                <span>
                  {lang === 'dz'
                    ? 'معاينة وتحميل مشروع Android الأصلي (Jetpack Compose + WebSocket)'
                    : 'View & Download Native Android Project (Compose + WebSocket)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {mode === 'tv' && (
          <TvHostView
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            onOpenAudioSettings={() => setIsAudioModalOpen(true)}
            lang={lang}
          />
        )}

        {mode === 'phone' && (
          <PhoneControllerView
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            onOpenAudioSettings={() => setIsAudioModalOpen(true)}
            lang={lang}
          />
        )}

        {mode === 'dual' && (
          <DualSimulatorView
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            onOpenAudioSettings={() => setIsAudioModalOpen(true)}
            lang={lang}
          />
        )}
      </main>

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        lang={lang}
        onLanguageChange={setLang}
      />

      {/* Diagnostics Modal (Network / LAN) */}
      <DiagnosticsModal isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />

      {/* Android Project Code Explorer & ZIP Export Modal */}
      <AndroidProjectModal isOpen={isAndroidModalOpen} onClose={() => setIsAndroidModalOpen(false)} />
    </div>
  );
}
