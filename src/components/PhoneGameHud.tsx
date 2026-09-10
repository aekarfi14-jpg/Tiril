import React, { useState, useRef, useEffect } from 'react';
import { GamePlayerState, WeaponType, PlayerInput } from '../types';
import { Language, translations } from '../i18n/translations';
import { Crosshair, Bomb, ArrowUp, Sliders, RefreshCw, Zap } from 'lucide-react';
import { audioService } from '../services/audioService';
import { localLanBus } from '../services/localLanBus';
import { CharacterAvatar2D } from './CharacterAvatar2D';

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

  // Movement & Aiming State
  const [moveVector, setMoveVector] = useState({ x: 0, y: 0 });
  const [aimAngle, setAimAngle] = useState(0);
  const [isFiring, setIsFiring] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [weapon, setWeapon] = useState<WeaponType>(playerState?.weapon || 'rifle');

  // Grenade Hold-to-Charge
  const [isChargingGrenade, setIsChargingGrenade] = useState(false);
  const [grenadePower, setGrenadePower] = useState(0);
  const grenadeChargeIntervalRef = useRef<any>(null);

  // Virtual Joystick
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const [joystickThumb, setJoystickThumb] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const jumpDebounceRef = useRef<boolean>(false);

  // Fire / Aim Button Touch
  const fireButtonRef = useRef<HTMLButtonElement | null>(null);

  // Send input continuously at ~40Hz
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

      if (isJumping) setIsJumping(false);
    }, 28);

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
    jumpDebounceRef.current = false;
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
    const normX = clampedX / maxRadius;
    const normY = clampedY / maxRadius;
    setMoveVector({ x: normX, y: normY });

    // Upward flick jump on joystick
    if (normY < -0.65 && !jumpDebounceRef.current) {
      setIsJumping(true);
      jumpDebounceRef.current = true;
    } else if (normY > -0.3) {
      jumpDebounceRef.current = false;
    }

    // Aim orientation tracks horizontal direction if not using fire drag aim
    if (Math.abs(normX) > 0.2 && !isFiring) {
      setAimAngle(normX > 0 ? 0 : Math.PI);
    }
  };

  // Fire Touch & Drag to Aim
  const handleFireTouchStart = (e: React.TouchEvent) => {
    setIsFiring(true);
    localLanBus.vibrate(25);
    updateFireAim(e.touches[0]);
  };

  const handleFireTouchMove = (e: React.TouchEvent) => {
    updateFireAim(e.touches[0]);
  };

  const handleFireTouchEnd = () => {
    setIsFiring(false);
  };

  const updateFireAim = (touch: React.Touch) => {
    if (!fireButtonRef.current) return;
    const rect = fireButtonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    if (Math.hypot(dx, dy) > 10) {
      setAimAngle(Math.atan2(dy, dx));
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
    }, 70);
  };

  const handleGrenadeEnd = () => {
    if (grenadeChargeIntervalRef.current) {
      clearInterval(grenadeChargeIntervalRef.current);
    }
    setIsChargingGrenade(false);

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

  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-4 pointer-events-none select-none">
      {/* Top HUD: Tactical Status Display */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        {/* Player Profile & 2D Avatar Badge */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 px-3 py-2 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative">
            <CharacterAvatar2D
              team={playerState?.team || 'red'}
              characterId={playerState?.characterId}
              weapon={weapon}
              size={54}
              animate={true}
            />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-900 rounded-tl font-mono font-bold text-[9px] text-white flex items-center justify-center">
              {playerState?.number || 1}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-100">
              <span className="truncate max-w-[90px]">{playerState?.name || 'Player'}</span>
              <span className="font-mono text-emerald-400 font-bold">{playerState?.hp || 0}/100</span>
            </div>
            {/* Segmented Tactical HP Bar */}
            <div className="w-28 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(0, playerState?.hp || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center Match Clock */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 px-4 py-2 rounded-2xl text-center shadow-xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">TIME</span>
          <span className="font-mono font-black text-lg text-amber-400">{timeStr}</span>
        </div>

        {/* Quick Settings Action */}
        <button
          id="hud-settings-btn"
          onClick={() => {
            audioService.playButtonClick();
            onOpenSettings();
          }}
          className="w-11 h-11 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shadow-xl active:scale-95"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {/* Defeat / Respawn Notice Banner */}
      {playerState && !playerState.isAlive && (
        <div className="self-center bg-rose-950/95 border border-rose-500/60 rounded-3xl px-6 py-4 text-center shadow-2xl animate-pulse pointer-events-auto">
          <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">
            {lang === 'dz' ? 'تمت تصفيتك' : 'ELIMINATED'}
          </span>
          <span className="font-mono font-black text-white text-lg">
            {lang === 'dz' ? 'العودة بعد' : 'Respawn in'} {Math.ceil(playerState.respawnTimeRemaining)}s
          </span>
        </div>
      )}

      {/* Bottom Controls: Tactile Virtual Controller */}
      <div className="w-full flex items-end justify-between pointer-events-auto gap-3 pb-2">
        {/* Left Side: Analog Directional Thumbstick */}
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          className="w-36 h-36 rounded-full bg-slate-950/85 border-2 border-slate-800 relative flex items-center justify-center shadow-2xl backdrop-blur-sm touch-none"
        >
          {/* Directional Accent Guides */}
          <div className="absolute top-2 w-1 h-3 bg-slate-700/60 rounded-full" />
          <div className="absolute bottom-2 w-1 h-3 bg-slate-700/60 rounded-full" />
          <div className="absolute left-2 w-3 h-1 bg-slate-700/60 rounded-full" />
          <div className="absolute right-2 w-3 h-1 bg-slate-700/60 rounded-full" />

          {/* Thumb Stick Knob */}
          <div
            className="w-14 h-14 rounded-full bg-sky-500 border-2 border-sky-300 shadow-xl transition-transform duration-75 flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white opacity-85" />
          </div>
        </div>

        {/* Right Side: Action Clusters (Jump, Weapon, Grenade, Fire) */}
        <div className="flex flex-col items-end gap-3">
          {/* Secondary Actions Bar */}
          <div className="flex items-center gap-2.5">
            {/* Grenade Button (Hold to Charge Arc) */}
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
                className={`w-13 h-13 rounded-2xl border flex flex-col items-center justify-center font-bold transition shadow-xl touch-none cursor-pointer active:scale-95 ${
                  isChargingGrenade
                    ? 'bg-amber-500 text-slate-950 border-amber-400 ring-4 ring-amber-400/40'
                    : 'bg-slate-900/90 border-slate-800 text-amber-400 hover:border-amber-500/40'
                }`}
              >
                <Bomb className="w-5 h-5" />
                <span className="text-[9px] font-mono mt-0.5 font-bold">BOMB</span>
              </button>
            </div>

            {/* Weapon Toggle (Rifle / Shotgun) */}
            <button
              id="hud-weapon-switch-btn"
              onClick={handleWeaponSwitch}
              className="px-3.5 h-13 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 flex flex-col items-center justify-center font-bold text-xs transition shadow-xl cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-sky-400 mb-0.5" />
              <span className="font-mono text-[10px] uppercase font-bold text-slate-200">
                {weapon}
              </span>
            </button>

            {/* Jump Button (Crucial for 2D Side-View) */}
            <button
              id="hud-jump-btn"
              onClick={() => {
                setIsJumping(true);
                localLanBus.vibrate(20);
              }}
              onTouchStart={() => {
                setIsJumping(true);
                localLanBus.vibrate(20);
              }}
              className="w-14 h-14 rounded-2xl bg-emerald-600/25 border-2 border-emerald-500 hover:bg-emerald-600/35 text-emerald-300 flex flex-col items-center justify-center font-bold text-xs transition shadow-xl cursor-pointer active:scale-95"
            >
              <ArrowUp className="w-6 h-6 stroke-[2.5]" />
              <span className="text-[9px] font-mono mt-0.5 font-black tracking-wider">JUMP</span>
            </button>
          </div>

          {/* Primary Action: High-Caliber FIRE Trigger with Drag-Aim */}
          <button
            ref={fireButtonRef}
            id="hud-fire-btn"
            onTouchStart={handleFireTouchStart}
            onTouchMove={handleFireTouchMove}
            onTouchEnd={handleFireTouchEnd}
            onMouseDown={() => setIsFiring(true)}
            onMouseUp={() => setIsFiring(false)}
            className={`w-32 h-20 rounded-3xl font-black text-base shadow-2xl flex items-center justify-center gap-2 transition touch-none cursor-pointer active:scale-95 ${
              isFiring
                ? 'bg-rose-500 text-white ring-4 ring-rose-400/50'
                : 'bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-600/30'
            }`}
          >
            <Crosshair className="w-6 h-6 stroke-[2.5]" />
            <span className="tracking-wider text-base font-black">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
