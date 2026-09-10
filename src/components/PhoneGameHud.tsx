import React, { useState, useRef, useEffect } from 'react';
import { GamePlayerState, WeaponType, PlayerInput } from '../types';
import { Language, translations } from '../i18n/translations';
import { Crosshair, Bomb, ArrowUp, Sliders, Shield, RefreshCw } from 'lucide-react';
import { audioService } from '../services/audioService';

interface PhoneGameHudProps {
  playerState?: GamePlayerState;
  timeRemaining: number;
  onSendInput: (input: Omit<PlayerInput, 'playerId'>) => void;
  onOpenSettings: () => void;
  lang: Language;
}

export const PhoneGameHud: React.FC<PhoneGameHudProps> = ({
  playerState,
  timeRemaining,
  onSendInput,
  onOpenSettings,
  lang,
}) => {
  const t = translations[lang];

  // Input States
  const [moveVector, setMoveVector] = useState({ x: 0, y: 0 });
  const [aimAngle, setAimAngle] = useState(0);
  const [isFiring, setIsFiring] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [weapon, setWeapon] = useState<WeaponType>(playerState?.weapon || 'rifle');

  // Grenade hold-to-charge state
  const [isChargingGrenade, setIsChargingGrenade] = useState(false);
  const [grenadePower, setGrenadePower] = useState(0);
  const grenadeChargeIntervalRef = useRef<any>(null);

  // Virtual Joystick touch tracking
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const [joystickThumb, setJoystickThumb] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  // Send input continuously at ~30-60Hz
  useEffect(() => {
    const timer = setInterval(() => {
      onSendInput({
        moveX: moveVector.x,
        moveY: moveVector.y,
        aimAngle,
        isFiring,
        isJumping,
        weapon,
        isThrowingGrenade: false,
        grenadePower: 0,
      });
      // Reset one-shot jump
      if (isJumping) setIsJumping(false);
    }, 33);

    return () => clearInterval(timer);
  }, [moveVector, aimAngle, isFiring, isJumping, weapon]);

  // Touch Move Virtual Joystick Handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    setIsJoystickActive(true);
    updateJoystickPos(e.touches[0]);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (!isJoystickActive) return;
    updateJoystickPos(e.touches[0]);
  };

  const handleJoystickTouchEnd = () => {
    setIsJoystickActive(false);
    setJoystickThumb({ x: 0, y: 0 });
    setMoveVector({ x: 0, y: 0 });
  };

  const updateJoystickPos = (touch: React.Touch) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const maxRadius = 45;

    let clampedX = dx;
    let clampedY = dy;
    if (distance > maxRadius) {
      clampedX = (dx / distance) * maxRadius;
      clampedY = (dy / distance) * maxRadius;
    }

    setJoystickThumb({ x: clampedX, y: clampedY });
    setMoveVector({ x: clampedX / maxRadius, y: clampedY / maxRadius });

    // Also orient aim in movement direction if not explicitly aiming
    if (Math.hypot(clampedX, clampedY) > 8) {
      setAimAngle(Math.atan2(clampedY, clampedX));
    }
  };

  // Weapon Switch
  const handleWeaponSwitch = () => {
    audioService.playButtonClick();
    setWeapon((prev) => (prev === 'rifle' ? 'shotgun' : 'rifle'));
  };

  // Grenade Hold-to-Charge
  const handleGrenadeStart = () => {
    setIsChargingGrenade(true);
    setGrenadePower(0.2);

    grenadeChargeIntervalRef.current = setInterval(() => {
      setGrenadePower((prev) => Math.min(1.0, prev + 0.08));
    }, 80);
  };

  const handleGrenadeEnd = () => {
    if (grenadeChargeIntervalRef.current) {
      clearInterval(grenadeChargeIntervalRef.current);
    }
    setIsChargingGrenade(false);

    // Emit throw immediately
    onSendInput({
      moveX: moveVector.x,
      moveY: moveVector.y,
      aimAngle,
      isFiring,
      isJumping,
      weapon,
      isThrowingGrenade: true,
      grenadePower,
    });
    setGrenadePower(0);
  };

  // Format time
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 pointer-events-none select-none">
      {/* Top HUD Bar */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        {/* Player Health & Team */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs">
            #{playerState?.number || 1}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-xs font-bold text-slate-200">
              <span>{playerState?.name || 'Player'}</span>
              <span className="font-mono text-emerald-400">{playerState?.hp || 0}/100</span>
            </div>
            {/* Health Bar */}
            <div className="w-32 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(0, playerState?.hp || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Match Timer */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-2xl text-center shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TIME</span>
          <span className="font-mono font-black text-lg text-amber-400">{timeStr}</span>
        </div>

        {/* Audio / Settings icon */}
        <button
          id="hud-settings-btn"
          onClick={() => {
            audioService.playButtonClick();
            onOpenSettings();
          }}
          className="w-10 h-10 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shadow-lg"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Dead Respawn Banner Overlay */}
      {playerState && !playerState.isAlive && (
        <div className="self-center bg-rose-950/90 border border-rose-500/50 rounded-2xl px-6 py-3 text-center shadow-2xl animate-pulse pointer-events-auto">
          <span className="text-xs font-bold text-rose-300 block">YOU WERE ELIMINATED</span>
          <span className="font-mono font-black text-white text-base">
            Respawn in {Math.ceil(playerState.respawnTimeRemaining)}s
          </span>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="w-full flex items-end justify-between pointer-events-auto gap-4 pb-2">
        {/* Left: Virtual Joystick */}
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          className="w-36 h-36 rounded-full bg-slate-900/75 border-2 border-slate-800 relative flex items-center justify-center shadow-2xl backdrop-blur-sm touch-none"
        >
          {/* Thumb stick */}
          <div
            className="w-14 h-14 rounded-full bg-sky-500 border-2 border-sky-400 shadow-md transition-transform duration-75 flex items-center justify-center"
            style={{
              transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-white opacity-80" />
          </div>
        </div>

        {/* Right: Action Buttons Cluster */}
        <div className="flex flex-col items-end gap-3">
          {/* Top row: Weapon Switch & Jump */}
          <div className="flex items-center gap-3">
            {/* Grenade Button (Hold to Charge) */}
            <div className="relative">
              {isChargingGrenade && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-950 border border-amber-500 rounded-lg px-2 py-0.5 text-[10px] font-mono text-amber-300 font-bold">
                  {Math.round(grenadePower * 100)}%
                </div>
              )}
              <button
                id="hud-grenade-btn"
                onTouchStart={handleGrenadeStart}
                onTouchEnd={handleGrenadeEnd}
                onMouseDown={handleGrenadeStart}
                onMouseUp={handleGrenadeEnd}
                className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center font-bold transition shadow-lg touch-none cursor-pointer ${
                  isChargingGrenade
                    ? 'bg-amber-500 text-slate-950 border-amber-400 ring-4 ring-amber-400/40'
                    : 'bg-slate-900/90 border-slate-800 text-amber-400 hover:border-amber-500/40'
                }`}
              >
                <Bomb className="w-5 h-5" />
                <span className="text-[9px] font-mono mt-0.5">BOMB</span>
              </button>
            </div>

            {/* Weapon Switch Button */}
            <button
              id="hud-weapon-switch-btn"
              onClick={handleWeaponSwitch}
              className="px-3.5 h-14 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 flex flex-col items-center justify-center font-bold text-xs transition shadow-lg cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-sky-400 mb-1" />
              <span className="font-mono text-[10px] uppercase font-bold text-slate-300">
                {weapon}
              </span>
            </button>

            {/* Jump Button */}
            <button
              id="hud-jump-btn"
              onClick={() => setIsJumping(true)}
              className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-emerald-400 flex flex-col items-center justify-center font-bold text-xs transition shadow-lg cursor-pointer active:scale-95"
            >
              <ArrowUp className="w-5 h-5" />
              <span className="text-[9px] font-mono mt-0.5">JUMP</span>
            </button>
          </div>

          {/* Bottom row: Massive Fire Button */}
          <button
            id="hud-fire-btn"
            onTouchStart={() => setIsFiring(true)}
            onTouchEnd={() => setIsFiring(false)}
            onMouseDown={() => setIsFiring(true)}
            onMouseUp={() => setIsFiring(false)}
            className={`w-28 h-20 rounded-3xl font-black text-base shadow-2xl flex items-center justify-center gap-2 transition touch-none cursor-pointer ${
              isFiring
                ? 'bg-rose-500 text-white ring-4 ring-rose-400/40 scale-98'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
            }`}
          >
            <Crosshair className="w-6 h-6" />
            <span className="tracking-wide">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
