import React, { useRef, useEffect } from 'react';
import { GameStateBroadcast, TeamColor } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, MAP_WALLS, TEAM_SPAWNS } from '../game/mapData';

interface GameCanvasProps {
  gameState: GameStateBroadcast;
  followPlayerId?: string; // If set, camera centers smoothly on this player
  className?: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  followPlayerId,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, scale: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Update camera target
      if (followPlayerId) {
        const targetPlayer = gameState.players.find((p) => p.id === followPlayerId);
        if (targetPlayer) {
          // Smooth camera lerp
          cameraRef.current.x += (targetPlayer.x - cameraRef.current.x) * 0.15;
          cameraRef.current.y += (targetPlayer.y - cameraRef.current.y) * 0.15;
          cameraRef.current.scale = 1.05;
        }
      } else {
        // Overview on TV: fit map into view or center
        const scaleX = width / MAP_WIDTH;
        const scaleY = height / MAP_HEIGHT;
        const fitScale = Math.min(scaleX, scaleY) * 0.95;
        cameraRef.current.x = MAP_WIDTH / 2;
        cameraRef.current.y = MAP_HEIGHT / 2;
        cameraRef.current.scale = Math.max(0.45, fitScale);
      }

      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;
      const scale = cameraRef.current.scale;

      // Clear Canvas Background
      ctx.fillStyle = '#090d16'; // Deep tactical navy
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      // Apply Camera Transform
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-camX, -camY);

      // --- 1. Draw Map Arena Floor & Grid ---
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      // Tactical grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MAP_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(MAP_WIDTH, y);
        ctx.stroke();
      }

      // --- 2. Draw Center Algerian Monument: Maqam El Chahid Plaza ---
      const centerX = 1200;
      const centerY = 800;

      // Concentric stone memorial plaza rings
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 240, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 380, 0, Math.PI * 2);
      ctx.stroke();

      // Monument ground insignia
      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
      ctx.fill();

      // Flame Glow in Center
      const flameGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 75);
      flameGrad.addColorStop(0, 'rgba(245, 158, 11, 0.8)');
      flameGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 75, 0, Math.PI * 2);
      ctx.fill();

      // --- 3. Draw Team Base Markers ---
      const teamHex: Record<TeamColor, string> = {
        red: '#ef4444',
        green: '#10b981',
        blue: '#3b82f6',
        yellow: '#eab308',
      };
      (Object.entries(TEAM_SPAWNS) as [TeamColor, { x: number; y: number }][]).forEach(
        ([tKey, pos]) => {
          ctx.strokeStyle = teamHex[tKey];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 70, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `${teamHex[tKey]}15`;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 70, 0, Math.PI * 2);
          ctx.fill();
        }
      );

      // --- 4. Draw Map Static Walls & Monument Fins ---
      MAP_WALLS.forEach((wall) => {
        if (wall.isMonument) {
          // Curved elegant monument fins
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(wall.x, wall.y, wall.width, wall.height, 16);
          ctx.fill();
          ctx.stroke();

          // Highlight fin crest
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(wall.x + 4, wall.y + 4, wall.width - 8, 6);
        } else {
          // Standard tactical walls / blocks
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
          ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
        }
      });

      // --- 5. Draw Wooden Crates (Pushable & Destructible) ---
      gameState.crates.forEach((crate) => {
        if (crate.broken) return;

        // Crate base wood body
        ctx.fillStyle = '#92400e';
        ctx.fillRect(crate.x, crate.y, crate.width, crate.height);

        // Wood borders and planks
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.strokeRect(crate.x, crate.y, crate.width, crate.height);

        // Diagonal wood cross brace
        ctx.beginPath();
        ctx.moveTo(crate.x + 4, crate.y + 4);
        ctx.lineTo(crate.x + crate.width - 4, crate.y + crate.height - 4);
        ctx.moveTo(crate.x + crate.width - 4, crate.y + 4);
        ctx.lineTo(crate.x + 4, crate.y + crate.height - 4);
        ctx.stroke();

        // Mini HP indicator for crate
        const hpPercent = Math.max(0, crate.hp / crate.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(crate.x + 4, crate.y - 8, crate.width - 8, 4);

        ctx.fillStyle = hpPercent > 0.5 ? '#10b981' : hpPercent > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(crate.x + 4, crate.y - 8, (crate.width - 8) * hpPercent, 4);
      });

      // --- 6. Draw Grenades ---
      gameState.grenades.forEach((g) => {
        // Grenade body
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();

        // Blinking fuse LED
        const blink = Math.floor(Date.now() / 150) % 2 === 0;
        ctx.fillStyle = blink ? '#ef4444' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 7. Draw Projectiles (Bullets) ---
      gameState.projectiles.forEach((p) => {
        ctx.fillStyle = p.weapon === 'shotgun' ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bullet tracer tail
        ctx.strokeStyle = p.weapon === 'shotgun' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      });

      // --- 8. Draw Explosions ---
      gameState.explosions.forEach((exp) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, exp.alpha);
        ctx.strokeStyle = exp.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `${exp.color}33`;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- 9. Draw Players ---
      gameState.players.forEach((p) => {
        const teamColor = teamHex[p.team] || '#38bdf8';

        if (!p.isAlive) {
          // Dead marker
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`+${Math.ceil(p.respawnTimeRemaining)}s`, p.x, p.y - 18);
          return;
        }

        // Jump Elevation & Shadow
        const renderY = p.y - (p.jumpHeight || 0);
        if (p.isJumping) {
          // Shadow on ground
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 4, 16, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Player Body Circle
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(p.x, renderY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Team Color Ring / Armband Accent
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, renderY, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Weapon Barrel / Aim Direction
        const barrelLen = p.weapon === 'shotgun' ? 24 : 28;
        const barrelX = p.x + Math.cos(p.aimAngle) * barrelLen;
        const barrelY = renderY + Math.sin(p.aimAngle) * barrelLen;

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = p.weapon === 'shotgun' ? 4.5 : 3;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(p.aimAngle) * 12, renderY + Math.sin(p.aimAngle) * 12);
        ctx.lineTo(barrelX, barrelY);
        ctx.stroke();

        // Player Number Badge inside body
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${p.number || 1}`, p.x, renderY);

        // Player Name & Health Bar (Floating above)
        const barWidth = 44;
        const barHeight = 4;
        const barX = p.x - barWidth / 2;
        const barY = renderY - 28;

        // Health background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health fill
        const hpPercent = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle = hpPercent > 0.5 ? '#10b981' : hpPercent > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Player Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.name, p.x, barY - 2);
      });

      ctx.restore();

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [gameState, followPlayerId]);

  // Handle Resize smoothly
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
