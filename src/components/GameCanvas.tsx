import React, { useRef, useEffect } from 'react';
import { GameStateBroadcast, TeamColor, GamePlayerState } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, MAP_PLATFORMS, TEAM_SPAWNS } from '../game/mapData';

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
  const cameraRef = useRef({ x: MAP_WIDTH / 2, y: 900, scale: 1 });

  // Ambient particles (Eternal flame sparks and dusk embers)
  const embersRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }>>([]);

  useEffect(() => {
    // Initialize ambient embers around center monument
    if (embersRef.current.length === 0) {
      for (let i = 0; i < 45; i++) {
        embersRef.current.push({
          x: 1200 + (Math.random() * 260 - 130),
          y: 1080 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 35,
          vy: -30 - Math.random() * 55,
          life: Math.random() * 2.5,
          maxLife: 2.5 + Math.random() * 1.5,
          size: 1.5 + Math.random() * 2.5,
        });
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animFrameId: number;
    let lastTime = performance.now();

    const teamHex: Record<TeamColor, string> = {
      red: '#ef4444',
      green: '#10b981',
      blue: '#3b82f6',
      yellow: '#f59e0b',
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const width = canvas.width;
      const height = canvas.height;

      // Update Camera Target
      if (followPlayerId) {
        const targetPlayer = gameState.players.find((p) => p.id === followPlayerId);
        if (targetPlayer) {
          // Smooth camera lerp following player
          cameraRef.current.x += (targetPlayer.x - cameraRef.current.x) * 0.14;
          cameraRef.current.y += (targetPlayer.y - cameraRef.current.y) * 0.14;
          // Scale for comfortable mobile/controller view
          cameraRef.current.scale = 1.0;
        }
      } else {
        // Overview on TV: fit entire arena nicely
        const scaleX = width / MAP_WIDTH;
        const scaleY = height / MAP_HEIGHT;
        const fitScale = Math.min(scaleX, scaleY) * 0.98;
        cameraRef.current.x = MAP_WIDTH / 2;
        cameraRef.current.y = 850;
        cameraRef.current.scale = Math.max(0.42, fitScale);
      }

      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;
      const scale = cameraRef.current.scale;

      // --- 1. Draw Sky & Atmosphere ---
      // Twilight dusk sky over Algiers
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#060913'); // Midnight indigo
      skyGrad.addColorStop(0.55, '#0f172a'); // Deep slate
      skyGrad.addColorStop(0.85, '#1e1b4b'); // Twilight violet
      skyGrad.addColorStop(1, '#2e1065'); // Warm horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      // Apply Camera Transform
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-camX, -camY);

      // --- 2. Parallax Distant Background: Algiers Bay & Hillside City Lights ---
      // Distant Mediterranean coastline & rolling hills
      ctx.fillStyle = '#080d1a';
      ctx.beginPath();
      ctx.moveTo(0, 1250);
      ctx.bezierCurveTo(400, 950, 800, 1020, 1300, 920);
      ctx.bezierCurveTo(1800, 850, 2200, 960, MAP_WIDTH, 900);
      ctx.lineTo(MAP_WIDTH, 1400);
      ctx.lineTo(0, 1400);
      ctx.closePath();
      ctx.fill();

      // Twinkling city lights along Algiers coastline
      ctx.fillStyle = 'rgba(253, 224, 71, 0.65)';
      for (let i = 0; i < 60; i++) {
        const starX = (i * 47) % MAP_WIDTH;
        const starY = 920 + Math.sin(i * 1.7) * 45 + (i % 5) * 12;
        const twinkle = (Math.sin(now * 0.003 + i) + 1) * 0.5;
        if (twinkle > 0.3) {
          ctx.beginPath();
          ctx.arc(starX, starY, 1.2 * twinkle, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- 3. Background Architecture: Maqam El Chahid (مقام الشهيد) Monument Silhouette ---
      const monX = 1300;
      const monBaseY = 1250;

      // Atmospheric Spotlights shining up into the sky from the monument base
      const spotGrad1 = ctx.createLinearGradient(monX - 180, monBaseY, monX - 320, 100);
      spotGrad1.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      spotGrad1.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = spotGrad1;
      ctx.beginPath();
      ctx.moveTo(monX - 180, monBaseY);
      ctx.lineTo(monX - 380, 80);
      ctx.lineTo(monX - 220, 80);
      ctx.closePath();
      ctx.fill();

      const spotGrad2 = ctx.createLinearGradient(monX + 180, monBaseY, monX + 320, 100);
      spotGrad2.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      spotGrad2.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = spotGrad2;
      ctx.beginPath();
      ctx.moveTo(monX + 180, monBaseY);
      ctx.lineTo(monX + 380, 80);
      ctx.lineTo(monX + 220, 80);
      ctx.closePath();
      ctx.fill();

      // Monument's 3 Towering Palm Fins (Architectural Silhouette)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;

      // Left Fin
      ctx.beginPath();
      ctx.moveTo(monX - 180, monBaseY);
      ctx.bezierCurveTo(monX - 260, 850, monX - 160, 480, monX - 40, 240);
      ctx.lineTo(monX - 20, 240);
      ctx.bezierCurveTo(monX - 110, 520, monX - 160, 880, monX - 110, monBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Fin
      ctx.beginPath();
      ctx.moveTo(monX + 180, monBaseY);
      ctx.bezierCurveTo(monX + 260, 850, monX + 160, 480, monX + 40, 240);
      ctx.lineTo(monX + 20, 240);
      ctx.bezierCurveTo(monX + 110, 520, monX + 160, 880, monX + 110, monBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center Spire & Dome Assembly
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(monX, 320, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Turret Spire Tip
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(monX, 320);
      ctx.lineTo(monX, 160);
      ctx.stroke();

      // Beacon Red warning light at apex
      const apexBlink = Math.sin(now * 0.005) > 0;
      ctx.fillStyle = apexBlink ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(monX, 160, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // --- 4. Draw The Eternal Flame (شعلة الشهيد) at Center Podium ---
      const flameX = 1300;
      const flameY = 1075;

      // Altar Bowl
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(flameX, flameY, 28, 0, Math.PI);
      ctx.fill();
      ctx.stroke();

      // Flame Glow
      const glowGrad = ctx.createRadialGradient(flameX, flameY - 20, 5, flameX, flameY - 20, 95);
      glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.75)');
      glowGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.35)');
      glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(flameX, flameY - 20, 95, 0, Math.PI * 2);
      ctx.fill();

      // Leaping Flame Tongues
      const flameHeight = 35 + Math.sin(now * 0.015) * 8;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(flameX - 18, flameY - 2);
      ctx.quadraticCurveTo(flameX - 10, flameY - flameHeight * 0.6, flameX, flameY - flameHeight);
      ctx.quadraticCurveTo(flameX + 10, flameY - flameHeight * 0.6, flameX + 18, flameY - 2);
      ctx.closePath();
      ctx.fill();

      // Core white-hot fire center
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.moveTo(flameX - 8, flameY - 2);
      ctx.quadraticCurveTo(flameX, flameY - flameHeight * 0.8, flameX + 8, flameY - 2);
      ctx.closePath();
      ctx.fill();

      // Update & Draw Ambient Embers
      embersRef.current.forEach((emb) => {
        emb.y += emb.vy * dt;
        emb.x += emb.vx * dt + Math.sin(now * 0.003 + emb.life) * 0.4;
        emb.life -= dt;
        if (emb.life <= 0) {
          emb.life = emb.maxLife;
          emb.x = flameX + (Math.random() * 80 - 40);
          emb.y = flameY - 10;
        }

        const alpha = Math.max(0, emb.life / emb.maxLife);
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.beginPath();
        ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 5. Draw 2D Side-View Platforms & Structural Elements ---
      MAP_PLATFORMS.forEach((plat) => {
        // Ground Floor Promenade
        if (plat.id === 'ground_floor') {
          // Solid Ground Base
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

          // Promenade Paver Rim
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(plat.x, plat.y, plat.width, 18);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(plat.x, plat.y, plat.width, 3); // Neon guide line

          // Stone paver joints
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          for (let px = plat.x; px < plat.x + plat.width; px += 80) {
            ctx.beginPath();
            ctx.moveTo(px, plat.y);
            ctx.lineTo(px, plat.y + 18);
            ctx.stroke();
          }
          return;
        }

        // Boundary Walls (Solid Dark Girders)
        if (plat.id.startsWith('boundary_')) {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
          return;
        }

        // Suspended Platform Trusses underneath
        if (plat.isJumpThrough) {
          // Modern steel beam platform
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

          // Top edge accent highlight
          const edgeColor = plat.material === 'monument' ? '#38bdf8' : plat.material === 'stone' ? '#e2e8f0' : '#f59e0b';
          ctx.fillStyle = edgeColor;
          ctx.fillRect(plat.x, plat.y, plat.width, 3.5);

          // Structural diagonal lattice struts beneath
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
          ctx.lineWidth = 1.5;
          const step = 30;
          for (let sx = plat.x; sx < plat.x + plat.width - step; sx += step) {
            ctx.beginPath();
            ctx.moveTo(sx, plat.y + plat.height);
            ctx.lineTo(sx + step / 2, plat.y + plat.height + 14);
            ctx.lineTo(sx + step, plat.y + plat.height);
            ctx.stroke();
          }
        } else {
          // Solid stone / architectural terrace
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

          // Top bevel
          ctx.fillStyle = '#64748b';
          ctx.fillRect(plat.x + 2, plat.y + 2, plat.width - 4, 3);
        }

        // Optional Zone Label on platform
        if (plat.label) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(plat.label, plat.x + plat.width / 2, plat.y + plat.height + 22);
        }
      });

      // --- 6. Draw Team Spawn Base Flags / Beacons ---
      (Object.entries(TEAM_SPAWNS) as [TeamColor, { x: number; y: number }][]).forEach(([teamKey, pos]) => {
        const color = teamHex[teamKey];
        // Vertical spawn holographic beacon
        const beaconGrad = ctx.createLinearGradient(pos.x, pos.y + 30, pos.x, pos.y - 120);
        beaconGrad.addColorStop(0, `${color}55`);
        beaconGrad.addColorStop(1, `${color}00`);
        ctx.fillStyle = beaconGrad;
        ctx.fillRect(pos.x - 22, pos.y - 120, 44, 150);

        // Ground base pad
        ctx.fillStyle = color;
        ctx.fillRect(pos.x - 30, pos.y + 28, 60, 6);
      });

      // --- 7. Draw Wooden Supply Crates (Pushable & Destructible) ---
      gameState.crates.forEach((crate) => {
        if (crate.broken) return;

        // Crate wood base
        ctx.fillStyle = '#92400e';
        ctx.fillRect(crate.x, crate.y, crate.width, crate.height);

        // Wood grain planks
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.strokeRect(crate.x, crate.y, crate.width, crate.height);

        // Diagonal wooden cross-brace
        ctx.beginPath();
        ctx.moveTo(crate.x + 4, crate.y + 4);
        ctx.lineTo(crate.x + crate.width - 4, crate.y + crate.height - 4);
        ctx.moveTo(crate.x + crate.width - 4, crate.y + 4);
        ctx.lineTo(crate.x + 4, crate.y + crate.height - 4);
        ctx.stroke();

        // Corner metal reinforcement brackets
        ctx.fillStyle = '#475569';
        const bSize = 8;
        ctx.fillRect(crate.x, crate.y, bSize, bSize);
        ctx.fillRect(crate.x + crate.width - bSize, crate.y, bSize, bSize);
        ctx.fillRect(crate.x, crate.y + crate.height - bSize, bSize, bSize);
        ctx.fillRect(crate.x + crate.width - bSize, crate.y + crate.height - bSize, bSize, bSize);

        // Damage Cracks if damaged
        if (crate.hp < crate.maxHp) {
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(crate.x + 12, crate.y + 20);
          ctx.lineTo(crate.x + 24, crate.y + 28);
          ctx.lineTo(crate.x + 18, crate.y + 42);
          ctx.stroke();
        }

        // Mini HP Bar over crate
        const hpPct = Math.max(0, crate.hp / crate.maxHp);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(crate.x + 4, crate.y - 9, crate.width - 8, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(crate.x + 4, crate.y - 9, (crate.width - 8) * hpPct, 4);
      });

      // --- 8. Draw Grenades ---
      gameState.grenades.forEach((g) => {
        // Shadow beneath grenade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(g.x, g.y + 10, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Grenade body
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pulsing fuse LED
        const blink = Math.floor(now / 140) % 2 === 0;
        ctx.fillStyle = blink ? '#ef4444' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 9. Draw Projectiles (Bullets with High-Tech Glow) ---
      gameState.projectiles.forEach((p) => {
        const isShotgun = p.weapon === 'shotgun';
        const color = isShotgun ? '#f59e0b' : '#38bdf8';

        // Bullet projectile tracer glow
        const tracerLen = isShotgun ? 18 : 28;
        const speed = Math.hypot(p.vx, p.vy);
        const normVx = speed > 0 ? p.vx / speed : 1;
        const normVy = speed > 0 ? p.vy / speed : 0;

        const tailGrad = ctx.createLinearGradient(
          p.x,
          p.y,
          p.x - normVx * tracerLen,
          p.y - normVy * tracerLen
        );
        tailGrad.addColorStop(0, color);
        tailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = isShotgun ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - normVx * tracerLen, p.y - normVy * tracerLen);
        ctx.stroke();

        // Head bullet spark
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, isShotgun ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 10. Draw Explosions ---
      gameState.explosions.forEach((exp) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, exp.alpha);

        // Fiery outer blast wave
        ctx.strokeStyle = exp.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing core
        const expGrad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
        expGrad.addColorStop(0, '#ffffff');
        expGrad.addColorStop(0.3, exp.color);
        expGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = expGrad;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // --- 11. Draw 2D Side-View Humanoid Players (Full Body & Skeletal Animations) ---
      gameState.players.forEach((p) => {
        drawSideViewPlayer(ctx, p, teamHex[p.team] || '#38bdf8', now);
      });

      ctx.restore();

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [gameState, followPlayerId]);

  // Handle Canvas Resize
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

// =========================================================================
// 2D Side-View Character Drawing with Full Body & Skeletal Animation
// =========================================================================
function drawSideViewPlayer(
  ctx: CanvasRenderingContext2D,
  p: GamePlayerState,
  teamColor: string,
  now: number
) {
  ctx.save();
  ctx.translate(p.x, p.y);

  // If player is dead: draw fallen knockout state & respawn beacon
  if (!p.isAlive) {
    // Ground Defeat Silhouette
    ctx.save();
    ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fallen body
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-24, 18, 48, 12, 6);
    ctx.fill();

    // Holographic Respawn Beacon
    const respawnAlpha = (Math.sin(now * 0.008) + 1) * 0.35 + 0.3;
    const beamGrad = ctx.createLinearGradient(0, 24, 0, -80);
    beamGrad.addColorStop(0, `${teamColor}`);
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = respawnAlpha;
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-14, -80, 28, 104);

    // Countdown Badge
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -98, 48, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${p.respawnTimeRemaining.toFixed(1)}s`, 0, -87);
    ctx.restore();

    ctx.restore();
    return;
  }

  // --- Dynamic Postures & Animation Phases ---
  const isMoving = Math.abs(p.vx) > 10;
  const walkPhase = p.walkCycle || 0;
  const idleBob = p.isOnGround && !isMoving ? Math.sin(now * 0.005) * 1.5 : 0;
  const facingScale = p.facingRight ? 1 : -1;

  // Shadow under feet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 33, p.isOnGround ? 18 : 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flip horizontal orientation based on facing direction
  ctx.scale(facingScale, 1);

  // --- 1. Draw Legs & Combat Boots ---
  let legAngle1 = 0;
  let legAngle2 = 0;
  if (!p.isOnGround) {
    // Airborne jump posture: legs tucked dynamically
    legAngle1 = -0.35;
    legAngle2 = 0.45;
  } else if (isMoving) {
    // Running scissor animation
    legAngle1 = Math.sin(walkPhase) * 0.55;
    legAngle2 = Math.sin(walkPhase + Math.PI) * 0.55;
  }

  // Back Leg
  drawLeg(ctx, -5, 10 + idleBob, legAngle2, '#1e293b', '#0f172a');

  // Front Leg
  drawLeg(ctx, 5, 10 + idleBob, legAngle1, '#334155', '#1e293b');

  // --- 2. Torso & Tactical Armor Vest ---
  const torsoY = -6 + idleBob;

  // Ballistic Chest Plate Body
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(-11, torsoY - 14, 22, 28, 6);
  ctx.fill();

  // Team-colored Tactical Chest Vest & Epaulets
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.roundRect(-9, torsoY - 12, 18, 16, 4);
  ctx.fill();

  // Tactical harness straps
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, torsoY - 12);
  ctx.lineTo(7, torsoY + 4);
  ctx.moveTo(7, torsoY - 12);
  ctx.lineTo(-7, torsoY + 4);
  ctx.stroke();

  // Utility belt
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-10, torsoY + 9, 20, 5);

  // Belt buckle
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-3, torsoY + 9.5, 6, 4);

  // --- 3. Head, Beret / Helmet, and Tactical Visor ---
  const headY = torsoY - 24;

  // Neck
  ctx.fillStyle = '#b45309'; // skin tone / collar
  ctx.fillRect(-4, headY + 8, 8, 5);

  // Head Base
  ctx.fillStyle = '#f59e0b'; // warm skin tone
  ctx.beginPath();
  ctx.arc(0, headY, 9, 0, Math.PI * 2);
  ctx.fill();

  // Tactical Beret / Combat Helmet in Team Color
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  // Beret tilted silhouette
  ctx.ellipse(1, headY - 4, 11, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Beret Gold Insignia Crest
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(4, headY - 4, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Tactical Visor / Combat Goggles Scanner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(1, headY - 2, 8, 5);
  // Visor cyan luminous line
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(2, headY - 1, 6.5, 2.5);

  // --- 4. Weapon & Animated Arm Holding Gun ---
  // In the player's flipped local space, aim angle needs to be calculated:
  let localAim = p.aimAngle;
  if (!p.facingRight) {
    // When mirrored, flip angle around Y axis
    localAim = Math.PI - p.aimAngle;
  }

  const shoulderX = 0;
  const shoulderY = torsoY - 6;

  ctx.save();
  ctx.translate(shoulderX, shoulderY);
  ctx.rotate(localAim);

  // Gun Recoil pushback
  const recoilOffset = p.isShooting ? -6 : 0;
  ctx.translate(recoilOffset, 0);

  // Draw 2D Weapon Sprite
  if (p.weapon === 'shotgun') {
    // Heavy Tactical Shotgun
    // Stock
    ctx.fillStyle = '#475569';
    ctx.fillRect(-14, -2, 12, 6);
    // Receiver
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -4, 18, 8);
    // Double Barrel
    ctx.fillStyle = '#64748b';
    ctx.fillRect(16, -3, 16, 5);
    // Under-barrel mag tube & ribbed pump
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8, 2, 12, 4);
  } else {
    // Assault Rifle
    // Stock
    ctx.fillStyle = '#334155';
    ctx.fillRect(-16, -2, 14, 5);
    // Body / Receiver
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -4, 20, 8);
    // Extended Barrel
    ctx.fillStyle = '#64748b';
    ctx.fillRect(18, -2, 16, 4);
    // Curved Magazine
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(4, 4, 6, 11, 2);
    ctx.fill();
    // Red-Dot Holographic Optic
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, -8, 8, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(7, -7, 2, 2);
  }

  // Front Arm holding weapon
  ctx.strokeStyle = teamColor;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(8, 2);
  ctx.stroke();

  // Muzzle Flash & Shell Ejection on firing
  if (p.isShooting) {
    const muzzleX = p.weapon === 'shotgun' ? 34 : 36;
    // Multi-pointed bright muzzle star
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(muzzleX + 4, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(muzzleX, -5);
    ctx.lineTo(muzzleX + 16, 0);
    ctx.lineTo(muzzleX, 5);
    ctx.closePath();
    ctx.fill();

    // Ejected Brass Shell
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4, -8, 3, 5);
  }

  ctx.restore();

  // Restore non-mirrored scale for text and UI bars
  ctx.scale(facingScale, 1);

  // --- 5. Overhead Status Bar (Player Name, Team Badge, Health) ---
  const hudY = headY - 26;

  // Segmented Health Bar
  const barW = 46;
  const barH = 5;
  const barX = -barW / 2;

  // Background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(barX - 1, hudY - 1, barW + 2, barH + 2);

  // Health fill
  const hpRatio = Math.max(0, p.hp / p.maxHp);
  const hpColor = hpRatio > 0.55 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, hudY, barW * hpRatio, barH);

  // Segment dividers
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  for (let s = 1; s < 4; s++) {
    ctx.fillRect(barX + (barW / 4) * s, hudY, 1, barH);
  }

  // Player Name & Number Pill
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.fillText(`${p.number}. ${p.name}`, 0, hudY - 4);
  ctx.shadowBlur = 0;

  ctx.restore();
}

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

  // Thigh & Pants
  ctx.strokeStyle = thighColor;
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 12);
  ctx.stroke();

  // Shin
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(1, 20);
  ctx.stroke();

  // Combat Boot
  ctx.fillStyle = bootColor;
  ctx.beginPath();
  ctx.roundRect(-2, 19, 9, 6, 2);
  ctx.fill();

  ctx.restore();
}
