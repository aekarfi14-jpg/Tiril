import React, { useEffect, useRef } from 'react';
import { TeamColor, WeaponType } from '../types';

interface CharacterAvatar2DProps {
  team: TeamColor;
  characterId?: string;
  weapon?: WeaponType;
  size?: number; // width & height in px
  animate?: boolean;
  className?: string;
}

export const CharacterAvatar2D: React.FC<CharacterAvatar2DProps> = ({
  team,
  characterId = 'commando',
  weapon = 'rifle',
  size = 140,
  animate = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const teamHex: Record<TeamColor, string> = {
      red: '#ef4444',
      green: '#10b981',
      blue: '#3b82f6',
      yellow: '#f59e0b',
    };
    const teamColor = teamHex[team] || '#38bdf8';

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 15;
      const scale = size / 100;

      const idleBob = animate ? Math.sin(time * 0.004) * 1.8 : 0;
      const armAngle = animate ? Math.sin(time * 0.003) * 0.06 - 0.1 : -0.1;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Floor Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 32, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Back Leg
      drawLeg(ctx, -5, 10 + idleBob, -0.05, '#1e293b', '#0f172a');
      // Front Leg
      drawLeg(ctx, 5, 10 + idleBob, 0.05, '#334155', '#1e293b');

      // Torso & Ballistic Vest
      const torsoY = -6 + idleBob;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-11, torsoY - 14, 22, 28, 6);
      ctx.fill();

      // Team colored armor plate
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.roundRect(-9, torsoY - 12, 18, 16, 4);
      ctx.fill();

      // Harness straps
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, torsoY - 12);
      ctx.lineTo(7, torsoY + 4);
      ctx.moveTo(7, torsoY - 12);
      ctx.lineTo(-7, torsoY + 4);
      ctx.stroke();

      // Belt
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, torsoY + 9, 20, 5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-3, torsoY + 9.5, 6, 4);

      // Head & Beret
      const headY = torsoY - 24;
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-4, headY + 8, 8, 5);

      // Head
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, headY, 9, 0, Math.PI * 2);
      ctx.fill();

      // Tactical Beret
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.ellipse(1, headY - 4, 11, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Beret Gold Insignia
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(4, headY - 4, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Visor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1, headY - 2, 8, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(2, headY - 1, 6.5, 2.5);

      // Weapon Arm & 2D Gun
      ctx.save();
      ctx.translate(0, torsoY - 6);
      ctx.rotate(armAngle);

      if (weapon === 'shotgun') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(-14, -2, 12, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-2, -4, 18, 8);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(16, -3, 16, 5);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(8, 2, 12, 4);
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(-16, -2, 14, 5);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-2, -4, 20, 8);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(18, -2, 16, 4);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(4, 4, 6, 11, 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4, -8, 8, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(7, -7, 2, 2);
      }

      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, 2);
      ctx.stroke();

      ctx.restore();

      ctx.restore();

      if (animate) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [team, characterId, weapon, size, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`block ${className}`}
    />
  );
};

function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  angle: number,
  thighColor: string,
  bootColor: string
) {
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(angle);

  ctx.strokeStyle = thighColor;
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 12);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(1, 20);
  ctx.stroke();

  ctx.fillStyle = bootColor;
  ctx.beginPath();
  ctx.roundRect(-2, 19, 9, 6, 2);
  ctx.fill();

  ctx.restore();
}
