import React, { useState } from 'react';
import { RoomInfo, TeamColor } from '../types';
import { Language, translations, CHARACTERS } from '../i18n/translations';
import { User, Shield, Send, LogOut, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { audioService } from '../services/audioService';
import { CharacterAvatar2D } from './CharacterAvatar2D';

interface PhoneLobbyProps {
  roomInfo: RoomInfo;
  playerName: string;
  characterId: string;
  team: TeamColor;
  onCustomize: (name: string, characterId: string, team: TeamColor) => void;
  onSendTest: () => void;
  onDisconnect: () => void;
  testSentFeedback: boolean;
  lang: Language;
}

export const PhoneLobby: React.FC<PhoneLobbyProps> = ({
  roomInfo,
  playerName,
  characterId,
  team,
  onCustomize,
  onSendTest,
  onDisconnect,
  testSentFeedback,
  lang,
}) => {
  const t = translations[lang];

  const [name, setName] = useState(playerName);
  const [selectedChar, setSelectedChar] = useState(characterId);
  const [selectedTeam, setSelectedTeam] = useState<TeamColor>(team);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  const teamList: { key: TeamColor; label: string; text: string; bg: string; border: string }[] = [
    { key: 'red', label: t.teams.red, text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' },
    { key: 'green', label: t.teams.green, text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' },
    { key: 'blue', label: t.teams.blue, text: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/40' },
    { key: 'yellow', label: t.teams.yellow, text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40' },
  ];

  const handleConfirm = () => {
    audioService.playButtonClick();
    onCustomize(name.trim() || 'Player', selectedChar, selectedTeam);
    setConfirmedSuccess(true);
    setTimeout(() => setConfirmedSuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-md space-y-4 animate-in fade-in duration-300" dir={lang === 'dz' ? 'rtl' : 'ltr'}>
      {/* Room & Status Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {t.connected}
          </div>
          <h2 className="text-lg font-black text-white mt-1">{roomInfo.name}</h2>
        </div>

        <div className="text-left font-mono text-xs text-slate-400">
          <div>{roomInfo.hostIp}:{roomInfo.port}</div>
          <div className="text-emerald-400 font-bold">{t.ready}</div>
        </div>
      </div>

      {/* 2D Animated Full-Body Character Showcase */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-3 left-4 text-[10px] font-mono font-bold text-sky-400 tracking-wider">
          2D COMBAT MODEL
        </div>
        <div className="w-36 h-36 flex items-center justify-center relative my-1">
          <CharacterAvatar2D
            team={selectedTeam}
            characterId={selectedChar}
            weapon="rifle"
            size={135}
            animate={true}
          />
        </div>
        <span className="text-xs font-bold text-slate-300">
          {name.trim() || 'Player'}
        </span>
      </div>

      {/* Player Customization Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <User className="w-4 h-4 text-sky-400" />
          <h3 className="font-bold text-sm text-white">{t.playerCustomization}</h3>
        </div>

        {/* Player Name Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">{t.playerName}</label>
          <input
            id="player-name-input"
            type="text"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-2xl px-4 py-2.5 text-white text-sm font-bold outline-none transition"
            placeholder={t.playerName}
          />
        </div>

        {/* Team Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">{t.chooseTeam}</label>
          <div className="grid grid-cols-2 gap-2">
            {teamList.map((tm) => {
              const isSelected = selectedTeam === tm.key;
              return (
                <button
                  key={tm.key}
                  id={`select-team-${tm.key}-btn`}
                  type="button"
                  onClick={() => {
                    audioService.playButtonClick();
                    setSelectedTeam(tm.key);
                  }}
                  className={`p-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                    isSelected
                      ? `${tm.bg} ${tm.border} ${tm.text} ring-2 ring-sky-400/40`
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{tm.label}</span>
                  <span className={`w-3 h-3 rounded-full ${tm.bg} border ${tm.border}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Character Archetype Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">{t.chooseCharacter}</label>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTERS.map((char) => {
              const isSelected = selectedChar === char.id;
              const charName = lang === 'dz' ? char.nameDz : char.nameEn;
              const charRole = lang === 'dz' ? char.roleDz : char.roleEn;

              return (
                <button
                  key={char.id}
                  id={`select-char-${char.id}-btn`}
                  type="button"
                  onClick={() => {
                    audioService.playButtonClick();
                    setSelectedChar(char.id);
                  }}
                  className={`p-2.5 rounded-2xl text-right transition border cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-400 ring-2 ring-sky-400/30'
                      : 'bg-slate-950 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{charName}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: char.color }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{charRole}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          id="confirm-customization-btn"
          onClick={handleConfirm}
          className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{confirmedSuccess ? (lang === 'dz' ? '✓ تم الحفظ والتحديث على التلفاز!' : '✓ Updated on TV!') : t.confirmChanges}</span>
        </button>
      </div>

      {/* Network Test Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="phone-send-test-btn"
          onClick={() => {
            audioService.playButtonClick();
            onSendTest();
          }}
          className="py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Send className="w-3.5 h-3.5 text-sky-400" />
          <span>{testSentFeedback ? '✓ SENT' : t.sendTest}</span>
        </button>

        <button
          id="phone-disconnect-btn"
          onClick={() => {
            audioService.playButtonClick();
            onDisconnect();
          }}
          className="py-2.5 rounded-2xl bg-slate-900/90 hover:bg-rose-950/40 text-rose-300 border border-slate-800 hover:border-rose-900/40 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.disconnect}</span>
        </button>
      </div>
    </div>
  );
};
