import React from 'react';
import { GamePlayerState, TeamColor } from '../types';
import { Language, translations } from '../i18n/translations';
import { Trophy, RotateCcw, Home, Crosshair, Skull, Award } from 'lucide-react';
import { audioService } from '../services/audioService';

interface MatchEndModalProps {
  winnerTeam: TeamColor | null;
  teamScores: Record<TeamColor, number>;
  playerStats: GamePlayerState[];
  isHost: boolean;
  onRematch: () => void;
  onBackToLobby: () => void;
  lang: Language;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  winnerTeam,
  teamScores,
  playerStats,
  isHost,
  onRematch,
  onBackToLobby,
  lang,
}) => {
  const t = translations[lang];

  const teamColors: Record<TeamColor, { label: string; text: string; bg: string; border: string }> = {
    red: { label: t.teams.red, text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
    green: { label: t.teams.green, text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    blue: { label: t.teams.blue, text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
    yellow: { label: t.teams.yellow, text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  };

  const winningMeta = winnerTeam ? teamColors[winnerTeam] : null;

  // Sort players by kills descending, then score
  const sortedPlayers = [...playerStats].sort((a, b) => b.kills - a.kills || b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 my-auto"
        dir={lang === 'dz' ? 'rtl' : 'ltr'}
      >
        {/* Winner Banner */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
              {t.matchOver}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {winningMeta ? (
                <span className={winningMeta.text}>{winningMeta.label}</span>
              ) : (
                <span>{t.winnerTeam}</span>
              )}
            </h2>
          </div>
        </div>

        {/* Team Score Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(teamScores) as TeamColor[]).map((teamKey) => {
            const meta = teamColors[teamKey];
            const isWinner = teamKey === winnerTeam;
            return (
              <div
                key={teamKey}
                className={`p-3.5 rounded-2xl border text-center transition ${meta.bg} ${meta.border} ${
                  isWinner ? 'ring-2 ring-amber-400/50 shadow-md' : ''
                }`}
              >
                <div className="text-[11px] font-bold text-slate-300 truncate">{meta.label}</div>
                <div className={`text-2xl font-black font-mono mt-1 ${meta.text}`}>
                  {teamScores[teamKey]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Players Scoreboard Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2">
            <span>{t.scoreboard}</span>
            <div className="flex items-center gap-8 text-[11px] font-mono">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                {t.kills}
              </span>
              <span className="flex items-center gap-1">
                <Skull className="w-3.5 h-3.5 text-slate-400" />
                {t.deaths}
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                {t.score}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {sortedPlayers.map((player, rank) => {
              const teamMeta = teamColors[player.team];
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-slate-950 border border-slate-800/80 px-4 py-3 rounded-2xl hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono font-bold text-slate-500 text-xs">
                      #{rank + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${teamMeta.bg} border ${teamMeta.border}`} />
                      <span className="font-bold text-slate-100 text-sm">{player.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 font-mono text-sm font-bold">
                    <span className="w-8 text-center text-rose-400">{player.kills}</span>
                    <span className="w-8 text-center text-slate-400">{player.deaths}</span>
                    <span className="w-12 text-center text-amber-400">{player.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons (Rematch & Lobby) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-800">
          {isHost ? (
            <>
              <button
                id="rematch-btn"
                onClick={() => {
                  audioService.playButtonClick();
                  onRematch();
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-base shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{t.rematch}</span>
              </button>

              <button
                id="back-to-lobby-btn"
                onClick={() => {
                  audioService.playButtonClick();
                  onBackToLobby();
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-base transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Home className="w-5 h-5" />
                <span>{t.backToLobby}</span>
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center">
              {lang === 'dz'
                ? 'في انتظار قرار المستضيف (Host) لإعادة المباراة أو العودة للغرفة...'
                : 'Waiting for Host to choose Rematch or return to Lobby...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
