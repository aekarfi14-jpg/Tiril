import React, { useEffect } from 'react';
import { audioService } from '../services/audioService';
import { Language, translations } from '../i18n/translations';
import { X, Flame } from 'lucide-react';

interface CountdownOverlayProps {
  count: number;
  isHost?: boolean;
  onCancel?: () => void;
  lang: Language;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  count,
  isHost = false,
  onCancel,
  lang,
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (count > 0) {
      audioService.playCountdownTick(count);
    }
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6">
      <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm tracking-wider">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{t.countdown}</span>
        </div>

        {/* Big Countdown Display */}
        <div
          key={count}
          className="w-40 h-40 sm:w-56 sm:h-56 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/50 flex items-center justify-center shadow-2xl shadow-amber-500/20 animate-pulse"
        >
          <span className="text-8xl sm:text-9xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-tr from-amber-400 via-yellow-200 to-white">
            {count}
          </span>
        </div>

        <p className="text-slate-400 text-sm max-w-sm">
          {lang === 'dz' ? 'المعركة تبدأ بعد قليل، استعد في موقعك!' : 'Battle commences shortly, prepare your position!'}
        </p>

        {/* Host cancel option */}
        {isHost && onCancel && (
          <button
            id="cancel-countdown-btn"
            onClick={() => {
              audioService.playButtonClick();
              onCancel();
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-sm transition cursor-pointer active:scale-95 shadow-lg"
          >
            <X className="w-4 h-4" />
            <span>{t.cancelCountdown}</span>
          </button>
        )}
      </div>
    </div>
  );
};
