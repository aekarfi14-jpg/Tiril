import React, { useState } from 'react';
import { audioService } from '../services/audioService';
import { Language, translations } from '../i18n/translations';
import { Volume2, VolumeX, Music, Mic, Languages, X } from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLanguageChange,
}) => {
  const t = translations[lang];
  const initialVolumes = audioService.getVolumes();

  const [music, setMusic] = useState(initialVolumes.music);
  const [sfx, setSfx] = useState(initialVolumes.sfx);
  const [voice, setVoice] = useState(initialVolumes.voice);

  if (!isOpen) return null;

  const handleMusicChange = (val: number) => {
    setMusic(val);
    audioService.setVolumes(val, sfx, voice);
  };

  const handleSfxChange = (val: number) => {
    setSfx(val);
    audioService.setVolumes(music, val, voice);
    audioService.playButtonClick();
  };

  const handleVoiceChange = (val: number) => {
    setVoice(val);
    audioService.setVolumes(music, sfx, val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6"
        dir={lang === 'dz' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">{t.audioSettings}</h3>
          </div>
          <button
            id="close-audio-settings-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Sliders */}
        <div className="space-y-4">
          {/* Music Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-2">
                <Music className="w-4 h-4 text-sky-400" />
                {t.musicVolume}
              </span>
              <span className="font-mono text-slate-400">{Math.round(music * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={music}
              onChange={(e) => handleMusicChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* SFX Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                {t.sfxVolume}
              </span>
              <span className="font-mono text-slate-400">{Math.round(sfx * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfx}
              onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Voice Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-400" />
                {t.voiceVolume}
              </span>
              <span className="font-mono text-slate-400">{Math.round(voice * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={voice}
              onChange={(e) => handleVoiceChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* Language Selection */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Languages className="w-4 h-4 text-indigo-400" />
            <span>{t.language}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              id="select-lang-dz-btn"
              onClick={() => {
                onLanguageChange('dz');
                audioService.playButtonClick();
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                lang === 'dz'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                  : 'bg-slate-850 text-slate-300 border-slate-750 hover:bg-slate-800'
              }`}
            >
              العربية الجزائرية (الدارجة)
            </button>
            <button
              id="select-lang-en-btn"
              onClick={() => {
                onLanguageChange('en');
                audioService.playButtonClick();
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                lang === 'en'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                  : 'bg-slate-850 text-slate-300 border-slate-750 hover:bg-slate-800'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
