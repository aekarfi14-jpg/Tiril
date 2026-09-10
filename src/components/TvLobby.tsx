import React, { useState, useEffect } from 'react';
import { Player, TeamColor, RoomInfo } from '../types';
import { Language, translations } from '../i18n/translations';
import {
  Play,
  Clock,
  PowerOff,
  Radio,
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { CharacterAvatar2D } from './CharacterAvatar2D';

interface TvLobbyProps {
  roomInfo: RoomInfo;
  players: Player[];
  durationSeconds: number;
  onDurationChange: (sec: number) => void;
  onStartMatch: () => void;
  onSendHostTest: () => void;
  onStopRoom: () => void;
  lang: Language;
}

export const TvLobby: React.FC<TvLobbyProps> = ({
  roomInfo,
  players,
  durationSeconds,
  onDurationChange,
  onStartMatch,
  onSendHostTest,
  onStopRoom,
  lang,
}) => {
  const t = translations[lang];

  // TV Remote Navigation focus index
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const durationOptions = [60, 120, 180, 300, 600];

  // Keyboard / D-Pad listener for TV Remote
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setFocusedIndex((prev) => (prev + 1) % 4);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setFocusedIndex((prev) => (prev - 1 + 4) % 4);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (focusedIndex === 0) {
          onStartMatch();
        } else if (focusedIndex === 1) {
          const curIdx = durationOptions.indexOf(durationSeconds);
          const next = durationOptions[(curIdx + 1) % durationOptions.length];
          onDurationChange(next);
        } else if (focusedIndex === 2) {
          onSendHostTest();
        } else if (focusedIndex === 3) {
          onStopRoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, durationSeconds]);

  const teams: { key: TeamColor; label: string; bg: string; border: string; text: string }[] = [
    { key: 'red', label: t.teams.red, bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-400' },
    { key: 'green', label: t.teams.green, bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    { key: 'blue', label: t.teams.blue, bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-400' },
    { key: 'yellow', label: t.teams.yellow, bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400' },
  ];

  return (
    <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-300" dir={lang === 'dz' ? 'rtl' : 'ltr'}>
      {/* Top TV Status Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{roomInfo.name}</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {t.serverRunning}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {t.port}: {roomInfo.port} | {t.lanNotice}
          </p>
        </div>

        {/* Action Controls cluster (Remote friendly) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Duration Selector */}
          <div
            id="tv-duration-selector"
            tabIndex={0}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950 border transition ${
              focusedIndex === 1 ? 'border-sky-400 ring-2 ring-sky-400/40' : 'border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300">{t.matchDuration}:</span>
            <div className="flex items-center gap-1">
              {durationOptions.map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    audioService.playButtonClick();
                    onDurationChange(sec);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                    durationSeconds === sec
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          {/* START GAME Button */}
          <button
            id="start-match-btn"
            tabIndex={0}
            onClick={() => {
              audioService.playButtonClick();
              onStartMatch();
            }}
            disabled={players.length === 0}
            className={`px-7 py-3 rounded-2xl font-black text-sm shadow-xl transition flex items-center gap-2 cursor-pointer active:scale-95 ${
              players.length > 0
                ? focusedIndex === 0
                  ? 'bg-emerald-400 text-slate-950 ring-4 ring-emerald-400/40 scale-105'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.startMatch}</span>
          </button>

          {/* Stop Room */}
          <button
            id="tv-stop-room-btn"
            tabIndex={0}
            onClick={() => {
              audioService.playButtonClick();
              onStopRoom();
            }}
            className={`p-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/40 text-xs font-bold transition cursor-pointer ${
              focusedIndex === 3 ? 'ring-2 ring-rose-400' : ''
            }`}
          >
            <PowerOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Teams Display Grid with Animated 2D Characters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {teams.map((team) => {
          const teamPlayers = players.filter((p) => p.team === team.key);

          return (
            <div
              key={team.key}
              className={`bg-slate-900/90 border ${team.border} rounded-3xl p-4 shadow-xl flex flex-col justify-between min-h-[360px] relative overflow-hidden`}
            >
              {/* Team Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${team.bg} border ${team.border}`} />
                    <h3 className={`font-black text-sm sm:text-base tracking-wide ${team.text}`}>{team.label}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                    {teamPlayers.length}
                  </span>
                </div>

                {/* Team Players List with 2D Avatars */}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {teamPlayers.length === 0 ? (
                    <div className="py-14 text-center text-slate-600 text-xs font-medium">
                      {lang === 'dz' ? 'لا يوجد لاعبين في هذا الفريق' : 'No players in this team'}
                    </div>
                  ) : (
                    teamPlayers.map((p, idx) => (
                      <div
                        key={p.id}
                        className="bg-slate-950 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* 2D Animated Character Thumbnail */}
                          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                            <CharacterAvatar2D
                              team={team.key}
                              characterId={p.characterId}
                              weapon="rifle"
                              size={52}
                              animate={true}
                            />
                          </div>

                          <div>
                            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                              <span>{p.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono capitalize">{p.characterId}</div>
                          </div>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {t.ready}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Team Summary */}
              <div className="pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
                <span>{t.playersCount}</span>
                <span className="font-mono font-bold text-slate-300">{teamPlayers.length}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zero players guidance banner */}
      {players.length === 0 && (
        <div className="bg-slate-900/80 border border-dashed border-slate-800 rounded-3xl p-6 text-center space-y-2.5">
          <Radio className="w-7 h-7 text-sky-400 mx-auto animate-pulse" />
          <h4 className="text-sm font-bold text-slate-200">{t.waitingForPlayers}</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {lang === 'dz'
              ? 'افتح الهاتف على وضع Phone / Controller على نفس الشبكة للدخول وتخصيص فريقك وشخصيتك.'
              : 'Open the phone in Phone / Controller mode on the same local network to join and pick your team.'}
          </p>
        </div>
      )}
    </div>
  );
};
